import { Link } from "wouter";
import { ChevronDown, RefreshCw, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import {
    DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

interface HomeSidebarProps {
    location: string;
    logoSvg: string;
    filters: any;
    setFilters: (filters: any) => void;
    setPage: (page: number) => void;
    totalFonts?: number;
}

// Human-readable labels for active chips
const CHIP_LABELS: Record<string, Record<string, string>> = {
    weight: { Light: "Light weight", Regular: "Regular weight", Bold: "Bold weight" },
    width: { Condensed: "Condensed", Normal: "Normal width", Expanded: "Expanded" },
    xHeight: { Low: "Low x-height", Medium: "Med x-height", High: "High x-height" },
    contrast: { Low: "Low contrast", Medium: "Med contrast", High: "High contrast" },
    italics: { Yes: "Has italics" },
    caps: { Standard: "Mixed case", "Caps Only": "Caps only" },
    serifType: { Slab: "Slab serif", Transitional: "Transitional", Modern: "Modern", Humanist: "Humanist" },
    aStory: { Double: "Double-story a", Single: "Single-story a" },
    gStory: { Double: "Double-story g", Single: "Single-story g" },
    licenseType: { free: "Free / Commercial", personal: "Personal use only" },
};

// ── Small SVG contrast icons showing actual stroke difference ──
function ContrastIcon({ level }: { level: "Low" | "Medium" | "High" }) {
    if (level === "Low") return (
        <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
            <ellipse cx="11" cy="11" rx="8" ry="8" stroke="currentColor" strokeWidth="2" />
        </svg>
    );
    if (level === "Medium") return (
        <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
            <path d="M11 3 C6 3 3 7 3 11 C3 15 6 19 11 19 C16 19 19 15 19 11 C19 7 16 3 11 3 Z"
                stroke="currentColor" strokeWidth="1.2" fill="none" />
            <path d="M11 19 C8 19 6 15.5 6 11 C6 6.5 8 3 11 3"
                stroke="currentColor" strokeWidth="3.5" fill="none" />
        </svg>
    );
    return (
        <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
            <path d="M11 3 C7 3 4 7 4 11 C4 15 7 19 11 19 C15 19 18 15 18 11 C18 7 15 3 11 3 Z"
                stroke="currentColor" strokeWidth="0.8" fill="none" />
            <path d="M11 19 C8.5 19 7 15.5 7 11 C7 6.5 8.5 3 11 3"
                stroke="currentColor" strokeWidth="5" fill="none" />
        </svg>
    );
}

// ── x-Height icons showing relative lowercase h size ──
function XHeightIcon({ level }: { level: "Low" | "Medium" | "High" }) {
    const sizes = { Low: 11, Medium: 15, High: 20 };
    const sz = sizes[level];
    return (
        <span style={{ fontSize: sz, lineHeight: 1, display: "block" }}>h</span>
    );
}

function FilterBtn({ active, onClick, tooltip, children }: {
    active: boolean; onClick: () => void; tooltip?: string; children: React.ReactNode;
}) {
    return (
        <button onClick={onClick} title={tooltip}
            className={cn(
                "flex-1 h-10 flex items-center justify-center border-r-[1.5px] last:border-0 border-[#EBF5FF] transition-all duration-150",
                "hover:bg-[#8598EE]/5",
                active
                    ? "bg-[#8598EE]/12 text-[#8598EE] ring-1 ring-inset ring-[#8598EE]/25 font-black"
                    : "text-[#9EADC7]"
            )} style={{ color: active ? undefined : '#9EADC7', borderColor: '#EBF5FF' }}>
            {children}
        </button>
    );
}

function FilterRow({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
    return (
        <div className="space-y-1.5">
            {children}
            <p className="text-[9px] text-center uppercase font-black tracking-[0.2em]" style={{ color: '#8598EE' }}>
                {label}
                {hint && <span className="normal-case font-normal opacity-60 ml-1" style={{ color: '#8598EE' }}>— {hint}</span>}
            </p>
        </div>
    );
}

export function HomeSidebar({ location, logoSvg, filters, setFilters, setPage, totalFonts }: HomeSidebarProps) {

    // Single-value toggle (null if already selected)
    const toggle = (key: string, value: string | null) => {
        setPage(1);
        setFilters((prev: any) => ({ ...prev, [key]: prev[key] === value ? null : value }));
    };

    // Multi-value toggle for weight (store as JSON array)
    const toggleWeight = (bucket: string) => {
        setPage(1);
        setFilters((prev: any) => {
            let current: string[] = [];
            try { current = prev.weight ? JSON.parse(prev.weight) : []; } catch { current = []; }
            const next = current.includes(bucket)
                ? current.filter((b: string) => b !== bucket)
                : [...current, bucket];
            return { ...prev, weight: next.length > 0 ? JSON.stringify(next) : null };
        });
    };

    const weightBuckets = (): string[] => {
        try { return filters.weight ? JSON.parse(filters.weight) : []; } catch { return []; }
    };

    const resetAll = () => {
        setFilters({
            weight: null, width: null, xHeight: null, contrast: null,
            italics: null, caps: null, story: null, figures: null,
            serifType: null, aStory: null, gStory: null, subset: null,
            licenseType: null,
            familySize: [1, 25],
        });
        setPage(1);
    };

    // Build active chips for display
    const chips: { key: string; value: string; label: string }[] = [];
    const buckets = weightBuckets();
    buckets.forEach(b => chips.push({ key: "weight", value: b, label: CHIP_LABELS.weight[b] ?? b }));
    for (const key of ["width","xHeight","contrast","italics","caps","serifType","aStory","gStory","subset","licenseType"]) {
        if (filters[key]) chips.push({ key, value: filters[key], label: CHIP_LABELS[key]?.[filters[key]] ?? filters[key] });
    }
    if (filters.familySize[0] !== 1 || filters.familySize[1] !== 25) {
        chips.push({ key: "familySize", value: "", label: `${filters.familySize[0]}–${filters.familySize[1]}${filters.familySize[1] === 25 ? "+" : ""} styles` });
    }

    const removeChip = (key: string, value: string) => {
        setPage(1);
        if (key === "weight") {
            const next = weightBuckets().filter(b => b !== value);
            setFilters((f: any) => ({ ...f, weight: next.length > 0 ? JSON.stringify(next) : null }));
        } else if (key === "familySize") {
            setFilters((f: any) => ({ ...f, familySize: [1, 25] }));
        } else {
            setFilters((f: any) => ({ ...f, [key]: null }));
        }
    };

    return (
        <aside className="w-full lg:w-72 shrink-0 lg:sticky lg:top-24 lg:h-[calc(100vh-8rem)] overflow-y-auto no-scrollbar pb-10 space-y-4 z-20 pr-1">
            <div className="flex flex-col items-center lg:items-start">
                <Link href="/">
                    <img src={logoSvg} alt="ukfont" className="w-full max-w-[200px] h-auto object-contain mb-1 cursor-pointer hover:opacity-80 transition-opacity" />
                </Link>
            </div>

            <nav className="flex flex-col sm:flex-row lg:flex-col flex-wrap gap-2 sm:gap-3 lg:gap-2 text-[14px] text-muted-foreground font-medium px-4 lg:px-0">
                <Link href="/instagram-fonts"><span className="hover:text-primary transition-colors block cursor-pointer">Instagram Fonts</span></Link>
                <Link href="/lenny-face-generator"><span className="hover:text-primary transition-colors block cursor-pointer">Lenny Face Generator</span></Link>
                <Link href="/upload"><span className="hover:text-primary transition-colors block cursor-pointer">Upload Font</span></Link>
                <Link href="/font-character"><span className={cn("hover:text-primary transition-colors block cursor-pointer", location === "/font-character" && "font-bold text-foreground border-l-2 border-primary pl-4 -ml-4 bg-primary/5 py-1")}>Font Character</span></Link>
                <Link href="/emoji"><span className={cn("hover:text-primary transition-colors block cursor-pointer", location === "/emoji" && "font-bold text-foreground border-l-2 border-primary pl-4 -ml-4 bg-primary/5 py-1")}>Emojis</span></Link>
                <Link href="/category"><span className={cn("hover:text-primary transition-colors block cursor-pointer", location === "/category" && "font-bold text-foreground border-l-2 border-primary pl-4 -ml-4 bg-primary/5 py-1")}>Font Category</span></Link>
            </nav>

            <div className="pt-3 space-y-4">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <h4 className="text-[14px] font-black uppercase tracking-widest text-[#8598EE]" style={{ color: '#8598EE' }}>PROPERTIES</h4>
                        {totalFonts !== undefined && (
                            <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full transition-all",
                                chips.length > 0 ? "bg-primary text-white" : "bg-primary/10 text-primary"
                            )}>
                                {totalFonts.toLocaleString()}
                            </span>
                        )}
                    </div>
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={resetAll} title="Reset all filters">
                        <RefreshCw className="h-3 w-3" style={{ color: '#9EADC7' }} />
                    </Button>
                </div>

                {/* Active filter chips */}
                {chips.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pb-1">
                        {chips.map(({ key, value, label }) => (
                            <button key={`${key}-${value}`}
                                onClick={() => removeChip(key, value)}
                                className="flex items-center gap-1 px-2.5 py-1 bg-primary/10 text-primary rounded-full text-[10px] font-bold hover:bg-primary/20 transition-colors">
                                {label}<X className="h-2.5 w-2.5" />
                            </button>
                        ))}
                        {chips.length > 1 && (
                            <button onClick={resetAll}
                                className="px-2.5 py-1 bg-destructive/10 text-destructive rounded-full text-[10px] font-bold hover:bg-destructive/20 transition-colors">
                                Clear all
                            </button>
                        )}
                    </div>
                )}

                <div className="space-y-4 px-1">
                    {/* ── Weight ── */}
                    <FilterRow label="Weight" hint="100–900, tap multiple">
                        <div className="flex border-[1.5px] border-[#EBF5FF] rounded-md overflow-hidden bg-white">
                            <FilterBtn
                                active={weightBuckets().includes("Light")}
                                onClick={() => toggleWeight("Light")}
                                tooltip="Light — 100 Thin · 200 Extra Light · 300 Light">
                                <span className="text-xl font-light text-[#9EADC7]">G</span>
                            </FilterBtn>
                            <FilterBtn
                                active={weightBuckets().includes("Regular")}
                                onClick={() => toggleWeight("Regular")}
                                tooltip="Regular — 400 Regular · 500 Medium">
                                <span className="text-xl font-normal text-[#9EADC7]">G</span>
                            </FilterBtn>
                            <FilterBtn
                                active={weightBuckets().includes("Bold")}
                                onClick={() => toggleWeight("Bold")}
                                tooltip="Bold — 600 Semibold · 700 Bold · 800 Extra Bold · 900 Black">
                                <span className="text-xl font-black text-[#9EADC7]">G</span>
                            </FilterBtn>
                        </div>
                    </FilterRow>

                    {/* ── Width ── */}
                    <FilterRow label="Width" hint="horizontal stretch">
                        <div className="flex border-[1.5px] border-[#EBF5FF] rounded-md overflow-hidden bg-white">
                            <FilterBtn active={filters.width === "Condensed"} onClick={() => toggle("width","Condensed")} tooltip="Condensed — narrow letters, tall oval O">
                                <span className="text-xl inline-block" style={{ transform:"scaleX(0.55)", transformOrigin:"center" }}>A</span>
                            </FilterBtn>
                            <FilterBtn active={filters.width === "Normal"} onClick={() => toggle("width","Normal")} tooltip="Normal width">
                                <span className="text-xl">A</span>
                            </FilterBtn>
                            <FilterBtn active={filters.width === "Expanded"} onClick={() => toggle("width","Expanded")} tooltip="Expanded — wide letters, flat oval O">
                                <span className="text-xl inline-block" style={{ transform:"scaleX(1.45)", transformOrigin:"center" }}>A</span>
                            </FilterBtn>
                        </div>
                    </FilterRow>

                    {/* ── x-Height ── */}
                    <FilterRow label="x-Height" hint="lowercase ÷ uppercase height">
                        <div className="flex border-[1.5px] border-[#EBF5FF] rounded-md overflow-hidden bg-white">
                            <FilterBtn active={filters.xHeight === "Low"} onClick={() => toggle("xHeight","Low")} tooltip="Low x-height (<50%) — elegant, delicate, editorial">
                                <XHeightIcon level="Low" />
                            </FilterBtn>
                            <FilterBtn active={filters.xHeight === "Medium"} onClick={() => toggle("xHeight","Medium")} tooltip="Medium x-height (50–66%) — balanced, traditional print">
                                <XHeightIcon level="Medium" />
                            </FilterBtn>
                            <FilterBtn active={filters.xHeight === "High"} onClick={() => toggle("xHeight","High")} tooltip="High x-height (>66%) — readable on screen, modern UI">
                                <XHeightIcon level="High" />
                            </FilterBtn>
                        </div>
                    </FilterRow>

                    {/* ── Contrast ── */}
                    <FilterRow label="Contrast" hint="thick ÷ thin stroke ratio">
                        <div className="flex border-[1.5px] border-[#EBF5FF] rounded-md overflow-hidden bg-white">
                            <FilterBtn active={filters.contrast === "Low"} onClick={() => toggle("contrast","Low")} tooltip="Low contrast — monolinear strokes (sans-serif, geometric)">
                                <ContrastIcon level="Low" />
                            </FilterBtn>
                            <FilterBtn active={filters.contrast === "Medium"} onClick={() => toggle("contrast","Medium")} tooltip="Medium contrast — slight thick/thin variation">
                                <ContrastIcon level="Medium" />
                            </FilterBtn>
                            <FilterBtn active={filters.contrast === "High"} onClick={() => toggle("contrast","High")} tooltip="High contrast — dramatic thick/thin (Bodoni, Playfair Display)">
                                <ContrastIcon level="High" />
                            </FilterBtn>
                        </div>
                    </FilterRow>

                    {/* ── Italics + Case ── */}
                    <div className="grid grid-cols-2 gap-2">
                        <FilterRow label="Italics" hint="has variant">
                            <button onClick={() => toggle("italics","Yes")} title="Font family includes a true italic or oblique variant"
                                className={cn("w-full h-10 border-[1.5px] border-[#EBF5FF] rounded-md flex items-center justify-center bg-white transition-all",
                                    filters.italics === "Yes"
                                        ? "bg-[#8598EE]/12 text-[#8598EE] ring-1 ring-inset ring-[#8598EE]/25"
                                        : "text-[#9EADC7] hover:bg-[#8598EE]/5")}>
                                <span className="italic text-lg font-medium">i</span>
                            </button>
                        </FilterRow>
                        <FilterRow label="Case">
                            <div className="flex border-[1.5px] border-[#EBF5FF] rounded-md overflow-hidden bg-white">
                                <FilterBtn active={filters.caps === "Standard"} onClick={() => toggle("caps","Standard")} tooltip="Standard — font has both uppercase and lowercase">
                                    <span className="text-[13px] font-bold">Ab</span>
                                </FilterBtn>
                                <FilterBtn active={filters.caps === "Caps Only"} onClick={() => toggle("caps","Caps Only")} tooltip="Caps only — lowercase keys produce capitals (Trajan, Bebas, Cinzel)">
                                    <span className="text-[13px] font-bold">AB</span>
                                </FilterBtn>
                            </div>
                        </FilterRow>
                    </div>

                    {/* ── Serif Type + a-Story ── */}
                    <div className="grid grid-cols-2 gap-2">
                        <FilterRow label="Serif Type">
                            <div className="flex border-[1.5px] border-[#EBF5FF] rounded-md overflow-hidden bg-white">
                                <FilterBtn active={filters.serifType === "Slab"} onClick={() => toggle("serifType","Slab")} tooltip="Slab serif — heavy rectangular serifs, low contrast (Rockwell, Zilla Slab, Arvo)">
                                    <span className="text-[11px] font-black">S</span>
                                </FilterBtn>
                                <FilterBtn active={filters.serifType === "Transitional"} onClick={() => toggle("serifType","Transitional")} tooltip="Transitional serif — moderate contrast, bracketed serifs (Baskerville, Merriweather, Times)">
                                    <span className="text-[11px] font-black">T</span>
                                </FilterBtn>
                                <FilterBtn active={filters.serifType === "Modern"} onClick={() => toggle("serifType","Modern")} tooltip="Modern/Didone — extreme thick/thin contrast, hairline serifs (Bodoni, Didot, Playfair Display)">
                                    <span className="text-[11px] font-black">M</span>
                                </FilterBtn>
                            </div>
                        </FilterRow>
                        <FilterRow label="a-Story">
                            <div className="flex border-[1.5px] border-[#EBF5FF] rounded-md overflow-hidden bg-white">
                                <FilterBtn active={filters.aStory === "Double"} onClick={() => toggle("aStory","Double")} tooltip="Double-story a — traditional, humanist, calligraphic">
                                    <span className="text-[18px] leading-none" style={{ fontFamily: "serif" }}>a</span>
                                </FilterBtn>
                                <FilterBtn active={filters.aStory === "Single"} onClick={() => toggle("aStory","Single")} tooltip="Single-story a — geometric, minimal, modern">
                                    <span className="text-[18px] leading-none">ɑ</span>
                                </FilterBtn>
                            </div>
                        </FilterRow>
                    </div>

                    {/* ── g-Story ── */}
                    <FilterRow label="g-Story">
                        <div className="flex border-[1.5px] border-[#EBF5FF] rounded-md overflow-hidden bg-white">
                            <FilterBtn active={filters.gStory === "Double"} onClick={() => toggle("gStory","Double")} tooltip="Double-story g (looptail) — traditional roman typefaces">
                                <span className="text-[18px] leading-none" style={{ fontFamily: "serif" }}>g</span>
                            </FilterBtn>
                            <FilterBtn active={filters.gStory === "Single"} onClick={() => toggle("gStory","Single")} tooltip="Single-story g (opentail) — geometric, handwriting, most display fonts">
                                <span className="text-[18px] leading-none">ɡ</span>
                            </FilterBtn>
                        </div>
                    </FilterRow>

                    {/* ── License Type ── */}
                    <div className="space-y-1.5 pt-3 border-t-[1.5px] border-[#EBF5FF] border-dashed mt-3">
                        <p className="text-[11px] font-black uppercase tracking-widest pt-1" style={{ color: '#9EADC7' }}>License</p>
                        <div className="flex border-[1.5px] border-[#EBF5FF] rounded-md overflow-hidden bg-white">
                            <FilterBtn
                                active={!filters.licenseType}
                                onClick={() => toggle("licenseType", null)}
                                tooltip="Show all fonts regardless of license">
                                <span className="text-[11px] font-bold">All</span>
                            </FilterBtn>
                            <FilterBtn
                                active={filters.licenseType === "free"}
                                onClick={() => toggle("licenseType", "free")}
                                tooltip="Free for commercial and personal use">
                                <span className="text-[11px] font-bold">Free</span>
                            </FilterBtn>
                            <FilterBtn
                                active={filters.licenseType === "personal"}
                                onClick={() => toggle("licenseType", "personal")}
                                tooltip="Free for personal use only — commercial license available">
                                <span className="text-[11px] font-bold">Personal</span>
                            </FilterBtn>
                        </div>
                    </div>

                    {/* ── Writing Language ── */}
                    <div className="space-y-1.5 pt-3 border-t-[1.5px] border-[#EBF5FF] border-dashed mt-3 mb-2">
                        <p className="text-[11px] font-black uppercase tracking-widest pt-1" style={{ color: '#9EADC7' }}>Writing Language</p>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="outline" className="w-full justify-between h-10 bg-white font-medium text-xs border-[1.5px] border-[#EBF5FF]" style={{ color: '#9EADC7', borderColor: '#EBF5FF' }}>
                                    {filters.subset
                                        ? filters.subset.charAt(0).toUpperCase() + filters.subset.slice(1).replace("-", " ")
                                        : "All Languages"}
                                    <ChevronDown className="h-4 w-4 opacity-50" style={{ color: '#9EADC7' }} />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent className="w-[260px] max-h-[300px] overflow-auto rounded-xl shadow-[0_10px_40px_-10px_rgb(0,0,0,0.15)] border-slate-100 p-2 z-50">
                                <DropdownMenuItem className="cursor-pointer rounded-lg hover:bg-slate-50" onClick={() => toggle("subset", null)}>All Languages</DropdownMenuItem>
                                {["latin","latin-ext","cyrillic","cyrillic-ext","greek","greek-ext",
                                  "vietnamese","devanagari","arabic","hebrew","thai","khmer",
                                  "korean","japanese","bengali","gujarati","tamil","telugu"].map(s => (
                                    <DropdownMenuItem className="cursor-pointer rounded-lg hover:bg-slate-50" key={s} onClick={() => toggle("subset", s)}>
                                        {s.charAt(0).toUpperCase() + s.slice(1).replace("-", " ")}
                                    </DropdownMenuItem>
                                ))}
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>

                </div>
            </div>
        </aside>
    );
}
