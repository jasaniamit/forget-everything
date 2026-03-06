/**
 * font-from-image.ts — Font From Image API (Node.js side)
 *
 * VISION_PROVIDER=local  → calls Python microservice (Phase 1+2+4)
 *                           PaddleOCR + SWT + Geometry + CLIP
 *                           Zero external dependencies, zero per-query cost
 *
 * VISION_PROVIDER=claude → calls Claude Vision API (fallback / premium)
 *
 * Default (auto): tries local first, falls back to Claude if unavailable
 */

import { type Express } from "express";
import multer from "multer";
import { db } from "../db";
import { fonts } from "@shared/schema";
import { eq, sql, like, and, notIlike } from "drizzle-orm";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_, file, cb) => {
    if (file.mimetype.startsWith("image/")) cb(null, true);
    else cb(new Error("Only image files are allowed"));
  },
});

const MICROSERVICE_URL = process.env.MICROSERVICE_URL || "http://localhost:8001";
const VISION_PROVIDER  = process.env.VISION_PROVIDER  || "auto";

async function enrichMatches(matches: any[]): Promise<any[]> {
  if (!matches || matches.length === 0) return [];
  const enriched = [];
  for (const match of matches) {
    try {
      const [font] = await db.select().from(fonts)
        .where(eq(fonts.id, match.font_id)).limit(1);
      if (font) {
        enriched.push({
          ...font,
          matchScore:     match.match_pct      ?? Math.round((match.fused_score ?? 0) * 100),
          matchReason:    match.match_reason   ?? "Vector similarity",
          clipSimilarity: match.clip_similarity ?? 0,
          geoSimilarity:  match.geo_similarity  ?? 0,
          fusedScore:     match.fused_score     ?? 0,
        });
      }
    } catch (_) {}
  }
  return enriched;
}

async function analyzeWithLocalService(fileBuffer: Buffer, mimetype: string): Promise<any | null> {
  try {
    const form = new FormData();
    const blob = new Blob([fileBuffer], { type: mimetype });
    form.append("image", blob, "upload.jpg");

    const resp = await fetch(`${MICROSERVICE_URL}/analyze`, {
      method: "POST",
      body: form,
      signal: AbortSignal.timeout(30000),
    });

    if (!resp.ok) throw new Error(`Microservice ${resp.status}`);

    const data = await resp.json();
    const geo = data.geometry || {};

    const analysis = {
      fontName:        data.matches?.[0]?.font_name ?? "Unknown",
      alternativeNames: data.matches?.slice(1, 4).map((m: any) => m.font_name) ?? [],
      xHeight:         geo.xHeight  ?? null,
      contrast:        geo.contrast ?? null,
      width:           geo.width    ?? null,
      hasSerif:        geo.hasSerif ?? null,
      confidence:      data.ocr_confidence > 0.7 ? "High" : data.ocr_confidence > 0.4 ? "Medium" : "Low",
      textDetected:    data.detected_text ?? "",
      latencyMs:       data.latency_ms,
      phasesUsed:      data.phases_used,
      indexedFonts:    data.indexed_fonts,
      provider:        "local",
    };

    return { analysis, matches: data.matches };
  } catch (err: any) {
    const isUnavailable = err.name === "TimeoutError"
      || err.code === "ECONNREFUSED"
      || err?.cause?.code === "ECONNREFUSED"
      || err.message?.includes("fetch failed");
    if (isUnavailable) { console.log("[font-from-image] Local microservice unavailable"); return null; }
    throw err;
  }
}

async function analyzeWithClaude(fileBuffer: Buffer, mimetype: string): Promise<any> {
  const Anthropic = (await import("@anthropic-ai/sdk")).default;
  const anthropic = new Anthropic();

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 1000,
    messages: [{
      role: "user",
      content: [
        { type: "image", source: { type: "base64", media_type: mimetype as any, data: fileBuffer.toString("base64") } },
        { type: "text", text: `Analyze the font in this image. Reply ONLY with JSON (no markdown backticks):
{"fontName":"","alternativeNames":[],"category":"","xHeight":"Low|Medium|High","contrast":"Low|Medium|High","width":"Condensed|Normal|Expanded","confidence":"High|Medium|Low","textDetected":"","searchKeywords":[]}` }
      ],
    }],
  });

  const rawText = response.content.filter((b: any) => b.type === "text").map((b: any) => b.text).join("");
  let analysis: any = { fontName: "Unknown", confidence: "Low", provider: "claude" };

  try {
    analysis = { ...JSON.parse(rawText.replace(/```json\n?|\n?```/g, "").trim()), provider: "claude" };
  } catch {}

  const dbMatches: any[] = [];
  if (analysis.fontName) {
    const nm = await db.select().from(fonts)
      .where(like(sql`lower(${fonts.name})`, `%${analysis.fontName.toLowerCase()}%`)).limit(5);
    nm.forEach(f => dbMatches.push({ font_id: f.id, font_name: f.name, match_pct: 88, match_reason: "Name match" }));
  }

  const popular = await db.select().from(fonts)
    .where(and(notIlike(fonts.name, "%Material%"), notIlike(fonts.name, "%Symbol%"))!)
    .orderBy(sql`${fonts.downloadCount} DESC`).limit(10);
  popular.forEach(f => {
    if (!dbMatches.find(m => m.font_id === f.id))
      dbMatches.push({ font_id: f.id, font_name: f.name, match_pct: 40, match_reason: "Popular" });
  });

  return { analysis, matches: dbMatches };
}

export function registerFontFromImageRoutes(app: Express) {
  app.get("/api/vision/health", async (req, res) => {
    try {
      const resp = await fetch(`${MICROSERVICE_URL}/health`, { signal: AbortSignal.timeout(3000) });
      const data = await resp.json();
      res.json({ ...data, provider: "local", microservice_url: MICROSERVICE_URL });
    } catch {
      res.json({
        status: "unavailable",
        provider: "none",
        message: `Start microservice: cd font-microservice && python main.py`,
        microservice_url: MICROSERVICE_URL,
      });
    }
  });

  app.post("/api/identify-font", upload.single("image"), async (req, res) => {
    if (!req.file) return res.status(400).json({ error: "No image uploaded" });

    try {
      let result: any = null;
      let usedProvider = "none";

      if (VISION_PROVIDER !== "claude") {
        result = await analyzeWithLocalService(req.file.buffer, req.file.mimetype);
        if (result) usedProvider = "local";
      }

      if (!result && VISION_PROVIDER !== "local" && process.env.ANTHROPIC_API_KEY) {
        result = await analyzeWithClaude(req.file.buffer, req.file.mimetype);
        usedProvider = "claude";
      }

      if (!result) {
        return res.status(503).json({
          error: "Font recognition unavailable",
          fix: "Start the microservice: cd font-microservice && python main.py",
        });
      }

      const enrichedMatches = await enrichMatches(result.matches || []);

      res.json({
        analysis: result.analysis,
        matches:  enrichedMatches,
        provider: usedProvider,
        meta: {
          latency_ms:    result.analysis?.latencyMs,
          phases_used:   result.analysis?.phasesUsed,
          indexed_fonts: result.analysis?.indexedFonts,
        },
      });
    } catch (err: any) {
      console.error("[font-from-image]", err);
      res.status(500).json({ error: err?.message ?? "Analysis failed" });
    }
  });
}
