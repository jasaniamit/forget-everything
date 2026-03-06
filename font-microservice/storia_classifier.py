"""
storia_classifier.py — Storia AI font classifier (ONNX, CPU, offline)

Drop-in replacement for clip_embedder.py.
Instead of returning a 512-dim vector, it returns ranked font name predictions.

Model: storia/font-classify-onnx (ResNet50, ~64MB, downloaded once from HuggingFace)
After first download: 100% offline, zero external calls.
"""

import os
import csv
import numpy as np
from PIL import Image
from typing import Optional

# Lazy-loaded globals
_session = None
_config  = None
_mapping = None

MAPPING_PATH = os.path.join(os.path.dirname(__file__), "google_fonts_mapping.tsv")


# ── Transform helpers (from Storia's train.py, no torch/tensorboard needed) ──

class _ResizeWithPad:
    def __init__(self, new_shape, padding_color=(255, 255, 255)):
        self.new_shape = new_shape
        self.padding_color = padding_color

    def __call__(self, image):
        import cv2
        original_shape = (image.shape[1], image.shape[0])
        ratio = float(max(self.new_shape)) / max(original_shape)
        new_size = tuple([int(x * ratio) for x in original_shape])
        pil = Image.fromarray(image).resize(new_size, Image.LANCZOS)
        image = np.array(pil)
        delta_w = self.new_shape[1] - new_size[0]
        delta_h = self.new_shape[0] - new_size[1]
        top, bottom = delta_h // 2, delta_h - (delta_h // 2)
        left, right  = delta_w // 2, delta_w - (delta_w // 2)
        image = cv2.copyMakeBorder(
            image, top, bottom, left, right,
            cv2.BORDER_CONSTANT, value=list(self.padding_color)
        )
        return image


def _cut_max(image, max_size=1024):
    h, w = image.shape[:2]
    if max(h, w) <= max_size:
        return image
    return image[:max_size, :, :] if h > w else image[:, :max_size, :]


def _normalize(image):
    mean = np.array([0.485, 0.456, 0.406], dtype=np.float32)
    std  = np.array([0.229, 0.224, 0.225], dtype=np.float32)
    return (image.astype(np.float32) / 255.0 - mean) / std


def _softmax(x):
    e = np.exp(x - np.max(x))
    return e / e.sum()


def _preprocess(img: Image.Image, input_size: int) -> np.ndarray:
    arr = np.array(img.convert("RGB"))
    arr = _cut_max(arr)
    arr = _ResizeWithPad((input_size, input_size))(arr)
    arr = _normalize(arr)
    arr = np.transpose(arr, (2, 0, 1))
    return np.expand_dims(arr, 0).astype(np.float32)


# ── Model loading ─────────────────────────────────────────────────────────────

def _load():
    global _session, _config, _mapping

    if _session is not None:
        return True

    try:
        import onnxruntime as ort
        import yaml
        import huggingface_hub

        print("[Storia] Downloading model (first time only ~64MB)...")
        config_path = huggingface_hub.hf_hub_download(
            repo_id="storia/font-classify-onnx", filename="model_config.yaml"
        )
        model_path = huggingface_hub.hf_hub_download(
            repo_id="storia/font-classify-onnx", filename="model.onnx"
        )

        with open(config_path, "r") as f:
            _config = yaml.safe_load(f)

        _session = ort.InferenceSession(model_path)

        # Load font name mapping
        _mapping = {}
        if os.path.exists(MAPPING_PATH):
            with open(MAPPING_PATH, "r") as f:
                for i, row in enumerate(csv.reader(f, delimiter="\t")):
                    if i > 0 and len(row) >= 2:
                        _mapping[row[0]] = row[1]

        print(f"[Storia] Model ready ✓  ({len(_config['classnames'])} font classes)")
        return True

    except Exception as e:
        print(f"[Storia] Load failed: {e}")
        return False


# ── Public API ────────────────────────────────────────────────────────────────

def classify(img: Image.Image, top_k: int = 12) -> list[dict]:
    """
    Classify a PIL Image and return top_k font matches.

    Returns list of dicts:
      [{"font_name": "Poppins", "confidence": 0.533, "match_pct": 53}, ...]
    """
    if not _load():
        return []

    try:
        input_size = _config["size"]
        classnames  = _config["classnames"]

        arr    = _preprocess(img, input_size)
        logits = _session.run(None, {"input": arr})[0][0]
        probs  = _softmax(logits)

        top_indices = np.argsort(probs)[::-1][:top_k]
        results = []
        seen_names = set()

        for idx in top_indices:
            raw   = classnames[idx]
            name  = _mapping.get(raw, raw)
            conf  = float(probs[idx])

            # Skip duplicate font names (model has variants like Poppins-Bold, Poppins-Regular)
            if name in seen_names:
                continue
            seen_names.add(name)

            results.append({
                "font_name":  name,
                "confidence": round(conf, 4),
                "match_pct":  int(conf * 100),
            })

        return results

    except Exception as e:
        print(f"[Storia] Classify error: {e}")
        return []


def warmup():
    """Pre-load model at startup so first request is instant."""
    if _load():
        dummy = Image.new("RGB", (128, 64), color=(255, 255, 255))
        classify(dummy, top_k=1)
        print("[Storia] Warmup complete ✓")
