/**
 * font-auto-tagger.ts
 *
 * Smart auto-tagger for font properties.
 * Uses Google Fonts API metadata + curated per-font knowledge base.
 *
 * Properties tagged:
 *   weight       → "Light" | "Regular" | "Bold"  (which buckets the family has)
 *   width        → "Condensed" | "Normal" | "Expanded"
 *   xHeight      → "Low" | "Medium" | "High"
 *   contrast     → "Low" | "Medium" | "High"
 *   italics      → "Yes" | "No"
 *   caps         → "Standard" | "Caps Only"
 *   serifType    → "Slab" | "Transitional" | "Modern" | "Humanist" | null
 *   aStory       → "Single" | "Double"
 *   gStory       → "Single" | "Double"
 *   figures      → "Lining" | "Oldstyle"
 *   familySize   → number (count of variants including italics)
 *   subsets      → JSON array of language subsets
 */

// ─────────────────────────────────────────────────────────────────────────────
// CURATED KNOWLEDGE BASE — per-font overrides
// Sourced from Adobe Fonts classification, Fonts In Use, Google Fonts metadata
// ─────────────────────────────────────────────────────────────────────────────
interface FontOverride {
  xHeight?: "Low" | "Medium" | "High";
  contrast?: "Low" | "Medium" | "High";
  serifType?: "Slab" | "Transitional" | "Modern" | "Humanist" | null;
  aStory?: "Single" | "Double";
  gStory?: "Single" | "Double";
  width?: "Condensed" | "Normal" | "Expanded";
  caps?: "Standard" | "Caps Only";
  figures?: "Lining" | "Oldstyle";
}

const FONT_OVERRIDES: Record<string, FontOverride> = {
  // ── Sans-serif: Geometric (single-story a, single-story g, low contrast)
  "Futura":           { xHeight: "Medium", contrast: "Low",    aStory: "Single", gStory: "Single" },
  "Avenir":           { xHeight: "Medium", contrast: "Low",    aStory: "Single", gStory: "Single" },
  "Century Gothic":   { xHeight: "Medium", contrast: "Low",    aStory: "Single", gStory: "Single" },
  "Nunito":           { xHeight: "Medium", contrast: "Low",    aStory: "Double", gStory: "Single" },
  "Nunito Sans":      { xHeight: "Medium", contrast: "Low",    aStory: "Double", gStory: "Single" },
  "Poppins":          { xHeight: "Medium", contrast: "Low",    aStory: "Single", gStory: "Single" },
  "Raleway":          { xHeight: "Medium", contrast: "Low",    aStory: "Single", gStory: "Single" },
  "Quicksand":        { xHeight: "High",   contrast: "Low",    aStory: "Single", gStory: "Single" },
  "Varela Round":     { xHeight: "High",   contrast: "Low",    aStory: "Single", gStory: "Single" },
  "M PLUS Rounded 1c":{ xHeight: "High",   contrast: "Low",    aStory: "Single", gStory: "Single" },
  "Josefin Sans":     { xHeight: "Low",    contrast: "Low",    aStory: "Single", gStory: "Single" },

  // ── Sans-serif: Humanist (double-story a, variable g, low-medium contrast)
  "Roboto":           { xHeight: "High",   contrast: "Low",    aStory: "Double", gStory: "Single" },
  "Inter":            { xHeight: "High",   contrast: "Low",    aStory: "Double", gStory: "Single" },
  "Open Sans":        { xHeight: "High",   contrast: "Low",    aStory: "Double", gStory: "Single" },
  "Lato":             { xHeight: "Medium", contrast: "Low",    aStory: "Double", gStory: "Single" },
  "Montserrat":       { xHeight: "Medium", contrast: "Low",    aStory: "Double", gStory: "Single" },
  "Source Sans Pro":  { xHeight: "High",   contrast: "Low",    aStory: "Double", gStory: "Single" },
  "Source Sans 3":    { xHeight: "High",   contrast: "Low",    aStory: "Double", gStory: "Single" },
  "Fira Sans":        { xHeight: "High",   contrast: "Low",    aStory: "Double", gStory: "Single" },
  "Noto Sans":        { xHeight: "High",   contrast: "Low",    aStory: "Double", gStory: "Single" },
  "Ubuntu":           { xHeight: "High",   contrast: "Low",    aStory: "Double", gStory: "Double" },
  "Muli":             { xHeight: "High",   contrast: "Low",    aStory: "Double", gStory: "Single" },
  "Mulish":           { xHeight: "High",   contrast: "Low",    aStory: "Double", gStory: "Single" },
  "DM Sans":          { xHeight: "High",   contrast: "Low",    aStory: "Double", gStory: "Single" },
  "Work Sans":        { xHeight: "High",   contrast: "Low",    aStory: "Double", gStory: "Single" },
  "Manrope":          { xHeight: "High",   contrast: "Low",    aStory: "Double", gStory: "Single" },
  "Karla":            { xHeight: "High",   contrast: "Low",    aStory: "Double", gStory: "Single" },
  "Cabin":            { xHeight: "High",   contrast: "Low",    aStory: "Double", gStory: "Single" },
  "Jost":             { xHeight: "Medium", contrast: "Low",    aStory: "Single", gStory: "Single" },
  "Plus Jakarta Sans":{ xHeight: "High",   contrast: "Low",    aStory: "Double", gStory: "Single" },
  "Outfit":           { xHeight: "High",   contrast: "Low",    aStory: "Single", gStory: "Single" },

  // ── Sans-serif: Grotesque (double-story a, double-story g)
  "Helvetica Neue":   { xHeight: "High",   contrast: "Low",    aStory: "Double", gStory: "Double" },
  "Arial":            { xHeight: "High",   contrast: "Low",    aStory: "Double", gStory: "Double" },
  "Overpass":         { xHeight: "High",   contrast: "Low",    aStory: "Double", gStory: "Double" },
  "IBM Plex Sans":    { xHeight: "High",   contrast: "Low",    aStory: "Double", gStory: "Double" },
  "Archivo":          { xHeight: "High",   contrast: "Low",    aStory: "Double", gStory: "Double" },
  "Space Grotesk":    { xHeight: "High",   contrast: "Low",    aStory: "Double", gStory: "Double" },

  // ── Sans-serif: Condensed
  "Barlow Condensed":     { xHeight: "High", contrast: "Low", width: "Condensed", aStory: "Double", gStory: "Single" },
  "Oswald":               { xHeight: "High", contrast: "Low", width: "Condensed", aStory: "Double", gStory: "Single" },
  "Roboto Condensed":     { xHeight: "High", contrast: "Low", width: "Condensed", aStory: "Double", gStory: "Single" },
  "Fjalla One":           { xHeight: "High", contrast: "Medium", width: "Condensed", aStory: "Double", gStory: "Single" },
  "Yanone Kaffeesatz":    { xHeight: "Medium", contrast: "Low", width: "Condensed", aStory: "Single", gStory: "Single" },
  "Bebas Neue":           { xHeight: "High", contrast: "Low", width: "Condensed", caps: "Caps Only", aStory: "Single", gStory: "Single" },
  "Squada One":           { xHeight: "High", contrast: "Low", width: "Condensed", caps: "Caps Only" },
  "Black Han Sans":       { xHeight: "High", contrast: "Low", width: "Condensed" },
  "Barlow Semi Condensed":{ xHeight: "High", contrast: "Low", width: "Condensed", aStory: "Double", gStory: "Single" },
  "Chivo":                { xHeight: "High", contrast: "Low", width: "Condensed", aStory: "Double", gStory: "Single" },

  // ── Serif: Old Style / Humanist (diagonal stress, low-medium contrast)
  "Garamond":         { xHeight: "Low",  contrast: "Medium", serifType: "Humanist",     aStory: "Single", gStory: "Double", figures: "Oldstyle" },
  "EB Garamond":      { xHeight: "Low",  contrast: "Medium", serifType: "Humanist",     aStory: "Single", gStory: "Double", figures: "Oldstyle" },
  "Cormorant":        { xHeight: "Low",  contrast: "High",   serifType: "Humanist",     aStory: "Single", gStory: "Double", figures: "Oldstyle" },
  "Cormorant Garamond":{ xHeight: "Low", contrast: "High",   serifType: "Humanist",     aStory: "Single", gStory: "Double", figures: "Oldstyle" },
  "Caslon":           { xHeight: "Low",  contrast: "Medium", serifType: "Humanist",     aStory: "Single", gStory: "Double" },
  "Palatino":         { xHeight: "Medium", contrast: "Medium", serifType: "Humanist",   aStory: "Single", gStory: "Double" },
  "Crimson Text":     { xHeight: "Low",  contrast: "Medium", serifType: "Humanist",     aStory: "Single", gStory: "Double", figures: "Oldstyle" },
  "Crimson Pro":      { xHeight: "Low",  contrast: "Medium", serifType: "Humanist",     aStory: "Single", gStory: "Double", figures: "Oldstyle" },
  "Spectral":         { xHeight: "Medium", contrast: "Medium", serifType: "Transitional", aStory: "Single", gStory: "Double" },
  "Cardo":            { xHeight: "Low",  contrast: "Medium", serifType: "Humanist",     aStory: "Single", gStory: "Double" },

  // ── Serif: Transitional (more vertical stress, higher contrast)
  "Times New Roman":  { xHeight: "Medium", contrast: "High",  serifType: "Transitional", aStory: "Single", gStory: "Double" },
  "Georgia":          { xHeight: "High",   contrast: "Medium", serifType: "Transitional", aStory: "Single", gStory: "Double" },
  "Merriweather":     { xHeight: "High",   contrast: "High",  serifType: "Transitional", aStory: "Single", gStory: "Double" },
  "Lora":             { xHeight: "Medium", contrast: "Medium", serifType: "Transitional", aStory: "Single", gStory: "Double" },
  "PT Serif":         { xHeight: "Medium", contrast: "Medium", serifType: "Transitional", aStory: "Single", gStory: "Double" },
  "Libre Baskerville":{ xHeight: "High",   contrast: "High",  serifType: "Transitional", aStory: "Single", gStory: "Double" },
  "Baskervville":     { xHeight: "Medium", contrast: "High",  serifType: "Transitional", aStory: "Single", gStory: "Double" },
  "IBM Plex Serif":   { xHeight: "High",   contrast: "Medium", serifType: "Transitional", aStory: "Single", gStory: "Double" },
  "Noto Serif":       { xHeight: "Medium", contrast: "Medium", serifType: "Transitional", aStory: "Single", gStory: "Double" },
  "Bitter":           { xHeight: "High",   contrast: "Low",   serifType: "Slab",          aStory: "Double", gStory: "Double" },
  "Domine":           { xHeight: "Medium", contrast: "Medium", serifType: "Transitional", aStory: "Single", gStory: "Double" },
  "Frank Ruhl Libre": { xHeight: "Medium", contrast: "Medium", serifType: "Transitional", aStory: "Single", gStory: "Double" },

  // ── Serif: Modern / Didone (vertical stress, extreme contrast)
  "Playfair Display": { xHeight: "Low",  contrast: "High",  serifType: "Modern",        aStory: "Double", gStory: "Double", figures: "Oldstyle" },
  "Bodoni":           { xHeight: "Low",  contrast: "High",  serifType: "Modern",        aStory: "Single", gStory: "Double" },
  "Didact Gothic":    { xHeight: "High", contrast: "Low",   serifType: null,             aStory: "Double", gStory: "Single" },
  "GFS Didot":        { xHeight: "Low",  contrast: "High",  serifType: "Modern",        aStory: "Single", gStory: "Double" },
  "Ogg":              { xHeight: "Low",  contrast: "High",  serifType: "Modern",        aStory: "Single", gStory: "Double" },

  // ── Serif: Slab
  "Rockwell":         { xHeight: "Medium", contrast: "Low",  serifType: "Slab",          aStory: "Double", gStory: "Double" },
  "Courier":          { xHeight: "Medium", contrast: "Low",  serifType: "Slab",          aStory: "Single", gStory: "Double" },
  "Courier Prime":    { xHeight: "Medium", contrast: "Low",  serifType: "Slab",          aStory: "Single", gStory: "Double" },
  "Clarendon":        { xHeight: "High",   contrast: "Medium", serifType: "Slab",        aStory: "Double", gStory: "Double" },
  "Zilla Slab":       { xHeight: "High",   contrast: "Low",  serifType: "Slab",          aStory: "Double", gStory: "Double" },
  "Roboto Slab":      { xHeight: "High",   contrast: "Low",  serifType: "Slab",          aStory: "Double", gStory: "Double" },
  "Arvo":             { xHeight: "High",   contrast: "Low",  serifType: "Slab",          aStory: "Double", gStory: "Double" },
  "Crete Round":      { xHeight: "High",   contrast: "Low",  serifType: "Slab",          aStory: "Double", gStory: "Double" },
  "Josefin Slab":     { xHeight: "Low",    contrast: "Low",  serifType: "Slab",          aStory: "Single", gStory: "Single" },
  "Glegoo":           { xHeight: "High",   contrast: "Low",  serifType: "Slab",          aStory: "Double", gStory: "Double" },
  "Alfa Slab One":    { xHeight: "High",   contrast: "Low",  serifType: "Slab",          aStory: "Double", gStory: "Double" },
  "Patua One":        { xHeight: "High",   contrast: "Low",  serifType: "Slab",          aStory: "Double", gStory: "Double" },

  // ── Monospace
  "Fira Code":        { xHeight: "High", contrast: "Low",    aStory: "Single", gStory: "Single" },
  "JetBrains Mono":   { xHeight: "High", contrast: "Low",    aStory: "Double", gStory: "Double" },
  "Source Code Pro":  { xHeight: "High", contrast: "Low",    aStory: "Double", gStory: "Single" },
  "Inconsolata":      { xHeight: "High", contrast: "Low",    aStory: "Double", gStory: "Double" },
  "IBM Plex Mono":    { xHeight: "High", contrast: "Low",    aStory: "Double", gStory: "Double" },
  "Roboto Mono":      { xHeight: "High", contrast: "Low",    aStory: "Double", gStory: "Double" },
  "Space Mono":       { xHeight: "High", contrast: "Low",    aStory: "Double", gStory: "Double" },
  "Courier New":      { xHeight: "Medium", contrast: "Low",  aStory: "Single", gStory: "Double" },
  "Anonymous Pro":    { xHeight: "High", contrast: "Low",    aStory: "Double", gStory: "Double" },
  "PT Mono":          { xHeight: "High", contrast: "Low",    aStory: "Double", gStory: "Double" },
  "Share Tech Mono":  { xHeight: "High", contrast: "Low",    aStory: "Double", gStory: "Single" },
  "Overpass Mono":    { xHeight: "High", contrast: "Low",    aStory: "Double", gStory: "Double" },

  // ── Caps Only / Display
  "Trajan":           { caps: "Caps Only", xHeight: "Low", contrast: "High", serifType: "Transitional" },
  "Copperplate":      { caps: "Caps Only", xHeight: "Low", contrast: "Medium" },
  "Cinzel":           { caps: "Caps Only", xHeight: "Low", contrast: "High", serifType: "Transitional" },
  "Cormorant SC":     { caps: "Caps Only", xHeight: "Low", contrast: "High", serifType: "Humanist" },
  "Allerta":          { caps: "Caps Only", xHeight: "High", contrast: "Low" },

  // ── Display: High contrast, low x-height
  "Abril Fatface":    { xHeight: "Low",  contrast: "High",  serifType: "Modern",   aStory: "Double", gStory: "Double" },
  "Ultra":            { xHeight: "Low",  contrast: "High",  serifType: "Slab",     aStory: "Double", gStory: "Double" },
  "Anton":            { xHeight: "High", contrast: "Low",   width: "Condensed",    caps: "Caps Only", aStory: "Single", gStory: "Single" },
  "Righteous":        { xHeight: "Medium", contrast: "Low", aStory: "Single", gStory: "Single" },
  "Lobster":          { xHeight: "Medium", contrast: "High", aStory: "Double", gStory: "Double" },
  "Pacifico":         { xHeight: "High", contrast: "Low",   aStory: "Double", gStory: "Double" },

  // ── Oldstyle figures
  "Alegreya":         { xHeight: "Low", contrast: "High",  serifType: "Humanist",     aStory: "Single", gStory: "Double", figures: "Oldstyle" },
  "Alegreya SC":      { xHeight: "Low", contrast: "High",  serifType: "Humanist",     aStory: "Single", gStory: "Double", figures: "Oldstyle", caps: "Caps Only" },
  "Philosopher":      { xHeight: "Medium", contrast: "Medium", serifType: "Transitional", aStory: "Single", gStory: "Double" },
};

// ─────────────────────────────────────────────────────────────────────────────
// CATEGORY-LEVEL DEFAULTS
// Applied when no per-font override exists
// ─────────────────────────────────────────────────────────────────────────────
interface CategoryDefaults {
  xHeight: "Low" | "Medium" | "High";
  contrast: "Low" | "Medium" | "High";
  serifType: "Slab" | "Transitional" | "Modern" | "Humanist" | null;
  aStory: "Single" | "Double";
  gStory: "Single" | "Double";
  width: "Condensed" | "Normal" | "Expanded";
  caps: "Standard" | "Caps Only";
  figures: "Lining" | "Oldstyle";
}

const CATEGORY_DEFAULTS: Record<string, CategoryDefaults> = {
  "sans-serif": {
    xHeight: "High", contrast: "Low", serifType: null,
    aStory: "Double", gStory: "Single", width: "Normal",
    caps: "Standard", figures: "Lining",
  },
  "serif": {
    xHeight: "Medium", contrast: "Medium", serifType: "Transitional",
    aStory: "Single", gStory: "Double", width: "Normal",
    caps: "Standard", figures: "Lining",
  },
  "display": {
    xHeight: "Medium", contrast: "Medium", serifType: null,
    aStory: "Double", gStory: "Single", width: "Normal",
    caps: "Standard", figures: "Lining",
  },
  "handwriting": {
    xHeight: "Medium", contrast: "Low", serifType: null,
    aStory: "Single", gStory: "Single", width: "Normal",
    caps: "Standard", figures: "Lining",
  },
  "monospace": {
    xHeight: "High", contrast: "Low", serifType: null,
    aStory: "Double", gStory: "Double", width: "Normal",
    caps: "Standard", figures: "Lining",
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// WEIGHT INFERENCE
// Given an array of variant names from Google Fonts API,
// determine which weight BUCKETS the font covers.
// Returns JSON array, e.g. ["Light","Regular","Bold"]
// ─────────────────────────────────────────────────────────────────────────────
// Industry-standard CSS weight → label mapping (100–900)
const WEIGHT_LABEL: Record<string, string> = {
  "100": "Thin",
  "200": "Extra Light",
  "300": "Light",
  "400": "Regular",
  "regular": "Regular",
  "500": "Medium",
  "600": "Semibold",
  "700": "Bold",
  "800": "Extra Bold",
  "900": "Black",
};

/**
 * inferWeightVariants — stores ACTUAL variant names (not buckets)
 * Input:  Google Fonts variants array e.g. ["100","300","regular","700","900"]
 * Output: JSON array of labels e.g. ["Thin","Light","Regular","Bold","Black"]
 *
 * The sidebar filter buckets (Light/Regular/Bold) map to these on the fly in storage.ts.
 * This way the admin shows the real weights and filtering still works.
 */
export function inferWeightVariants(variants: string[]): string {
  const labels = new Set<string>();
  for (const v of variants) {
    // Strip "italic" suffix — "700italic" → "700", "italic" → "regular"
    const num = v.replace("italic", "").trim() || "regular";
    const label = WEIGHT_LABEL[num];
    if (label) labels.add(label);
  }
  if (labels.size === 0) labels.add("Regular");

  // Return in weight order (100→900)
  const ORDER = ["Thin","Extra Light","Light","Regular","Medium","Semibold","Bold","Extra Bold","Black"];
  const sorted = ORDER.filter(l => labels.has(l));
  return JSON.stringify(sorted);
}

// Keep old name as alias for backward compatibility
export const inferWeightBuckets = inferWeightVariants;

export function inferItalics(variants: string[]): string {
  return variants.some(v => v.includes("italic")) ? "Yes" : "No";
}

// ─────────────────────────────────────────────────────────────────────────────
// WIDTH INFERENCE FROM SUBFAMILY / VARIANT NAMES
// ─────────────────────────────────────────────────────────────────────────────
export function inferWidthFromName(familyName: string): "Condensed" | "Normal" | "Expanded" {
  const lower = familyName.toLowerCase();
  if (lower.includes("condensed") || lower.includes("narrow") || lower.includes("compressed")) return "Condensed";
  if (lower.includes("expanded") || lower.includes("extended") || lower.includes("wide")) return "Expanded";
  return "Normal";
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN TAG FUNCTION
// Given font family name, google category, and variants array,
// returns full set of properties to store in DB.
// ─────────────────────────────────────────────────────────────────────────────
export interface FontTags {
  weight: string;          // JSON array: ["Light","Regular","Bold"]
  width: "Condensed" | "Normal" | "Expanded";
  xHeight: "Low" | "Medium" | "High";
  contrast: "Low" | "Medium" | "High";
  italics: "Yes" | "No";
  caps: "Standard" | "Caps Only";
  serifType: string | null;
  aStory: "Single" | "Double" | null;
  gStory: "Single" | "Double" | null;
  figures: "Lining" | "Oldstyle";
  familySize: number;
  subsets: string;         // JSON array
}

export function tagFont(
  familyName: string,
  googleCategory: string,
  variants: string[],
  subsets: string[],
): FontTags {
  const cat = (googleCategory || "sans-serif").toLowerCase();
  const defaults = CATEGORY_DEFAULTS[cat] ?? CATEGORY_DEFAULTS["sans-serif"];

  // Look up override — try exact match, then partial match for Roboto Condensed → Roboto etc.
  const override: FontOverride = FONT_OVERRIDES[familyName] ?? {};

  // Width: check override first, then infer from family name
  const width = override.width ?? inferWidthFromName(familyName) ?? defaults.width;

  return {
    weight: inferWeightBuckets(variants),
    width,
    xHeight: override.xHeight ?? defaults.xHeight,
    contrast: override.contrast ?? defaults.contrast,
    italics: inferItalics(variants),
    caps: override.caps ?? defaults.caps,
    serifType: override.serifType !== undefined ? override.serifType : defaults.serifType,
    aStory: override.aStory ?? defaults.aStory,
    gStory: override.gStory ?? defaults.gStory,
    figures: override.figures ?? defaults.figures,
    familySize: variants.length,
    subsets: JSON.stringify(subsets || ["latin"]),
  };
}
