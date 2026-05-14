/**
 * Resolve a better commercial/homepage URL for DaFont personal-use fonts.
 * Fetches the font page → author profile (.d123.htm) → first external link.
 */

import { fetchHtml, firstExternalHref } from "./commercial-url-shared.js";

const DAFONT_HOST = /dafont\.com$/i;

function normalizeAuthorUrl(pathOrUrl: string): string {
  const p = pathOrUrl.replace(/^\.\//, "").trim();
  if (p.startsWith("http")) return p;
  return `https://www.dafont.com/${p.replace(/^\//, "")}`;
}

/** DaFont author pages use names like author-name.d12345.htm */
export function extractDafontAuthorPageFromFontHtml(html: string): string | null {
  const byMatch = html.match(
    /href="(?:https?:\/\/(?:www\.)?dafont\.com\/)?([a-z0-9_.-]+\.d\d+\.htm)"/i,
  );
  if (byMatch) return normalizeAuthorUrl(byMatch[1]);

  const all: string[] = [];
  const re = /href="(?:https?:\/\/(?:www\.)?dafont\.com\/)?([a-z0-9_.-]+\.d\d+\.htm)"/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    all.push(m[1]);
  }
  if (all.length === 0) return null;
  return normalizeAuthorUrl(all[0]);
}

export async function resolveDafontCommercialUrl(fontDetailUrl: string): Promise<string | undefined> {
  const html = await fetchHtml(fontDetailUrl);
  if (!html) return undefined;

  const authorUrl = extractDafontAuthorPageFromFontHtml(html);
  if (!authorUrl) return undefined;

  const authorHtml = await fetchHtml(authorUrl);
  if (!authorHtml) return undefined;

  const external = firstExternalHref(authorHtml, { extraDomainBlock: DAFONT_HOST });
  if (!external || DAFONT_HOST.test(new URL(external).hostname)) return undefined;

  return external;
}