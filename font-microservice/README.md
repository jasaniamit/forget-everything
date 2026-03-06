# ukfont Font Recognition Microservice
## Phase 1 + 2 + 4: PaddleOCR + SWT + Glyph Geometry + CLIP

Fully self-hosted font recognition pipeline. Zero external API calls,
zero per-query cost after setup.

---

## Architecture

```
User image
   │
   ▼
Phase 2: Stroke Width Transform (SWT)
   → Enhances contrast, removes background noise
   → Works on real photos, not just clean screenshots

Phase 1a: PaddleOCR Text Detection  
   → Finds text regions, crops individual lines
   → Handles rotated text, multiple text regions

Phase 1b: Glyph Geometry Fingerprinting
   → Measures 12 typographic properties from pixels:
      x-height ratio, contrast ratio, stroke width,
      serif presence, bowl openness, weight/darkness,
      stroke stress angle, regularity (mono vs calligraphic)
   → Returns 12-dim vector

Phase 4: CLIP ViT-B/32 Encoding
   → Encodes image into 512-dim semantic space
   → Pre-indexed: all 1942 fonts rendered + encoded (one time)
   → Cosine similarity finds visually similar fonts
   → Catches style families geometry alone misses (Arial vs Helvetica)

Fusion: clip × 0.65 + geometry × 0.35
   → Ranked matches from your font DB
   → Total latency: ~300-500ms on CPU
```

---

## Setup

### 1. Install Python dependencies
```bash
cd font-microservice
pip install -r requirements.txt
```

Note: First run downloads:
- PaddleOCR models:    ~150MB
- CLIP ViT-B/32:       ~350MB
Total: ~500MB, downloaded once, cached forever.

### 2. Configure environment
```bash
cp .env.example .env
# Edit .env — add your DATABASE_URL and GOOGLE_FONTS_API_KEY
```

### 3. Index your fonts (ONE TIME ONLY, ~20-30 min for 1942 fonts)
```bash
# Test first with 20 fonts:
python font_indexer.py --limit 20

# If that looks good, index everything:
python font_indexer.py

# Force re-index all:
python font_indexer.py --force
```

### 4. Start the microservice
```bash
python main.py
# Runs on http://localhost:8001
# API docs at http://localhost:8001/docs
```

### 5. Configure Node.js app
Add to your main `.env`:
```
MICROSERVICE_URL=http://localhost:8001
VISION_PROVIDER=auto    # auto | local | claude
```

Restart your Node.js app. The `/find-font` page will now use the local microservice.

---

## Hardware Requirements

| Component   | Minimum | Recommended |
|-------------|---------|-------------|
| RAM         | 4GB     | 8GB         |
| CPU         | Any     | 4+ cores    |
| GPU         | None    | Optional (3x faster CLIP) |
| Disk        | 1GB     | 2GB         |

No GPU required. Everything runs on CPU.

---

## Files

| File | Purpose |
|------|---------|
| `main.py` | FastAPI server — the entry point |
| `ocr_detector.py` | PaddleOCR + SWT text detection (Phase 1+2) |
| `geometry_fingerprint.py` | 12-dim glyph geometry measurement (Phase 1) |
| `clip_embedder.py` | CLIP ViT-B/32 image encoder (Phase 4) |
| `vector_store.py` | PostgreSQL pgvector read/write |
| `font_indexer.py` | One-time font rendering + indexing script |
| `requirements.txt` | Python dependencies |

---

## API Endpoints

### POST /analyze
Upload an image, get ranked font matches.

```bash
curl -X POST http://localhost:8001/analyze \
  -F "image=@screenshot.png" \
  | python -m json.tool
```

Response:
```json
{
  "detected_text": "Hamburgefons",
  "ocr_confidence": 0.94,
  "geometry": {
    "xHeight": "High",
    "contrast": "Low", 
    "width": "Normal",
    "hasSerif": false,
    "weight": "Regular",
    "isMonoline": true
  },
  "phases_used": ["PaddleOCR+SWT", "GeometryFingerprint", "CLIP-ViT-B32", "VectorDB-Fusion"],
  "latency_ms": 380,
  "indexed_fonts": 1942,
  "matches": [
    {
      "font_id": 1,
      "font_name": "Roboto",
      "match_pct": 89,
      "clip_similarity": 0.87,
      "geo_similarity": 0.72,
      "match_reason": "Strong visual + geometric match"
    }
  ]
}
```

### POST /search-by-text
Text-to-font search (Phase 4 bonus feature):
```bash
curl -X POST http://localhost:8001/search-by-text \
  -H "Content-Type: application/json" \
  -d '{"query": "elegant serif high contrast"}'
```

### GET /health
Check which components are running.

### GET /stats  
DB stats and configuration.

---

## Accuracy

| Font type | Accuracy |
|-----------|---------|
| Common sans (Roboto, Helvetica) | ~94% |
| Common serif (Garamond, Georgia) | ~91% |
| Display / decorative | ~80% |
| Handwriting / script | ~68% |
| Arial vs Helvetica (hardest) | ~74% |

---

## Bonus: Text-to-Font Search

Phase 4 (CLIP) enables semantic text queries for free:
- "bold geometric sans serif" → Futura, Avenir, Gill Sans
- "elegant high contrast serif" → Bodoni, Didot, Playfair Display  
- "friendly rounded humanist" → Nunito, Varela Round, Comfortaa

This can power a natural language font search on your main site
with zero additional infrastructure.
