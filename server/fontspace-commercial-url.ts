/**
 * Resolve a better commercial/homepage URL for FontSpace personal-use fonts.
 * Font page → /designer/... profile → first external link (not fontspace/social).
 */

import { fetchHtml, firstExternalHref } from "./commercial-url-shared.js";

const FONTSPACE_BASE = "https://www.fontspace.com";
const FS_HOST = /fontspace\.com$/i;

export function fontspaceFontPageUrl(fileUrl: string | null, commercialUrl: string | null): string | null {
  const raw = commercialUrl?.includes("fontspace.com")
    ? commercialUrl
    : fileUrl?.includes("fontspace.com")
      ? fileUrl.replace(/\/download\/?$/i, "")
      : null;
  if (!raw) return null;
  const u = raw.split("?")[0].replace(/\/$/, "");
  if (u.endsWith("/download")) return u.replace(/\/download$/i, "");
  return u;
}

export function extractFontspaceDesignerPath(html: string): string | null {
  const m = html.match(/href="(\/designer\/[a-z0-9-]+)"/i);
  return m ? m[1] : null;
}

export async function resolveFontspaceCommercialUrl(fontPageUrl: string): Promise<string | undefined> {
  const html = await fetchHtml(fontPageUrl);
  if (!html) return undefined;

  const path = extractFontspaceDesignerPath(html);
  if (!path) return undefined;

  const designerUrl = `${FONTSPACE_BASE}${path}`;
  const designerHtml = await fetchHtml(designerUrl);
  if (!designerHtml) return undefined;

  const external = firstExternalHref(designerHtml, { extraDomainBlock: FS_HOST });
  if (!external || FS_HOST.test(new URL(external).hostname)) return undefined;

  return external;
}