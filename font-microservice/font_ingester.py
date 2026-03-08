#!/usr/bin/env python3
"""
font_ingester.py — Add fonts from open-source repositories to ukfont DB

Supports:
  1. Google Fonts (already done via API)
  2. Fontshare (ITF) — https://api.fontshare.com
  3. Open Font Library — https://fontlibrary.org/api
  4. Font Squirrel (scrape catalog page)
  5. GitHub OFL search — search GitHub for fonts with OFL license

Usage:
  python font_ingester.py --source fontshare
  python font_ingester.py --source github --query "display serif"
  python font_ingester.py --source openfontlibrary
  python font_ingester.py --list   # show what's available

Requirements:
  pip install requests psycopg2-binary python-dotenv
"""

import os
import sys
import json
import time
import argparse
import requests
import psycopg2
from dotenv import load_dotenv

load_dotenv()

DB_URL = os.environ.get("DATABASE_URL", "")


# ── Database helpers ───────────────────────────────────────────────────────────

def get_conn():
    return psycopg2.connect(DB_URL)


def font_exists(conn, name: str) -> bool:
    with conn.cursor() as cur:
        cur.execute("SELECT 1 FROM fonts WHERE lower(name) = lower(%s) LIMIT 1", (name,))
        return cur.fetchone() is not None


def insert_font(conn, font: dict) -> bool:
    """Insert a font record. Returns True if inserted, False if skipped."""
    if font_exists(conn, font["name"]):
        print(f"  SKIP  {font['name']} (already exists)")
        return False

    with conn.cursor() as cur:
        cur.execute("""
            INSERT INTO fonts (
                name, family, use_case, license, designer,
                file_url, description, weight, width, x_height,
                contrast, italics, family_size, subsets, download_count
            ) VALUES (
                %(name)s, %(family)s, %(use_case)s, %(license)s, %(designer)s,
                %(file_url)s, %(description)s, %(weight)s, %(width)s, %(x_height)s,
                %(contrast)s, %(italics)s, %(family_size)s, %(subsets)s, 0
            )
        """, {
            "name": font.get("name"),
            "family": font.get("family", font.get("name")),
            "use_case": font.get("use_case", "creative"),
            "license": font.get("license", "OFL"),
            "designer": font.get("designer", "Unknown"),
            "file_url": font.get("file_url", ""),
            "description": font.get("description", ""),
            "weight": font.get("weight", "Regular"),
            "width": font.get("width", "Normal"),
            "x_height": font.get("x_height"),
            "contrast": font.get("contrast"),
            "italics": font.get("italics", "No"),
            "family_size": font.get("family_size", 1),
            "subsets": json.dumps(font.get("subsets", ["latin"])),
        })
    conn.commit()
    print(f"  ADD   {font['name']} — {font.get('designer')} ({font.get('license', 'OFL')})")
    return True


# ── Source: Fontshare (ITF) ───────────────────────────────────────────────────

def ingest_fontshare(limit: int = 200) -> list[dict]:
    """
    Fontshare by Indian Type Foundry — 100+ high quality fonts, all OFL.
    API: https://api.fontshare.com/v2/fonts?page=1&perpage=50
    """
    print("\n[Fontshare] Fetching font catalog...")
    fonts = []
    page = 1

    while True:
        url = f"https://api.fontshare.com/v2/fonts?page={page}&perpage=50"
        try:
            r = requests.get(url, timeout=15)
            data = r.json()
        except Exception as e:
            print(f"  Error: {e}")
            break

        items = data.get("fonts", [])
        if not items:
            break

        for item in items:
            slug = item.get("slug", "")
            name = item.get("name", slug.replace("-", " ").title())
            family = item.get("family", {})
            family_name = family.get("name", name) if isinstance(family, dict) else name

            fonts.append({
                "name": name,
                "family": family_name,
                "use_case": json.dumps(["creative", "designer"]),
                "license": "OFL",
                "designer": item.get("foundry", {}).get("name", "Indian Type Foundry") if isinstance(item.get("foundry"), dict) else "Indian Type Foundry",
                "file_url": f"https://api.fontshare.com/v2/fonts/download/{slug}",
                "description": item.get("description", f"{name} is a free font from Indian Type Foundry (Fontshare), available under the Open Font License."),
                "family_size": len(item.get("fonts", [])) or 1,
                "subsets": ["latin"],
            })

            if len(fonts) >= limit:
                break

        print(f"  Page {page}: fetched {len(items)} fonts ({len(fonts)} total)")
        page += 1

        if len(fonts) >= limit or len(items) < 50:
            break

        time.sleep(0.5)

    return fonts


# ── Source: Open Font Library ─────────────────────────────────────────────────

def ingest_openfontlibrary(limit: int = 300) -> list[dict]:
    """
    Open Font Library — https://fontlibrary.org
    API: https://fontlibrary.org/api/font
    All fonts are OFL or similar open licenses.
    """
    print("\n[Open Font Library] Fetching font catalog...")
    fonts = []
    offset = 0
    batch = 50

    while len(fonts) < limit:
        url = f"https://fontlibrary.org/api/font?limit={batch}&offset={offset}"
        try:
            r = requests.get(url, timeout=20)
            data = r.json()
        except Exception as e:
            print(f"  Error at offset {offset}: {e}")
            break

        items = data.get("objects", [])
        if not items:
            break

        for item in items:
            name = item.get("name", "")
            if not name:
                continue
            license_name = item.get("license", "OFL")
            # Only include truly open fonts
            if any(x in license_name.upper() for x in ["OFL", "GPL", "APACHE", "MIT", "PUBLIC DOMAIN", "CC0"]):
                fonts.append({
                    "name": name,
                    "family": name,
                    "use_case": json.dumps(["creative"]),
                    "license": "OFL",
                    "designer": item.get("creator", "Unknown"),
                    "file_url": item.get("downloadUrl", "") or f"https://fontlibrary.org/face/{item.get('slug', '')}",
                    "description": item.get("description", "") or f"{name} is an open-source font available under {license_name}.",
                    "family_size": len(item.get("fonts", [])) or 1,
                    "subsets": ["latin"],
                })

        print(f"  Fetched {len(items)} items, offset {offset} ({len(fonts)} eligible)")
        offset += batch

        if len(items) < batch:
            break
        time.sleep(0.5)

    return fonts[:limit]


# ── Source: GitHub OFL Search ─────────────────────────────────────────────────

def ingest_github_ofl(query: str = "font", limit: int = 50) -> list[dict]:
    """
    Search GitHub for font repositories using the topic 'open-font-license'.
    This is the correct GitHub topic tag used by OFL font repos.

    Fix: 'license:ofl' is NOT a valid GitHub license filter.
    The correct approach is topic:open-font-license + keyword search.

    Note: GitHub API allows 10 unauthenticated requests/min.
    Set GITHUB_TOKEN in .env for 30 requests/min (recommended).
    Get a token at: https://github.com/settings/tokens (no scopes needed)
    """
    print(f"\n[GitHub OFL] Searching for '{query}' with topic:open-font-license...")
    token = os.environ.get("GITHUB_TOKEN", "")
    headers = {
        "Accept": "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
    }
    if token:
        headers["Authorization"] = f"Bearer {token}"
    else:
        print("  Tip: Set GITHUB_TOKEN in .env for higher rate limits (30 req/min vs 10)")

    fonts = []

    # Strategy: search by topic:open-font-license + optional keyword
    # This is the tag font repos actually use — more reliable than license: filter
    q_parts = ["topic:open-font-license"]
    if query and query.lower() != "font":
        q_parts.append(query)  # e.g. "display serif", "handwriting"
    else:
        q_parts.append("font")  # ensure font-related repos

    search_q = "+".join(q_parts)
    search_url = f"https://api.github.com/search/repositories?q={search_q}&sort=stars&order=desc&per_page=30"

    try:
        r = requests.get(search_url, headers=headers, timeout=15)
        if r.status_code == 403:
            print("  Rate limited — wait 60s or add GITHUB_TOKEN to .env")
            return fonts
        data = r.json()
    except Exception as e:
        print(f"  Error: {e}")
        return fonts

    repos = data.get("items", [])
    if not repos:
        # Fallback: search by topic:font + filename:OFL.txt
        print("  No results for topic search, trying filename:OFL.txt fallback...")
        fallback_url = f"https://api.github.com/search/repositories?q={query}+font+filename:OFL.txt&sort=stars&per_page=30"
        try:
            r = requests.get(fallback_url, headers=headers, timeout=15)
            data = r.json()
            repos = data.get("items", [])
        except Exception as e:
            print(f"  Fallback error: {e}")
            return fonts

    print(f"  Found {len(repos)} repos")

    for repo in repos[:limit]:
        repo_name = repo.get("name", "")
        # Clean up repo name → font family name
        name = repo_name.replace("-", " ").replace("_", " ").replace("font", "").replace("Font", "").strip().title()
        if not name:
            name = repo_name.replace("-", " ").title()

        # Skip non-font repos
        desc = (repo.get("description") or "").lower()
        topics = repo.get("topics", [])
        is_font_repo = (
            "font" in repo_name.lower()
            or "font" in desc
            or "typeface" in desc
            or "font" in topics
            or "typeface" in topics
            or "open-font-license" in topics
        )
        if not is_font_repo:
            continue

        # Verify OFL.txt exists (confirms it's a proper OFL font)
        ofl_url = f"https://api.github.com/repos/{repo['full_name']}/contents/OFL.txt"
        try:
            ofl_r = requests.get(ofl_url, headers=headers, timeout=10)
            has_ofl = ofl_r.status_code == 200
        except:
            has_ofl = False

        # Also accept LICENSE files that mention OFL
        if not has_ofl:
            time.sleep(0.15)
            continue

        designer = repo.get("owner", {}).get("login", "Unknown")
        description = repo.get("description") or f"{name} is an open-source typeface under the SIL Open Font License."
        stars = repo.get("stargazers_count", 0)

        fonts.append({
            "name": name,
            "family": name,
            "use_case": json.dumps(["creative", "designer"]),
            "license": "OFL",
            "designer": designer,
            "file_url": repo.get("html_url", ""),
            "description": description,
            "family_size": 1,
            "subsets": ["latin"],
        })
        print(f"  ✓ {name:30s} by {designer:20s} ⭐{stars}")
        time.sleep(0.2)  # Respect rate limits

    return fonts


# ── Source: Fontsource ────────────────────────────────────────────────────────

def ingest_fontsource(limit: int = 500, exclude_google: bool = True) -> list[dict]:
    """
    Fontsource — 1500+ open-source fonts via clean REST API.
    API: https://api.fontsource.org/v1/fonts
    
    By default skips Google Fonts (type='google') since those are already
    in your DB. Set exclude_google=False to include them too.

    Each font has a direct CDN TTF URL via jsDelivr for font rendering.
    """
    print(f"\n[Fontsource] Fetching catalog (exclude_google={exclude_google})...")
    try:
        r = requests.get(
            "https://api.fontsource.org/v1/fonts",
            timeout=30,
            headers={"User-Agent": "ukfont-ingester/1.0"}
        )
        r.raise_for_status()
        data = r.json()
    except Exception as e:
        print(f"  Error: {e}")
        return []

    fonts = []
    skipped_google = 0

    for item in data:
        if not isinstance(item, dict):
            continue

        font_type = item.get("type", "")
        if exclude_google and font_type == "google":
            skipped_google += 1
            continue

        family = item.get("family", "")
        font_id = item.get("id", "")
        if not family or not font_id:
            continue

        # Build direct TTF download URL via jsDelivr CDN
        weights = item.get("weights", [400])
        default_weight = 400 if 400 in weights else weights[0]
        file_url = f"https://cdn.jsdelivr.net/fontsource/fonts/{font_id}@latest/latin-{default_weight}-normal.ttf"

        category = item.get("category", "sans-serif")
        use_case_map = {
            "serif": "editorial",
            "sans-serif": "modern",
            "display": "creative",
            "handwriting": "creative",
            "monospace": "coding",
        }

        fonts.append({
            "name": family,
            "family": family,
            "use_case": json.dumps([use_case_map.get(category, "creative")]),
            "license": item.get("license", "OFL"),
            "designer": "Fontsource",
            "file_url": file_url,
            "description": f"{family} is a {category} font available via Fontsource under {item.get('license', 'OFL')}.",
            "family_size": len(item.get("weights", [1])),
            "subsets": item.get("subsets", ["latin"]),
        })

        if len(fonts) >= limit:
            break

    if skipped_google:
        print(f"  Skipped {skipped_google} Google Fonts (already in your DB)")
    print(f"  Fetched {len(fonts)} non-Google fonts")
    return fonts


# ── Source: Font Squirrel ─────────────────────────────────────────────────────

def ingest_fontsquirrel(limit: int = 200) -> list[dict]:
    """
    Font Squirrel — manually vetted free commercial fonts.
    API: https://www.fontsquirrel.com/api/fontlist/all

    Fix: requires a browser-like User-Agent, otherwise returns empty HTML.
    """
    print("\n[Font Squirrel] Fetching font catalog...")
    try:
        r = requests.get(
            "https://www.fontsquirrel.com/api/fontlist/all",
            timeout=20,
            headers={
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36",
                "Accept": "application/json, text/javascript, */*",
                "Referer": "https://www.fontsquirrel.com/fonts/list",
            }
        )
        # Verify it's JSON before parsing
        content_type = r.headers.get("content-type", "")
        if "json" not in content_type and not r.text.strip().startswith("["):
            print(f"  Error: Got HTML instead of JSON (Font Squirrel may be blocking scrapers)")
            print(f"  Response preview: {r.text[:150]}")
            print(f"  Try again later, or use --source fontsource instead (same quality, open API)")
            return []
        data = r.json()
    except Exception as e:
        print(f"  Error: {e}")
        return []

    fonts = []
    for item in data[:limit]:
        name = item.get("family_name", "")
        if not name:
            continue
        fonts.append({
            "name": name,
            "family": name,
            "use_case": json.dumps(["creative"]),
            "license": item.get("license_type", "Free Commercial"),
            "designer": item.get("designer", "Unknown") or "Unknown",
            "file_url": f"https://www.fontsquirrel.com/fonts/{item.get('family_urlname', '')}/download",
            "description": f"{name} is a free commercial-use font curated by Font Squirrel.",
            "family_size": int(item.get("styles_count", 1) or 1),
            "subsets": ["latin"],
        })

    print(f"  Fetched {len(fonts)} fonts")
    return fonts



# ── New sources to append to font_ingester.py ────────────────────────────────

def ingest_dafont(limit: int = 5000) -> list[dict]:
    """
    DaFont — 80,000+ free fonts browsable by alphabet.
    Scrapes: https://www.dafont.com/alpha.php?lettre=a&page=1&fpp=200
    Each page has up to 200 fonts. 26 letters × many pages = 80K+ total.
    """
    import re
    from bs4 import BeautifulSoup

    print(f"\n[DaFont] Scraping up to {limit} fonts...")
    fonts = []
    letters = "abcdefghijklmnopqrstuvwxyz0"  # 0 = numeric/symbols
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml",
        "Accept-Language": "en-US,en;q=0.9",
    }

    CATEGORY_MAP = {
        "Serif": "serif", "Sans Serif": "sans-serif", "Script": "script",
        "Display": "decorative", "Handwritten": "handwriting",
        "Decorative": "decorative", "Techno": "tech", "Gothic": "serif",
        "Various": "decorative", "Fancy": "decorative", "Basic": "sans-serif",
    }

    for letter in letters:
        if len(fonts) >= limit:
            break
        page = 1
        while len(fonts) < limit:
            url = f"https://www.dafont.com/alpha.php?lettre={letter}&page={page}&fpp=200&text=The+quick+brown+fox"
            try:
                r = requests.get(url, headers=headers, timeout=15)
                if r.status_code != 200:
                    break
                soup = BeautifulSoup(r.text, "html.parser")
                font_blocks = soup.select("div.fontpreview")
                if not font_blocks:
                    # Try alternate selector
                    font_blocks = soup.select("div.preview")
                if not font_blocks:
                    break

                page_count = 0
                for block in font_blocks:
                    name_el = block.select_one("h2 a, .fontname a, h2")
                    if not name_el:
                        continue
                    name = name_el.get_text(strip=True)
                    if not name:
                        continue

                    # Get author
                    author_el = block.select_one("span.byauthor a, .author a")
                    author = author_el.get_text(strip=True) if author_el else "Unknown"

                    # Get category
                    cat_el = block.select_one("small a, .categ a")
                    category = cat_el.get_text(strip=True) if cat_el else "Various"
                    use_case_str = CATEGORY_MAP.get(category, "creative")

                    # Font slug for download URL
                    href = name_el.get("href", "")
                    slug_match = re.search(r"/([^/]+)$", href)
                    slug = slug_match.group(1) if slug_match else name.lower().replace(" ", "-")

                    fonts.append({
                        "name": name,
                        "family": name,
                        "use_case": json.dumps([use_case_str]),
                        "license": "Free",
                        "designer": author,
                        "file_url": f"https://dl.dafont.com/dl/?f={slug}",
                        "description": f"{name} is a free {category.lower()} font by {author} available on DaFont.",
                        "family_size": 1,
                        "subsets": json.dumps(["latin"]),
                    })
                    page_count += 1
                    if len(fonts) >= limit:
                        break

                print(f"  Letter '{letter}' page {page}: +{page_count} fonts ({len(fonts)} total)")
                if page_count < 100:  # Less than half page = last page
                    break
                page += 1
                time.sleep(0.5)  # Be polite to DaFont

            except Exception as e:
                print(f"  Error on letter '{letter}' page {page}: {e}")
                break

    print(f"  DaFont total: {len(fonts)} fonts")
    return fonts[:limit]


def ingest_fontspace(limit: int = 5000) -> list[dict]:
    """
    FontSpace — 80,000+ free fonts with JSON API.
    API: https://www.fontspace.com/api/fonts?page=1&perPage=50
    """
    print(f"\n[FontSpace] Fetching up to {limit} fonts via API...")
    fonts = []
    page = 1
    per_page = 50
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36",
        "Accept": "application/json",
        "Referer": "https://www.fontspace.com/",
    }

    while len(fonts) < limit:
        try:
            r = requests.get(
                f"https://www.fontspace.com/api/fonts",
                params={"page": page, "perPage": per_page, "sort": "popular"},
                headers=headers,
                timeout=15,
            )
            if r.status_code != 200:
                print(f"  HTTP {r.status_code} — stopping")
                break

            data = r.json()
            items = data.get("items", data.get("fonts", data if isinstance(data, list) else []))
            if not items:
                break

            for item in items:
                name = item.get("name", item.get("title", ""))
                if not name:
                    continue
                author = item.get("designer", item.get("author", item.get("user", {}).get("name", "Unknown")))
                if isinstance(author, dict):
                    author = author.get("name", "Unknown")
                slug = item.get("slug", item.get("urlName", name.lower().replace(" ", "-")))
                category = item.get("category", item.get("classification", "Sans Serif"))
                license_name = item.get("license", item.get("licenseType", "Free"))

                fonts.append({
                    "name": name,
                    "family": name,
                    "use_case": json.dumps(["creative"]),
                    "license": str(license_name),
                    "designer": str(author) if author else "Unknown",
                    "file_url": f"https://www.fontspace.com/{slug}",
                    "description": f"{name} is a free {category} font available on FontSpace.",
                    "family_size": item.get("styles", item.get("styleCount", 1)),
                    "subsets": json.dumps(["latin"]),
                })

            print(f"  Page {page}: +{len(items)} fonts ({len(fonts)} total)")
            if len(items) < per_page:
                break
            page += 1
            time.sleep(0.3)

        except Exception as e:
            print(f"  Error on page {page}: {e}")
            break

    print(f"  FontSpace total: {len(fonts)} fonts")
    return fonts[:limit]


def ingest_1001fonts(limit: int = 3000) -> list[dict]:
    """
    1001Fonts — 15,000+ free fonts, paginated HTML scraping.
    URL: https://www.1001fonts.com/search.php?page=1&perpage=50
    """
    from bs4 import BeautifulSoup
    print(f"\n[1001Fonts] Scraping up to {limit} fonts...")
    fonts = []
    page = 1
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36",
        "Accept": "text/html",
    }

    while len(fonts) < limit:
        try:
            r = requests.get(
                f"https://www.1001fonts.com/search.php",
                params={"page": page, "perpage": 50},
                headers=headers,
                timeout=15,
            )
            if r.status_code != 200:
                break
            soup = BeautifulSoup(r.text, "html.parser")
            items = soup.select("li.font-item, div.font-item, article.font-item")
            if not items:
                # Try alternate selector for their newer layout
                items = soup.select("[class*='font-list'] li, [class*='font-item']")
            if not items:
                break

            page_count = 0
            for item in items:
                name_el = item.select_one("h2 a, h3 a, .font-name a, a.font-link")
                if not name_el:
                    continue
                name = name_el.get_text(strip=True)
                if not name:
                    continue
                author_el = item.select_one(".designer a, .author a, span.designer")
                author = author_el.get_text(strip=True) if author_el else "Unknown"
                href = name_el.get("href", "")
                slug = href.split("/")[-1].replace(".font", "") if href else name.lower().replace(" ", "-")

                fonts.append({
                    "name": name,
                    "family": name,
                    "use_case": json.dumps(["creative"]),
                    "license": "Free",
                    "designer": author,
                    "file_url": f"https://www.1001fonts.com/{slug}.font",
                    "description": f"{name} is a free font by {author} available on 1001Fonts.",
                    "family_size": 1,
                    "subsets": json.dumps(["latin"]),
                })
                page_count += 1
                if len(fonts) >= limit:
                    break

            print(f"  Page {page}: +{page_count} fonts ({len(fonts)} total)")
            if page_count < 10:
                break
            page += 1
            time.sleep(0.4)

        except Exception as e:
            print(f"  Error on page {page}: {e}")
            break

    print(f"  1001Fonts total: {len(fonts)} fonts")
    return fonts[:limit]


# ── Main ───────────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description="Ingest open-source fonts into ukfont DB")
    parser.add_argument("--source", choices=["fontshare", "openfontlibrary", "github", "fontsquirrel", "fontsource", "dafont", "fontspace", "1001fonts", "all"], help="Source to ingest from")
    parser.add_argument("--query", default="font", help="Search query (for GitHub source)")
    parser.add_argument("--limit", type=int, default=200, help="Max fonts to fetch")
    parser.add_argument("--dry-run", action="store_true", help="Print what would be added, don't insert")
    parser.add_argument("--list", action="store_true", help="List available sources")
    args = parser.parse_args()

    if args.list:
        print("\nAvailable font sources:")
        print("  fontshare      — 100+ high-quality fonts from Indian Type Foundry (OFL)")
        print("  fontsource     — 1500+ fonts via Fontsource API, skips Google duplicates ✨ RECOMMENDED")
        print("  openfontlibrary— 6000+ fonts from Open Font Library (OFL/GPL)")
        print("  github         — Search GitHub topic:open-font-license by keyword")
        print("  fontsquirrel   — 13000+ curated free commercial fonts (needs browser User-Agent)")
        print("  all            — Run all sources")
        print("  dafont         — 80,000+ free fonts from DaFont (HTML scraping)")
        print("  fontspace      — 80,000+ free fonts from FontSpace (API)")
        print("  1001fonts      — 15,000+ free fonts from 1001Fonts (HTML scraping)")
        return

    if not args.source:
        parser.print_help()
        return

    if not DB_URL and not args.dry_run:
        print("ERROR: DATABASE_URL not set. Use --dry-run to test without DB.")
        sys.exit(1)

    # Fetch fonts from selected source
    all_fonts = []
    if args.source in ("fontshare", "all"):
        all_fonts += ingest_fontshare(args.limit)
    if args.source in ("fontsource", "all"):
        all_fonts += ingest_fontsource(args.limit)
    if args.source in ("openfontlibrary", "all"):
        all_fonts += ingest_openfontlibrary(args.limit)
    if args.source in ("github", "all"):
        all_fonts += ingest_github_ofl(args.query, args.limit)
    if args.source in ("fontsquirrel", "all"):
        all_fonts += ingest_fontsquirrel(args.limit)
    if args.source in ("dafont",):
        if BeautifulSoup is None:
            print("ERROR: beautifulsoup4 not installed. Run: pip install beautifulsoup4")
            sys.exit(1)
        all_fonts += ingest_dafont(args.limit)
    if args.source in ("fontspace",):
        all_fonts += ingest_fontspace(args.limit)
    if args.source in ("1001fonts",):
        if BeautifulSoup is None:
            print("ERROR: beautifulsoup4 not installed. Run: pip install beautifulsoup4")
            sys.exit(1)
        all_fonts += ingest_1001fonts(args.limit)

    print(f"\nTotal fonts fetched: {len(all_fonts)}")

    if args.dry_run:
        print("\n[DRY RUN] Would insert:")
        for f in all_fonts[:20]:
            print(f"  {f['name']} — {f['designer']} ({f['license']})")
        if len(all_fonts) > 20:
            print(f"  ... and {len(all_fonts)-20} more")
        return

    # Insert into DB
    conn = get_conn()
    added = 0
    skipped = 0

    print(f"\nInserting into database...")
    for font in all_fonts:
        try:
            if insert_font(conn, font):
                added += 1
            else:
                skipped += 1
        except Exception as e:
            print(f"  ERROR inserting {font.get('name')}: {e}")
            conn.rollback()

    conn.close()
    print(f"\n✓ Done: {added} added, {skipped} skipped (already existed)")

    # ── Auto-run geometry analysis on newly ingested fonts ────────────────────
    if added > 0 and not args.dry_run:
        print(f"\n{'='*60}")
        print(f"  Running geometry analysis on {added} new fonts...")
        print(f"  This populates: x_height, contrast, width, serif_type")
        print(f"  for property filters and font-from-image matching.")
        print(f"{'='*60}")

        try:
            # Import font_indexer from same directory
            import sys, os
            script_dir = os.path.dirname(os.path.abspath(__file__))
            microservice_dir = os.path.join(script_dir, "..", "font-microservice")
            if os.path.exists(microservice_dir):
                sys.path.insert(0, microservice_dir)

            from font_indexer import index_font, run_indexer
            from vector_store import get_unindexed_fonts

            unindexed = get_unindexed_fonts()
            if unindexed:
                print(f"  Found {len(unindexed)} unindexed fonts — starting analysis...")
                run_indexer(unindexed, label="New Font Geometry Analysis")
            else:
                print("  All fonts already indexed.")
        except ImportError as e:
            print(f"\n  Note: Auto-indexing skipped ({e})")
            print(f"  Run manually: cd font-microservice && python font_indexer.py")
            print(f"  This will analyse geometry for all {added} new fonts.")


if __name__ == "__main__":
    main()
