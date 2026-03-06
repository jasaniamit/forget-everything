import { type Express, type Request, type Response } from "express";
import multer from "multer";
import { db } from "../db";
import { fonts } from "@shared/schema";
import { eq, sql, like, and, notIlike } from "drizzle-orm";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
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
    const axios = (await import("axios")).default;
    const FormDataNode = (await import("form-data")).default;

    const form = new FormDataNode();
    form.append("image", fileBuffer, {
      filename: "upload.jpg",
      contentType: mimetype,
      knownLength: fileBuffer.length,
    });

    const resp = await axios.post(`${MICROSERVICE_URL}/analyze`, form, {
      headers: { ...form.getHeaders() },
      timeout: 120000,
      maxContentLength: Infinity,
      maxBodyLength: Infinity,
    });

    if (resp.status !== 200) {
      throw new Error(`Microservice ${resp.status}`);
    }

    const data = resp.data;
    const geo = data.geometry || {};

    const analysis = {
      fontName:         data.top_font ?? data.matches?.[0]?.font_name ?? "Unknown",
      alternativeNames: data.matches?.slice(1, 4).map((m: any) => m.font_name) ?? [],
      xHeight:          null,
      contrast:         null,
      width:            null,
      hasSerif:         null,
      confidence:       data.matches?.[0]?.match_pct > 70 ? "High"
                      : data.matches?.[0]?.match_pct > 40 ? "Medium" : "Low",
      textDetected:     data.detected_text ?? "",
      latencyMs:        data.latency_ms,
      phasesUsed:       data.phases_used,
      indexedFonts:     data.indexed_fonts,
      provider:         "local",
    };

    // Normalise matches — Storia returns font_id=0 for fonts not in local DB
    const matches = (data.matches || []).map((m: any) => ({
      ...m,
      font_id:    m.font_id    || 0,
      font_name:  m.font_name  || "Unknown",
      match_pct:  m.match_pct  || Math.round((m.confidence || 0) * 100),
      match_reason: m.match_reason || "Storia classifier",
    }));

    return { analysis, matches };
  } catch (err: any) {
    const isUnavailable =
      err.name === "TimeoutError" ||
      err.code === "ECONNREFUSED" ||
      err?.cause?.code === "ECONNREFUSED" ||
      err.message?.includes("fetch failed") ||
      err.message?.includes("ECONNREFUSED");
    if (isUnavailable) {
      console.log("[font-from-image] Local microservice unavailable:", err.message);
      return null;
    }
    console.error("[font-from-image] Local service error:", err.message);
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
        { type: "text", text: `Analyze the font. Reply ONLY with raw JSON no markdown:
{"fontName":"","alternativeNames":[],"category":"","xHeight":"Low|Medium|High","contrast":"Low|Medium|High","width":"Condensed|Normal|Expanded","confidence":"High|Medium|Low","textDetected":"","searchKeywords":[]}` }
      ],
    }],
  });

  const rawText = response.content
    .filter((b: any) => b.type === "text")
    .map((b: any) => b.text).join("");

  let analysis: any = { fontName: "Unknown", confidence: "Low", provider: "claude" };
  try {
    analysis = { ...JSON.parse(rawText.replace(/```json\n?|\n?```/g, "").trim()), provider: "claude" };
  } catch {}

  const dbMatches: any[] = [];
  if (analysis.fontName) {
    const nm = await db.select().from(fonts)
      .where(like(sql`lower(${fonts.name})`, `%${analysis.fontName.toLowerCase()}%`)).limit(5);
    nm.forEach((f: any) => dbMatches.push({ font_id: f.id, font_name: f.name, match_pct: 88, match_reason: "Name match" }));
  }
  const popular = await db.select().from(fonts)
    .where(and(notIlike(fonts.name, "%Material%"), notIlike(fonts.name, "%Symbol%"))!)
    .orderBy(sql`${fonts.downloadCount} DESC`).limit(10);
  popular.forEach((f: any) => {
    if (!dbMatches.find((m: any) => m.font_id === f.id))
      dbMatches.push({ font_id: f.id, font_name: f.name, match_pct: 40, match_reason: "Popular" });
  });

  return { analysis, matches: dbMatches };
}

export function registerFontFromImageRoutes(app: Express) {

  // Health check for microservice
  app.get("/api/vision/health", async (_req: Request, res: Response) => {
    try {
      const resp = await fetch(`${MICROSERVICE_URL}/health`, {
        signal: AbortSignal.timeout(3000),
      });
      const data = await resp.json();
      res.json({ ...data, provider: "local", microservice_url: MICROSERVICE_URL });
    } catch {
      res.json({
        status: "unavailable",
        provider: "none",
        message: `Start: cd font-microservice && python main.py`,
        microservice_url: MICROSERVICE_URL,
      });
    }
  });

  // Main font identification endpoint
  app.post("/api/identify-font",
    (req: Request, res: Response, next: any) => {
      upload.single("image")(req, res, (err) => {
        if (err) {
          console.error("[font-from-image] Multer error:", err);
          return res.status(400).json({ error: `Upload error: ${err.message}` });
        }
        next();
      });
    },
    async (req: Request, res: Response) => {
      if (!req.file) {
        return res.status(400).json({ error: "No image file uploaded. Send as multipart/form-data with field name 'image'" });
      }

      console.log(`[font-from-image] Received image: ${req.file.originalname} ${req.file.size} bytes ${req.file.mimetype}`);

      try {
        let result: any = null;
        let usedProvider = "none";

        // Try local microservice first
        if (VISION_PROVIDER !== "claude") {
          result = await analyzeWithLocalService(req.file.buffer, req.file.mimetype);
          if (result) usedProvider = "local";
        }

        // Fall back to Claude if local unavailable
        if (!result && VISION_PROVIDER !== "local" && process.env.ANTHROPIC_API_KEY) {
          console.log("[font-from-image] Falling back to Claude Vision");
          result = await analyzeWithClaude(req.file.buffer, req.file.mimetype);
          usedProvider = "claude";
        }

        if (!result) {
          return res.status(503).json({
            error: "Font recognition service unavailable",
            fix: "Start the microservice: cd font-microservice && python main.py",
            microservice_url: MICROSERVICE_URL,
          });
        }

        const enrichedMatches = await enrichMatches(result.matches || []);

        return res.json({
          analysis:  result.analysis,
          matches:   enrichedMatches,
          provider:  usedProvider,
          meta: {
            latency_ms:    result.analysis?.latencyMs,
            phases_used:   result.analysis?.phasesUsed,
            indexed_fonts: result.analysis?.indexedFonts,
          },
        });

      } catch (err: any) {
        console.error("[font-from-image] Error:", err);
        return res.status(500).json({ error: err?.message ?? "Analysis failed" });
      }
    }
  );
}
