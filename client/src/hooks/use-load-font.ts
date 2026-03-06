/**
 * useLoadFont — loads a font for preview with two-stage strategy:
 *
 * Stage 1: Try Google Fonts CSS2 API (loads all weight variants, fast CDN)
 * Stage 2: If that fails or font isn't on Google Fonts, fall back to
 *          our own /api/fonts/:id/file proxy endpoint
 *
 * This handles:
 *  - Public Google Fonts (Roboto, Inter, Playfair Display, etc.) → Stage 1
 *  - Proprietary/custom fonts (Google Sans, Product Sans, etc.) → Stage 2
 *  - Variable fonts → Stage 1 with full weight range
 */
import { useEffect } from "react";

const loaded = new Set<string>();
const failed = new Set<string>(); // fonts that failed Stage 1

const WEIGHT_MAP: Record<string, number> = {
  "Thin": 100, "Extra Light": 200, "ExtraLight": 200,
  "Light": 300, "Regular": 400, "Medium": 500,
  "Semibold": 600, "SemiBold": 600, "Bold": 700,
  "Extra Bold": 800, "ExtraBold": 800, "Black": 900,
};

function parseWeightNums(weightJson?: string): number[] {
  if (!weightJson) return [400];
  try {
    const labels: string[] = JSON.parse(weightJson);
    const nums = labels.map(l => WEIGHT_MAP[l]).filter(Boolean);
    return nums.length > 0 ? [...new Set(nums)].sort((a, b) => a - b) : [400];
  } catch { return [400]; }
}

// Load via Google Fonts CSS2 API — handles all weights in one request
function loadViaGoogleFonts(fontFamily: string, weights: number[]): HTMLLinkElement {
  const weightStr = weights.join(";");
  const familyEncoded = fontFamily.replace(/ /g, "+");
  const url = `https://fonts.googleapis.com/css2?family=${familyEncoded}:ital,wght@0,${weightStr};1,${weightStr}&display=swap`;
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = url;
  return link;
}

// Load via our own file proxy — serves the font file directly from DB/storage
function loadViaProxy(fontId: number, fontFamily: string): HTMLStyleElement {
  const style = document.createElement("style");
  style.textContent = `
    @font-face {
      font-family: '${fontFamily}';
      src: url('/api/fonts/${fontId}/file') format('truetype');
      font-display: swap;
    }
  `;
  return style;
}

export function useLoadFont(fontId: number, fontFamily: string, weightVariants?: string) {
  useEffect(() => {
    if (!fontId || !fontFamily) return;
    const key = `${fontId}`;
    if (loaded.has(key)) return;
    loaded.add(key);

    const weights = parseWeightNums(weightVariants);

    // Stage 1: Try Google Fonts
    const link = loadViaGoogleFonts(fontFamily, weights);

    link.onerror = () => {
      // Stage 2: Google Fonts failed — use our proxy
      failed.add(key);
      const style = loadViaProxy(fontId, fontFamily);
      document.head.appendChild(style);
    };

    // Also detect when Google Fonts returns a fallback/empty response
    // by checking if the font actually loaded after a short delay
    link.onload = () => {
      setTimeout(() => {
        // Test render: create a hidden span and measure — if it renders
        // at the same width as a known fallback font, GF didn't have this font
        const test = document.createElement("span");
        test.style.cssText = `
          position:absolute; visibility:hidden; pointer-events:none;
          font-family:'${fontFamily}',monospace; font-size:72px;
        `;
        test.textContent = "BESbswy";
        document.body.appendChild(test);
        const w1 = test.offsetWidth;

        test.style.fontFamily = "monospace";
        const w2 = test.offsetWidth;
        document.body.removeChild(test);

        // If widths are the same, the font didn't load — fall back to proxy
        if (w1 === w2 && !failed.has(key)) {
          failed.add(key);
          const style = loadViaProxy(fontId, fontFamily);
          document.head.appendChild(style);
        }
      }, 800);
    };

    document.head.appendChild(link);
  }, [fontId, fontFamily, weightVariants]);
}

// Get CSS font-weight number for the active filter bucket
export function getPreviewWeight(activeWeightFilter: string | null): number {
  if (!activeWeightFilter) return 400;
  try {
    const buckets: string[] = JSON.parse(activeWeightFilter);
    if (buckets.includes("Light")) return 300;
    if (buckets.includes("Bold")) return 700;
    if (buckets.includes("Regular")) return 400;
  } catch {}
  return 400;
}
