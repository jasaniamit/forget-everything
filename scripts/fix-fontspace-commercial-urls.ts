/**
 * Backfill commercialUrl for FontSpace personal-use fonts: designer external site when found.
 *
 *   node --env-file=.env --import tsx/esm server/scripts/fix-fontspace-commercial-urls.ts
 *   node --env-file=.env --import tsx/esm server/scripts/fix-fontspace-commercial-urls.ts --limit=50 --dry-run
 */

import { db } from "../db.js";
import { fonts } from "@shared/schema.js";
import { and, eq, like, or, ilike, isNull } from "drizzle-orm";
import { resolveFontspaceCommercialUrl, fontspaceFontPageUrl } from "../fontspace-commercial-url.js";

function delay(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

export type FixCommercialOptions = { limit?: number; dryRun?: boolean };

export async function runFixFontspaceCommercialUrls(options: FixCommercialOptions = {}) {
  const { limit = Infinity, dryRun = false } = options;

  const rows = await db
    .select({
      id: fonts.id,
      commercialUrl: fonts.commercialUrl,
      fileUrl: fonts.fileUrl,
    })
    .from(fonts)
    .where(
      and(
        or(
          eq(fonts.sourceType, "fontspace"),
          like(fonts.fileUrl, "%fontspace.com%"),
          like(fonts.commercialUrl, "%fontspace.com%"),
        ),
        or(eq(fonts.licenseType, "personal"), ilike(fonts.license, "%personal%")),
        or(
          like(fonts.commercialUrl, "%fontspace.com%"),
          and(
            or(isNull(fonts.commercialUrl), eq(fonts.commercialUrl, "")),
            like(fonts.fileUrl, "%fontspace.com%"),
          ),
        ),
      ),
    );

  const todo = Number.isFinite(limit) ? rows.slice(0, limit) : rows;
  console.log(`[fix-fontspace-commercial] candidates: ${rows.length}, processing: ${todo.length}, dryRun=${dryRun}`);

  let updated = 0;
  let skipped = 0;
  let failed = 0;

  for (const row of todo) {
    const pageUrl = fontspaceFontPageUrl(row.fileUrl, row.commercialUrl);
    if (!pageUrl) {
      skipped++;
      continue;
    }

    try {
      const resolved = await resolveFontspaceCommercialUrl(pageUrl);
      if (!resolved || /fontspace\.com/i.test(resolved)) {
        skipped++;
        await delay(600);
        continue;
      }
      if (!dryRun) {
        await db.update(fonts).set({ commercialUrl: resolved }).where(eq(fonts.id, row.id));
      }
      updated++;
      console.log(`[fix-fontspace-commercial] id=${row.id} -> ${resolved}`);
    } catch (e: any) {
      failed++;
      console.warn(`[fix-fontspace-commercial] id=${row.id} error:`, e?.message || e);
    }
    await delay(800);
  }

  console.log(`[fix-fontspace-commercial] done: updated=${updated} skipped=${skipped} failed=${failed}`);
}

const args = process.argv.slice(2);
const limitArg = args.find((a) => a.startsWith("--limit="));
const limit = limitArg ? parseInt(limitArg.split("=")[1], 10) : Infinity;
const dryRun = args.includes("--dry-run");
const isMain = process.argv[1]?.includes("fix-fontspace-commercial-urls");

if (isMain) {
  runFixFontspaceCommercialUrls({ limit, dryRun })
    .then(() => process.exit(0))
    .catch((e) => {
      console.error(e);
      process.exit(1);
    });
}
