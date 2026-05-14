/**
 * Run all commercial-URL backfills (1001fonts, DaFont, FontSpace).
 * Google / Fontsource / Font Squirrel ingests are normally commercial-free — nothing to fix.
 *
 *   node --env-file=.env --import tsx/esm server/scripts/fix-all-commercial-urls.ts
 *   node --env-file=.env --import tsx/esm server/scripts/fix-all-commercial-urls.ts --limit=100 --dry-run
 *
 * `--limit` applies per source (each pipeline processes at most N rows).
 */

import { runFix1001CommercialUrls } from "./fix-1001-commercial-urls.js";
import { runFixDafontCommercialUrls } from "./fix-dafont-commercial-urls.js";
import { runFixFontspaceCommercialUrls } from "./fix-fontspace-commercial-urls.js";

const args = process.argv.slice(2);
const limitArg = args.find((a) => a.startsWith("--limit="));
const limit = limitArg ? parseInt(limitArg.split("=")[1], 10) : Infinity;
const dryRun = args.includes("--dry-run");

async function main() {
  const opts = { limit, dryRun };
  console.log("\n########## 1001fonts ##########\n");
  await runFix1001CommercialUrls(opts);
  console.log("\n########## DaFont ##########\n");
  await runFixDafontCommercialUrls(opts);
  console.log("\n########## FontSpace ##########\n");
  await runFixFontspaceCommercialUrls(opts);
  console.log("\n[fix-all-commercial] finished all sources.\n");
}

main().then(() => process.exit(0)).catch((e) => {
  console.error(e);
  process.exit(1);
});
