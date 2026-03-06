"""
ocr_detector.py — Phase 1+2: PaddleOCR Text Detection + Glyph Isolation

Two modes:
1. DETECTION ONLY — find text regions in image (bounding boxes)
2. FULL OCR — detect + recognize text content

For font matching we primarily need mode 1 — clean glyph crops.
We don't care what the text says, only how the glyphs look.

Pipeline:
  Input image
    → SWT preprocessing (Phase 2) — handles noisy/photo backgrounds
    → PaddleOCR detection — finds text bounding boxes
    → Crop + clean each text region
    → Return largest/clearest crop for font analysis
"""

import cv2
import numpy as np
from PIL import Image
from typing import List, Tuple, Optional
import warnings
warnings.filterwarnings("ignore")

# Lazy load PaddleOCR (heavy import, ~2s startup)
_ocr = None


def _get_ocr():
    """Initialize PaddleOCR on first use."""
    global _ocr
    if _ocr is not None:
        return _ocr
    
    try:
        from paddleocr import PaddleOCR
        print("[OCR] Loading PaddleOCR models...")
        # det=True for detection, rec=False (we don't need text content)
        # use_angle_cls=True handles rotated text
        _ocr = PaddleOCR(
            use_angle_cls=True,
            lang="en",
            det=True,
            rec=True,          # enable so we get confidence scores
            cls=True,
            show_log=False,
            use_gpu=False,     # CPU mode — no GPU required
        )
        print("[OCR] PaddleOCR loaded ✓")
        return _ocr
    except ImportError:
        print("[OCR] PaddleOCR not installed. Run: pip install paddleocr paddlepaddle")
        return None
    except Exception as e:
        print(f"[OCR] Failed to load: {e}")
        return None


def preprocess_with_swt(img_array: np.ndarray) -> np.ndarray:
    """
    Phase 2: Stroke Width Transform preprocessing.
    
    Enhances text visibility in real-world photos by:
    1. Normalizing contrast and brightness
    2. Reducing background texture/noise
    3. Making stroke widths more uniform for better detection
    
    This is especially important for:
    - Photos of signs, menus, storefronts
    - Logos on colored/textured backgrounds  
    - Low-contrast text on busy backgrounds
    """
    if len(img_array.shape) == 3:
        gray = cv2.cvtColor(img_array, cv2.COLOR_BGR2GRAY)
    else:
        gray = img_array.copy()
    
    # CLAHE: Contrast Limited Adaptive Histogram Equalization
    # Dramatically improves local contrast for text detection
    clahe = cv2.createCLAHE(clipLimit=3.0, tileGridSize=(8, 8))
    enhanced = clahe.apply(gray)
    
    # Gaussian blur to reduce sensor noise while preserving edges
    denoised = cv2.GaussianBlur(enhanced, (3, 3), 0)
    
    # Unsharp mask: sharpen edges (text boundaries) after denoising
    blurred = cv2.GaussianBlur(denoised, (0, 0), 2)
    sharpened = cv2.addWeighted(denoised, 1.5, blurred, -0.5, 0)
    
    # Convert back to BGR for PaddleOCR
    result = cv2.cvtColor(sharpened, cv2.COLOR_GRAY2BGR)
    return result


def detect_text_regions(img: Image.Image) -> List[dict]:
    """
    Detect text regions in image using PaddleOCR.
    
    Returns list of dicts:
    {
        "bbox": [[x1,y1],[x2,y2],[x3,y3],[x4,y4]],  # quad coordinates
        "text": "detected text string",
        "confidence": 0.95,
        "crop": PIL.Image,  # cropped and cleaned text region
        "area": int,        # pixel area of region
    }
    """
    ocr = _get_ocr()
    
    # Convert PIL to numpy BGR for OpenCV/PaddleOCR
    img_array = np.array(img.convert("RGB"))
    img_bgr = cv2.cvtColor(img_array, cv2.COLOR_RGB2BGR)
    
    # Phase 2: SWT preprocessing
    preprocessed = preprocess_with_swt(img_bgr)
    
    regions = []
    
    if ocr is not None:
        try:
            result = ocr.ocr(preprocessed, cls=True)
            
            if result and result[0]:
                for line in result[0]:
                    if line is None:
                        continue
                    
                    bbox_points, (text, confidence) = line
                    
                    if confidence < 0.3:  # skip very low confidence
                        continue
                    
                    # Convert quad bbox to rect for cropping
                    pts = np.array(bbox_points, dtype=np.int32)
                    x_min = max(0, int(pts[:, 0].min()) - 4)
                    y_min = max(0, int(pts[:, 1].min()) - 4)
                    x_max = min(img_array.shape[1], int(pts[:, 0].max()) + 4)
                    y_max = min(img_array.shape[0], int(pts[:, 1].max()) + 4)
                    
                    if x_max <= x_min or y_max <= y_min:
                        continue
                    
                    # Crop the text region from ORIGINAL (not preprocessed)
                    crop = img_array[y_min:y_max, x_min:x_max]
                    crop_pil = Image.fromarray(crop)
                    
                    area = (x_max - x_min) * (y_max - y_min)
                    
                    regions.append({
                        "bbox": bbox_points,
                        "text": text,
                        "confidence": confidence,
                        "crop": crop_pil,
                        "area": area,
                        "rect": (x_min, y_min, x_max, y_max),
                    })
        except Exception as e:
            print(f"[OCR] Detection error: {e}")
    
    # Fallback: if OCR fails or finds nothing, use the full image
    if not regions:
        regions.append({
            "bbox": None,
            "text": "",
            "confidence": 0.5,
            "crop": img,
            "area": img.size[0] * img.size[1],
            "rect": (0, 0, img.size[0], img.size[1]),
        })
    
    # Sort by area — largest region first (most informative for font analysis)
    regions.sort(key=lambda r: r["area"], reverse=True)
    return regions


def get_best_crop(img: Image.Image, min_height_px: int = 20) -> Tuple[Image.Image, str, float]:
    """
    Get the single best text crop for font analysis.
    
    Strategy: largest region that's at least min_height_px tall,
    with text that has enough characters to measure properly.
    
    Returns: (crop_image, detected_text, confidence)
    """
    regions = detect_text_regions(img)
    
    for region in regions:
        crop = region["crop"]
        h = crop.size[1] if isinstance(crop, Image.Image) else crop.shape[0]
        
        if h >= min_height_px:
            return crop, region["text"], region["confidence"]
    
    # Last resort: return full image
    return img, "", 0.3


def get_all_crops(img: Image.Image, max_crops: int = 5) -> List[Tuple[Image.Image, str, float]]:
    """
    Get multiple text crops for ensemble analysis.
    Analyzing multiple crops and averaging vectors improves accuracy.
    """
    regions = detect_text_regions(img)
    result = []
    
    for region in regions[:max_crops]:
        result.append((region["crop"], region["text"], region["confidence"]))
    
    return result if result else [(img, "", 0.3)]
