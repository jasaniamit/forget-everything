/** Shared helpers for resolving designer "buy / homepage" URLs from scraper sites. */

export const SCRAPE_FETCH_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
} as const;

const SOCIAL_OR_BLOCKED =
  /(facebook\.com|twitter\.com|instagram\.com|youtube\.com|youtu\.be|behance\.net|pinterest\.com|linkedin\.com|dribbble\.com|tiktok\.com|snapchat\.com|doubleclick\.net|googlesyndication\.com|paypal\.com|patreon\.com|ko-fi\.com)/i;

export function hostLooksBlocked(hostname: string, extraBlocked?: RegExp): boolean {
  const h = hostname.replace(/^www\./i, "").toLowerCase();
  if (h === "x.com") return true;
  if (extraBlocked?.test(h)) return true;
  return SOCIAL_OR_BLOCKED.test(h);
}

export async function fetchHtml(url: string, timeoutMs = 25000): Promise<string | null> {
  try {
    const r = await fetch(url, {
      headers: SCRAPE_FETCH_HEADERS,
      signal: AbortSignal.timeout(timeoutMs),
      redirect: "follow",
    });
    if (!r.ok) return null;
    return await r.text();
  } catch {
    return null;
  }
}

/** First external https URL from href=... in HTML, excluding blocked hosts. */
export function firstExternalHref(
  html: string,
  opts: { extraDomainBlock?: RegExp } = {},
): string | null {
  const urls: string[] = [];
  for (const re of [/href=["'](https?:\/\/[^"']+)["']/gi, /href=(https?:\/\/[^>\s]+)/gi]) {
    let m: RegExpExecArray | null;
    re.lastIndex = 0;
    while ((m = re.exec(html)) !== null) {
      const u = m[1].replace(/&amp;/g, "&");
      if (urls.includes(u)) continue;
      urls.push(u);
    }
  }
  for (const raw of urls) {
    try {
      const url = new URL(raw);
      if (hostLooksBlocked(url.hostname, opts.extraDomainBlock)) continue;
      return raw.replace(/\/$/, "");
    } catch {
      continue;
    }
  }
  return null;
}