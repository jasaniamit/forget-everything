"""
clip_embedder.py — Phase 4: CLIP ViT-B/32 Visual Embeddings

Downloads and caches the CLIP ViT-B/32 model (~350MB, one time).
Encodes images into 512-dimensional semantic vectors.

Why CLIP for fonts?
CLIP was trained on 400M image-text pairs. It learned that an image of
"Helvetica" text looks different from "Garamond" text — not because
someone told it about fonts, but because the internet naturally contains
captions like "clean helvetica logo" vs "elegant serif typography".

For font matching, we:
1. Render all fonts in our DB as preview images (font_indexer.py does this)
2. Encode each preview → 512-dim vector → store in DB
3. At query time, encode the uploaded image → same 512-dim space
4. Cosine similarity → fonts that visually match the query image

This catches things geometry cannot: the "feeling" of a font, 
subtle style differences (Arial vs Helvetica), script/display families.
"""

import numpy as np
from PIL import Image
from typing import Optional
import warnings
warnings.filterwarnings("ignore")

# Lazy load — don't import torch at module level to keep startup fast
_model = None
_processor = None
_device = None


def _load_model():
    """Load CLIP model on first use. Downloads ~350MB once, then cached."""
    global _model, _processor, _device
    
    if _model is not None:
        return _model, _processor, _device
    
    try:
        import torch
        from sentence_transformers import SentenceTransformer
        
        _device = "cuda" if torch.cuda.is_available() else "cpu"
        print(f"[CLIP] Loading ViT-B/32 on {_device}...")
        
        # sentence-transformers wraps CLIP with a clean API
        # Model is cached at ~/.cache/torch/sentence_transformers/
        _model = SentenceTransformer("clip-ViT-B-32", device=_device)
        _processor = None  # sentence-transformers handles preprocessing
        
        print(f"[CLIP] Model loaded ✓  ({_device})")
        return _model, _processor, _device
        
    except ImportError as e:
        print(f"[CLIP] Import error: {e}")
        print("[CLIP] Run: pip install sentence-transformers torch torchvision")
        return None, None, None
    except Exception as e:
        print(f"[CLIP] Failed to load: {e}")
        return None, None, None


def encode_image(img: Image.Image) -> Optional[np.ndarray]:
    """
    Encode a PIL Image into a 512-dim CLIP vector.
    Returns None if model unavailable.
    """
    model, _, _ = _load_model()
    if model is None:
        return None
    
    try:
        # Resize to CLIP expected input (224x224) while preserving aspect
        img_resized = img.convert("RGB")
        
        # sentence-transformers CLIP encode handles PIL images directly
        embedding = model.encode(img_resized, convert_to_numpy=True)
        
        # L2 normalize for cosine similarity
        norm = np.linalg.norm(embedding)
        if norm > 0:
            embedding = embedding / norm
        
        return embedding.astype(np.float32)
        
    except Exception as e:
        print(f"[CLIP] Encode error: {e}")
        return None


def encode_text(text: str) -> Optional[np.ndarray]:
    """
    Encode a text description into the same 512-dim space.
    Enables text-to-font search: "bold geometric sans serif" → matching fonts.
    """
    model, _, _ = _load_model()
    if model is None:
        return None
    
    try:
        embedding = model.encode(text, convert_to_numpy=True)
        norm = np.linalg.norm(embedding)
        if norm > 0:
            embedding = embedding / norm
        return embedding.astype(np.float32)
    except Exception as e:
        print(f"[CLIP] Text encode error: {e}")
        return None


def cosine_similarity(a: np.ndarray, b: np.ndarray) -> float:
    """Fast cosine similarity between two L2-normalized vectors."""
    return float(np.dot(a, b))


def batch_cosine_similarity(query: np.ndarray, matrix: np.ndarray) -> np.ndarray:
    """
    Compute cosine similarity between query vector and all rows in matrix.
    matrix shape: (N, 512)
    Returns: (N,) array of similarities in [-1, 1]
    """
    return matrix @ query  # both are L2 normalized
