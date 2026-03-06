/**
 * analyze-fonts.ts — Font Geometry Analyzer CLI
 *
 * Usage:
 *   npm run analyze-fonts                     → analyze all un-tagged fonts
 *   npm run analyze-fonts -- --limit 50       → first 50 fonts only
 *   npm run analyze-fonts -- --force          → re-analyze ALL fonts
 *   npm run analyze-fonts -- --id 42          → single font by DB id
 *   npm run analyze-fonts -- --dry            → dry run, no DB writes
 *
 * How it works:
 *   1. Fetches the Google Fonts API to get REAL direct .ttf URLs
 *   2. Downloads each font binary
 *   3. Measures xHeight, contrast, width, caps, a/g-story from actual glyph geometry
 *   4. Updates DB with measured values
 */

import { db } from "../db";
import { fonts } from "@shared/schema";
import { eq, isNull, or } from "drizzle-orm";
import { analyzeFontUrl } from "../font-geometry-analyzer";
import axios from "axios";

const args      = process.argv.slice(2);
const limit     = parseInt(args[args.indexOf("--limit") + 1] ?? "0") || 0;
const singleId  = parseInt(args[args.indexOf("--id")    + 1] ?? "0") || 0;
const force     = args.includes("--force");
const dryRun    = args.includes("--dry");

const pad = (s: string | number, n: number) => String(s).padEnd(n).slice(0, n);

// ── Step 1: Fetch Google Fonts API to build family → direct TTF URL map ──────
async function buildGoogleFontsUrlMap(): Promise<Map<string, string>> {
  const apiKey = process.env.GOOGLE_FONTS_API_KEY;
  const map = new Map<string, string>();

  if (!apiKey) {
    console.warn("  ⚠  GOOGLE_FONTS_API_KEY not set — will try fileUrls from DB directly\n");
    return map;
  }

  try {
    process.stdout.write("  Fetching Google Fonts API for direct .ttf URLs… ");
    const resp = await axios.get(
      `https://www.googleapis.com/webfonts/v1/webfonts?key=${apiKey}&sort=popularity`,
      { timeout: 20000 }
    );
    const items: any[] = resp.data.items ?? [];

    for (const item of items) {
      // Prefer regular/400, fall back to first available variant URL
      const url: string =
        item.files?.regular ||
        item.files?.["400"]  ||
        Object.values<string>(item.files ?? {})[0] ||
        "";
      if (url) {
        // Force https (API sometimes returns http)
        map.set(item.family.toLowerCase(), url.replace(/^http:/, "https:"));
      }
    }
    console.log(`got ${map.size} fonts ✓\n`);
  } catch (err: any) {
    console.log(`FAILED (${err?.message}) — will use DB fileUrls\n`);
  }

  return map;
}

async function run() {
  console.log("\n╔════════════════════════════════════════════════════════╗");
  console.log("║        ukfont — Font Geometry Analyzer                ║");
  console.log("╚════════════════════════════════════════════════════════╝\n");

  // ── Build real URL map from Google Fonts API ──────────────────────────────
  const gfUrlMap = await buildGoogleFontsUrlMap();

  // ── Build DB query ────────────────────────────────────────────────────────
  let baseQuery = db.select({
    id:       fonts.id,
    name:     fonts.name,
    family:   fonts.family,
    fileUrl:  fonts.fileUrl,
    xHeight:  fonts.xHeight,
    contrast: fonts.contrast,
    width:    fonts.width,
  }).from(fonts).$dynamic();

  if (singleId) {
    baseQuery = baseQuery.where(eq(fonts.id, singleId));
  } else if (!force) {
    baseQuery = baseQuery.where(
      or(isNull(fonts.xHeight), isNull(fonts.contrast), eq(fonts.xHeight, "Medium"))
    );
  }

  const rows = await baseQuery;
  const toProcess = limit > 0 ? rows.slice(0, limit) : rows;

  console.log(`  Fonts to analyze : ${rows.length}`);
  console.log(`  Will process     : ${toProcess.length}${limit ? `  (--limit ${limit})` : ""}`);
  if (dryRun) console.log("  Mode             : DRY RUN — no database writes");
  if (force)  console.log("  Mode             : FORCE — re-analyzing all");
  console.log("");

  // ── Table header ──────────────────────────────────────────────────────────
  console.log(
    pad("#",         6) + pad("Font Name",    28) +
    pad("x-Height", 16) + pad("Contrast",    15) +
    pad("Width",    18) + pad("Case",        10) +
    pad("a-story",  10) + pad("g-story",      8) + "Status"
  );
  console.log("─".repeat(111));

  let ok = 0, failed = 0, skipped = 0;
  const errors: { name: string; msg: string }[] = [];

  for (let i = 0; i < toProcess.length; i++) {
    const row = toProcess[i];
    process.stdout.write(`${pad(`${i+1}/${toProcess.length}`, 6)}${pad(row.name, 28)}`);

    // ── Resolve the best download URL ─────────────────────────────────────
    // Priority: Google Fonts API direct .ttf > DB fileUrl
    const directUrl = gfUrlMap.get(row.family.toLowerCase()) || row.fileUrl;

    // Skip obviously bad URLs (HTML zip pages)
    const looksLikeFontFile = directUrl.match(/\.(ttf|otf|woff2?)/i) ||
                              directUrl.includes("gstatic.com");

    if (!looksLikeFontFile) {
      console.log(`${"".padEnd(55)}⚠  SKIP — no direct font URL available`);
      skipped++;
      continue;
    }

    try {
      const tags = await analyzeFontUrl(directUrl);

      if (!tags) {
        console.log(`${"".padEnd(55)}⚠  SKIP — download/parse failed`);
        skipped++;
        continue;
      }

      const { xHeight, contrast, width, caps, aStory, gStory, raw } = tags;

      console.log(
        pad(`${xHeight}(${raw.xHeightRatio.toFixed(2)})`,    16) +
        pad(`${contrast}(${raw.contrastRatio.toFixed(1)}x)`, 15) +
        pad(`${width}(${raw.widthRatio.toFixed(2)})`,        18) +
        pad(caps,                                            10) +
        pad(`${aStory}-a`,                                   10) +
        pad(`${gStory}-g`,                                    8) + "✓"
      );

      // Also update the fileUrl in DB to the direct .ttf URL for future use
      if (!dryRun) {
        await db.update(fonts)
          .set({ xHeight, contrast, width, caps, aStory, gStory, fileUrl: directUrl })
          .where(eq(fonts.id, row.id));
      } else {
        console.log(`${" ".repeat(6)}  → URL: ${directUrl.slice(0, 80)}`);
      }

      ok++;
    } catch (err: any) {
      const msg = String(err?.message ?? err).slice(0, 55);
      console.log(`${"".padEnd(55)}✗  ${msg}`);
      errors.push({ name: row.name, msg });
      failed++;
    }

    // Polite delay — avoid hammering CDN
    await new Promise(r => setTimeout(r, 80));
  }

  // ── Summary ───────────────────────────────────────────────────────────────
  console.log("\n" + "═".repeat(111));
  console.log(`\n  ✅  Done!`);
  console.log(`      Analyzed : ${ok}`);
  console.log(`      Skipped  : ${skipped}  (no direct URL / parse failed)`);
  console.log(`      Errors   : ${failed}`);
  console.log(`      Total    : ${toProcess.length}`);
  if (errors.length > 0) {
    console.log("\n  Failed fonts:");
    errors.forEach(e => console.log(`    • ${e.name}: ${e.msg}`));
  }
  if (ok > 0 && !dryRun) {
    console.log(`\n  💾  DB updated — filters will now use real geometry data!`);
  }
  console.log("");
  process.exit(0);
}

run().catch(err => {
  console.error("\n  Fatal error:", err);
  process.exit(1);
});
