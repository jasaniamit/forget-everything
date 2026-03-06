import { type Express, Request, Response, NextFunction } from "express";
import { storage } from "../storage";
import { insertFontSchema, fonts } from "@shared/schema";
import { z } from "zod";
import { fetchAndIngestGoogleFonts } from "../google-fonts-ingestion";
import { db } from "../db";
import { eq, or, sql } from "drizzle-orm";

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
    const adminKey = process.env.ADMIN_API_KEY;
    if (!adminKey) {
        return res.status(500).json({ message: "ADMIN_API_KEY is not configured on the server" });
    }
    const provided = req.headers["x-admin-key"];
    if (provided !== adminKey) {
        return res.status(401).json({ message: "Unauthorized: invalid or missing x-admin-key header" });
    }
    next();
}

export function registerAdminRoutes(app: Express) {
    // Admin: debug — raw DB count
    app.get("/api/admin/debug", requireAdmin, async (req, res) => {
        try {
            const { sql: sqlTag } = await import("drizzle-orm");
            const [{ count }] = await db.select({ count: sqlTag<number>`cast(count(*) as integer)` }).from(fonts);
            const sample = await db.select({ id: fonts.id, name: fonts.name }).from(fonts).limit(3);
            res.json({ totalFonts: count, sample });
        } catch (err: any) {
            res.status(500).json({ message: err.message });
        }
    });

    // Admin: list all fonts with full properties for management
    app.get("/api/admin/fonts", requireAdmin, async (req, res) => {
        try {
            const page = Math.max(1, parseInt((req.query.page as string) || "1", 10));
            const limit = Math.min(200, Math.max(1, parseInt((req.query.limit as string) || "50", 10)));
            const search = req.query.search as string | undefined;
            const category = req.query.category as string | undefined;
            const result = await storage.getFonts({ page, limit, search, category });
            res.json(result);
        } catch (err) {
            console.error("Admin list fonts error:", err);
            res.status(500).json({ message: "Internal server error" });
        }
    });

    // Admin: update a font's properties
    app.patch("/api/admin/fonts/:id", requireAdmin, async (req, res) => {
        try {
            const id = Number(req.params.id);
            if (isNaN(id)) return res.status(400).json({ message: "Invalid font id" });

            const allowed = ["name", "family", "useCase", "designer", "license", "description",
                "weight", "width", "xHeight", "contrast", "italics", "caps", "figures", "story",
                "serifType", "aStory", "gStory", "familySize", "fileUrl"];
            const updates: Record<string, any> = {};
            for (const key of allowed) {
                if (key in req.body) updates[key] = req.body[key] === "" ? null : req.body[key];
            }

            if (Object.keys(updates).length === 0) {
                return res.status(400).json({ message: "No valid fields to update" });
            }

            const font = await storage.updateFont(id, updates as any);
            if (!font) return res.status(404).json({ message: "Font not found" });
            res.json(font);
        } catch (err) {
            console.error("Admin update font error:", err);
            res.status(500).json({ message: "Internal server error" });
        }
    });

    app.post("/api/admin/fonts/bulk", requireAdmin, async (req, res) => {
        try {
            const fontsData = z.array(insertFontSchema).parse(req.body);
            await storage.bulkCreateFonts(fontsData);
            res.status(201).json({ message: `Successfully queued ${fontsData.length} fonts for import` });
        } catch (err) {
            if (err instanceof z.ZodError) {
                return res.status(400).json({ message: "Invalid font data format", errors: err.errors });
            }
            res.status(500).json({ message: "Internal server error" });
        }
    });

    app.post("/api/admin/fonts/fetch-google", requireAdmin, async (req, res) => {
        try {
            fetchAndIngestGoogleFonts();
            res.json({ message: "Google Fonts ingestion started in the background" });
        } catch (err) {
            res.status(500).json({ message: "Failed to start Google Fonts ingestion" });
        }
    });

    app.post("/api/admin/fonts/reingest-properties", requireAdmin, async (req, res) => {
        try {
            const { sql, isNull, or } = await import("drizzle-orm");
            const nullFonts = await db
                .select({ id: fonts.id })
                .from(fonts)
                .where(or(isNull(fonts.aStory), isNull(fonts.gStory)));

            const A_STORY: Record<string, string | null> = { "sans-serif": "Double", "serif": "Single", "monospace": "Double" };
            const G_STORY: Record<string, string | null> = { "sans-serif": "Single", "serif": "Double", "monospace": "Single" };
            let updated = 0;
            for (const f of nullFonts) {
                const aStory = null;
                const gStory = null;
                if (aStory || gStory) {
                    await db.update(fonts).set({ aStory, gStory }).where(eq(fonts.id, f.id));
                    updated++;
                }
            }
            res.json({ message: `Updated properties on ${updated} fonts (of ${nullFonts.length} with nulls)` });
        } catch (err) {
            console.error("Reingest properties error:", err);
            res.status(500).json({ message: "Internal server error" });
        }
    });

    // Auto-tag all existing fonts with smart property inference
    app.post("/api/admin/fonts/auto-tag", requireAdmin, async (req, res) => {
        try {
            const { tagFont } = await import("../font-auto-tagger");
            const API_KEY = process.env.GOOGLE_FONTS_API_KEY;

            // Fetch Google Fonts metadata for variant/subset info
            let gfMap: Record<string, { variants: string[]; subsets: string[]; category: string }> = {};
            if (API_KEY) {
                try {
                    const axios = await import("axios");
                    const resp = await axios.default.get(
                        `https://www.googleapis.com/webfonts/v1/webfonts?key=${API_KEY}&sort=popularity`
                    );
                    for (const gf of resp.data.items) {
                        gfMap[gf.family.toLowerCase()] = {
                            variants: gf.variants || ["regular"],
                            subsets: gf.subsets || ["latin"],
                            category: gf.category || "sans-serif",
                        };
                    }
                    console.log(`[auto-tag] Loaded ${Object.keys(gfMap).length} fonts from Google Fonts API`);
                } catch (e) {
                    console.warn("[auto-tag] Could not fetch Google Fonts API — will use category fallback");
                }
            }

            // Get all fonts from DB
            const allFonts = await db.select({
                id: fonts.id,
                name: fonts.name,
                family: fonts.family,
                weight: fonts.weight,
                italics: fonts.italics,
                subsets: fonts.subsets,
            }).from(fonts);

            let updated = 0;
            let skipped = 0;

            for (const font of allFonts) {
                const key = font.family.toLowerCase();
                const gf = gfMap[key];

                // Determine category from existing style map
                const [styleRow] = await db.execute(
                    sql`SELECT fs.name FROM font_style_map fsm JOIN font_sub_styles fs ON fs.id = fsm.style_id WHERE fsm.font_id = ${font.id} LIMIT 1`
                );
                const styleName = (styleRow as any)?.name?.toLowerCase() ?? "sans-serif";
                const catMap: Record<string, string> = {
                    "sans serif": "sans-serif", "serif": "serif",
                    "slab serif": "serif", "script": "display",
                    "decorative": "display", "handwriting": "handwriting",
                    "monospace": "monospace",
                };
                const category = catMap[styleName] ?? gf?.category ?? "sans-serif";

                // Parse variants from existing weight JSON or use Google Fonts
                let variants: string[] = gf?.variants ?? [];
                if (variants.length === 0 && font.weight) {
                    try {
                        const parsed = JSON.parse(font.weight);
                        if (Array.isArray(parsed)) variants = ["regular"]; // minimal fallback
                    } catch { variants = ["regular"]; }
                }
                if (variants.length === 0) variants = ["regular"];

                const subsets = gf?.subsets ?? (font.subsets ? JSON.parse(font.subsets) : ["latin"]);
                const tags = tagFont(font.family, category, variants, subsets);

                await db.update(fonts).set(tags).where(eq(fonts.id, font.id));
                updated++;

                if (updated % 100 === 0) {
                    console.log(`[auto-tag] Progress: ${updated}/${allFonts.length}`);
                }
            }

            res.json({
                message: `Auto-tagging complete.`,
                updated,
                skipped,
                total: allFonts.length,
            });
        } catch (err: any) {
            console.error("Auto-tag error:", err);
            res.status(500).json({ message: err.message });
        }
    });

    // Geometry analysis endpoint — runs real font measurement on a batch of fonts
    app.post("/api/admin/fonts/analyze-geometry", requireAdmin, async (req, res) => {
        const { limit = 50, force = false, fontId } = req.body ?? {};
        res.setHeader("Content-Type", "text/event-stream");
        res.setHeader("Cache-Control", "no-cache");
        res.setHeader("Connection", "keep-alive");

        const send = (data: object) => res.write(`data: ${JSON.stringify(data)}\n\n`);

        try {
            const { analyzeFontUrl } = await import("../font-geometry-analyzer");
            const { isNull, or, eq } = await import("drizzle-orm");

            let query = db.select({
                id: fonts.id, name: fonts.name, family: fonts.family, fileUrl: fonts.fileUrl,
            }).from(fonts) as any;

            if (fontId) {
                query = query.where(eq(fonts.id, Number(fontId)));
            } else if (!force) {
                query = query.where(or(isNull(fonts.xHeight), isNull(fonts.contrast), eq(fonts.xHeight, "Medium")));
            }

            const rows = await query.limit(Number(limit));
            send({ type: "start", total: rows.length });

            let ok = 0, failed = 0;
            for (let i = 0; i < rows.length; i++) {
                const row = rows[i];
                try {
                    const tags = await analyzeFontUrl(row.fileUrl);
                    if (!tags) {
                        send({ type: "progress", i: i + 1, name: row.name, status: "skip", msg: "Download/parse failed" });
                        failed++;
                        continue;
                    }

                    await db.update(fonts).set({
                        xHeight: tags.xHeight,
                        contrast: tags.contrast,
                        width: tags.width,
                        caps: tags.caps,
                        aStory: tags.aStory,
                        gStory: tags.gStory,
                    }).where(eq(fonts.id, row.id));

                    send({
                        type: "progress", i: i + 1, name: row.name, status: "ok",
                        xHeight: tags.xHeight, contrast: tags.contrast, width: tags.width,
                        caps: tags.caps, aStory: tags.aStory, gStory: tags.gStory,
                        raw: {
                            xHeightRatio: tags.raw.xHeightRatio.toFixed(3),
                            contrastRatio: tags.raw.contrastRatio.toFixed(2),
                            widthRatio: tags.raw.widthRatio.toFixed(3),
                        },
                    });
                    ok++;
                } catch (err: any) {
                    send({ type: "progress", i: i + 1, name: row.name, status: "error", msg: err?.message });
                    failed++;
                }
                // Small delay to avoid hammering CDN
                await new Promise(r => setTimeout(r, 60));
            }

            send({ type: "done", ok, failed, total: rows.length });
            res.end();
        } catch (err: any) {
            send({ type: "error", message: err?.message });
            res.end();
        }
    });

    app.post("/api/admin/fonts/migrate-categories", requireAdmin, async (req, res) => {
        try {
            res.json({ message: `Migration logic was moved into the setup phase and fonts.category is now normalized and dropped.` });
        } catch (err) {
            console.error("Migration error:", err);
            res.status(500).json({ message: "Internal server error" });
        }
    });
}
