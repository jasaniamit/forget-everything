"""
storia_infer.py — Standalone font classifier using Storia AI's pretrained ONNX model.
No dependency on train.py or tensorboard.

Usage:
    python storia_infer.py --image path/to/image.png
    python storia_infer.py --data_folder path/to/folder/
"""

import argparse
import csv
import os
import sys
import numpy as np
import onnxruntime as ort
import yaml
from PIL import Image
import huggingface_hub


# ── The two transforms copied directly from Storia's train.py ────────────────
# (so we don't need to import train.py and its heavy torch/tensorboard deps)

class ResizeWithPad:
    """Resize image to new_shape while maintaining aspect ratio, pad with white."""
    def __init__(self, new_shape, padding_color=(255, 255, 255)):
        self.new_shape = new_shape
        self.padding_color = padding_color

    def __call__(self, image, **kwargs):
        original_shape = (image.shape[1], image.shape[0])
        ratio = float(max(self.new_shape)) / max(original_shape)
        new_size = tuple([int(x * ratio) for x in original_shape])
        # Resize
        from PIL import Image as PILImage
        img_pil = PILImage.fromarray(image)
        img_pil = img_pil.resize(new_size, PILImage.LANCZOS)
        image = np.array(img_pil)

        # Pad to square
        delta_w = self.new_shape[1] - new_size[0]
        delta_h = self.new_shape[0] - new_size[1]
        top, bottom = delta_h // 2, delta_h - (delta_h // 2)
        left, right  = delta_w // 2, delta_w - (delta_w // 2)
        import cv2
        image = cv2.copyMakeBorder(
            image, top, bottom, left, right,
            cv2.BORDER_CONSTANT, value=list(self.padding_color)
        )
        return image


class CutMax:
    """Crop the longest side to max_size."""
    def __init__(self, max_size):
        self.max_size = max_size

    def __call__(self, image, **kwargs):
        h, w = image.shape[:2]
        if max(h, w) <= self.max_size:
            return image
        if h > w:
            return image[:self.max_size, :, :]
        else:
            return image[:, :self.max_size, :]


def softmax(x):
    e_x = np.exp(x - np.max(x))
    return e_x / e_x.sum()


def normalize(image):
    """ImageNet normalization."""
    mean = np.array([0.485, 0.456, 0.406], dtype=np.float32)
    std  = np.array([0.229, 0.224, 0.225], dtype=np.float32)
    image = image.astype(np.float32) / 255.0
    image = (image - mean) / std
    return image


def preprocess(image_path, input_size):
    """Load and preprocess an image for the ONNX model."""
    img = np.array(Image.open(image_path).convert("RGB"))
    img = CutMax(1024)(img)
    img = ResizeWithPad((input_size, input_size))(img)
    img = normalize(img)
    img = np.transpose(img, (2, 0, 1))   # HWC → CHW
    img = np.expand_dims(img, 0)          # add batch dim
    return img.astype(np.float32)


def load_model():
    """Download model from HuggingFace (once) and return ONNX session + config."""
    print("Downloading Storia model from HuggingFace (first time only ~50MB)...")
    config_path = huggingface_hub.hf_hub_download(
        repo_id="storia/font-classify-onnx", filename="model_config.yaml"
    )
    model_path = huggingface_hub.hf_hub_download(
        repo_id="storia/font-classify-onnx", filename="model.onnx"
    )
    with open(config_path, "r") as f:
        config = yaml.safe_load(f)

    session = ort.InferenceSession(model_path)
    print("Model loaded ✓")
    return session, config


def load_mapping(mapping_path="google_fonts_mapping.tsv"):
    """Load Google Fonts name mapping."""
    mapping = {}
    if not os.path.exists(mapping_path):
        print(f"Warning: {mapping_path} not found, font names will be raw class names")
        return mapping
    with open(mapping_path, "r") as f:
        reader = csv.reader(f, delimiter="\t")
        for i, row in enumerate(reader):
            if i > 0 and len(row) >= 2:
                filename, font_name = row[0], row[1]
                mapping[filename] = font_name
    return mapping


def classify_image(image_path, session, config, mapping, top_k=5):
    """
    Classify a single image.
    Returns list of (font_name, confidence_pct) tuples, best first.
    """
    input_size = config["size"]
    classnames  = config["classnames"]

    img = preprocess(image_path, input_size)
    logits = session.run(None, {"input": img})[0][0]
    probs  = softmax(logits)

    # Top-k results
    top_indices = np.argsort(probs)[::-1][:top_k]
    results = []
    for idx in top_indices:
        raw_name   = classnames[idx]
        font_name  = mapping.get(raw_name, raw_name)
        confidence = float(probs[idx]) * 100
        results.append((font_name, round(confidence, 2)))

    return results


def main():
    parser = argparse.ArgumentParser(description="Storia font classifier")
    parser.add_argument("--image",       type=str, help="Single image path")
    parser.add_argument("--data_folder", type=str, help="Folder of images")
    parser.add_argument("--top_k",       type=int, default=5)
    parser.add_argument("--mapping",     type=str, default="google_fonts_mapping.tsv")
    args = parser.parse_args()

    if not args.image and not args.data_folder:
        print("Error: provide --image or --data_folder")
        sys.exit(1)

    session, config = load_model()
    mapping = load_mapping(args.mapping)

    images = []
    if args.image:
        images = [args.image]
    elif args.data_folder:
        exts = {".png", ".jpg", ".jpeg", ".webp", ".bmp"}
        images = [
            os.path.join(args.data_folder, f)
            for f in os.listdir(args.data_folder)
            if os.path.splitext(f)[1].lower() in exts
        ]
        if not images:
            print(f"No images found in {args.data_folder}")
            sys.exit(1)

    for img_path in images:
        print(f"\n{'='*50}")
        print(f"Image: {os.path.basename(img_path)}")
        print(f"{'='*50}")
        try:
            results = classify_image(img_path, session, config, mapping, args.top_k)
            for i, (name, conf) in enumerate(results, 1):
                bar = "█" * int(conf / 5)
                print(f"  #{i}  {name:<35} {conf:5.1f}%  {bar}")
        except Exception as e:
            print(f"  Error: {e}")


if __name__ == "__main__":
    main()
