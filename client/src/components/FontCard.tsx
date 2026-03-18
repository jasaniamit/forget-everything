import { Link } from "wouter";
import { Font } from "@shared/schema";
import { ArrowDown, ExternalLink } from "lucide-react";
import { motion } from "framer-motion";
import { useLoadFont } from "@/hooks/use-load-font";

interface FontCardProps {
  font: Font;
  previewText?: string;
  fontSize?: number;
  color?: string;
  index?: number;
  previewWeight?: number;
}

// ── Derive the best CSS weight to showcase a font ────────────────────────────
// Shows the font's most distinctive weight — Bold for display, Light for
// elegant serifs, Regular for body fonts.
const WEIGHT_NUM: Record<string, number> = {
  "Thin": 100, "Extra Light": 200, "Light": 300,
  "Regular": 400, "Medium": 500, "Semibold": 600,
  "Bold": 700, "Extra Bold": 800, "Black": 900,
};

function getShowcaseWeight(font: Font, activeFilterWeight?: number): number {
  // If user has a weight filter active, respect it
  if (activeFilterWeight && activeFilterWeight !== 400) return activeFilterWeight;

  // Parse available weights from DB
  let variants: string[] = [];
  try { variants = font.weight ? JSON.parse(font.weight) : []; } catch {}
  const nums = variants.map(v => WEIGHT_NUM[v]).filter(Boolean);
  if (nums.length === 0) return 400;

  // Showcase logic based on font category/contrast:
  // High contrast display fonts → show Bold for impact
  // Elegant serifs with low x-height → show Light/Regular for elegance
  // Handwriting/script → always Regular (heavy weights look bad)
  const cat = (font.category ?? "").toLowerCase();
  const contrast = font.contrast ?? "Medium";

  if (cat.includes("handwriting") || cat.includes("script")) {
    return nums.includes(400) ? 400 : nums[Math.floor(nums.length / 2)];
  }
  if (contrast === "High") {
    // Show bold weight to highlight the thick/thin contrast
    const bold = nums.filter(n => n >= 600);
    return bold.length > 0 ? Math.min(...bold) : nums[nums.length - 1];
  }
  if (contrast === "Low" && nums.filter(n => n >= 700).length > 0) {
    // Geometric sans — show Black/ExtraBold for punchy display
    return Math.max(...nums.filter(n => n >= 700));
  }
  // Default: show the middle-most available weight
  return nums[Math.floor(nums.length / 2)] ?? 400;
}

// ── Derive a font-size that fits the card nicely ─────────────────────────────
// Wide/expanded fonts get smaller size, narrow/condensed get bigger
function getShowcaseFontSize(font: Font, userFontSize?: number): number {
  if (userFontSize && userFontSize !== 40) return userFontSize; // respect user slider
  const width = font.width ?? "Normal";
  if (width === "Expanded") return 34;
  if (width === "Condensed") return 46;
  return 40;
}

// ── Derive letter-spacing to complement the font style ───────────────────────
function getLetterSpacing(font: Font): string {
  const cat = (font.category ?? "").toLowerCase();
  const xHeight = font.xHeight ?? "Medium";
  if (cat.includes("handwriting") || cat.includes("script")) return "0.01em";
  if (xHeight === "Low") return "0.02em"; // elegant serifs breathe more
  if (font.width === "Condensed") return "-0.01em";
  return "normal";
}

// ── License label helper ─────────────────────────────────────────────────────
function getLicenseLabel(font: Font): { text: string; isPersonal: boolean } {
  const lt = (font as any).licenseType ?? "free";
  if (lt === "personal") return { text: "PERSONAL USE", isPersonal: true };
  if (lt === "open-source") return { text: "OPEN SOURCE", isPersonal: false };
  return { text: "100% FREE", isPersonal: false };
}

export function FontCard({
  font, previewText, fontSize, color, index = 0, previewWeight,
}: FontCardProps) {
  useLoadFont(font.id, font.family, font.weight ?? undefined);

  const showcaseWeight  = getShowcaseWeight(font, previewWeight);
  const showcaseSize    = getShowcaseFontSize(font, fontSize);
  const letterSpacing   = getLetterSpacing(font);
  const { text: licenseText, isPersonal } = getLicenseLabel(font);

  const commercialUrl = (font as any).commercialUrl || font.fileUrl;

  const handleDownload = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const link = document.createElement("a");
    link.href = `/api/fonts/${font.id}/download`;
    link.target = "_blank";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -2 }}
      transition={{ duration: 0.4, delay: index * 0.05, ease: [0.25, 0.1, 0.25, 1] }}
      className="group relative bg-white rounded-2xl border border-border/30 hover:border-primary/20 hover:shadow-2xl hover:shadow-primary/5 transition-all duration-300 py-6 px-8 mb-4 overflow-hidden"
    >
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
      <div className="flex items-center justify-between gap-8">
        <Link href={`/font/${font.id}`} className="flex-1 space-y-4 min-w-0">

          {/* Preview — each font renders at its showcase weight/size */}
          <div className="flex items-baseline gap-4">
            <span
              className="text-foreground leading-tight"
              style={{
                fontFamily:    font.family,
                fontWeight:    showcaseWeight,
                fontSize:      `${showcaseSize}px`,
                letterSpacing: letterSpacing,
                color:         color || undefined,
              }}
            >
              {previewText || "The quick brown fox jumps over the lazy dog"}
            </span>
          </div>

          {/* Metadata row */}
          <div className="flex flex-wrap items-center gap-3 text-[10px] font-normal text-muted-foreground/60">
            <span>{font.name}</span>
            <span className="w-1 h-1 bg-muted-foreground/30 rounded-full" />
            <span>{font.designer || "Unknown"}</span>
            <span className="w-1 h-1 bg-muted-foreground/30 rounded-full" />
            <span>{font.familySize != null ? `${font.familySize} Style${font.familySize !== 1 ? "s" : ""}` : "1 Style"}</span>
            <span className="w-1 h-1 bg-muted-foreground/30 rounded-full" />
            <span className="text-primary/80 capitalize">{font.category || "Sans Serif"}</span>
            {/* Show which weight is being previewed */}
            {showcaseWeight !== 400 && (
              <>
                <span className="w-1 h-1 bg-muted-foreground/30 rounded-full" />
                <span className="text-muted-foreground/40">
                  {showcaseWeight === 100 ? "Thin" :
                   showcaseWeight === 200 ? "Extra Light" :
                   showcaseWeight === 300 ? "Light" :
                   showcaseWeight === 500 ? "Medium" :
                   showcaseWeight === 600 ? "Semibold" :
                   showcaseWeight === 700 ? "Bold" :
                   showcaseWeight === 800 ? "Extra Bold" :
                   showcaseWeight === 900 ? "Black" : "Regular"}
                </span>
              </>
            )}
          </div>
        </Link>

        {/* Download + License */}
        <div className="flex flex-col items-center gap-1.5 shrink-0 z-10">
          <button
            onClick={handleDownload}
            className="flex flex-col items-center gap-2 group/btn"
          >
            <div className="bg-secondary/50 p-3 rounded-full group-hover/btn:bg-primary group-hover/btn:shadow-lg group-hover/btn:shadow-primary/25 group-hover/btn:scale-110 transition-all duration-300">
              <ArrowDown className="h-6 w-6 text-muted-foreground group-hover/btn:text-white transition-colors" />
            </div>
            <span className={`text-[9px] font-black uppercase tracking-widest transition-colors ${
              isPersonal
                ? "text-amber-500/70 group-hover/btn:text-amber-600"
                : "text-muted-foreground/40 group-hover/btn:text-primary/60"
            }`}>
              {licenseText}
            </span>
          </button>
          {/* Buy Commercial License link for personal-use-only fonts */}
          {isPersonal && (
            <a
              href={commercialUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="flex items-center gap-1 text-[8px] font-bold text-amber-600/60 hover:text-amber-700 transition-colors px-2 py-0.5 rounded hover:bg-amber-50"
            >
              Buy Commercial License
              <ExternalLink className="h-2.5 w-2.5" />
            </a>
          )}
        </div>
      </div>
    </motion.div>
  );
}

