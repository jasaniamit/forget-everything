import { useQuery } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { useFonts } from "@/hooks/use-fonts";
import { FontCard } from "@/components/FontCard";
import { getPreviewWeight } from "@/hooks/use-load-font";
import { Navbar } from "@/components/Navbar";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Search, Loader2, LayoutGrid, Type as TypeIcon, ChevronDown, Copy, Check, RefreshCw, Columns2, Pin, X } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

import { Slider } from "@/components/ui/slider";

import { HomeSidebar } from "@/components/HomeSidebar";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const CATEGORIES = ["All", "Serif", "Sans Serif", "Display", "Handwriting", "Monospace"];
const USE_CASES = [
  { label: "All", value: "All" },
  { label: "Tech", value: "tech" },
  { label: "Business", value: "business" },
  { label: "Designer", value: "designer" },
  { label: "Developer", value: "developer" },
  { label: "Food", value: "food" },
  { label: "Education", value: "education" },
  { label: "Editorial", value: "editorial" },
  { label: "Branding", value: "branding" },
  { label: "Display", value: "display" },
  { label: "Web", value: "web" },
  { label: "Print", value: "print" },
  { label: "Creative", value: "creative" },
  { label: "Lifestyle", value: "lifestyle" },
  { label: "Fashion", value: "fashion" },
  { label: "Gaming", value: "gaming" },
];

const SAMPLE_TEXTS = [
  "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
  "abcdefghijklmnopqrstuvwxyz",
  "0123456789 ¿ ? ¡ ! & @ ‘ ’ “ ” « » % * ^ # $ £ € ¢ / ( ) [ ] { } . , ® ©",
  "Realigned equestrian fez bewilders picky monarch",
  "Roger, hungry: ate 236 peaches & cantaloupes in 1904!",
  "The quick brown fox jumps over the lazy dog",
  "Voix ambiguë d’un cœur qui au zéphyr préfère les jattes de kiwi",
  "Victor jagt zwölf Boxkämpfer quer über den großen Sylter Deich",
  "Quiere la boca exhausta vid, kiwi, piña y fugaz jamón",
  "Ma la volpe, col suo balzo, ha raggiunto il quieto Fido",
  "Zebras caolhas de Java querem passar fax para moças gigantes de New Yo"
];

const PROPERTY_OPTIONS = {
  weight: ["Thin", "Extra Light", "Light", "Regular", "Medium", "Semibold", "Bold", "Black"],
  width: ["Ultra Condensed", "Condensed", "Normal", "Expanded", "Ultra Expanded"],
  xHeight: ["Low", "Medium", "High"],
  contrast: ["Low", "Medium", "High"],
  italics: ["Yes", "No"],
  caps: ["Standard", "Caps Only"],
  story: ["Double", "Single"],
  figures: ["Lining", "Oldstyle"]
};

// ── Compact grid tile for grid view ─────────────────────────────────────────
function GridFontTile({ font, color }: {
  font: any; color: string;
}) {
  if (typeof window !== "undefined") {
    const id = `gf-grid-${font.id}`;
    if (!document.getElementById(id)) {
      const link = document.createElement("link");
      link.id = id;
      link.rel = "stylesheet";
      link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(font.family)}:wght@400;700&display=swap`;
      document.head.appendChild(link);
    }
  }

  return (
    <Link href={`/font/${font.id}`}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        whileHover={{ y: -2, boxShadow: "0 8px 30px rgba(124,139,255,0.12)" }}
        className="group bg-white rounded-2xl border border-border/30 hover:border-primary/20 transition-all duration-300 p-4 flex flex-col justify-between overflow-hidden cursor-pointer h-[130px]"
      >
        {/* Large Aa — shows the font personality clearly */}
        <div className="flex-1 flex items-center">
          <span
            className="leading-none select-none"
            style={{
              fontFamily: font.family,
              fontSize: "52px",
              color: color || "#66768D",
              fontWeight: 400,
            }}
          >
            Aa
          </span>
        </div>
        {/* Name + category at bottom */}
        <div className="shrink-0 border-t border-border/10 pt-2 mt-1">
          <p className="text-[11px] font-bold text-foreground/60 truncate leading-tight">{font.name}</p>
          <p className="text-[9px] uppercase tracking-widest text-primary/30 font-black mt-0.5">{font.category || "Font"}</p>
        </div>
      </motion.div>
    </Link>
  );
}

export default function Home() {
  const [location] = useLocation();
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");
  const [activeUseCase, setActiveUseCase] = useState("All");
  const [previewText, setPreviewText] = useState("The quick brown fox jumps over the lazy dog");
  const [fontSize, setFontSize] = useState(32);
  const [fontColor, setFontColor] = useState("#66768D");
  const [isCommercial, setIsCommercial] = useState(false);
  const [page, setPage] = useState(1);
  // Rotation seed — changes every 30min automatically, or instantly on shuffle click
  const [seed, setSeed] = useState(() => Math.floor(Date.now() / (30 * 60 * 1000)));

  const [viewMode, setViewMode] = useState<"list" | "grid" | "compare">("list");
  const [compareIds, setCompareIds] = useState<Set<number>>(new Set());

  const [filters, setFilters] = useState<any>({
    weight: null,
    width: null,
    xHeight: null,
    contrast: null,
    italics: null,
    caps: null,
    story: null,
    figures: null,
    serifType: null,
    aStory: null,
    gStory: null,
    subset: null,
    familySize: [1, 25]
  });

  const { data: taxonomy } = useQuery<any>({ queryKey: ["/api/taxonomy"] });
  const [activeStyles, setActiveStyles] = useState<string[]>(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const cat = params.get("category");
      if (cat) return [cat.toLowerCase().replace(" ", "-")];
    }
    return [];
  });

  const { data, isLoading, error } = useFonts({
    search: search || undefined,
    style: activeStyles.length > 0 ? activeStyles : undefined,
    useCase: activeUseCase !== "All" ? activeUseCase : undefined,
    weight: filters.weight || undefined,
    width: filters.width || undefined,
    xHeight: filters.xHeight || undefined,
    contrast: filters.contrast || undefined,
    italics: filters.italics || undefined,
    caps: filters.caps || undefined,
    story: filters.story || undefined,
    figures: filters.figures || undefined,
    serifType: filters.serifType || undefined,
    aStory: filters.aStory || undefined,
    gStory: filters.gStory || undefined,
    minFamilySize: filters.familySize[0] === 1 && filters.familySize[1] === 25 ? undefined : filters.familySize[0],
    maxFamilySize: filters.familySize[0] === 1 && filters.familySize[1] === 25 ? undefined : filters.familySize[1],
    subset: filters.subset || undefined,
    licenseType: filters.licenseType || undefined,
    page,
    seed,
  });

  const fonts = data?.fonts;
  const totalPages = data ? Math.ceil(data.total / data.limit) : 1;

  const toggleStyle = (slug: string) => {
    setPage(1);
    setActiveStyles(prev => (prev.includes(slug) && prev.length === 1) ? [] : [slug]);
  };

  const toggleFilter = (key: string, value: string) => {
    setPage(1);
    setFilters((prev: any) => ({
      ...prev,
      [key]: prev[key] === value ? null : value
    }));
  };

  const toggleCompare = (font: any) => {
    setCompareIds(prev => {
      const n = new Set(prev);
      if (n.has(font.id)) { n.delete(font.id); return n; }
      if (n.size >= 4) return prev;
      n.add(font.id);
      return n;
    });
  };

  const compareFonts = (fonts ?? []).filter((f: any) => compareIds.has(f.id));

  return (
    <div className="min-h-screen bg-background font-sans">
      <Navbar />

      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col lg:flex-row gap-8 items-start">
          {/* Left Sidebar Menu */}
          <HomeSidebar
            location={location}
            logoSvg={"/logo.svg"}
            filters={filters}
            setFilters={setFilters}
            setPage={setPage}
            totalFonts={data?.total}
          />

          {/* Main Content Area */}
          <div className="flex-1 space-y-10 w-full overflow-hidden">
            <div className="flex flex-col gap-10 items-start relative">
              {/* Search Bar & Primary Interaction Area */}
              <div className="w-full flex-col">
                <section className="relative w-full flex flex-col items-center justify-center pt-2">
                  <div className="relative z-10 w-full max-w-[800px] mb-4 mt-2">
                    <Input
                      placeholder="Search Font..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="h-16 pl-8 pr-16 text-lg bg-white border border-slate-100 shadow-[0_8px_30px_rgb(133,152,238,0.12)] rounded-[2rem] focus-visible:ring-1 focus-visible:ring-white/20 transition-all font-medium text-slate-700 placeholder:text-slate-400"
                    />
                    <Search className="absolute right-6 top-1/2 -translate-y-1/2 h-6 w-6 text-[#8598EE]" />
                  </div>
                  <div className="w-full max-w-[1000px] relative pointer-events-none flex justify-center mt-2">
                     <img src="/search-bar.svg" alt="Search Illustration" className="w-[95%] sm:w-[85%] h-auto object-contain" />
                  </div>
                </section>

                <section className="mt-8 mb-6">
                  <div className="w-full text-center mb-4">
                    <h3 className="text-[12px] font-black uppercase tracking-[0.2em] text-[#A0AABF]">BROWSE BY CATEGORIES</h3>
                  </div>
                  <div className="flex flex-wrap items-center justify-center gap-1.5 sm:gap-2 w-full max-w-7xl mx-auto px-1 mb-2">
                    {[
                      { slug: "sans-serif", label: "Sans Serif" },
                      { slug: "slab-serif", label: "Slab Serif" },
                      { slug: "serif", label: "Serif" },
                      { slug: "display", label: "Display" },
                      { slug: "handwriting", label: "Handwritten" },
                      { slug: "script", label: "Script" },
                      { slug: "decorative", label: "Decorative" },
                      { slug: "monospace", label: "Monospace" }
                    ].map((cat) => (
                      <button
                        key={cat.slug}
                        onClick={() => toggleStyle(cat.slug)}
                        className={cn(
                          "rounded-lg px-3 sm:px-4 py-1.5 sm:py-2 text-[11px] sm:text-[12px] font-bold transition-all shadow-sm whitespace-nowrap",
                          activeStyles.includes(cat.slug)
                            ? "bg-[#8598EE] text-white shadow-[#8598EE]/20"
                            : "bg-[#F3F6FF] text-[#8598EE] hover:bg-[#EAEFFF]"
                        )}
                      >
                        {cat.label}
                      </button>
                    ))}
                  </div>

                  {/* Font Preview Customizer Bar */}
                  <div className="mx-auto w-full max-w-[1000px] mt-12 mb-4 px-4 py-3 sm:px-5 sm:py-3.5 rounded-[1.25rem] border border-[#E5E9F2] shadow-[0_8px_30px_rgb(0,0,0,0.04)] bg-white flex flex-col xl:flex-row items-center gap-4 xl:gap-6">
                    <div className="flex-1 flex relative w-full">
                      <Input
                        value={previewText}
                        onChange={(e) => setPreviewText(e.target.value)}
                        placeholder="Type or choose sample text..."
                        className="border-0 shadow-none focus-visible:ring-0 text-[15px] font-medium h-12 px-5 bg-[#F1F4F9] rounded-xl w-full"
                      />
                    </div>

                    <div className="flex items-center justify-between xl:justify-start gap-4 sm:gap-5 shrink-0 w-full xl:w-auto overflow-x-auto pb-2 xl:pb-0 scrollbar-hide">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button className="h-10 w-10 shrink-0 bg-[#8598EE] hover:bg-[#7285DB] text-white rounded-[0.7rem] flex items-center justify-center transition-all shadow-md shadow-[#8598EE]/20 cursor-pointer">
                            <ChevronDown size={18} strokeWidth={2.5} />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="center" className="w-[350px] sm:w-[450px] max-h-[400px] overflow-y-auto rounded-[1.25rem] shadow-[0_20px_50px_-10px_rgb(0,0,0,0.15)] border border-slate-100 p-2 z-50 bg-white">
                          <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider px-3 pb-2 pt-1 border-b border-slate-50 mb-1">Select Phrase</div>
                          {SAMPLE_TEXTS.map((text, i) => (
                            <DropdownMenuItem
                              key={i}
                              className="text-[14px] text-slate-600 py-3.5 px-4 cursor-pointer rounded-[0.85rem] font-medium hover:bg-[#F3F6FF] hover:text-[#8598EE] transition-colors focus:bg-[#F3F6FF] focus:text-[#8598EE] data-[highlighted]:bg-[#F3F6FF] data-[highlighted]:text-[#8598EE]"
                              onClick={() => setPreviewText(text)}
                            >
                              {text}
                            </DropdownMenuItem>
                          ))}
                        </DropdownMenuContent>
                      </DropdownMenu>

                      <div className="flex items-center gap-3 w-32 sm:w-40 shrink-0">
                        <Slider
                          value={[fontSize]}
                          onValueChange={(v: number[]) => setFontSize(v[0])}
                          min={12}
                          max={120}
                          step={1}
                          className="w-full"
                        />
                      </div>

                      <div className="relative shrink-0 flex items-center justify-center">
                        <div
                          className="w-9 h-9 rounded-[0.6rem] shrink-0 cursor-pointer shadow-sm border border-slate-200 transition-transform hover:scale-110"
                          style={{ backgroundColor: fontColor }}
                          onClick={() => document.getElementById('font-color-picker')?.click()}
                        />
                        <input id="font-color-picker" type="color" value={fontColor} onChange={(e) => setFontColor(e.target.value)} className="sr-only" />
                      </div>

                      <div className="flex items-center gap-2 shrink-0 cursor-pointer group" onClick={() => toggleFilter("licenseType", filters.licenseType === "free" ? "All" : "free")}>
                        <div className={cn("w-[18px] h-[18px] rounded-[4px] border border-slate-300 flex items-center justify-center transition-colors group-hover:border-[#8598EE]", filters.licenseType === "free" ? "bg-[#8598EE] border-[#8598EE]" : "")}>
                          {filters.licenseType === "free" && <Check className="w-3.5 h-3.5 text-white" strokeWidth={3} />}
                        </div>
                        <span className="text-[12px] font-bold text-[#66768D] group-hover:text-slate-700 transition-colors whitespace-nowrap">Commercial Use</span>
                      </div>

                      <button
                        className="w-10 h-10 flex items-center justify-center shrink-0 text-slate-300 hover:text-slate-500 hover:bg-slate-50 transition-all rounded-[0.7rem]"
                        onClick={() => { setFontColor("#66768D"); setPreviewText("The quick brown fox jumps over the lazy dog"); setFontSize(32); setFilters((prev: any) => ({ ...prev, licenseType: null })); }}
                      >
                        <RefreshCw size={18} strokeWidth={2} />
                      </button>
                    </div>
                  </div>
                </section>
              </div>
            </div>

            {/* View Specific Content */}
            <section className="space-y-8">

              {/* View mode switcher */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1 bg-secondary/30 rounded-xl border border-border/40 p-1">
                  {([
                    { mode: "list",    label: "List" },
                    { mode: "grid",    label: "Grid" },
                    { mode: "compare", label: "Compare" },
                  ] as { mode: "list"|"grid"|"compare"; label: string }[]).map(({ mode, label }) => (
                    <button key={mode} onClick={() => setViewMode(mode)}
                      className={`px-4 py-1.5 rounded-lg text-[11px] font-black uppercase tracking-wider transition-all ${
                        viewMode === mode
                          ? "bg-white shadow-sm text-primary"
                          : "text-muted-foreground/60 hover:text-foreground"
                      }`}>
                      {label}
                    </button>
                  ))}
                </div>
                {viewMode === "compare" && (
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground/50">Click fonts to add · max 4 · {compareIds.size}/4</span>
                    {compareIds.size > 0 && (
                      <button onClick={() => setCompareIds(new Set())}
                        className="text-xs text-primary/60 hover:text-primary font-bold transition-colors">
                        Clear
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Compare panel */}
              {viewMode === "compare" && compareFonts.length > 0 && (
                <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${compareFonts.length}, 1fr)` }}>
                  {compareFonts.map((font: any) => (
                    <div key={font.id} className="bg-white rounded-2xl border border-border/60 overflow-hidden shadow-sm">
                      <div className="flex items-center justify-between px-4 py-2 border-b border-border/30 bg-secondary/20">
                        <div>
                          <p className="text-xs font-bold text-foreground truncate">{font.name}</p>
                          <p className="text-[10px] text-muted-foreground">{font.category}</p>
                        </div>
                        <button onClick={() => toggleCompare(font)} className="text-muted-foreground/40 hover:text-foreground transition-colors">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <div className="px-5 py-6 space-y-3">
                        <p className="leading-snug text-foreground/80 break-words" style={{ fontFamily: font.family, fontSize: Math.min(fontSize, 40) }}>{previewText}</p>
                        <p className="text-sm text-muted-foreground/60" style={{ fontFamily: font.family }}>The quick brown fox jumps over the lazy dog · 0123456789</p>
                        <p className="text-xs text-muted-foreground/40 break-all" style={{ fontFamily: font.family }}>ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Results header — shows count + shuffle on default browse, just count on search/filter */}
              {(() => {
                const hasFilters = search || activeStyles.length > 0 ||
                  Object.entries(filters).some(([k, v]) =>
                    k !== "familySize" ? !!v : ((v as number[])[0] !== 1 || (v as number[])[1] !== 25)
                  );
                return (
                  <div className="flex items-center justify-between px-1">
                    <p className="text-xs text-muted-foreground/50 font-medium">
                      {data?.total != null ? (
                        <>
                          {data.total.toLocaleString()} font{data.total !== 1 ? "s" : ""}
                          {!hasFilters && (
                            <span className="opacity-50"> · feed rotates every 30 min</span>
                          )}
                        </>
                      ) : null}
                    </p>
                    {!hasFilters && (
                      <button
                        onClick={() => { setSeed(Math.floor(Math.random() * 99999)); setPage(1); }}
                        className="flex items-center gap-1.5 text-xs font-bold text-primary/40 hover:text-primary transition-colors group"
                        title="Shuffle — show different fonts now"
                      >
                        <svg className="w-3.5 h-3.5 group-hover:rotate-180 transition-transform duration-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <path d="M16 3h5v5M4 20L21 3M21 16v5h-5M15 15l6 6" />
                        </svg>
                        Shuffle
                      </button>
                    )}
                  </div>
                );
              })()}

              {/* Content Area */}
              <div className="relative">
                {isLoading ? (
                  <div className="flex flex-col items-center justify-center py-24 text-muted-foreground">
                    <Loader2 className="h-10 w-10 animate-spin mb-4 text-primary" />
                    <p className="font-bold text-sm uppercase tracking-widest">Scanning foundry...</p>
                  </div>
                ) : error ? (
                  <div className="text-center py-24 text-destructive bg-destructive/5 rounded-2xl border border-destructive/20">
                    <h3 className="text-xl font-bold">Transmission Error</h3>
                    <p className="mt-2 text-sm font-medium">Unable to synchronize font data.</p>
                    <p className="mt-2 text-xs font-mono opacity-60">{String((error as any)?.message ?? error)}</p>
                  </div>
                ) : fonts?.length === 0 ? (
                  <div className="text-center py-24 text-muted-foreground bg-secondary/20 rounded-2xl border-2 border-dashed border-border">
                    <h3 className="text-xl font-bold mb-2">Zero Matches Found</h3>
                    <p className="text-sm font-medium">Try broadening your search parameters.</p>
                    <Button
                      variant="outline"
                      className="mt-6 rounded-xl font-bold px-8"
                      onClick={() => { setSearch(""); setActiveCategory("All"); setActiveUseCase("All"); }}
                    >
                      Reset All Filters
                    </Button>
                  </div>
                ) : viewMode === "grid" ? (
                  /* ── Grid view: compact tiles ── */
                  <motion.div
                    key="gridview"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 gap-3 mt-4"
                  >
                    {fonts?.map((font, idx) => (
                      <GridFontTile
                        key={font.id}
                        font={font}
                        color={fontColor}
                      />
                    ))}
                  </motion.div>
                ) : (
                  /* ── List / Compare view ── */
                  <motion.div
                    key="listview"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex flex-col space-y-2 mt-4"
                  >
                    {fonts?.map((font, idx) => (
                      viewMode === "compare" ? (
                        <div key={font.id}
                          onClick={() => toggleCompare(font)}
                          className={`cursor-pointer rounded-2xl border-2 transition-all ${compareIds.has(font.id) ? "border-primary shadow-lg shadow-primary/10 scale-[1.01]" : "border-transparent hover:border-primary/30"}`}>
                          <FontCard
                            font={font}
                            previewText={previewText}
                            fontSize={fontSize}
                            color={fontColor}
                            index={idx}
                            previewWeight={getPreviewWeight(filters.weight)}
                          />
                        </div>
                      ) : (
                        <FontCard
                          key={font.id}
                          font={font}
                          previewText={previewText}
                          fontSize={fontSize}
                          color={fontColor}
                          index={idx}
                          previewWeight={getPreviewWeight(filters.weight)}
                        />
                      )
                    ))}
                  </motion.div>
                )}
              </div>

              {/* Pagination Controls */}
              {!isLoading && !error && fonts && fonts.length > 0 && totalPages > 1 && (
                <div className="flex items-center justify-center gap-4 pt-8 pb-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page <= 1}
                    className="rounded-xl font-bold px-6"
                  >
                    Previous
                  </Button>
                  <span className="text-sm font-medium text-muted-foreground">
                    Page {page} of {totalPages} ({data?.total} fonts)
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={page >= totalPages}
                    className="rounded-xl font-bold px-6"
                  >
                    Next
                  </Button>
                </div>
              )}
            </section>
          </div >

          <aside className="hidden xl:block w-72 shrink-0 sticky top-24 space-y-6">
            {/* ── Google AdSense placeholder ── */}
            <div className="w-full rounded-2xl border-2 border-dashed border-border/30 bg-secondary/10 flex flex-col items-center justify-center text-center p-4" style={{ minHeight: 280 }}>
              <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/25">Advertisement</p>
              {/* Replace this div with your AdSense <ins> tag */}
            </div>

            {/* Related Styles */}
            <div className="space-y-4">
              <h4 className="text-[13px] font-black uppercase tracking-[0.2em] text-primary/40">RELATED STYLES</h4>
              <div className="grid grid-cols-2 gap-2">
                {["Cartoon", "Comic", "Groovy", "Trash", "Graffiti", "Old School", "Horror", "School", "Outline", "Curly", "Various", "Brush"].map(style => (
                  <button key={style} className="px-4 py-2.5 bg-secondary/30 border border-transparent rounded-xl text-[11px] font-black uppercase tracking-wider text-muted-foreground hover:bg-white hover:border-primary/20 hover:text-primary hover:shadow-lg hover:shadow-primary/5 transition-all">
                    {style}
                  </button>
                ))}
              </div>
            </div>

            {/* ── Second AdSense slot ── */}
            <div className="w-full rounded-2xl border-2 border-dashed border-border/30 bg-secondary/10 flex flex-col items-center justify-center text-center p-4" style={{ minHeight: 250 }}>
              <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/25">Advertisement</p>
            </div>
          </aside>
        </div >
      </main >
    </div >
  );
}
