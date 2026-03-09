import { useState, useRef, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { useFonts } from "@/hooks/use-fonts";
import { useQuery } from "@tanstack/react-query";
import { Navbar } from "@/components/Navbar";
import { Link } from "wouter";
import {
  Loader2, Search, X, Pin, Columns2, Type,
  ArrowLeftRight, ChevronRight, SlidersHorizontal,
  Eye, Minus, Plus,
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

// ─── Types ────────────────────────────────────────────────────────────────────
type ViewMode = "swim" | "grid" | "compare";

const CATEGORIES = ["All", "serif", "sans-serif", "display", "handwriting", "monospace"] as const;
const SAMPLE_TEXTS = [
  "The quick brown fox",
  "Pack my box with five",
  "Sphinx of black quartz",
  "Jackdaws love my big",
  "How vexingly quick",
  "ABCDEFGabcdefg",
  "0123456789",
];

const SIZES = [24, 32, 48, 64, 80];

// ─── Category badge colors ────────────────────────────────────────────────────
const CAT_COLORS: Record<string, string> = {
  "serif":       "bg-primary/5 text-primary/70 border-primary/15",
  "sans-serif":  "bg-secondary/50 text-muted-foreground border-border/40",
  "display":     "bg-primary/8 text-primary/60 border-primary/20",
  "handwriting": "bg-secondary/60 text-muted-foreground/80 border-border/50",
  "monospace":   "bg-secondary/40 text-muted-foreground/70 border-border/35",
};

// ─── Single font card (grid mode) ─────────────────────────────────────────────
function GridCard({
  font, sampleText, fontSize, pinned, onPin, onSelect, selected,
}: {
  font: any; sampleText: string; fontSize: number;
  pinned: boolean; onPin: () => void; onSelect: () => void; selected: boolean;
}) {
  useEffect(() => { loadFont(font.family); }, [font.family]);
  const catColor = CAT_COLORS[font.category] ?? "bg-secondary/30 text-muted-foreground/70 border-border/60";

  return (
    <motion.div
      onClick={onSelect}
      whileHover={{ y: -2 }}
      transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
      className={`group relative bg-white rounded-2xl border-2 transition-all cursor-pointer overflow-hidden ${
        selected
          ? "border-primary shadow-2xl shadow-primary/10"
          : "border-border/40 hover:border-primary/20 hover:shadow-2xl hover:shadow-primary/5"
      }`}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
      {/* Pin button */}
      <button
        onClick={e => { e.stopPropagation(); onPin(); }}
        className={`absolute top-2.5 right-2.5 z-10 w-7 h-7 rounded-full flex items-center justify-center transition-all ${
          pinned
            ? "bg-primary text-white shadow-sm"
            : "bg-white/80 text-muted-foreground/30 opacity-0 group-hover:opacity-100 hover:text-primary"
        }`}
      >
        <Pin className="w-3 h-3" />
      </button>

      {/* Specimen */}
      <div className="px-4 pt-5 pb-3 min-h-[90px] flex items-center">
        <span
          className="text-foreground leading-tight break-words w-full"
          style={{ fontFamily: font.family, fontSize, color: "#66768D" }}
        >
          {sampleText}
        </span>
      </div>

      {/* Meta */}
      <div className="px-4 pb-3 flex items-center justify-between gap-2">
        <span className="text-[11px] font-bold text-muted-foreground/70 truncate">{font.name}</span>
        {font.category && (
          <span className={`text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-full border shrink-0 ${catColor}`}>
            {font.category}
          </span>
        )}
      </div>
    </motion.div>
  );
}

// ─── Swim lane (category row) ─────────────────────────────────────────────────
function SwimLane({
  category, fonts, sampleText, fontSize, pinnedIds, onPin, onSelect, selectedId,
}: {
  category: string; fonts: any[]; sampleText: string; fontSize: number;
  pinnedIds: Set<number>; onPin: (id: number) => void;
  onSelect: (font: any) => void; selectedId: number | null;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-3 px-1">
        <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-full border ${CAT_COLORS[category] ?? "bg-secondary/30 text-muted-foreground/70 border-border/60"}`}>
          {category}
        </span>
        <span className="text-xs text-muted-foreground/50">{fonts.length} fonts</span>
        <div className="flex-1 h-px bg-secondary/50" />
      </div>
      <div ref={scrollRef} className="flex gap-3 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-zinc-200">
        {fonts.map(font => (
          <div key={font.id} className="flex-shrink-0" style={{ width: 220 }}>
            <GridCard
              font={font}
              sampleText={sampleText}
              fontSize={Math.min(fontSize, 28)}
              pinned={pinnedIds.has(font.id)}
              onPin={() => onPin(font.id)}
              onSelect={() => onSelect(font)}
              selected={selectedId === font.id}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Compare card — standalone so useEffect never called inside map ─────────────
function CompareCard({ font, sampleText, fontSize, onRemove }: {
  font: any; sampleText: string; fontSize: number; onRemove: () => void;
}) {
  useEffect(() => { loadFont(font.family); }, [font.family]);
  return (
    <div className="bg-white rounded-2xl border border-border/40 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2 border-b border-border/20 bg-secondary/30">
        <div>
          <p className="text-xs font-bold text-foreground/80">{font.name}</p>
          <p className="text-[10px] text-muted-foreground/50">{font.category}</p>
        </div>
        <button onClick={onRemove} className="text-muted-foreground/30 hover:text-muted-foreground transition-colors">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
      <div className="px-5 py-6">
        <p className="leading-snug break-words" style={{ fontFamily: font.family, fontSize: fontSize * 0.8, color: "#66768D" }}>
          {sampleText}
        </p>
        <p className="mt-4 text-sm leading-relaxed" style={{ fontFamily: font.family, color: "#66768D99" }}>
          The quick brown fox jumps over the lazy dog. 0123456789
        </p>
        <p className="mt-2 text-xs leading-relaxed" style={{ fontFamily: font.family, color: "#66768D80" }}>
          ABCDEFGHIJKLMNOPQRSTUVWXYZ abcdefghijklmnopqrstuvwxyz
        </p>
      </div>
    </div>
  );
}

// ─── Compare panel ────────────────────────────────────────────────────────────
function ComparePanel({
  fonts, sampleText, fontSize, onRemove,
}: {
  fonts: any[]; sampleText: string; fontSize: number; onRemove: (id: number) => void;
}) {
  return (
    <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${fonts.length}, 1fr)` }}>
      {fonts.map(font => (
        <CompareCard key={font.id} font={font} sampleText={sampleText} fontSize={fontSize} onRemove={() => onRemove(font.id)} />
      ))}
    </div>
  );
}

// ─── SimilarRow — proper component so hooks never called inside .map() ─────────
function SimilarRow({ font, char }: { font: any; char: string }) {
  useEffect(() => { loadFont(font.family); }, [font.family]);
  return (
    <Link href={`/font/${font.id}`}>
      <div className="flex items-center gap-3 py-2 px-2 rounded-xl hover:bg-secondary/30 transition-colors group cursor-pointer">
        <span className="text-xl w-8" style={{ fontFamily: font.family, color: "#66768D" }}>Ag</span>
        <span className="text-xs font-medium text-muted-foreground group-hover:text-primary transition-colors truncate">{font.name}</span>
        <ChevronRight className="w-3 h-3 text-muted-foreground/30 ml-auto shrink-0" />
      </div>
    </Link>
  );
}

// ─── PinnedCard — proper component so hooks never called inside .map() ─────────
function PinnedCard({ font, sampleText, onUnpin }: { font: any; sampleText: string; onUnpin: () => void }) {
  useEffect(() => { loadFont(font.family); }, [font.family]);
  return (
    <div className="flex-shrink-0 bg-white rounded-xl border border-border/40 px-4 py-2.5 flex items-center gap-3 group">
      <span className="text-2xl" style={{ fontFamily: font.family, fontSize: 22, color: "#66768D" }}>{sampleText.slice(0, 12)}</span>
      <div className="min-w-0">
        <p className="text-[11px] font-bold text-muted-foreground">{font.name}</p>
        <p className="text-[9px] text-muted-foreground/50">{font.category}</p>
      </div>
      <button onClick={onUnpin} className="text-muted-foreground/30 hover:text-muted-foreground opacity-0 group-hover:opacity-100 transition-all">
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

// ─── Detail drawer ────────────────────────────────────────────────────────────
function DetailDrawer({
  font, sampleText, fontSize, onClose,
}: {
  font: any; sampleText: string; fontSize: number; onClose: () => void;
}) {
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
    <div className="bg-white rounded-3xl border border-border/40 shadow-xl overflow-hidden">
      {/* Header */}
      <div className="flex items-start justify-between p-5 border-b border-border/20">
        <div>
          <h2 className="text-lg font-black text-foreground">{font.name}</h2>
          <p className="text-sm text-muted-foreground/50 mt-0.5">{font.category}{font.designer ? ` · ${font.designer}` : ""}</p>
        </div>
        <div className="flex gap-2">
          <Link href={`/font/${font.id}`}>
            <button className="text-xs font-bold text-primary border border-primary/30 px-3 py-1.5 rounded-lg hover:bg-primary hover:text-white transition-all">
              View Details
            </button>
          </Link>
          <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground/50 hover:bg-secondary/50 hover:text-foreground/80 transition-all">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Big specimen */}
      <div className="px-6 py-8 bg-secondary/20 border-b border-border/20">
        <p className="leading-tight" style={{ fontFamily: font.family, fontSize: Math.min(fontSize * 1.2, 72), color: "#66768D" }}>
          {sampleText}
        </p>
        <p className="mt-3 text-sm" style={{ fontFamily: font.family, color: "#66768D99" }}>
          The quick brown fox jumps over the lazy dog
        </p>
        <p className="mt-1 text-xs" style={{ fontFamily: font.family, color: "#66768D80" }}>
          ABCDEFGHIJKLMNOPQRSTUVWXYZ · 0123456789 · !@#$%
        </p>
      </div>

      {/* Similar + Pair */}
      {similar && (
        <div className="grid grid-cols-2 divide-x divide-zinc-50 p-4 gap-4">
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/50 mb-3">Similar Fonts</p>
            <div className="space-y-1">
              {similar.similar?.slice(0, 5).map(f => <SimilarRow key={f.id} font={f} char="Ag" />)}
            </div>
          </div>
          <div className="pl-4">
            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/50 mb-3 flex items-center gap-1.5">
              <ArrowLeftRight className="w-3 h-3" /> Pair With
            </p>
            <div className="space-y-1">
              {similar.opposite?.slice(0, 5).map(f => <SimilarRow key={f.id} font={f} char="Ag" />)}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function FontCharacter() {
  const [viewMode,    setViewMode]    = useState<ViewMode>("grid");
  const [category,   setCategory]    = useState("All");
  const [sampleIdx,  setSampleIdx]   = useState(0);
  const [customText, setCustomText]  = useState("");
  const [sizeIdx,    setSizeIdx]     = useState(2);         // default 48px
  const [search,     setSearch]      = useState("");
  const [page,       setPage]        = useState(1);
  const [pinnedIds,  setPinnedIds]   = useState<Set<number>>(new Set());
  const [compareIds, setCompareIds]  = useState<Set<number>>(new Set());
  const [selectedFont, setSelectedFont] = useState<any>(null);
  const [showFilters,  setShowFilters]  = useState(false);

  const sampleText = customText || SAMPLE_TEXTS[sampleIdx];
  const fontSize   = SIZES[sizeIdx];

  const catFilter = category === "All" ? undefined : category;
  const { data, isLoading } = useFonts({ page, limit: 80, search, category: catFilter });
  const fonts = data?.fonts ?? [];
  const totalPages = data ? Math.ceil(data.total / data.limit) : 1;

  const pinnedFonts  = fonts.filter(f => pinnedIds.has(f.id));
  const compareFonts = fonts.filter(f => compareIds.has(f.id));

  const togglePin = (id: number) => {
    setPinnedIds(prev => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  };

  const toggleCompare = (font: any) => {
    setCompareIds(prev => {
      const n = new Set(prev);
      if (n.has(font.id)) { n.delete(font.id); return n; }
      if (n.size >= 4) return prev; // max 4
      n.add(font.id);
      return n;
    });
  };

  const handleSelect = (font: any) => {
    if (viewMode === "compare") {
      toggleCompare(font);
    } else {
      setSelectedFont(prev => prev?.id === font.id ? null : font);
    }
  };

  // Grouped by category for swim lane view
  const byCategory = CATEGORIES.slice(1).reduce((acc, cat) => {
    acc[cat] = fonts.filter(f => f.category === cat);
    return acc;
  }, {} as Record<string, any[]>);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <div className="max-w-[1400px] mx-auto px-4 py-6 space-y-5">

        {/* ── Header ── */}
        <div className="flex items-end justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-4xl font-black tracking-tighter text-foreground">
              Font <span className="text-primary">Specimen</span> Explorer
            </h1>
            <p className="text-muted-foreground/50 mt-1 text-sm">
              Browse {data?.total?.toLocaleString() ?? "…"} fonts · type any text · pin & compare
            </p>
          </div>

          {/* View mode switcher */}
          <div className="flex items-center gap-1 bg-white rounded-xl border border-border/60 p-1 shadow-sm">
            {([
              { mode: "grid",    icon: <Eye className="w-4 h-4" />,      label: "Browse" },
              { mode: "swim",    icon: <Columns2 className="w-4 h-4" />, label: "By Style" },
              { mode: "compare", icon: <Columns2 className="w-4 h-4" />, label: "Compare" },
            ] as { mode: ViewMode; icon: React.ReactNode; label: string }[]).map(({ mode, icon, label }) => (
              <button key={mode} onClick={() => setViewMode(mode)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition-all ${
                  viewMode === mode ? "bg-primary text-white shadow-sm" : "text-muted-foreground/70 hover:text-foreground"
                }`}>
                {icon} {label}
              </button>
            ))}
          </div>
        </div>

        {/* ── Controls ── */}
        <div className="bg-white rounded-2xl border border-border/40 shadow-sm p-4 space-y-4">

          {/* Row 1: text input + size + filters toggle */}
          <div className="flex gap-3 flex-wrap items-center">
            {/* Custom text */}
            <div className="relative flex-1 min-w-[200px]">
              <Type className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/30" />
              <input
                value={customText}
                onChange={e => setCustomText(e.target.value)}
                placeholder="Type preview text…"
                className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-border/60 text-sm focus:outline-none focus:border-primary bg-secondary/30 placeholder:text-muted-foreground/30"
              />
              {customText && (
                <button onClick={() => setCustomText("")} className="absolute right-3 top-1/2 -translate-y-1/2">
                  <X className="w-3.5 h-3.5 text-muted-foreground/30 hover:text-muted-foreground" />
                </button>
              )}
            </div>

            {/* Sample text pills */}
            <div className="flex gap-1.5 flex-wrap">
              {SAMPLE_TEXTS.slice(0, 4).map((t, i) => (
                <button key={i} onClick={() => { setSampleIdx(i); setCustomText(""); }}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                    !customText && sampleIdx === i
                      ? "bg-primary text-white border-primary"
                      : "bg-secondary/30 text-muted-foreground/70 border-border/60 hover:border-border"
                  }`}>
                  {t.split(" ").slice(0, 2).join(" ")}…
                </button>
              ))}
            </div>

            {/* Size */}
            <div className="flex items-center gap-1.5 bg-secondary/30 rounded-xl border border-border/60 px-2 py-1">
              <button onClick={() => setSizeIdx(i => Math.max(0, i - 1))} className="w-6 h-6 flex items-center justify-center text-muted-foreground/50 hover:text-foreground/80">
                <Minus className="w-3 h-3" />
              </button>
              <span className="text-xs font-bold text-muted-foreground w-8 text-center">{fontSize}px</span>
              <button onClick={() => setSizeIdx(i => Math.min(SIZES.length - 1, i + 1))} className="w-6 h-6 flex items-center justify-center text-muted-foreground/50 hover:text-foreground/80">
                <Plus className="w-3 h-3" />
              </button>
            </div>

            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground/30" />
              <input
                value={search}
                onChange={e => { setSearch(e.target.value); setPage(1); }}
                placeholder="Search fonts…"
                className="pl-9 pr-4 py-2.5 rounded-xl border border-border/60 text-sm focus:outline-none focus:border-primary bg-secondary/30 placeholder:text-muted-foreground/30 w-48"
              />
            </div>

            <button onClick={() => setShowFilters(v => !v)}
              className={`flex items-center gap-1.5 px-3 py-2.5 rounded-xl border text-xs font-bold transition-all ${
                showFilters ? "bg-primary text-white border-primary" : "border-border/60 text-muted-foreground/70 hover:border-border"
              }`}>
              <SlidersHorizontal className="w-3.5 h-3.5" /> Filters
            </button>
          </div>

          {/* Row 2: category filter (always visible) */}
          <div className="flex gap-2 flex-wrap">
            {CATEGORIES.map(cat => (
              <button key={cat} onClick={() => { setCategory(cat); setPage(1); }}
                className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-all ${
                  category === cat
                    ? "bg-foreground text-white border-foreground"
                    : `${CAT_COLORS[cat] ?? "bg-secondary/30 text-muted-foreground/70 border-border/60"} hover:shadow-sm`
                }`}>
                {cat === "All" ? "All Styles" : cat}
              </button>
            ))}
          </div>
        </div>

        {/* ── Pinned bar ── */}
        {pinnedFonts.length > 0 && (
          <div className="bg-secondary/30 border border-border/40 rounded-2xl p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-black uppercase tracking-widest text-primary/60 flex items-center gap-1.5">
                <Pin className="w-3 h-3" /> Pinned ({pinnedFonts.length})
              </span>
              <button onClick={() => setPinnedIds(new Set())} className="text-xs text-primary/50 hover:text-primary font-medium">Clear all</button>
            </div>
            <div className="flex gap-3 overflow-x-auto pb-1">
              {pinnedFonts.map(font => <PinnedCard key={font.id} font={font} sampleText={sampleText} onUnpin={() => togglePin(font.id)} />)}
            </div>
          </div>
        )}

        {/* ── Compare mode bar ── */}
        {viewMode === "compare" && (
          <div className="bg-primary/5 border border-primary/15 rounded-2xl p-3 flex items-center gap-3">
            <span className="text-xs font-black uppercase tracking-widest text-primary/60 shrink-0">
              Compare Mode
            </span>
            <span className="text-xs text-muted-foreground/60">Click fonts to add (max 4) · {compareIds.size}/4 selected</span>
            {compareIds.size > 0 && (
              <button onClick={() => setCompareIds(new Set())} className="ml-auto text-xs text-primary/50 hover:text-primary font-medium shrink-0">
                Clear
              </button>
            )}
          </div>
        )}

        {/* ── Compare panel ── */}
        {viewMode === "compare" && compareFonts.length > 0 && (
          <ComparePanel
            fonts={compareFonts}
            sampleText={sampleText}
            fontSize={fontSize}
            onRemove={id => setCompareIds(prev => { const n = new Set(prev); n.delete(id); return n; })}
          />
        )}

        {/* ── Selected font detail ── */}
        {selectedFont && viewMode !== "compare" && (
          <DetailDrawer
            font={selectedFont}
            sampleText={sampleText}
            fontSize={fontSize}
            onClose={() => setSelectedFont(null)}
          />
        )}

        {/* ── Font display ── */}
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-24 text-muted-foreground/50">
            <Loader2 className="w-8 h-8 animate-spin mb-3 text-primary" />
            <p className="text-sm font-medium">Loading fonts…</p>
          </div>
        ) : viewMode === "swim" ? (
          /* Swim lanes */
          <div className="space-y-8">
            {(Object.entries(byCategory) as [string, any[]][])
              .filter(([, fts]) => fts.length > 0)
              .map(([cat, fts]) => (
                <SwimLane
                  key={cat}
                  category={cat}
                  fonts={fts}
                  sampleText={sampleText}
                  fontSize={fontSize}
                  pinnedIds={pinnedIds}
                  onPin={togglePin}
                  onSelect={handleSelect}
                  selectedId={selectedFont?.id ?? null}
                />
              ))}
          </div>
        ) : (
          /* Grid */
          <div>
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs text-muted-foreground/50 font-medium">{fonts.length} fonts shown</p>
              {viewMode === "compare" && (
                <p className="text-xs text-muted-foreground/50 font-medium">Click to add to comparison</p>
              )}
            </div>
            <div className="grid gap-3"
              style={{ gridTemplateColumns: `repeat(auto-fill, minmax(${Math.max(180, fontSize * 5)}px, 1fr))` }}>
              {fonts.map(font => (
                <GridCard
                  key={font.id}
                  font={font}
                  sampleText={sampleText}
                  fontSize={fontSize}
                  pinned={pinnedIds.has(font.id)}
                  onPin={() => togglePin(font.id)}
                  onSelect={() => handleSelect(font)}
                  selected={viewMode === "compare" ? compareIds.has(font.id) : selectedFont?.id === font.id}
                />
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-3 pt-8">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="px-4 py-2 rounded-xl border border-border/60 text-xs font-bold text-muted-foreground hover:border-border disabled:opacity-30 transition-all bg-white"
                >
                  ← Previous
                </button>
                <span className="text-xs text-muted-foreground/50">
                  Page {page} of {totalPages} · {data?.total?.toLocaleString()} fonts
                </span>
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  className="px-4 py-2 rounded-xl border border-border/60 text-xs font-bold text-muted-foreground hover:border-border disabled:opacity-30 transition-all bg-white"
                >
                  Next →
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
