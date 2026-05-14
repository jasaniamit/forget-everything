/**
 * Backfill commercialUrl for 1001fonts personal-use rows: replace listing pages
 * with designer shop / product URLs when resolvable.
 *
 *   node --env-file=.env --import tsx/esm server/scripts/fix-1001-commercial-urls.ts
 *   node --env-file=.env --import tsx/esm server/scripts/fix-1001-commercial-urls.ts --limit=50
 *   node --env-file=.env --import tsx/esm server/scripts/fix-1001-commercial-urls.ts --dry-run
 */

import { db } from "../db.js";
import { fonts } from "@shared/schema.js";
import { and, eq, like, or, ilike, isNull } from "drizzle-orm";
import { resolve1001FontsCommercialUrl, hundredOneFontDetailUrl } from "../1001fonts-commercial-url.js";

function slugFromStoredUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  const m = url.match(/1001fonts\.com\/([a-z0-9-]+)-font\.html/i);
  return m ? m[1].toLowerCase() : null;
}

function slugFromDownloadUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  const m = url.match(/1001fonts\.com\/download\/([a-z0-9-]+)\.zip/i);
  return m ? m[1].toLowerCase() : null;
}

function delay(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

export type FixCommercialOptions = { limit?: number; dryRun?: boolean };

export async function runFix1001CommercialUrls(options: FixCommercialOptions = {}) {
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
        or(eq(fonts.sourceType, "1001fonts"), like(fonts.fileUrl, "%1001fonts.com%")),
        or(eq(fonts.licenseType, "personal"), ilike(fonts.license, "%personal%")),
        or(
          like(fonts.commercialUrl, "%1001fonts.com%"),
          and(
            or(isNull(fonts.commercialUrl), eq(fonts.commercialUrl, "")),
            like(fonts.fileUrl, "%1001fonts.com%"),
          ),
        ),
      ),
    );

  const todo = Number.isFinite(limit) ? rows.slice(0, limit) : rows;
  console.log(`[fix-1001-commercial] candidates: ${rows.length}, processing: ${todo.length}, dryRun=${dryRun}`);

  let updated = 0;
  let skipped = 0;
  let failed = 0;

  for (const row of todo) {
    const slug = (
      row.externalId ||
      slugFromStoredUrl(row.commercialUrl || undefined) ||
      slugFromDownloadUrl(row.fileUrl || undefined) ||
      ""
    ).trim();
    if (!slug) {
      skipped++;
      continue;
    }

    const detailUrl =
      row.commercialUrl &&
      row.commercialUrl.includes("1001fonts.com") &&
      row.commercialUrl.includes("-font.html")
        ? row.commercialUrl
        : hundredOneFontDetailUrl(slug);

    try {
      const resolved = await resolve1001FontsCommercialUrl({ slug, detailUrl });
      if (!resolved || resolved.includes("1001fonts.com")) {
        skipped++;
        await delay(400);
        continue;
      }
      if (!dryRun) {
        await db.update(fonts).set({ commercialUrl: resolved }).where(eq(fonts.id, row.id));
      }
      updated++;
      console.log(`[fix-1001-commercial] id=${row.id} slug=${slug} -> ${resolved}`);
    } catch (e: any) {
      failed++;
      console.warn(`[fix-1001-commercial] id=${row.id} slug=${slug} error:`, e?.message || e);
    }
    await delay(500);
  }

  console.log(`[fix-1001-commercial] done: updated=${updated} skipped=${skipped} failed=${failed}`);
}

const args = process.argv.slice(2);
const limitArg = args.find((a) => a.startsWith("--limit="));
const limit = limitArg ? parseInt(limitArg.split("=")[1], 10) : Infinity;
const dryRun = args.includes("--dry-run");
const isMain = process.argv[1]?.includes("fix-1001-commercial-urls");

if (isMain) {
  runFix1001CommercialUrls({ limit, dryRun })
    .then(() => process.exit(0))
    .catch((e) => {
      console.error(e);
      process.exit(1);
    });
}
