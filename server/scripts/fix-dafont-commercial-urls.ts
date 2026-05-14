/**
 * Backfill commercialUrl for DaFont personal-use fonts: author homepage / shop when found.
 *
 *   node --env-file=.env --import tsx/esm server/scripts/fix-dafont-commercial-urls.ts
 *   node --env-file=.env --import tsx/esm server/scripts/fix-dafont-commercial-urls.ts --limit=50 --dry-run
 */

import { db } from "../db.js";
import { fonts } from "@shared/schema.js";
import { and, eq, like, or, ilike, isNull } from "drizzle-orm";
import { resolveDafontCommercialUrl } from "../dafont-commercial-url.js";

function delay(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function dafontDetailFromExternalId(externalId: string | null | undefined): string | null {
  const id = (externalId || "").trim();
  if (!id) return null;
  return `https://www.dafont.com/${id}.font`;
}

export type FixCommercialOptions = { limit?: number; dryRun?: boolean };

export async function runFixDafontCommercialUrls(options: FixCommercialOptions = {}) {
  const { limit = Infinity, dryRun = false } = options;

  const rows = await db
    .select({
      id: fonts.id,
      externalId: fonts.externalId,
      commercialUrl: fonts.commercialUrl,
      fileUrl: fonts.fileUrl,
    })
    .from(fonts)
    .where(
      and(
        or(eq(fonts.sourceType, "dafont"), like(fonts.fileUrl, "%dafont.com%")),
        or(eq(fonts.licenseType, "personal"), ilike(fonts.license, "%personal%")),
        or(
          like(fonts.commercialUrl, "%dafont.com%"),
          and(
            or(isNull(fonts.commercialUrl), eq(fonts.commercialUrl, "")),
            like(fonts.fileUrl, "%dafont.com%"),
          ),
        ),
      ),
    );

  const todo = Number.isFinite(limit) ? rows.slice(0, limit) : rows;
  console.log(`[fix-dafont-commercial] candidates: ${rows.length}, processing: ${todo.length}, dryRun=${dryRun}`);

  let updated = 0;
  let skipped = 0;
  let failed = 0;

  for (const row of todo) {
    const detailUrl =
      row.commercialUrl && row.commercialUrl.includes("dafont.com") && row.commercialUrl.includes(".font")
        ? row.commercialUrl.split("?")[0]
        : dafontDetailFromExternalId(row.externalId);
    if (!detailUrl) {
      skipped++;
      continue;
    }

    try {
      const resolved = await resolveDafontCommercialUrl(detailUrl);
      if (!resolved || resolved.includes("dafont.com")) {
        skipped++;
        await delay(600);
        continue;
      }
      if (!dryRun) {
        await db.update(fonts).set({ commercialUrl: resolved }).where(eq(fonts.id, row.id));
      }
      updated++;
      console.log(`[fix-dafont-commercial] id=${row.id} -> ${resolved}`);
    } catch (e: any) {
      failed++;
      console.warn(`[fix-dafont-commercial] id=${row.id} error:`, e?.message || e);
    }
    await delay(800);
  }

  console.log(`[fix-dafont-commercial] done: updated=${updated} skipped=${skipped} failed=${failed}`);
}

const args = process.argv.slice(2);
const limitArg = args.find((a) => a.startsWith("--limit="));
const limit = limitArg ? parseInt(limitArg.split("=")[1], 10) : Infinity;
const dryRun = args.includes("--dry-run");
const isMain = process.argv[1]?.includes("fix-dafont-commercial-urls");

if (isMain) {
  runFixDafontCommercialUrls({ limit, dryRun })
    .then(() => process.exit(0))
    .catch((e) => {
      console.error(e);
      process.exit(1);
    });
}
