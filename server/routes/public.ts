import { type Express } from "express";
import { storage } from "../storage";
import { api } from "@shared/routes";
import { db } from "../db";
import { fontClassification, fontGlyphFeatures, fontCategories, fontSubStyles, fontCharacteristics } from "@shared/schema";
import { eq } from "drizzle-orm";

const variantCache = new Map<number, { variants: any[], family: string, timestamp: number }>();
const CACHE_TTL = 1000 * 60 * 60 * 24; // 24 hours

export function registerPublicRoutes(app: Express) {
    // Debug endpoint — tests the actual getFonts call
    app.get("/api/debug-fonts", async (req, res) => {
        try {
            const { db } = await import("../db");
            const { sql } = await import("drizzle-orm");
            const cols = await db.execute(sql`SELECT column_name FROM information_schema.columns WHERE table_name = 'fonts' AND table_schema = 'public' ORDER BY ordinal_position`);
            const cnt = await db.execute(sql`SELECT COUNT(*) as n FROM fonts`);
            const sample = await db.execute(sql`SELECT id, name, download_count, subsets, weight FROM fonts LIMIT 2`);
            res.json({ columns: cols.rows, count: cnt.rows[0], sample: sample.rows });
        } catch (err: any) {
            res.status(500).json({ error: err.message, stack: err.stack?.split("\n").slice(0,5) });
        }
    });

    // Debug endpoint 2 — tests the actual getFonts storage call
    app.get("/api/debug-getfonts", async (req, res) => {
        try {
            const result = await storage.getFonts({ limit: 5 });
            res.json({ ok: true, total: result.total, count: result.fonts.length, first: result.fonts[0]?.name });
        } catch (err: any) {
            res.status(500).json({ 
                error: err.message, 
                hint: "This is the exact error from getFonts()",
                stack: err.stack?.split("\n").slice(0, 8)
            });
        }
    });

    app.get("/api/taxonomy", async (req, res) => {
        const categories = await db.select().from(fontCategories);
        const styles = await db.select().from(fontSubStyles);
        const characteristics = await db.select().from(fontCharacteristics);
        res.json({ categories, styles, characteristics });
    });

    app.get(api.fonts.list.path, async (req, res) => {
        // Time-based rotation seed — changes every 30 min so the default
        // feed shows fresh fonts at the top each half-hour.
        const rotationSeed = req.query.seed
            ? Number(req.query.seed)
            : Math.floor(Date.now() / (30 * 60 * 1000));

        try {
            const fontsList = await storage.getFonts({ ...req.query, seed: rotationSeed });
            res.json(fontsList);
        } catch (err: any) {
            console.error("[/api/fonts] getFonts error:", err?.message ?? err);
            console.error("[/api/fonts] Stack:", err?.stack);
            res.status(500).json({ error: "Database query failed", detail: err?.message });
        }
    });

    app.get("/api/fonts/search", async (req, res) => {
        const fontsList = await storage.getFonts(req.query);
        res.json(fontsList);
    });

    app.get("/api/fonts/:id", async (req, res) => {
        const id = Number(req.params.id);
        const font = await storage.getFont(id);
        if (!font) {
            return res.status(404).json({ message: 'Font not found' });
        }

        const [classification] = await db.select().from(fontClassification).where(eq(fontClassification.styleId, font.id.toString())).limit(1);
        const [glyphFeatures] = await db.select().from(fontGlyphFeatures).where(eq(fontGlyphFeatures.styleId, font.id.toString())).limit(1);

        res.json({ ...font, classification, glyphFeatures });
    });

    // Real variant list fetched from Google Fonts API with in-memory caching
    app.get("/api/fonts/:id/variants", async (req, res) => {
        try {
            const id = Number(req.params.id);

            // Check cache first
            const cached = variantCache.get(id);
            if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
                return res.json({ variants: cached.variants, family: cached.family });
            }

            const font = await storage.getFont(id);
            if (!font) return res.status(404).json({ message: "Font not found" });

            const apiKey = process.env.GOOGLE_FONTS_API_KEY;
            if (!apiKey) {
                // Fall back to what we have in the DB
                return res.json({ variants: [], family: font.family });
            }

            const url = `https://www.googleapis.com/webfonts/v1/webfonts?family=${encodeURIComponent(font.family)}&key=${apiKey}`;
            const gfRes = await fetch(url);
            if (!gfRes.ok) {
                return res.json({ variants: [], family: font.family });
            }

            const gfData = await gfRes.json() as any;
            const items: any[] = gfData?.items ?? [];
            const match = items.find((i: any) => i.family.toLowerCase() === font.family.toLowerCase());

            const VARIANT_LABEL: Record<string, string> = {
                "100": "Thin", "100italic": "Thin Italic",
                "200": "Extra Light", "200italic": "Extra Light Italic",
                "300": "Light", "300italic": "Light Italic",
                "regular": "Regular", "italic": "Italic",
                "500": "Medium", "500italic": "Medium Italic",
                "600": "Semibold", "600italic": "Semibold Italic",
                "700": "Bold", "700italic": "Bold Italic",
                "800": "Extra Bold", "800italic": "Extra Bold Italic",
                "900": "Black", "900italic": "Black Italic",
            };

            const SORT_ORDER: Record<string, number> = {
                "100": 1, "100italic": 2, "200": 3, "200italic": 4,
                "300": 5, "300italic": 6, "regular": 7, "italic": 8,
                "500": 9, "500italic": 10, "600": 11, "600italic": 12,
                "700": 13, "700italic": 14, "800": 15, "800italic": 16,
                "900": 17, "900italic": 18,
            };

            const rawVariants: string[] = match?.variants ?? [];
            const variants = rawVariants
                .sort((a, b) => (SORT_ORDER[a] ?? 99) - (SORT_ORDER[b] ?? 99))
                .map(v => ({
                    raw: v,
                    label: VARIANT_LABEL[v] ?? v,
                    weight: parseInt(v) || (v === "regular" || v === "italic" ? 400 : 400),
                    italic: v.includes("italic"),
                }));

            // Set cache
            variantCache.set(id, { variants, family: font.family, timestamp: Date.now() });

            res.json({ variants, family: font.family });
        } catch (err) {
            console.error("Variants fetch error:", err);
            res.json({ variants: [], family: "" });
        }
    });

    // Similar & contrast fonts endpoint
    app.get("/api/fonts/:id/similar", async (req, res) => {
        try {
            const id = Number(req.params.id);
            const font = await storage.getFont(id);
            if (!font) return res.status(404).json({ message: "Font not found" });

            // Get all fonts (limited) to compute similarity
            const allData = await storage.getFonts({ limit: 500 });
            const allFonts = allData.fonts.filter(f => f.id !== id);

            // Score similarity: same category/style gets high score, matching props add up
            type ScoredFont = { font: typeof font; score: number };
            const scored: ScoredFont[] = allFonts.map(f => {
                let score = 0;
                if (f.category === font.category) score += 30;
                if (f.contrast === font.contrast) score += 20;
                if (f.xHeight === font.xHeight) score += 15;
                if (f.width === font.width) score += 10;
                if (f.serifType && f.serifType === font.serifType) score += 15;
                if (f.aStory === font.aStory) score += 5;
                if (f.gStory === font.gStory) score += 5;
                return { font: f, score };
            });

            // Similar = high score
            const similar = scored
                .sort((a, b) => b.score - a.score)
                .slice(0, 12)
                .map(s => s.font);

            // Contrast/opposite = different category and opposite contrast
            const contrastMap: Record<string, string> = { Low: "High", High: "Low", Medium: "Medium" };
            const targetContrast = font.contrast ? contrastMap[font.contrast] : null;
            const opposite = allFonts
                .filter(f => f.category !== font.category)
                .sort((a, b) => {
                    let aScore = 0, bScore = 0;
                    if (targetContrast && a.contrast === targetContrast) aScore += 20;
                    if (targetContrast && b.contrast === targetContrast) bScore += 20;
                    // Good pairing: serif + sans-serif
                    const isGoodPair = (cat1: string | null, cat2: string | null) =>
                        (cat1?.includes("serif") && cat2?.includes("sans")) ||
                        (cat1?.includes("sans") && cat2?.includes("serif"));
                    if (isGoodPair(font.category, a.category)) aScore += 15;
                    if (isGoodPair(font.category, b.category)) bScore += 15;
                    return bScore - aScore;
                })
                .slice(0, 8);

            res.json({ similar, opposite });
        } catch (err) {
            console.error("Similar fonts error:", err);
            res.status(500).json({ similar: [], opposite: [] });
        }
    });

    app.post(api.fonts.incrementDownload.path, async (req, res) => {
        const font = await storage.incrementDownloadCount(Number(req.params.id));
        if (!font) {
            return res.status(404).json({ message: 'Font not found' });
        }
        res.json({ count: font.downloadCount });
    });

    app.get("/api/fonts/:id/download", async (req, res) => {
        try {
            const id = Number(req.params.id);
            const font = await storage.getFont(id);

            if (!font) {
                return res.status(404).json({ message: "Font not found" });
            }

            await storage.incrementDownloadCount(id);
            res.redirect(font.fileUrl);
        } catch (err) {
            console.error("Download error:", err);
            res.status(500).json({ message: "Internal server error during download" });
        }
    });

    // /api/fonts/:id (from api.fonts.get.path) might match the earlier route but keeping exactly as original
    app.get(api.fonts.get.path, async (req, res) => {
        const font = await storage.getFont(Number(req.params.id));
        if (!font) {
            return res.status(404).json({ message: 'Font not found' });
        }
        res.json(font);
    });
}
