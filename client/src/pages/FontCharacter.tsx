import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { useFonts } from "@/hooks/use-fonts";
import { useQuery } from "@tanstack/react-query";
import { Navbar } from "@/components/Navbar";
import { Link } from "wouter";
import {
  Search, X, ChevronRight, ArrowLeftRight,
  Loader2, LayoutGrid, LayoutList,
} from "lucide-react";

// ─── Font loader ──────────────────────────────────────────────────────────────
const loadedFonts = new Set<string>();
function loadFont(family: string) {
  if (!family || loadedFonts.has(family)) return;
  loadedFonts.add(family);
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(family)}:wght@400;700&display=swap`;
  document.head.appendChild(link);
}

// ─── Character groups ─────────────────────────────────────────────────────────
const CHAR_GROUPS = [
  { label: "Uppercase",   chars: "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("") },
  { label: "Lowercase",   chars: "abcdefghijklmnopqrstuvwxyz".split("") },
  { label: "Numbers",     chars: "0123456789".split("") },
  { label: "Punctuation", chars: [".", ",", ":", ";", "!", "?", "'", '"', "-", "–"] },
  { label: "Symbols",     chars: ["@", "#", "$", "%", "&", "*", "(", ")", "+", "="] },
  { label: "Key Glyphs",  chars: ["g", "a", "e", "G", "R", "Q", "S", "J", "Ag", "Rg"] },
];

const SIZES = [
  { label: "S",  px: 40 },
  { label: "M",  px: 64 },
  { label: "L",  px: 96 },
  { label: "XL", px: 128 },
];

const CATEGORIES = ["All", "serif", "sans-serif", "display", "handwriting", "monospace"] as const;

const CAT_PILL: Record<string, string> = {
  "serif":       "bg-primary/5 text-primary/70 border-primary/15",
  "sans-serif":  "bg-secondary/50 text-muted-foreground border-border/40",
  "display":     "bg-primary/8 text-primary/60 border-primary/20",
  "handwriting": "bg-secondary/60 text-muted-foreground/80 border-border/50",
  "monospace":   "bg-secondary/40 text-muted-foreground/70 border-border/35",
};

// ─── SimilarFontRow — standalone component so useEffect is never inside .map() ─
function SimilarFontRow({ font, char }: { font: any; char: string }) {
  useEffect(() => { loadFont(font.family); }, [font.family]);
  return (
    <Link href={`/font/${font.id}`}>
      <div className="flex items-center gap-3 py-2 px-2 rounded-xl hover:bg-secondary/30 transition-colors group cursor-pointer">
        <span className="text-2xl w-10 shrink-0" style={{ fontFamily: font.family, color: "#66768D" }}>{char}</span>
        <span className="text-xs font-medium text-muted-foreground group-hover:text-primary transition-colors truncate">{font.name}</span>
        <ChevronRight className="w-3 h-3 text-muted-foreground/30 ml-auto shrink-0" />
      </div>
    </Link>
  );
}

// ─── Grid card ────────────────────────────────────────────────────────────────
function GridCard({ font, char, size, selected, onSelect }: {
  font: any; char: string; size: number; selected: boolean; onSelect: () => void;
}) {
  useEffect(() => { loadFont(font.family); }, [font.family]);
  return (
    <motion.div
      onClick={onSelect}
      whileHover={{ y: -2 }}
      transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
      className={`group relative flex flex-col items-center bg-white rounded-2xl border-2 cursor-pointer transition-all overflow-hidden ${
        selected ? "border-primary shadow-2xl shadow-primary/10" : "border-border/40 hover:border-primary/20 hover:shadow-2xl hover:shadow-primary/5"
      }`}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
      <div className="flex items-center justify-center w-full flex-1 py-4" style={{ minHeight: size + 32 }}>
        <span
          className="text-foreground leading-none select-none transition-transform group-hover:scale-110 duration-300"
          style={{ fontFamily: font.family, fontSize: size, color: "#66768D" }}
        >
          {char}
        </span>
      </div>
      <div className={`w-full px-2 pb-2 pt-1.5 border-t ${selected ? "border-primary/10 bg-primary/3" : "border-border/20 bg-secondary/30"}`}>
        <p className="text-[10px] font-bold text-muted-foreground truncate text-center">{font.name}</p>
        {font.category && (
          <p className={`text-[8px] font-black uppercase tracking-wider text-center mt-0.5 ${selected ? "text-primary" : "text-muted-foreground/30"}`}>
            {font.category}
          </p>
        )}
      </div>
    </motion.div>
  );
}

// ─── List row ─────────────────────────────────────────────────────────────────
function ListRow({ font, char, selected, onSelect }: {
  font: any; char: string; selected: boolean; onSelect: () => void;
}) {
  useEffect(() => { loadFont(font.family); }, [font.family]);
  return (
    <motion.div
      onClick={onSelect}
      whileHover={{ y: -1 }}
      transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
      className={`relative flex items-center gap-4 px-4 py-3 rounded-xl border cursor-pointer transition-all group ${
        selected ? "border-primary/40 bg-primary/3 shadow-2xl shadow-primary/5" : "border-border/40 bg-white hover:border-primary/20 hover:shadow-2xl hover:shadow-primary/5"
      }`}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none rounded-xl" />
      <div className="flex items-center justify-center shrink-0 w-14 h-14">
        <span className="text-foreground leading-none select-none" style={{ fontFamily: font.family, fontSize: 44, color: "#66768D" }}>{char}</span>
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-bold text-foreground truncate">{font.name}</p>
        {font.category && (
          <span className={`inline-block text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-full border mt-0.5 ${CAT_PILL[font.category] ?? "bg-secondary/30 text-muted-foreground/70 border-border/60"}`}>
            {font.category}
          </span>
        )}
      </div>
      <p className="text-sm truncate flex-[2] hidden md:block" style={{ fontFamily: font.family, color: "#66768D" }}>
        The quick brown fox jumps
      </p>
      <ChevronRight className={`w-4 h-4 shrink-0 transition-colors ${selected ? "text-primary" : "text-muted-foreground/20 group-hover:text-muted-foreground/50"}`} />
    </motion.div>
  );
}

// ─── Detail panel ─────────────────────────────────────────────────────────────
function DetailPanel({ font, char, onClose }: { font: any; char: string; onClose: () => void; }) {
  useEffect(() => { loadFont(font.family); }, [font.family]);
  const { data: similar } = useQuery<{ similar: any[]; opposite: any[] }>({
    queryKey: [`/api/fonts/${font.id}/similar`],
    queryFn: async () => {
      const r = await fetch(`/api/fonts/${font.id}/similar`);
      if (!r.ok) return { similar: [], opposite: [] };
      return r.json();
    },
  });

  return (
    <div className="bg-white rounded-3xl border border-border/40 shadow-2xl overflow-hidden">
      <div className="flex items-start justify-between p-5 border-b border-border/20 bg-secondary/20">
        <div>
          <h3 className="text-lg font-black text-foreground leading-tight">{font.name}</h3>
          <p className="text-xs text-muted-foreground/50 mt-0.5">{font.category}{font.designer ? ` · ${font.designer}` : ""}</p>
        </div>
        <div className="flex gap-2">
          <Link href={`/font/${font.id}`}>
            <button className="text-xs font-bold text-primary border border-primary/30 px-3 py-1.5 rounded-lg hover:bg-primary hover:text-white transition-all whitespace-nowrap">
              View Font →
            </button>
          </Link>
          <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground/50 hover:bg-secondary/50 hover:text-foreground/80 transition-all">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Giant glyph */}
      <div className="flex flex-col items-center py-10 px-6 border-b border-border/20">
        <span className="leading-none select-all" style={{ fontFamily: font.family, fontSize: 120, color: "#66768D" }}>{char}</span>
        <p className="text-xs text-muted-foreground/30 mt-3 font-mono">{font.family}</p>
      </div>

      {/* Full alphabet */}
      <div className="px-5 py-4 border-b border-border/20 space-y-1.5">
        <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/30 mb-2">Full Specimen</p>
        <p className="text-base leading-snug break-all" style={{ fontFamily: font.family, color: "#66768D" }}>
          AaBbCcDdEeFfGgHhIiJjKkLlMmNnOoPpQqRrSsTtUuVvWwXxYyZz
        </p>
        <p className="text-sm" style={{ fontFamily: font.family, color: "#66768D99" }}>0123456789 !@#$%&*()</p>
        <p className="text-sm leading-relaxed" style={{ fontFamily: font.family, color: "#66768D99" }}>
          The quick brown fox jumps over the lazy dog
        </p>
      </div>

      {/* Similar + Pair */}
      {similar && (
        <div className="p-4 space-y-4">
          {similar.similar?.length > 0 && (
            <div>
              <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/30 mb-2">Similar Fonts</p>
              {similar.similar.slice(0, 4).map(f => (
                <SimilarFontRow key={f.id} font={f} char={char} />
              ))}
            </div>
          )}
          {similar.opposite?.length > 0 && (
            <div>
              <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/30 mb-2 flex items-center gap-1">
                <ArrowLeftRight className="w-3 h-3" /> Pair With
              </p>
              {similar.opposite.slice(0, 4).map(f => (
                <SimilarFontRow key={f.id} font={f} char={char} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function FontCharacter() {
  const [activeChar,   setActiveChar]   = useState("A");
  const [customChar,   setCustomChar]   = useState("");
  const [sizeIdx,      setSizeIdx]      = useState(1);
  const [category,     setCategory]     = useState("All");
  const [search,       setSearch]       = useState("");
  const [page,         setPage]         = useState(1);
  const [viewMode,     setViewMode]     = useState<"grid" | "list">("grid");
  const [selectedFont, setSelectedFont] = useState<any>(null);
  const [activeGroup,  setActiveGroup]  = useState("Uppercase");

  const char = customChar || activeChar;
  const size = SIZES[sizeIdx].px;
  const catFilter = category === "All" ? undefined : category;

  const { data, isLoading } = useFonts({ page, limit: 96, search, category: catFilter });
  const fonts = data?.fonts ?? [];
  const totalPages = data ? Math.ceil(data.total / data.limit) : 1;
  const currentGroup = CHAR_GROUPS.find(g => g.label === activeGroup) ?? CHAR_GROUPS[0];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="max-w-[1600px] mx-auto px-4 py-6">

        {/* Header */}
        <div className="mb-6">
          <h1 className="text-4xl font-black tracking-tighter text-foreground">
            Font <span className="text-primary">Character</span> Map
          </h1>
          <p className="text-muted-foreground/50 mt-1 text-sm">
            Pick any character — see it across {data?.total?.toLocaleString() ?? "…"} fonts side by side
          </p>
        </div>

        <div className="flex gap-5">

          {/* ── LEFT SIDEBAR ── */}
          <div className="w-64 shrink-0 space-y-3">

            {/* Custom char input */}
            <div className="bg-white rounded-2xl border border-border/40 shadow-sm p-4 space-y-3">
              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/50">Custom character</p>
              <div className="relative">
                <input
                  value={customChar}
                  onChange={e => { setCustomChar(e.target.value.slice(0, 2)); setPage(1); }}
                  placeholder={activeChar}
                  maxLength={2}
                  className="w-full text-center text-5xl font-mono text-foreground bg-secondary/30 border-2 border-border/60 rounded-xl py-4 focus:outline-none focus:border-primary h-24 placeholder:text-muted-foreground/20"
                />
                {customChar && (
                  <button onClick={() => setCustomChar("")} className="absolute top-2 right-2 w-6 h-6 rounded-full bg-secondary flex items-center justify-center hover:bg-secondary">
                    <X className="w-3 h-3 text-muted-foreground" />
                  </button>
                )}
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground/50">Now showing:</span>
                <span className="text-2xl font-mono text-foreground/80 bg-secondary/30 border border-border/60 rounded-lg w-10 h-10 flex items-center justify-center">{char}</span>
              </div>
            </div>

            {/* Character groups */}
            <div className="bg-white rounded-2xl border border-border/40 shadow-sm overflow-hidden">
              <div className="flex overflow-x-auto border-b border-border/20 scrollbar-none">
                {CHAR_GROUPS.map(g => (
                  <button key={g.label} onClick={() => { setActiveGroup(g.label); setCustomChar(""); }}
                    className={`px-3 py-2.5 text-[9px] font-black uppercase tracking-wider whitespace-nowrap shrink-0 border-b-2 transition-all ${
                      activeGroup === g.label ? "border-primary text-primary" : "border-transparent text-muted-foreground/50 hover:text-foreground/80"
                    }`}>
                    {g.label}
                  </button>
                ))}
              </div>
              <div className="p-3 flex flex-wrap gap-1.5">
                {currentGroup.chars.map(ch => (
                  <button key={ch} onClick={() => { setActiveChar(ch); setCustomChar(""); setPage(1); setSelectedFont(null); }}
                    className={`min-w-[34px] h-9 px-1.5 rounded-lg text-sm font-mono border-2 transition-all hover:scale-110 active:scale-95 ${
                      !customChar && activeChar === ch
                        ? "bg-primary border-primary text-white shadow-md shadow-primary/20"
                        : "bg-secondary/30 border-border/40 text-foreground/80 hover:border-border"
                    }`}>
                    {ch}
                  </button>
                ))}
              </div>
            </div>

            {/* Size */}
            <div className="bg-white rounded-2xl border border-border/40 shadow-sm p-4">
              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/50 mb-3">Display Size</p>
              <div className="grid grid-cols-4 gap-1.5">
                {SIZES.map((s, i) => (
                  <button key={s.label} onClick={() => setSizeIdx(i)}
                    className={`py-2 rounded-lg text-xs font-black border-2 transition-all ${
                      sizeIdx === i ? "bg-primary border-primary text-white" : "bg-secondary/30 border-border/40 text-muted-foreground/70 hover:border-border"
                    }`}>
                    {s.label}
                    <span className="block text-[8px] font-medium opacity-60">{s.px}px</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Category */}
            <div className="bg-white rounded-2xl border border-border/40 shadow-sm p-4">
              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/50 mb-3">Style</p>
              <div className="space-y-1.5">
                {CATEGORIES.map(cat => (
                  <button key={cat} onClick={() => { setCategory(cat); setPage(1); }}
                    className={`w-full text-left px-3 py-2 rounded-xl text-xs font-bold border transition-all ${
                      category === cat ? "bg-foreground text-white border-foreground" : `${CAT_PILL[cat] ?? "bg-secondary/30 text-muted-foreground/70 border-border/40"} hover:shadow-sm`
                    }`}>
                    {cat === "All" ? "All Styles" : cat}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* ── RIGHT CONTENT ── */}
          <div className="flex-1 min-w-0 space-y-3">

            {/* Toolbar */}
            <div className="flex items-center gap-3 bg-white rounded-2xl border border-border/40 shadow-sm px-4 py-3">
              <div className="relative flex-1 max-w-xs">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground/30" />
                <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); setSelectedFont(null); }}
                  placeholder="Search fonts…"
                  className="w-full pl-9 pr-4 py-2 rounded-xl border border-border/60 text-xs focus:outline-none focus:border-primary bg-secondary/30 placeholder:text-muted-foreground/30"
                />
                {search && <button onClick={() => { setSearch(""); setPage(1); }} className="absolute right-3 top-1/2 -translate-y-1/2"><X className="w-3 h-3 text-muted-foreground/30 hover:text-muted-foreground" /></button>}
              </div>
              <span className="text-xs text-muted-foreground/50 font-medium">{fonts.length} fonts · page {page}/{totalPages}</span>
              <div className="flex-1" />
              <div className="flex gap-1 bg-secondary/30 rounded-xl p-1 border border-border/40">
                <button onClick={() => setViewMode("grid")} className={`p-1.5 rounded-lg transition-all ${viewMode === "grid" ? "bg-white shadow-sm text-primary" : "text-muted-foreground/50 hover:text-foreground/80"}`}><LayoutGrid className="w-4 h-4" /></button>
                <button onClick={() => setViewMode("list")} className={`p-1.5 rounded-lg transition-all ${viewMode === "list" ? "bg-white shadow-sm text-primary" : "text-muted-foreground/50 hover:text-foreground/80"}`}><LayoutList className="w-4 h-4" /></button>
              </div>
            </div>

            {/* Grid + Detail side by side */}
            <div className="flex gap-4 items-start min-h-[600px]">
              <div className={selectedFont ? "flex-1 min-w-0" : "w-full"}>
                {isLoading ? (
                  <div className="flex flex-col items-center justify-center py-24 text-muted-foreground/50">
                    <Loader2 className="w-8 h-8 animate-spin mb-3 text-primary" />
                    <p className="text-sm font-medium">Loading fonts…</p>
                  </div>
                ) : viewMode === "grid" ? (
                  <div className="grid gap-2.5" style={{ gridTemplateColumns: `repeat(auto-fill, minmax(${Math.max(90, size + 20)}px, 1fr))` }}>
                    {fonts.map(font => (
                      <GridCard key={font.id} font={font} char={char} size={size}
                        selected={selectedFont?.id === font.id}
                        onSelect={() => setSelectedFont(prev => prev?.id === font.id ? null : font)}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    {fonts.map(font => (
                      <ListRow key={font.id} font={font} char={char} selected={selectedFont?.id === font.id}
                        onSelect={() => setSelectedFont(prev => prev?.id === font.id ? null : font)}
                      />
                    ))}
                  </div>
                )}

                {!isLoading && totalPages > 1 && (
                  <div className="flex items-center justify-center gap-3 pt-6">
                    <button onClick={() => { setPage(p => Math.max(1, p - 1)); setSelectedFont(null); }} disabled={page <= 1}
                      className="px-4 py-2 rounded-xl border border-border/60 text-xs font-bold text-muted-foreground hover:border-border disabled:opacity-30 transition-all bg-white">
                      ← Prev
                    </button>
                    <span className="text-xs text-muted-foreground/50">{data?.total?.toLocaleString()} fonts total</span>
                    <button onClick={() => { setPage(p => Math.min(totalPages, p + 1)); setSelectedFont(null); }} disabled={page >= totalPages}
                      className="px-4 py-2 rounded-xl border border-border/60 text-xs font-bold text-muted-foreground hover:border-border disabled:opacity-30 transition-all bg-white">
                      Next →
                    </button>
                  </div>
                )}
              </div>

              {/* Sticky detail panel */}
              {selectedFont && (
                <div className="w-72 shrink-0">
                  <DetailPanel font={selectedFont} char={char} onClose={() => setSelectedFont(null)} />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
