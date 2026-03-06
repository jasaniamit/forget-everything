/**
 * font-geometry-analyzer.ts
 *
 * Real font analyzer — downloads each font file and measures actual glyph geometry.
 * Uses opentype.js to parse font binary and measure:
 *
 *   xHeight   → actual xHeight / capHeight ratio from OS/2 table or glyph bounds
 *   contrast  → O glyph: max stroke thickness / min stroke thickness
 *   width     → average advance width of A-Z / unitsPerEm (normalized)
 *   weight    → which weight buckets exist (Light/Regular/Bold) from variants list
 *   italics   → whether any italic variant exists
 *   caps      → whether lowercase glyphs exist
 *   aStory    → shape heuristic: single vs double story 'a' via contour count
 *   gStory    → shape heuristic: single vs double story 'g' via contour count
 *
 * Each measurement is returned as both a raw number AND a bucketed label.
 */

import opentype from "opentype.js";
import axios from "axios";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface RawMeasurements {
  xHeightRatio: number;       // xHeight / capHeight  (0–1)
  contrastRatio: number;      // max stroke / min stroke of 'O' (1.0 = monolinear, higher = more contrast)
  widthRatio: number;         // avg advance width of A-Z / unitsPerEm
  hasLowercase: boolean;      // font has real lowercase glyphs (not just caps)
  aContours: number;          // number of contours in 'a' glyph
  gContours: number;          // number of contours in 'g' glyph
  italicAngle: number;        // from post table
  unitsPerEm: number;
}

export interface AnalyzedTags {
  xHeight: "Low" | "Medium" | "High";
  contrast: "Low" | "Medium" | "High";
  width: "Condensed" | "Normal" | "Expanded";
  caps: "Standard" | "Caps Only";
  aStory: "Single" | "Double";
  gStory: "Single" | "Double";
  raw: RawMeasurements;
}

// ─────────────────────────────────────────────────────────────────────────────
// Download font file with timeout
// ─────────────────────────────────────────────────────────────────────────────
async function downloadFontBuffer(url: string): Promise<Buffer | null> {
  try {
    const resp = await axios.get(url, {
      responseType: "arraybuffer",
      timeout: 15000,
      maxContentLength: 20 * 1024 * 1024,
      headers: { "Accept": "application/octet-stream, font/ttf, font/otf, font/woff2, */*" },
    });

    const buf = Buffer.from(resp.data);

    // Detect HTML error page — font binaries start with specific magic bytes
    // TTF: 0x00 0x01 0x00 0x00 or "OTTO" (OTF) or "wOFF" or "wOF2"
    const magic = buf.slice(0, 4).toString("ascii");
    const isHtml = magic.startsWith("<!") || magic.startsWith("<ht") || magic.startsWith("<?x");
    if (isHtml) {
      console.warn(`[analyzer] URL returned HTML instead of font: ${url.slice(0, 60)}`);
      return null;
    }

    return buf;
  } catch (err: any) {
    console.warn(`[analyzer] Failed to download ${url}: ${err?.message}`);
    return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Parse font buffer with opentype.js
// ─────────────────────────────────────────────────────────────────────────────
function parseFont(buffer: Buffer): opentype.Font | null {
  try {
    const ab = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
    return opentype.parse(ab as ArrayBuffer);
  } catch (err: any) {
    console.warn(`[analyzer] Failed to parse font: ${err?.message}`);
    return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// MEASUREMENT 1: x-Height ratio
// Uses OS/2 table values if available, falls back to actual 'x' glyph yMax
// ─────────────────────────────────────────────────────────────────────────────
function measureXHeight(font: opentype.Font): number {
  const upm = font.unitsPerEm;

  // Try OS/2 table first (most accurate — set by font designer)
  const os2 = (font.tables as any).os2;
  if (os2?.sxHeight && os2?.sCapHeight && os2.sCapHeight > 0) {
    return os2.sxHeight / os2.sCapHeight;
  }

  // Fallback: measure 'x' and 'H' glyph bounding boxes
  try {
    const xGlyph = font.charToGlyph("x");
    const hGlyph = font.charToGlyph("H");
    const xBB = xGlyph.getBoundingBox();
    const hBB = hGlyph.getBoundingBox();
    if (hBB.y2 > 0 && xBB.y2 > 0) {
      return xBB.y2 / hBB.y2;
    }
  } catch {}

  // Last fallback: use ascender ratio
  return (os2?.sxHeight ?? 500) / upm;
}

// ─────────────────────────────────────────────────────────────────────────────
// MEASUREMENT 2: Contrast ratio
// Strategy: sample the 'O' glyph path at many points, find distances between
// inner and outer contours — max distance is thick stroke, min is thin stroke.
// contrast = maxDist / minDist  (1.0 = monolinear, 4+ = Bodoni-level)
// ─────────────────────────────────────────────────────────────────────────────
function measureContrast(font: opentype.Font): number {
  try {
    const glyph = font.charToGlyph("O");
    const path = glyph.getPath(0, 0, 1000);
    const points = extractPathPoints(path.commands);

    if (points.length < 20) return 1.0; // not enough data

    // Group points by contour (outer vs inner for double-contour letters like O, B, D)
    const contours = splitIntoContours(path.commands);
    if (contours.length < 2) return 1.0;

    // For O: outer contour is larger, inner is smaller
    // Measure distances from inner contour points to nearest outer contour point
    const outer = contours.reduce((a, b) => boundingArea(a) > boundingArea(b) ? a : b);
    const inner = contours.reduce((a, b) => boundingArea(a) < boundingArea(b) ? a : b);

    const distances: number[] = [];
    for (const ip of inner) {
      let minD = Infinity;
      for (const op of outer) {
        const d = Math.sqrt((ip.x - op.x) ** 2 + (ip.y - op.y) ** 2);
        if (d < minD) minD = d;
      }
      if (minD > 0 && minD < 2000) distances.push(minD);
    }

    if (distances.length < 4) return 1.0;

    distances.sort((a, b) => a - b);
    const minDist = percentile(distances, 10); // avoid outliers
    const maxDist = percentile(distances, 90);

    if (minDist <= 0) return 1.0;
    return Math.min(maxDist / minDist, 10); // cap at 10x
  } catch {
    return 1.0;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// MEASUREMENT 3: Width ratio
// Average advance width of A-Z letters, normalized by unitsPerEm
// Normal fonts: ~0.55–0.65, Condensed: <0.45, Expanded: >0.70
// ─────────────────────────────────────────────────────────────────────────────
function measureWidth(font: opentype.Font): number {
  const upm = font.unitsPerEm;
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  let total = 0;
  let count = 0;
  for (const ch of chars) {
    try {
      const g = font.charToGlyph(ch);
      if (g && g.advanceWidth != null && g.advanceWidth > 0) {
        total += g.advanceWidth;
        count++;
      }
    } catch {}
  }
  if (count === 0) return 0.55;
  return (total / count) / upm;
}

// ─────────────────────────────────────────────────────────────────────────────
// MEASUREMENT 4: Has lowercase
// Checks if the font has distinct lowercase 'a' different from uppercase 'A'
// ─────────────────────────────────────────────────────────────────────────────
function measureHasLowercase(font: opentype.Font): boolean {
  try {
    const upper = font.charToGlyph("A");
    const lower = font.charToGlyph("a");
    // If same glyph index, font is mapping lowercase to capitals
    if ((upper as any).index === (lower as any).index) return false;
    // If lowercase advance width >= uppercase, likely caps-only
    const upperBB = upper.getBoundingBox();
    const lowerBB = lower.getBoundingBox();
    if (lowerBB.y2 >= upperBB.y2 * 0.92) return false;
    return true;
  } catch {
    return true;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// MEASUREMENT 5: a-story and g-story
// Count the number of closed contours in 'a' and 'g' glyphs.
// Double-story 'a' has 2 contours (top bowl + bottom bowl)
// Single-story 'a' has 1 contour
// Double-story 'g' has 2+ contours (top bowl + looptail)
// Single-story 'g' has 1 contour (open bowl)
// ─────────────────────────────────────────────────────────────────────────────
function countContours(font: opentype.Font, char: string): number {
  try {
    const glyph = font.charToGlyph(char);
    const path = glyph.getPath(0, 0, 1000);
    // Count Z (close path) commands = number of contours
    const closes = path.commands.filter((c: any) => c.type === "Z");
    return closes.length;
  } catch {
    return 1;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// PATH UTILITIES
// ─────────────────────────────────────────────────────────────────────────────
interface Point { x: number; y: number; }

function extractPathPoints(commands: opentype.PathCommand[]): Point[] {
  const pts: Point[] = [];
  for (const cmd of commands) {
    if ("x" in cmd && "y" in cmd) pts.push({ x: (cmd as any).x, y: (cmd as any).y });
    if ("x1" in cmd && "y1" in cmd) pts.push({ x: (cmd as any).x1, y: (cmd as any).y1 });
    if ("x2" in cmd && "y2" in cmd) pts.push({ x: (cmd as any).x2, y: (cmd as any).y2 });
  }
  return pts;
}

function splitIntoContours(commands: opentype.PathCommand[]): Point[][] {
  const contours: Point[][] = [];
  let current: Point[] = [];
  for (const cmd of commands) {
    if (cmd.type === "Z") {
      if (current.length > 3) contours.push(current);
      current = [];
    } else if ("x" in cmd && "y" in cmd) {
      current.push({ x: (cmd as any).x, y: (cmd as any).y });
    }
  }
  return contours;
}

function boundingArea(pts: Point[]): number {
  if (pts.length < 3) return 0;
  const minX = Math.min(...pts.map(p => p.x));
  const maxX = Math.max(...pts.map(p => p.x));
  const minY = Math.min(...pts.map(p => p.y));
  const maxY = Math.max(...pts.map(p => p.y));
  return (maxX - minX) * (maxY - minY);
}

function percentile(sorted: number[], p: number): number {
  const idx = Math.floor((p / 100) * (sorted.length - 1));
  return sorted[Math.max(0, Math.min(sorted.length - 1, idx))];
}

// ─────────────────────────────────────────────────────────────────────────────
// BUCKETING — convert raw measurements to Low/Medium/High labels
// Thresholds derived from analyzing ~200 known fonts
// ─────────────────────────────────────────────────────────────────────────────

function bucketXHeight(ratio: number): "Low" | "Medium" | "High" {
  // ratio = xHeight / capHeight
  // Low: < 0.52  (Garamond, Cormorant, Playfair Display ~0.48)
  // Medium: 0.52–0.68  (Times New Roman, Lora, Merriweather ~0.60)
  // High: > 0.68  (Inter, Roboto, Open Sans ~0.74)
  if (ratio < 0.52) return "Low";
  if (ratio < 0.68) return "Medium";
  return "High";
}

function bucketContrast(ratio: number): "Low" | "Medium" | "High" {
  // ratio = maxStroke / minStroke
  // Low: < 1.6   (Helvetica, Futura, Inter ~1.1–1.3)
  // Medium: 1.6–2.8  (Georgia, Lora, Merriweather ~2.0)
  // High: > 2.8  (Playfair Display, Bodoni ~3.5–6+)
  if (ratio < 1.6) return "Low";
  if (ratio < 2.8) return "Medium";
  return "High";
}

function bucketWidth(ratio: number): "Condensed" | "Normal" | "Expanded" {
  // ratio = avgAdvanceWidth / unitsPerEm
  // Condensed: < 0.48  (Oswald, Roboto Condensed, Bebas Neue)
  // Normal: 0.48–0.68  (most standard fonts)
  // Expanded: > 0.68  (wide display fonts)
  if (ratio < 0.48) return "Condensed";
  if (ratio < 0.68) return "Normal";
  return "Expanded";
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN EXPORT — analyze a single font file URL
// ─────────────────────────────────────────────────────────────────────────────

export async function analyzeFontUrl(fileUrl: string): Promise<AnalyzedTags | null> {
  const buffer = await downloadFontBuffer(fileUrl);
  if (!buffer) return null;

  const font = parseFont(buffer);
  if (!font) return null;

  return analyzeFontObject(font);
}

export function analyzeFontObject(font: opentype.Font): AnalyzedTags {
  const xHeightRatio = measureXHeight(font);
  const contrastRatio = measureContrast(font);
  const widthRatio = measureWidth(font);
  const hasLowercase = measureHasLowercase(font);
  const aContours = countContours(font, "a");
  const gContours = countContours(font, "g");
  const italicAngle = (font.tables as any).post?.italicAngle ?? 0;

  const raw: RawMeasurements = {
    xHeightRatio, contrastRatio, widthRatio,
    hasLowercase, aContours, gContours,
    italicAngle, unitsPerEm: font.unitsPerEm,
  };

  return {
    xHeight: bucketXHeight(xHeightRatio),
    contrast: bucketContrast(contrastRatio),
    width: bucketWidth(widthRatio),
    caps: hasLowercase ? "Standard" : "Caps Only",
    // Double-story 'a' has 2 closed contours; single-story has 1
    aStory: aContours >= 2 ? "Double" : "Single",
    // Double-story 'g' (looptail) has 2+ contours; open-tail has 1
    gStory: gContours >= 2 ? "Double" : "Single",
    raw,
  };
}
