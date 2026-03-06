/**
 * fix-weights.ts — Re-tag weight column with real variant names from Google Fonts API
 *
 * The old ingestion stored weight as buckets: ["Light","Regular","Bold"]
 * The correct format is: ["Thin","Extra Light","Light","Regular","Medium","Semibold","Bold","Extra Bold","Black"]
 *
 * This script fetches the Google Fonts API, gets the real variant list for each font,
 * converts to proper weight labels, and updates the DB.
 *
 * Usage:
 *   node --env-file=.env --import tsx/esm server/scripts/fix-weights.ts
 *   node --env-file=.env --import tsx/esm server/scripts/fix-weights.ts --dry
 */

import { db } from "../db";
import { fonts } from "@shared/schema";
import { eq } from "drizzle-orm";
import axios from "axios";

const dryRun = process.argv.includes("--dry");

// Industry-standard CSS weight → label (matches your reference image exactly)
const WEIGHT_LABEL: Record<string, string> = {
  "100": "Thin",
  "200": "Extra Light",
  "300": "Light",
  "400": "Regular",
  "regular": "Regular",
  "500": "Medium",
  "600": "Semibold",
  "700": "Bold",
  "800": "Extra Bold",
  "900": "Black",
};

const WEIGHT_ORDER = ["Thin","Extra Light","Light","Regular","Medium","Semibold","Bold","Extra Bold","Black"];

function variantsToWeightLabels(variants: string[]): string {
  const labels = new Set<string>();
  for (const v of variants) {
    const num = v.replace("italic","").trim() || "regular";
    const label = WEIGHT_LABEL[num];
    if (label) labels.add(label);
  }
  if (labels.size === 0) labels.add("Regular");
  // Return in order 100→900
  const sorted = WEIGHT_ORDER.filter(l => labels.has(l));
  return JSON.stringify(sorted);
}

// Detect if a weight value is in old bucket format ["Light","Regular","Bold"]
function isOldBucketFormat(weight: string | null): boolean {
  if (!weight) return true;
  try {
    const arr = JSON.parse(weight);
    if (!Array.isArray(arr)) return true;
    // Old format only has buckets: Light, Regular, Bold
    // New format has actual names: Thin, Extra Light, Medium, Semibold, Black etc.
    const buckets = new Set(["Light","Regular","Bold"]);
    const hasOnlyBuckets = arr.every((v: string) => buckets.has(v));
    return hasOnlyBuckets;
  } catch { return true; }
}

async function run() {
  console.log("\n╔════════════════════════════════════════════════════╗");
  console.log("║       ukfont — Weight Column Fixer                ║");
  console.log("╚════════════════════════════════════════════════════╝\n");

  if (dryRun) console.log("  DRY RUN — no DB writes\n");

  const apiKey = process.env.GOOGLE_FONTS_API_KEY;
  if (!apiKey) {
    console.error("  ✗ GOOGLE_FONTS_API_KEY not set in .env");
    process.exit(1);
  }

  // ── Fetch Google Fonts API ─────────────────────────────────────────────
  process.stdout.write("  Fetching Google Fonts API… ");
  const resp = await axios.get(
    `https://www.googleapis.com/webfonts/v1/webfonts?key=${apiKey}&sort=popularity`,
    { timeout: 20000 }
  );
  const gfItems: any[] = resp.data.items ?? [];
  console.log(`got ${gfItems.length} fonts ✓\n`);

  // Build map: family name (lowercase) → { variants, familySize }
  const gfMap = new Map<string, { variants: string[]; familySize: number }>();
  for (const item of gfItems) {
    gfMap.set(item.family.toLowerCase(), {
      variants: item.variants ?? ["regular"],
      familySize: (item.variants ?? ["regular"]).length,
    });
  }

  // ── Get all fonts from DB ──────────────────────────────────────────────
  const allFonts = await db.select({
    id: fonts.id,
    name: fonts.name,
    family: fonts.family,
    weight: fonts.weight,
    familySize: fonts.familySize,
  }).from(fonts);

  console.log(`  Total fonts in DB: ${allFonts.length}`);

  const needsFix = allFonts.filter(f => isOldBucketFormat(f.weight));
  const alreadyGood = allFonts.length - needsFix.length;
  console.log(`  Already correct  : ${alreadyGood}`);
  console.log(`  Need fixing      : ${needsFix.length}\n`);

  const pad = (s: string | number, n: number) => String(s).padEnd(n).slice(0, n);

  // Header
  console.log(pad("#", 6) + pad("Font", 30) + pad("Old weight", 25) + pad("New weight", 60) + "Styles");
  console.log("─".repeat(121));

  let updated = 0, skipped = 0;

  for (let i = 0; i < needsFix.length; i++) {
    const font = needsFix[i];
    const key = font.family.toLowerCase();
    const gf = gfMap.get(key);

    if (!gf) {
      console.log(pad(`${i+1}/${needsFix.length}`, 6) + pad(font.name, 30) + pad(String(font.weight), 25) + "⚠ not in Google Fonts API");
      skipped++;
      continue;
    }

    const newWeight = variantsToWeightLabels(gf.variants);
    const oldWeight = font.weight ?? "null";

    console.log(
      pad(`${i+1}/${needsFix.length}`, 6) +
      pad(font.name, 30) +
      pad(oldWeight.slice(0, 23), 25) +
      pad(newWeight.slice(0, 58), 60) +
      gf.familySize
    );

    if (!dryRun) {
      await db.update(fonts)
        .set({ weight: newWeight, familySize: gf.familySize })
        .where(eq(fonts.id, font.id));
    }
    updated++;
  }

  console.log("\n" + "═".repeat(121));
  console.log(`\n  ✅  Done!`);
  console.log(`      Fixed   : ${updated}`);
  console.log(`      Skipped : ${skipped}  (not in Google Fonts API)`);
  console.log(`      Already correct: ${alreadyGood}`);
  if (!dryRun && updated > 0) {
    console.log(`\n  💾  Weight column updated with real variant names!`);
    console.log(`      The Bold filter will now correctly match Semibold/Bold/Extra Bold/Black fonts.`);
  }
  console.log("");
  process.exit(0);
}

run().catch(err => {
  console.error("\n  Fatal:", err);
  process.exit(1);
});
