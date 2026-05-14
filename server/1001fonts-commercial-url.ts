/**
 * Resolve a "buy commercial" URL for 1001fonts personal-use fonts.
 * Listing/detail pages on 1001fonts are not the foundry shop; designer profiles
 * often link to a real store (e.g. enxyclo.com) where /product/{slug}/ works.
 */

const SITE_BASE = "https://www.1001fonts.com";

const FETCH_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
  Accept: "text/html,application/xhtml+xml",
} as const;

const SOCIAL_OR_BLOCKED =
  /(facebook\.com|twitter\.com|instagram\.com|youtube\.com|youtu\.be|behance\.net|pinterest\.com|linkedin\.com|dribbble\.com|tiktok\.com|snapchat\.com|1001fonts\.com|doubleclick\.net|googlesyndication\.com)/i;

function hostLooksBlocked(hostname: string): boolean {
  const h = hostname.replace(/^www\./i, "").toLowerCase();
  if (h === "x.com") return true;
  return SOCIAL_OR_BLOCKED.test(h);
}

export function hundredOneFontDetailUrl(slug: string): string {
  return `${SITE_BASE}/${slug}-font.html`;
}

async function fetchHtml(url: string): Promise<string | null> {
  try {
    const r = await fetch(url, {
      headers: FETCH_HEADERS,
      signal: AbortSignal.timeout(25000),
      redirect: "follow",
    });
    if (!r.ok) return null;
    return await r.text();
  } catch {
    return null;
  }
}

function firstDesignerUserPath(html: string): string | null {
  const m = html.match(/\/users\/([a-z0-9-]+)/i);
  return m ? `/users/${m[1].toLowerCase()}` : null;
}

/** Primary website link from the designer profile (globe icon row). */
function extractFoundryHomepageFromUserPage(userPageHtml: string): string | null {
  const ul = userPageHtml.match(/<ul[^>]*\buser-links\b[^>]*>([\s\S]*?)<\/ul>/i);
  if (!ul) return null;
  const block = ul[1];
  const rawUrls: string[] = [];
  const seen = new Set<string>();
  for (const re of [/href=["'](https?:\/\/[^"']+)["']/gi, /href=(https?:\/\/[^>\s]+)/gi]) {
    let m: RegExpExecArray | null;
    re.lastIndex = 0;
    while ((m = re.exec(block)) !== null) {
      const u = m[1].replace(/&amp;/g, "&");
      if (seen.has(u)) continue;
      seen.add(u);
      rawUrls.push(u);
    }
  }
  for (const raw of rawUrls) {
    try {
      const u = new URL(raw);
      if (hostLooksBlocked(u.hostname)) continue;
      return raw.replace(/\/$/, "");
    } catch {
      continue;
    }
  }
  return null;
}

async function urlExists(url: string): Promise<boolean> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 18000);
  try {
    let r = await fetch(url, {
      method: "HEAD",
      signal: ctrl.signal,
      redirect: "follow",
      headers: FETCH_HEADERS,
    });
    if (r.status === 405 || r.status === 403) {
      r = await fetch(url, {
        method: "GET",
        signal: ctrl.signal,
        redirect: "follow",
        headers: FETCH_HEADERS,
      });
    }
    return r.ok;
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}

/** Try common WooCommerce / shop URL patterns; fall back to foundry homepage. */
async function bestProductOrHomeUrl(foundryBase: string, slug: string): Promise<string> {
  const base = foundryBase.replace(/\/$/, "");
  const candidates = [
    `${base}/product/${slug}/`,
    `${base}/product/${slug}`,
    `${base}/shop/${slug}/`,
  ];
  for (const u of candidates) {
    if (await urlExists(u)) return u;
  }
  return foundryBase;
}

export type Resolve1001CommercialParams = {
  slug: string;
  /** Full 1001fonts font page; default `${SITE_BASE}/${slug}-font.html` */
  detailUrl?: string;
};

/**
 * Returns a foundry shop URL (ideally product page), or undefined if resolution fails.
 */
export async function resolve1001FontsCommercialUrl(
  params: Resolve1001CommercialParams,
): Promise<string | undefined> {
  const detailUrl = params.detailUrl ?? hundredOneFontDetailUrl(params.slug);
  const detailHtml = await fetchHtml(detailUrl);
  if (!detailHtml) return undefined;

  const userPath = firstDesignerUserPath(detailHtml);
  if (!userPath) return undefined;

  const profileUrl = `${SITE_BASE}${userPath.endsWith("/") ? userPath.slice(0, -1) : userPath}/`;
  const userHtml = await fetchHtml(profileUrl);
  if (!userHtml) return undefined;

  const home = extractFoundryHomepageFromUserPage(userHtml);
  if (!home) return undefined;

  return bestProductOrHomeUrl(home, params.slug);
}