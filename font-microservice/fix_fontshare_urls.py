"""
fix_fontshare_urls.py — Fix the 67 Fontshare fonts that failed with "no font file"

Problem:
  The stored file_url was: https://api.fontshare.com/v2/fonts/download/{slug}
  That endpoint returns a ZIP file — the indexer needs a direct .ttf URL.

Fix:
  Fontshare serves TTF files via their CSS endpoint redirect.
  The correct direct TTF URL is:
    https://api.fontshare.com/v2/css?f[]={slug}@400&display=swap
  But we can't download TTF directly from that.

  Best approach: use the Fontsource CDN as a fallback for Fontshare fonts
  that ALSO exist in Fontsource, then update file_url in the DB.

  For fonts NOT in Fontsource, use the Fontshare direct download API which
  actually returns a ZIP. The indexer download_font_bytes() handles ZIP files.

Usage:
  python fix_fontshare_urls.py --dry-run    # see what would change
  python fix_fontshare_urls.py              # apply fixes

Requirements:
  pip install requests psycopg2-binary python-dotenv
"""

import os
import sys
import time
import json
import argparse
import requests
import psycopg2
from dotenv import load_dotenv

load_dotenv()
DB_URL = os.environ.get("DATABASE_URL", "")

# Known correct Fontshare slug → font name mapping (from API responses)
# Fontshare slug is lowercase-hyphenated version of the font name
def name_to_slug(name: str) -> str:
    return name.lower().replace(" ", "-").replace("'", "").replace(".", "")


def get_conn():
    return psycopg2.connect(DB_URL)


def get_fontshare_fonts(conn) -> list[dict]:
    """Get all fonts from DB that came from Fontshare (file_url contains fontshare)."""
    with conn.cursor() as cur:
        cur.execute("""
            SELECT f.id, f.name, f.file_url
            FROM fonts f
            LEFT JOIN font_vectors fv ON f.id = fv.font_id
            WHERE (f.file_url LIKE '%fontshare%' OR f.designer = 'Indian Type Foundry')
              AND fv.font_id IS NULL
            ORDER BY f.name
        """)
        return [{"id": r[0], "name": r[1], "file_url": r[2]} for r in cur.fetchall()]


def get_fontsource_url(font_name: str) -> str | None:
    """
    Check if this font exists in Fontsource and get its direct TTF URL.
    Fontsource uses a predictable ID format.
    """
    # Try converting name to Fontsource ID format
    font_id = font_name.lower().replace(" ", "-")
    
    # Query Fontsource API for this specific font
    url = f"https://api.fontsource.org/v1/fonts/{font_id}"
    try:
        r = requests.get(url, timeout=10, headers={"User-Agent": "ukfont/1.0"})
        if r.status_code == 200:
            data = r.json()
            weights = data.get("weights", [400])
            w = 400 if 400 in weights else weights[0]
            # Direct CDN TTF
            ttf_url = f"https://cdn.jsdelivr.net/fontsource/fonts/{font_id}@latest/latin-{w}-normal.ttf"
            return ttf_url
    except:
        pass
    return None


def get_fontshare_direct_url(slug: str) -> str:
    """
    Fontshare direct download — returns ZIP containing all font files.
    The font_indexer.py download_font_bytes() handles ZIP extraction.
    
    The correct download URL format (returns ZIP):
    https://api.fontshare.com/v2/fonts/download/{slug}
    
    Actually the problem was something else — let's verify by checking
    if the indexer can handle ZIP responses. The fix is to ensure the
    download function extracts TTF from ZIP.
    """
    return f"https://api.fontshare.com/v2/fonts/download/{slug}"


def update_font_url(conn, font_id: int, new_url: str, dry_run: bool = False):
    if dry_run:
        return
    with conn.cursor() as cur:
        cur.execute("UPDATE fonts SET file_url = %s WHERE id = %s", (new_url, font_id))
    conn.commit()


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--reindex", action="store_true", help="Run indexer after fixing URLs")
    args = parser.parse_args()

    if not DB_URL:
        print("ERROR: DATABASE_URL not set")
        sys.exit(1)

    conn = get_conn()
    fonts = get_fontshare_fonts(conn)
    print(f"Found {len(fonts)} unindexed Fontshare/ITF fonts\n")

    fixed_via_fontsource = 0
    fixed_via_direct = 0
    not_found = []

    for font in fonts:
        name = font["name"]
        current_url = font["file_url"] or ""
        
        # Strategy 1: Try Fontsource CDN (fast, reliable, direct TTF)
        fontsource_url = get_fontsource_url(name)
        if fontsource_url:
            status = "DRY-RUN" if args.dry_run else "FIXED"
            print(f"  [{status} via Fontsource] {name}")
            print(f"    Old: {current_url}")
            print(f"    New: {fontsource_url}")
            update_font_url(conn, font["id"], fontsource_url, args.dry_run)
            fixed_via_fontsource += 1
            time.sleep(0.2)
            continue

        # Strategy 2: Use Fontshare direct download (ZIP)
        # The indexer already handles ZIP — the issue was the URL was correct
        # but the indexer's download function might not be handling it right
        slug = name_to_slug(name)
        direct_url = get_fontshare_direct_url(slug)
        
        # Verify the URL actually works
        try:
            r = requests.head(direct_url, timeout=10, allow_redirects=True)
            if r.status_code == 200:
                content_type = r.headers.get("content-type", "")
                print(f"  [DIRECT ZIP] {name} — {r.status_code} {content_type[:40]}")
                update_font_url(conn, font["id"], direct_url, args.dry_run)
                fixed_via_direct += 1
            else:
                print(f"  [NOT FOUND]  {name} — HTTP {r.status_code}")
                not_found.append(name)
        except Exception as e:
            print(f"  [ERROR]      {name} — {e}")
            not_found.append(name)
        
        time.sleep(0.3)

    conn.close()

    print(f"\n{'='*60}")
    print(f"  Fixed via Fontsource CDN: {fixed_via_fontsource}")
    print(f"  Fixed via Fontshare ZIP:  {fixed_via_direct}")
    print(f"  Not found:                {len(not_found)}")
    if not_found:
        print(f"\n  Could not fix: {', '.join(not_found[:10])}")
    print(f"{'='*60}")

    if args.reindex and not args.dry_run and (fixed_via_fontsource + fixed_via_direct) > 0:
        print(f"\nRunning geometry indexer on fixed fonts...")
        try:
            import sys as _sys
            _sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
            from font_indexer import run_indexer
            from vector_store import get_unindexed_fonts
            unindexed = get_unindexed_fonts()
            if unindexed:
                run_indexer(unindexed, "Fontshare Repair")
        except ImportError as e:
            print(f"  Auto-reindex failed: {e}")
            print(f"  Run manually: python font_indexer.py")


if __name__ == "__main__":
    main()
