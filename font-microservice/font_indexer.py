"""
font_indexer.py — One-Time Font Indexing Script

Renders all 1942 fonts as preview images, encodes them with:
  - CLIP ViT-B/32     → 512-dim semantic vector
  - Geometry fingerprint → 12-dim property vector

Stores both in PostgreSQL font_vectors table.

Run once (or when new fonts are added):
  python font_indexer.py              # index all un-indexed fonts
  python font_indexer.py --force      # re-index everything
  python font_indexer.py --limit 100  # index first 100 (for testing)
  python font_indexer.py --id 42      # index single font by id

Time estimate: ~20-30 minutes for 1942 fonts on CPU
               ~5 minutes with GPU
               (runs once, then zero cost forever)
"""

import os
import sys
import time
import argparse
import requests
import numpy as np
from io import BytesIO
from PIL import Image, ImageDraw, ImageFont
from dotenv import load_dotenv
import warnings
warnings.filterwarnings("ignore")

load_dotenv()

from vector_store import (
    setup_schema, upsert_font_vector,
    get_unindexed_fonts, get_all_fonts_for_indexing,
    get_indexed_count
)
from clip_embedder import encode_image
from geometry_fingerprint import compute_geometry_vector, bucket_geometry_vector


# ── Font rendering ────────────────────────────────────────────────────────────

PREVIEW_TEXT = "Hamburgefons"   # classic font tester — uses diverse letterforms
PREVIEW_SIZE = (400, 100)       # width x height of rendered preview
PREVIEW_FONT_SIZE = 52

# Google Fonts API key from env
GF_API_KEY = os.environ.get("GOOGLE_FONTS_API_KEY", "")

# Cache of Google Fonts direct URLs
_gf_url_cache: dict = {}


def _build_gf_url_cache():
    """Fetch Google Fonts API to get direct .ttf download URLs."""
    global _gf_url_cache
    if _gf_url_cache:
        return
    
    if not GF_API_KEY:
        print("[Indexer] No GOOGLE_FONTS_API_KEY — will use DB fileUrl for all fonts")
        return
    
    try:
        resp = requests.get(
            f"https://www.googleapis.com/webfonts/v1/webfonts?key={GF_API_KEY}&sort=popularity",
            timeout=20
        )
        for item in resp.json().get("items", []):
            url = (
                item["files"].get("regular") or
                item["files"].get("400") or
                list(item["files"].values())[0]
            )
            if url:
                _gf_url_cache[item["family"].lower()] = url.replace("http://", "https://")
        print(f"[Indexer] Google Fonts cache: {len(_gf_url_cache)} fonts ✓")
    except Exception as e:
        print(f"[Indexer] Could not fetch Google Fonts API: {e}")


def _extract_ttf_from_zip(zip_bytes: bytes, font_name: str) -> bytes | None:
    """
    Extract the best TTF/OTF file from a ZIP archive.
    Fontshare and some other sources return ZIP files containing font files.
    Picks the 'Regular' or '400' weight file, or the first TTF found.
    """
    import zipfile
    from io import BytesIO
    try:
        zf = zipfile.ZipFile(BytesIO(zip_bytes))
        font_files = [f for f in zf.namelist() if f.lower().endswith(('.ttf', '.otf'))]
        if not font_files:
            return None
        
        # Prefer Regular/400 weight
        name_lower = font_name.lower().replace(" ", "")
        preferred = None
        for f in font_files:
            fl = f.lower()
            if 'regular' in fl or '-400' in fl or '_400' in fl:
                preferred = f
                break
        
        chosen = preferred or font_files[0]
        return zf.read(chosen)
    except Exception:
        return None


def download_font_bytes(font_id: int, font_name: str, font_family: str, file_url: str) -> bytes | None:
    """
    Download font file bytes. Tries Google Fonts direct URL first.
    Handles: direct TTF/OTF files, WOFF/WOFF2, and ZIP archives (Fontshare).
    """
    _build_gf_url_cache()
    
    # Try Google Fonts direct URL first
    direct_url = _gf_url_cache.get(font_family.lower())
    urls_to_try = [u for u in [direct_url, file_url] if u]
    
    for url in urls_to_try:
        # Skip Google Fonts HTML download pages (not direct files)
        if "download?family" in url and "gstatic" not in url:
            continue
        try:
            resp = requests.get(url, timeout=30, headers={"User-Agent": "ukfont/1.0"})
            if resp.status_code != 200:
                continue
            content = resp.content
            if not content:
                continue

            # Direct font file — TTF/OTF/WOFF magic bytes
            if content[:4] in (b'\x00\x01\x00\x00', b'OTTO', b'wOFF', b'wOF2', b'true', b'typ1'):
                return content

            # ZIP archive — Fontshare and some others return ZIPs
            # ZIP magic bytes: PK\x03\x04
            if content[:4] == b'PK\x03\x04':
                ttf = _extract_ttf_from_zip(content, font_name)
                if ttf:
                    return ttf
                continue

            # HTML page — skip
            if content[:5] == b'<?xml' or content[:9] == b'<!DOCTYPE' or content[:15].lower().startswith(b'<!doctype html'):
                continue

        except Exception:
            continue
    
    return None


def render_font_preview(font_bytes: bytes, text: str = PREVIEW_TEXT) -> Image.Image | None:
    """
    Render preview text using the font file.
    Returns a clean PIL Image on white background.
    """
    try:
        font_buffer = BytesIO(font_bytes)
        
        # Try different font sizes to fill the image nicely
        img = Image.new("RGB", PREVIEW_SIZE, color=(255, 255, 255))
        draw = ImageDraw.Draw(img)
        
        for size in [PREVIEW_FONT_SIZE, 40, 32, 24]:
            try:
                font_buffer.seek(0)
                pil_font = ImageFont.truetype(font_buffer, size=size)
                
                # Measure text size
                bbox = draw.textbbox((0, 0), text, font=pil_font)
                text_w = bbox[2] - bbox[0]
                text_h = bbox[3] - bbox[1]
                
                if text_w > PREVIEW_SIZE[0] * 0.9:
                    continue  # Too wide, try smaller size
                
                # Center the text
                x = (PREVIEW_SIZE[0] - text_w) // 2
                y = (PREVIEW_SIZE[1] - text_h) // 2
                
                # Draw on clean white background
                img = Image.new("RGB", PREVIEW_SIZE, color=(255, 255, 255))
                draw = ImageDraw.Draw(img)
                draw.text((x, y), text, font=pil_font, fill=(20, 20, 20))
                
                return img
                
            except Exception:
                continue
        
        return None
        
    except Exception as e:
        return None


def render_multiple_previews(font_bytes: bytes) -> list[Image.Image]:
    """
    Render multiple preview texts for ensemble encoding.
    Different letter combinations reveal different aspects of the font.
    """
    texts = [
        "Hamburgefons",      # classic diverse letterforms
        "AaBbCcDdEeFf",      # uppercase + lowercase pairs
        "The quick brown",   # natural sentence
        "ABCDEFGHIJ",        # capitals only
        "abcdefghij",        # lowercase only
    ]
    
    previews = []
    for text in texts:
        img = render_font_preview(font_bytes, text)
        if img is not None:
            previews.append(img)
    
    return previews


# ── Main indexing logic ───────────────────────────────────────────────────────

def index_font(font: dict) -> bool:
    """
    Index a single font:
    1. Download font file
    2. Render preview images
    3. Compute CLIP embedding (average of multiple previews)
    4. Compute geometry fingerprint
    5. Store both vectors in DB
    
    Returns True on success.
    """
    font_bytes = download_font_bytes(
        font["id"], font["name"], font["family"], font.get("file_url", "")
    )
    
    if font_bytes is None:
        return False
    
    # Render previews
    previews = render_multiple_previews(font_bytes)
    if not previews:
        return False
    
    # CLIP embedding — average over all previews for robustness
    clip_vecs = []
    for img in previews:
        vec = encode_image(img)
        if vec is not None:
            clip_vecs.append(vec)
    
    clip_final = None
    if clip_vecs:
        clip_final = np.mean(clip_vecs, axis=0).astype(np.float32)
        # Re-normalize after averaging
        norm = np.linalg.norm(clip_final)
        if norm > 0:
            clip_final = clip_final / norm
    
    # Geometry fingerprint — from first (largest) preview
    geo_img = np.array(previews[0].convert("RGB"))
    geo_img_bgr = geo_img[:, :, ::-1]  # RGB → BGR for OpenCV
    geo_vec = compute_geometry_vector(geo_img_bgr)
    geo_props = bucket_geometry_vector(geo_vec)
    
    # Store in DB
    upsert_font_vector(
        font_id=font["id"],
        font_name=font["name"],
        font_family=font["family"],
        geometry_vec=geo_vec,
        clip_vec=clip_final,
        geometry_props=geo_props,
    )
    
    return True


def run_indexer(fonts: list, label: str = ""):
    """Run indexing with progress display."""
    total = len(fonts)
    ok = 0
    failed = 0
    
    print(f"\n{'='*70}")
    print(f"  ukfont Font Indexer — {label}")
    print(f"  Fonts to index: {total}")
    print(f"{'='*70}\n")
    
    pad = lambda s, n: str(s)[:n].ljust(n)
    
    print(pad("#", 8) + pad("Font", 32) + pad("CLIP", 8) + pad("Geo", 6) + "Status")
    print("─" * 60)
    
    for i, font in enumerate(fonts):
        prefix = f"{i+1}/{total}"
        sys.stdout.write(f"  {pad(prefix, 8)}{pad(font['name'], 32)}")
        sys.stdout.flush()
        
        try:
            success = index_font(font)
            if success:
                ok += 1
                print("✓  ✓    ✓")
            else:
                failed += 1
                print("⚠        no font file")
        except Exception as e:
            failed += 1
            print(f"✗        {str(e)[:30]}")
        
        # Small delay to avoid hammering Google Fonts CDN
        time.sleep(0.1)
    
    print(f"\n{'='*70}")
    print(f"  Done!")
    print(f"  Indexed:  {ok}")
    print(f"  Failed:   {failed}")
    print(f"  Total DB: {get_indexed_count()} fonts with vectors")
    print(f"\n  Fonts are ready for similarity search.")
    print(f"  Start the microservice: python main.py")
    print(f"{'='*70}\n")


def main():
    parser = argparse.ArgumentParser(description="Index fonts into vector DB")
    parser.add_argument("--force",  action="store_true", help="Re-index all fonts")
    parser.add_argument("--limit",  type=int, default=0, help="Limit number of fonts")
    parser.add_argument("--id",     type=int, default=0, help="Index single font by ID")
    args = parser.parse_args()
    
    # Setup DB schema (safe to run multiple times)
    setup_schema()
    
    if args.id:
        # Single font mode
        conn_fonts = get_all_fonts_for_indexing()
        font = next((f for f in conn_fonts if f["id"] == args.id), None)
        if not font:
            print(f"Font ID {args.id} not found")
            sys.exit(1)
        fonts = [font]
        label = f"Single font: {font['name']}"
    elif args.force:
        fonts = get_all_fonts_for_indexing()
        label = "Full re-index (--force)"
    else:
        fonts = get_unindexed_fonts()
        label = "New/unindexed fonts only"
    
    if args.limit > 0:
        fonts = fonts[:args.limit]
    
    if not fonts:
        already = get_indexed_count()
        print(f"\n  All fonts already indexed! ({already} fonts in vector DB)")
        print(f"  Use --force to re-index everything.\n")
        return
    
    run_indexer(fonts, label)


if __name__ == "__main__":
    main()
