"""
geometry_fingerprint.py — Phase 1: Glyph Geometry Fingerprinting

Measures typographic properties directly from glyph pixel data.
Mirrors the logic in font-geometry-analyzer.ts but works on
rasterized glyph images instead of font file outlines.

Output: 12-dimensional vector
  [0]  x_height_ratio      — lowercase height / uppercase height
  [1]  contrast_ratio      — thick stroke / thin stroke width
  [2]  width_ratio         — average advance width ratio
  [3]  stroke_width_norm   — normalized dominant stroke width
  [4]  serif_score         — 0.0 (none) to 1.0 (strong serifs)
  [5]  bowl_openness       — aperture openness (open vs closed)
  [6]  weight_darkness     — ink density (light=0 to black=1)
  [7]  ascender_ratio      — ascender height / cap height
  [8]  descender_ratio     — descender depth / cap height
  [9]  cap_height_ratio    — cap height / total em
  [10] horizontal_stress   — stroke angle bias (0=vertical, 1=diagonal)
  [11] regularity          — stroke width consistency (high=monoline)
"""

import cv2
import numpy as np
from PIL import Image
from typing import Optional
import warnings
warnings.filterwarnings("ignore")


def _to_gray_binary(img: np.ndarray, invert: bool = True) -> np.ndarray:
    """Convert image to clean binary (black glyph on white background)."""
    if len(img.shape) == 3:
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    else:
        gray = img.copy()

    # Adaptive threshold handles uneven lighting / photos
    binary = cv2.adaptiveThreshold(
        gray, 255,
        cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
        cv2.THRESH_BINARY,
        blockSize=15, C=8
    )
    if invert:
        binary = cv2.bitwise_not(binary)
    return binary


def stroke_width_transform(binary: np.ndarray) -> np.ndarray:
    """
    Phase 2: Stroke Width Transform (SWT)
    
    For each foreground pixel, compute the width of the stroke it belongs to
    by casting rays perpendicular to the gradient direction until hitting
    another edge. Returns a map where each pixel contains its stroke width.
    
    This is the key technique that makes font recognition work on real photos —
    it's invariant to font size, rotation, and background texture.
    """
    # Edge detection
    edges = cv2.Canny(binary, 50, 150)
    
    # Gradient direction
    grad_x = cv2.Sobel(binary.astype(np.float32), cv2.CV_32F, 1, 0, ksize=3)
    grad_y = cv2.Sobel(binary.astype(np.float32), cv2.CV_32F, 0, 1, ksize=3)
    
    h, w = binary.shape
    swt_map = np.full((h, w), np.inf, dtype=np.float32)
    
    # Ray casting from each edge pixel
    edge_pixels = np.argwhere(edges > 0)
    
    for (r, c) in edge_pixels:
        gx = grad_x[r, c]
        gy = grad_y[r, c]
        mag = np.sqrt(gx**2 + gy**2)
        if mag < 1e-6:
            continue
        
        # Normalized gradient direction
        dx, dy = gx / mag, gy / mag
        
        # Cast ray in gradient direction
        ray_r, ray_c = float(r), float(c)
        ray_pixels = [(r, c)]
        
        for _ in range(70):  # max stroke width = 70px
            ray_r += dy
            ray_c += dx
            nr, nc = int(round(ray_r)), int(round(ray_c))
            if nr < 0 or nr >= h or nc < 0 or nc >= w:
                break
            ray_pixels.append((nr, nc))
            if edges[nr, nc] > 0:
                # Check opposite gradient direction (confirms stroke boundary)
                opp_gx = grad_x[nr, nc]
                opp_gy = grad_y[nr, nc]
                opp_mag = np.sqrt(opp_gx**2 + opp_gy**2)
                if opp_mag > 1e-6:
                    cos_angle = (dx * opp_gx + dy * opp_gy) / opp_mag
                    if cos_angle < -0.7:  # roughly opposite direction
                        stroke_w = len(ray_pixels)
                        for pr, pc in ray_pixels:
                            if 0 <= pr < h and 0 <= pc < w:
                                swt_map[pr, pc] = min(swt_map[pr, pc], stroke_w)
                break
    
    # Replace inf with 0
    swt_map[swt_map == np.inf] = 0
    return swt_map


def measure_x_height_ratio(binary: np.ndarray) -> float:
    """
    Measure x-height ratio by finding horizontal projection peaks.
    Lowercase letters (x, o, a) sit between baseline and x-height.
    Uppercase letters reach cap height.
    """
    # Horizontal projection profile
    proj = np.sum(binary > 0, axis=1).astype(np.float32)
    
    if proj.max() == 0:
        return 0.5
    
    # Smooth the profile
    proj = np.convolve(proj, np.ones(3) / 3, mode='same')
    
    h = len(proj)
    threshold = proj.max() * 0.15
    
    # Find top and bottom of text
    text_rows = np.where(proj > threshold)[0]
    if len(text_rows) < 10:
        return 0.5
    
    top = text_rows[0]
    bottom = text_rows[-1]
    total_height = bottom - top
    
    if total_height < 5:
        return 0.5
    
    # Find the baseline region — highest density in lower portion
    lower_half = proj[top + total_height // 2:]
    if len(lower_half) == 0:
        return 0.5
    
    # X-height is typically 0.45-0.75 of cap height
    # We estimate by finding density changes
    cumulative = np.cumsum(proj[top:bottom])
    total_ink = cumulative[-1]
    if total_ink == 0:
        return 0.5
    
    # Find where 60% of ink density is reached (proxy for x-height zone)
    midpoint_idx = np.searchsorted(cumulative, total_ink * 0.6)
    x_height_approx = (total_height - midpoint_idx) / total_height
    
    return float(np.clip(x_height_approx, 0.3, 0.9))


def measure_contrast_ratio(swt_map: np.ndarray) -> float:
    """
    Measure stroke contrast using SWT results.
    High contrast = large difference between thick and thin strokes.
    Low contrast = all strokes roughly same width (geometric/monoline).
    """
    strokes = swt_map[swt_map > 0]
    if len(strokes) < 10:
        return 1.0
    
    # Contrast = ratio of 90th percentile to 10th percentile stroke width
    p10 = float(np.percentile(strokes, 10))
    p90 = float(np.percentile(strokes, 90))
    
    if p10 < 0.5:
        p10 = 0.5
    
    ratio = p90 / p10
    return float(np.clip(ratio, 1.0, 10.0))


def measure_serif_score(binary: np.ndarray, swt_map: np.ndarray) -> float:
    """
    Detect serif presence by looking for horizontal stroke terminations
    (serifs are small horizontal strokes at the ends of vertical strokes).
    
    Method: Find stroke endpoints, check for perpendicular ink in the
    horizontal direction. More horizontal ink at endpoints = more serif.
    """
    # Find thin horizontal structures at text boundaries
    # Serifs appear as short horizontal bars at top/bottom of vertical strokes
    
    # Horizontal run-length encoding
    h, w = binary.shape
    horizontal_runs = []
    
    for r in range(h):
        row = binary[r]
        in_run = False
        run_len = 0
        for c in range(w):
            if row[c] > 0:
                if not in_run:
                    in_run = True
                    run_len = 1
                else:
                    run_len += 1
            else:
                if in_run and 2 <= run_len <= 12:
                    horizontal_runs.append(run_len)
                in_run = False
                run_len = 0
    
    if len(horizontal_runs) == 0:
        return 0.0
    
    # Short horizontal runs at extremities suggest serifs
    short_runs = sum(1 for r in horizontal_runs if r <= 6)
    serif_ratio = short_runs / max(len(horizontal_runs), 1)
    
    return float(np.clip(serif_ratio * 2.5, 0.0, 1.0))


def measure_weight_darkness(binary: np.ndarray) -> float:
    """Ink density — proportion of dark pixels (proxy for font weight)."""
    if binary.size == 0:
        return 0.4
    ink = np.sum(binary > 0)
    total = binary.size
    return float(np.clip(ink / total, 0.0, 1.0))


def measure_regularity(swt_map: np.ndarray) -> float:
    """
    Stroke width consistency — how uniform are the stroke widths?
    High regularity = monoline (geometric sans like Futura)
    Low regularity = calligraphic variation (script, high-contrast serif)
    """
    strokes = swt_map[swt_map > 0]
    if len(strokes) < 10:
        return 0.5
    
    mean = np.mean(strokes)
    std = np.std(strokes)
    
    if mean == 0:
        return 0.5
    
    cv = std / mean  # coefficient of variation
    regularity = 1.0 - np.clip(cv / 1.5, 0.0, 1.0)
    return float(regularity)


def measure_bowl_openness(binary: np.ndarray) -> float:
    """
    Measure aperture — how open are the counters/bowls?
    Open aperture (like Gill Sans 'c'): high score
    Closed aperture (like Futura 'c' almost full circle): low score
    """
    # Count holes using contour analysis
    contours, hierarchy = cv2.findContours(
        binary, cv2.RETR_CCOMP, cv2.CHAIN_APPROX_SIMPLE
    )
    
    if hierarchy is None or len(contours) == 0:
        return 0.5
    
    # Inner contours (holes) = closed bowls
    h = hierarchy[0]
    total = len(contours)
    inner = sum(1 for i in range(len(h)) if h[i][3] >= 0)
    
    # More inner contours relative to total = more closed bowls
    closedness = inner / max(total, 1)
    openness = 1.0 - closedness
    return float(np.clip(openness, 0.0, 1.0))


def measure_horizontal_stress(binary: np.ndarray) -> float:
    """
    Stroke angle — is the thick stroke vertical or diagonal?
    Vertical stress (modern/transitional serifs): ~0.0
    Diagonal/oblique stress (humanist/old style): ~1.0
    """
    grad_x = cv2.Sobel(binary.astype(np.float32), cv2.CV_32F, 1, 0)
    grad_y = cv2.Sobel(binary.astype(np.float32), cv2.CV_32F, 0, 1)
    
    angles = np.arctan2(np.abs(grad_y), np.abs(grad_x) + 1e-6)
    
    # Horizontal dominance (low angles = horizontal = vertical stress)
    horizontal = np.mean(angles < np.pi / 4)
    return float(np.clip(1.0 - horizontal, 0.0, 1.0))


def compute_geometry_vector(img_array: np.ndarray) -> np.ndarray:
    """
    Main entry point — compute the 12-dim geometry fingerprint vector
    from a glyph image (numpy array, any size).
    
    Returns: np.ndarray of shape (12,), values in [0, 1]
    """
    # Ensure we have a usable image
    if img_array is None or img_array.size == 0:
        return np.full(12, 0.5, dtype=np.float32)
    
    # Resize to standard working size
    target_h = 128
    h, w = img_array.shape[:2]
    if h == 0 or w == 0:
        return np.full(12, 0.5, dtype=np.float32)
    
    scale = target_h / h
    target_w = max(int(w * scale), 32)
    resized = cv2.resize(img_array, (target_w, target_h))
    
    # Binarize
    binary = _to_gray_binary(resized)
    
    # SWT (Phase 2)
    swt_map = stroke_width_transform(binary)
    
    # Compute all 12 features
    x_height     = measure_x_height_ratio(binary)
    contrast     = measure_contrast_ratio(swt_map)
    stroke_w     = float(np.mean(swt_map[swt_map > 0])) / target_h if np.any(swt_map > 0) else 0.1
    serif        = measure_serif_score(binary, swt_map)
    bowl         = measure_bowl_openness(binary)
    darkness     = measure_weight_darkness(binary)
    regularity   = measure_regularity(swt_map)
    stress       = measure_horizontal_stress(binary)
    
    # Simplified height ratios (without word-level context, estimated from projection)
    proj         = np.sum(binary > 0, axis=1)
    text_rows    = np.where(proj > proj.max() * 0.1)[0] if proj.max() > 0 else np.array([0, target_h])
    total_h      = max(text_rows[-1] - text_rows[0], 1) if len(text_rows) > 1 else target_h
    
    # Contrast ratio normalized to [0,1]
    contrast_norm = np.clip((contrast - 1.0) / 9.0, 0.0, 1.0)
    
    # Width ratio: approximate from bounding box aspect
    width_ratio = np.clip(target_w / (target_h * 0.7), 0.3, 2.0) / 2.0
    
    vector = np.array([
        x_height,                                    # [0]  x-height ratio
        contrast_norm,                               # [1]  contrast
        width_ratio,                                 # [2]  width ratio
        np.clip(stroke_w * 10, 0.0, 1.0),           # [3]  stroke width (normalized)
        serif,                                       # [4]  serif score
        bowl,                                        # [5]  bowl openness
        darkness,                                    # [6]  weight/darkness
        np.clip(total_h / target_h, 0.0, 1.0),      # [7]  ascender estimate
        0.1,                                         # [8]  descender (hard without baseline)
        np.clip(total_h / target_h * 0.85, 0.0, 1.0), # [9]  cap height estimate
        stress,                                      # [10] horizontal stress
        regularity,                                  # [11] stroke regularity
    ], dtype=np.float32)
    
    return vector


def bucket_geometry_vector(vec: np.ndarray) -> dict:
    """
    Convert raw geometry vector back to human-readable property buckets.
    Used for display and for matching against DB property fields.
    """
    x_height_ratio = vec[0]
    contrast_ratio = vec[1] * 9 + 1  # denormalize
    width_ratio    = vec[2] * 2
    serif_score    = vec[4]
    darkness       = vec[6]
    regularity     = vec[11]
    
    return {
        "xHeight":  "High" if x_height_ratio > 0.68 else ("Low" if x_height_ratio < 0.52 else "Medium"),
        "contrast": "High" if contrast_ratio > 2.8  else ("Low" if contrast_ratio < 1.6  else "Medium"),
        "width":    "Expanded" if width_ratio > 0.68 else ("Condensed" if width_ratio < 0.48 else "Normal"),
        "hasSerif": serif_score > 0.4,
        "weight":   "Bold" if darkness > 0.35 else ("Light" if darkness < 0.15 else "Regular"),
        "isMonoline": regularity > 0.7,
    }
