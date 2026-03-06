import { db } from "./db";
import { fonts, fontSubStyles, fontStyleMap } from "@shared/schema";
import { eq, sql } from "drizzle-orm";
import axios from "axios";
import { tagFont } from "./font-auto-tagger";

const CATEGORY_USE_CASE: Record<string, string> = {
  "sans-serif": "tech",
  "serif": "business",
  "display": "designer",
  "handwriting": "designer",
  "monospace": "developer",
};

const CATEGORY_STYLE_SLUG: Record<string, string> = {
  "sans-serif": "sans-serif",
  "serif": "serif",
  "display": "decorative",
  "handwriting": "handwriting",
  "monospace": "monospace",
};

export async function fetchAndIngestGoogleFonts() {
  const API_KEY = process.env.GOOGLE_FONTS_API_KEY;
  if (!API_KEY) {
    console.error("[Google Fonts] GOOGLE_FONTS_API_KEY is not set — skipping ingestion.");
    return;
  }

  try {
    console.log("[Google Fonts] Fetching full font list from Google Fonts API...");
    const response = await axios.get(
      `https://www.googleapis.com/webfonts/v1/webfonts?key=${API_KEY}&sort=popularity`
    );

    const googleFonts: any[] = response.data.items;
    console.log(`[Google Fonts] Found ${googleFonts.length} fonts. Starting ingestion...`);

    let inserted = 0;
    let skipped = 0;

    for (const gf of googleFonts) {
      const existing = await db
        .select({ id: fonts.id })
        .from(fonts)
        .where(eq(fonts.family, gf.family))
        .limit(1);
      if (existing.length > 0) { skipped++; continue; }

      const cat: string = gf.category || "sans-serif";
      const variants: string[] = gf.variants || ["regular"];
      const subsets: string[] = gf.subsets || ["latin"];

      const rawUrl: string =
        gf.files?.regular || gf.files?.["400"] ||
        Object.values<string>(gf.files)[0] || "";
      const fileUrl = rawUrl.replace(/^http:/, "https:");
      const designer: string = gf.designers?.join(", ") || gf.family;

      // Use smart tagger
      const tags = tagFont(gf.family, cat, variants, subsets);

      const [newFont] = await db.insert(fonts).values({
        name: gf.family,
        family: gf.family,
        useCase: JSON.stringify([CATEGORY_USE_CASE[cat] ?? "designer"]),
        license: "OFL",
        designer,
        fileUrl,
        description: `${gf.family} is a ${cat} font from Google Fonts.`,
        ...tags,
      }).returning();

      const styleSlug = CATEGORY_STYLE_SLUG[cat] || "sans-serif";
      const [style] = await db.select().from(fontSubStyles)
        .where(eq(fontSubStyles.slug, styleSlug)).limit(1);
      if (style) {
        await db.insert(fontStyleMap)
          .values({ fontId: newFont.id, styleId: style.id })
          .onConflictDoNothing();
      }

      inserted++;
      if (inserted % 100 === 0) {
        console.log(`[Google Fonts] Progress: ${inserted} inserted, ${skipped} skipped...`);
      }
    }

    console.log(`[Google Fonts] Ingestion complete. ${inserted} new fonts added, ${skipped} already existed.`);
  } catch (error: any) {
    console.error("[Google Fonts] Error during ingestion:", error?.message || error);
  }
}

export async function autoIngestIfNeeded(threshold = 200) {
  try {
    const [{ count }] = await db
      .select({ count: sql<number>`cast(count(*) as integer)` })
      .from(fonts);

    if (count < threshold) {
      console.log(`[Google Fonts] Only ${count} fonts in DB (threshold: ${threshold}). Starting background ingestion...`);
      fetchAndIngestGoogleFonts().catch(err =>
        console.error("[Google Fonts] Background ingestion failed:", err)
      );
    } else {
      console.log(`[Google Fonts] ${count} fonts in DB — skipping auto-ingestion.`);
    }
  } catch (err) {
    console.error("[Google Fonts] Could not check font count for auto-ingestion:", err);
  }
}
