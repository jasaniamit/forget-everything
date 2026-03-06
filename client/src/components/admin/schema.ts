import { Font } from "@shared/schema";

export const WEIGHT_OPTIONS = ["Thin", "Extra Light", "Light", "Regular", "Medium", "Semibold", "Bold", "Extra Bold", "Black"];

export const USE_CASE_OPTIONS = [
    "tech", "business", "designer", "developer", "food",
    "education", "editorial", "branding", "display", "web",
    "print", "creative", "lifestyle", "fashion", "gaming"
];

export const SUBSET_OPTIONS = [
    "latin", "latin-ext", "cyrillic", "cyrillic-ext", "greek", "greek-ext",
    "vietnamese", "devanagari", "arabic", "hebrew", "thai", "khmer",
    "korean", "japanese", "chinese-hongkong", "chinese-simplified", "chinese-traditional",
    "bengali", "gujarati", "gurmukhi", "kannada", "malayalam", "oriya", "sinhala", "tamil", "telugu"
];

export const PROP_OPTIONS: Record<string, string[]> = {
    weight: WEIGHT_OPTIONS,
    width: ["Ultra Condensed", "Condensed", "Normal", "Expanded", "Ultra Expanded"],
    xHeight: ["Low", "Medium", "High"],
    contrast: ["Low", "Medium", "High"],
    italics: ["Yes", "No"],
    caps: ["Standard", "Caps Only"],
    story: ["Single", "Double"],
    figures: ["Lining", "Oldstyle"],
    serifType: ["Slab", "Transitional", "Modern"],
    aStory: ["Single", "Double"],
    gStory: ["Single", "Double"],
    useCase: USE_CASE_OPTIONS,
    subsets: SUBSET_OPTIONS,
    category: ["sans-serif", "serif", "display", "handwriting", "monospace", "basic", "trendy"],
};

// Multi-value fields stored as JSON arrays
export const MULTI_VALUE_FIELDS = new Set<string>(["weight", "useCase", "subsets"]);

export type ColType = "text" | "number" | "select" | "multiselect" | "readonly";

export const COLUMNS: { key: keyof Font; label: string; width: string; editable?: boolean; type?: ColType }[] = [
    { key: "name", label: "Font Name", width: "180px", editable: false, type: "readonly" },
    { key: "family", label: "CSS Family", width: "160px", editable: false, type: "readonly" },
    { key: "useCase", label: "Use Case", width: "150px", editable: true, type: "multiselect" },
    { key: "weight", label: "Weight", width: "150px", editable: true, type: "multiselect" },
    { key: "width", label: "Width", width: "130px", editable: true, type: "select" },
    { key: "xHeight", label: "x-Height", width: "100px", editable: true, type: "select" },
    { key: "contrast", label: "Contrast", width: "100px", editable: true, type: "select" },
    { key: "italics", label: "Italics", width: "80px", editable: true, type: "select" },
    { key: "caps", label: "Caps", width: "110px", editable: true, type: "select" },
    { key: "story", label: "Story", width: "90px", editable: true, type: "select" },
    { key: "figures", label: "Figures", width: "90px", editable: true, type: "select" },
    { key: "serifType", label: "Serif Type", width: "120px", editable: true, type: "select" },
    { key: "aStory", label: "a-Story", width: "90px", editable: true, type: "select" },
    { key: "gStory", label: "g-Story", width: "90px", editable: true, type: "select" },
    { key: "subsets", label: "Languages", width: "150px", editable: true, type: "multiselect" },
    { key: "familySize", label: "Family Size", width: "100px", editable: true, type: "number" },
    { key: "downloadCount", label: "Downloads", width: "100px", editable: false },
];

export function parseArray(val: any): string[] {
    if (!val) return [];
    if (Array.isArray(val)) return val as string[];
    try { const p = JSON.parse(val); return Array.isArray(p) ? p : []; } catch { return [val]; }
}

export function formatArrayDisplay(val: any): string {
    const arr = parseArray(val);
    if (arr.length === 0) return "—";
    if (arr.length === 1) return arr[0];
    return `${arr.length} selected`;
}
