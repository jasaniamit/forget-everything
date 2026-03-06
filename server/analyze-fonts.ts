/**
 * analyze-fonts.ts  —  Standalone CLI script
 *
 * Run:  npx tsx server/scripts/analyze-fonts.ts
 *  or:  npx tsx server/scripts/analyze-fonts.ts --limit 100
 *  or:  npx tsx server/scripts/analyze-fonts.ts --id 42
 *
 * Downloads each font file, runs geometric analysis, and updates the DB.
 * Shows a live progress table in the terminal.
 * Safe to re-run — skips fonts that already have geometry data (unless --force).
 */

import { db } from "../db";
import { fonts } from "@shared/schema";
import { eq, isNull, or, and } from "drizzle-orm";
import { analyzeFontUrl } from "../font-geometry-analyzer";

const args = process.argv.slice(2);
const limit = parseInt(args[args.indexOf("--limit") + 1] ?? "0") || 0;
const singleId = parseInt(args[args.indexOf("--id") + 1] ?? "0") || 0;
const force = args.includes("--force");
const dryRun = args.includes("--dry");

async function run() {
  console.log("\n╔══════════════════════════════════════════════════════╗");
  console.log("║       ukfont — Font Geometry Analyzer               ║");
  console.log("╚══════════════════════════════════════════════════════╝\n");

  // Build query
  let query = db.select({
    id: fonts.id,
    name: fonts.name,
    family: fonts.family,
    fileUrl: fonts.fileUrl,
    xHeight: fonts.xHeight,
    contrast: fonts.contrast,
    width: fonts.width,
  }).from(fonts) as any;

  if (singleId) {
    query = query.where(eq(fonts.id, singleId));
  } else if (!force) {
    // Only process fonts where geometry properties are null or default "Medium"
    // (skip ones already properly analyzed)
    query = query.where(
      or(
        isNull(fonts.xHeight),
        isNull(fonts.contrast),
        eq(fonts.xHeight, "Medium"),
      )
    );
  }

  const rows = await query;
  const toProcess = limit ? rows.slice(0, limit) : rows;

  console.log(`Found ${rows.length} fonts to analyze${limit ? ` (limited to ${limit})` : ""}.`);
  if (dryRun) console.log("DRY RUN — no DB updates will be made.\n");
  console.log("");

  let ok = 0, failed = 0, skipped = 0;
  const errors: string[] = [];

  const pad = (s: string, n: number) => s.padEnd(n).slice(0, n);

  // Header
  console.log(
    pad("#", 5) + pad("Font", 32) + pad("xH", 9) + pad("Ctr", 9) +
    pad("Wid", 12) + pad("Caps", 8) + pad("a", 8) + pad("g", 8) + "Status"
  );
  console.log("─".repeat(100));

  for (let i = 0; i < toProcess.length; i++) {
    const row = toProcess[i];
    const n = `${i + 1}/${toProcess.length}`;

    process.stdout.write(`${pad(n, 5)}${pad(row.name, 32)}`);

    try {
      const tags = await analyzeFontUrl(row.fileUrl);

      if (!tags) {
        console.log(`${"".padEnd(48)}⚠ SKIP (download/parse failed)`);
        skipped++;
        continue;
      }

      const { xHeight, contrast, width, caps, aStory, gStory, raw } = tags;

      // Show raw numbers alongside labels for transparency
      const xhStr = `${xHeight}(${raw.xHeightRatio.toFixed(2)})`;
      const ctrStr = `${contrast}(${raw.contrastRatio.toFixed(1)}x)`;
      const widStr = `${width}(${raw.widthRatio.toFixed(2)})`;

      console.log(
        pad(xhStr, 9) + pad(ctrStr, 9) +
        pad(widStr, 12) + pad(caps, 8) +
        pad(aStory + "-a", 8) + pad(gStory + "-g", 8) + "✓"
      );

      if (!dryRun) {
        await db.update(fonts).set({
          xHeight,
          contrast,
          width,
          caps,
          aStory,
          gStory,
        }).where(eq(fonts.id, row.id));
      }

      ok++;
    } catch (err: any) {
      console.log(`${"".padEnd(48)}✗ ERROR: ${err?.message?.slice(0, 40)}`);
      errors.push(`${row.name}: ${err?.message}`);
      failed++;
    }

    // Small delay to avoid hammering Google Fonts CDN
    await new Promise(r => setTimeout(r, 80));
  }

  // Summary
  console.log("\n" + "═".repeat(100));
  console.log(`\n✅ Done!  Analyzed: ${ok}  |  Skipped: ${skipped}  |  Failed: ${failed}`);
  if (errors.length > 0) {
    console.log("\nErrors:");
    errors.forEach(e => console.log(`  • ${e}`));
  }
  console.log("");

  process.exit(0);
}

run().catch(err => {
  console.error("Fatal:", err);
  process.exit(1);
});
