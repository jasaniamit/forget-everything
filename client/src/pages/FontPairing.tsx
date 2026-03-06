import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Navbar } from "@/components/Navbar";
import { motion, AnimatePresence } from "framer-motion";
import { Search, ArrowRight, RefreshCw, Copy, Check, Shuffle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

// ── Types ─────────────────────────────────────────────────────────────────────
interface Font {
  id: number; name: string; family: string; category: string;
  contrast?: string; xHeight?: string; width?: string; designer?: string;
}

// Curated headline/body pairing rules
const PAIRING_RULES: Record<string, { label: string; description: string }> = {
  "serif+sans-serif":    { label: "Classic",      description: "Serif headline with sans-serif body — timeless editorial pairing" },
  "sans-serif+serif":    { label: "Modern",       description: "Clean sans headline, readable serif body — contemporary editorial" },
  "display+sans-serif":  { label: "Editorial",    description: "Expressive display headline with clean body" },
  "handwriting+serif":   { label: "Boutique",     description: "Humanist script with refined serif — premium brand feel" },
  "monospace+sans-serif":{ label: "Developer",    description: "Code-forward headline with clean readable body" },
  "sans-serif+monospace":{ label: "Tech",         description: "Geometric sans with monospace detail — startup energy" },
};

const SAMPLE_CONTENT = [
  { heading: "The Art of Typography", body: "Good typography is invisible. Bad typography is everywhere. Great design speaks before you read a single word." },
  { heading: "Designing for Humans", body: "Every typeface carries an emotion. Choose carefully. The font you pick tells the reader how to feel before they understand what you're saying." },
  { heading: "Less Is More", body: "Whitespace is not empty space — it is powerful breathing room that gives your content room to land with impact." },
];

// ── Font search ────────────────────────────────────────────────────────────────
function useFontSearch(query: string) {
  return useQuery<{ fonts: Font[] }>({
    queryKey: ["/api/fonts", { search: query, limit: 8 }],
    queryFn: async () => {
      const params = new URLSearchParams({ limit: "8" });
      if (query) params.set("search", query);
      const res = await fetch(`/api/fonts?${params}`);
      return res.json();
    },
    enabled: true,
  });
}

function usePairings(fontId: number) {
  return useQuery<Font[]>({
    queryKey: [`/api/fonts/${fontId}/similar`],
    queryFn: async () => {
      const res = await fetch(`/api/fonts/${fontId}/similar`);
      const data = await res.json();
      // Return contrast/opposite pairings (different category)
      return (data.opposite || data.similar || []).slice(0, 6);
    },
    enabled: !!fontId,
  });
}

// ── Pairing card ──────────────────────────────────────────────────────────────
function PairingCard({
  headline, body, content, onSwap
}: {
  headline: Font; body: Font;
  content: { heading: string; body: string };
  onSwap: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const pairingKey = `${headline.category}+${body.category}`;
  const rule = PAIRING_RULES[pairingKey];

  const cssCode = `/* Font Pairing: ${headline.name} + ${body.name} */
@import url('https://fonts.googleapis.com/css2?family=${encodeURIComponent(headline.family)}:wght@700&family=${encodeURIComponent(body.family)}:wght@400;500&display=swap');

h1, h2, h3 {
  font-family: '${headline.family}', ${headline.category === 'serif' ? 'serif' : 'sans-serif'};
  font-weight: 700;
}

body, p {
  font-family: '${body.family}', ${body.category === 'serif' ? 'serif' : 'sans-serif'};
  font-weight: 400;
  line-height: 1.7;
}`;

  const copyCSS = () => {
    navigator.clipboard.writeText(cssCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white border border-border/60 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow"
    >
      {/* Preview */}
      <div className="p-8 bg-gradient-to-br from-slate-50 to-white min-h-[200px]">
        <p
          className="text-3xl font-bold mb-3 text-foreground leading-tight"
          style={{ fontFamily: headline.family }}
        >
          {content.heading}
        </p>
        <p
          className="text-base text-muted-foreground leading-relaxed"
          style={{ fontFamily: body.family }}
        >
          {content.body}
        </p>
      </div>

      {/* Info bar */}
      <div className="px-6 py-4 border-t border-border/40 bg-white">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Headline</p>
              <Link href={`/font/${headline.id}`}>
                <p className="font-semibold text-sm truncate hover:text-primary transition-colors cursor-pointer">{headline.name}</p>
              </Link>
            </div>
            <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Body</p>
              <Link href={`/font/${body.id}`}>
                <p className="font-semibold text-sm truncate hover:text-primary transition-colors cursor-pointer">{body.name}</p>
              </Link>
            </div>
            {rule && (
              <span className="hidden sm:block px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-bold uppercase tracking-wider shrink-0">
                {rule.label}
              </span>
            )}
          </div>
          <div className="flex gap-2 shrink-0">
            <Button size="sm" variant="ghost" onClick={onSwap} title="Swap fonts">
              <RefreshCw className="h-4 w-4" />
            </Button>
            <Button size="sm" variant="outline" onClick={copyCSS}>
              {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
              <span className="ml-1.5 text-xs">{copied ? "Copied!" : "CSS"}</span>
            </Button>
          </div>
        </div>
        {rule && (
          <p className="text-xs text-muted-foreground mt-2">{rule.description}</p>
        )}
      </div>
    </motion.div>
  );
}

// ── FontSelector ──────────────────────────────────────────────────────────────
function FontSelector({
  label, selected, onSelect
}: {
  label: string;
  selected: Font | null;
  onSelect: (f: Font) => void;
}) {
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const { data } = useFontSearch(search);

  return (
    <div className="relative">
      <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2">{label}</p>
      <div
        className="flex items-center gap-3 p-4 border-2 border-border rounded-xl cursor-pointer hover:border-primary/50 transition-colors bg-white"
        onClick={() => setOpen(!open)}
      >
        {selected ? (
          <>
            <span className="text-2xl font-bold" style={{ fontFamily: selected.family }}>Aa</span>
            <div>
              <p className="font-semibold text-sm">{selected.name}</p>
              <p className="text-xs text-muted-foreground">{selected.category}</p>
            </div>
          </>
        ) : (
          <p className="text-muted-foreground text-sm">Choose a font…</p>
        )}
      </div>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="absolute z-50 top-full mt-2 w-full bg-white border border-border rounded-xl shadow-xl overflow-hidden"
          >
            <div className="p-3 border-b">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  className="pl-9 h-9 text-sm"
                  placeholder="Search fonts…"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  autoFocus
                />
              </div>
            </div>
            <div className="max-h-64 overflow-y-auto">
              {data?.fonts.map(f => (
                <div
                  key={f.id}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-muted/50 cursor-pointer transition-colors"
                  onClick={() => { onSelect(f); setOpen(false); setSearch(""); }}
                >
                  <span className="text-xl w-10 text-center" style={{ fontFamily: f.family }}>Aa</span>
                  <div>
                    <p className="font-medium text-sm">{f.name}</p>
                    <p className="text-xs text-muted-foreground">{f.category}</p>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function FontPairing() {
  const [headlineFont, setHeadlineFont] = useState<Font | null>(null);
  const [bodyFont, setBodyFont] = useState<Font | null>(null);
  const [contentIdx, setContentIdx] = useState(0);
  const [swapped, setSwapped] = useState(false);

  const { data: suggestions } = usePairings(headlineFont?.id || 0);

  const handleSwap = () => {
    const tmp = headlineFont;
    setHeadlineFont(bodyFont);
    setBodyFont(tmp);
    setSwapped(s => !s);
  };

  // Auto-suggest body font when headline is picked
  const handleHeadlineSelect = (f: Font) => {
    setHeadlineFont(f);
    if (!bodyFont && suggestions?.length) {
      setBodyFont(suggestions[0]);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Hero */}
      <div className="bg-[#00153D] text-white py-16 px-4">
        <div className="container mx-auto max-w-4xl text-center space-y-4">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <span className="inline-block px-3 py-1 rounded-full bg-white/10 text-white/80 text-xs font-bold uppercase tracking-widest mb-4">
              Font Pairing Engine
            </span>
            <h1 className="text-4xl md:text-6xl font-bold tracking-tight">
              Find your perfect<br />
              <span className="text-blue-300">type pairing</span>
            </h1>
            <p className="mt-4 text-white/60 text-lg max-w-2xl mx-auto">
              Pick a headline font. We'll suggest complementary body fonts based on typographic contrast rules.
            </p>
          </motion.div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-12 max-w-5xl space-y-10">

        {/* Selector row */}
        <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] gap-4 items-end">
          <FontSelector label="Headline Font" selected={headlineFont} onSelect={handleHeadlineSelect} />
          <Button variant="ghost" size="icon" onClick={handleSwap} className="mb-0.5 mx-auto">
            <Shuffle className="h-5 w-5" />
          </Button>
          <FontSelector label="Body Font" selected={bodyFont} onSelect={setBodyFont} />
        </div>

        {/* Auto-suggestions when headline picked */}
        {headlineFont && suggestions && suggestions.length > 0 && !bodyFont && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
            <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
              Suggested pairings for {headlineFont.name}
            </p>
            <div className="flex flex-wrap gap-2">
              {suggestions.slice(0, 6).map(s => (
                <button
                  key={s.id}
                  onClick={() => setBodyFont(s)}
                  className="px-4 py-2 rounded-full border border-border hover:border-primary hover:bg-primary/5 text-sm font-medium transition-colors"
                  style={{ fontFamily: s.family }}
                >
                  {s.name}
                </button>
              ))}
            </div>
          </motion.div>
        )}

        {/* Live preview */}
        {headlineFont && bodyFont && (
          <motion.div
            key={`${headlineFont.id}-${bodyFont.id}-${swapped}`}
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="space-y-4"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold">Your Pairing</h2>
              <div className="flex gap-2">
                {SAMPLE_CONTENT.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setContentIdx(i)}
                    className={`w-2 h-2 rounded-full transition-colors ${i === contentIdx ? "bg-primary" : "bg-border"}`}
                  />
                ))}
              </div>
            </div>
            <PairingCard
              headline={headlineFont}
              body={bodyFont}
              content={SAMPLE_CONTENT[contentIdx]}
              onSwap={handleSwap}
            />
          </motion.div>
        )}

        {/* Empty state */}
        {!headlineFont && (
          <div className="text-center py-20 text-muted-foreground">
            <p className="text-5xl mb-4">Aa</p>
            <p className="text-lg font-medium">Pick a headline font to get started</p>
            <p className="text-sm mt-1">We'll suggest complementary body fonts automatically</p>
          </div>
        )}

        {/* Pairing guides */}
        <section className="pt-8 border-t space-y-6">
          <h2 className="text-2xl font-bold">Classic Pairing Rules</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Object.entries(PAIRING_RULES).map(([key, { label, description }]) => {
              const [h, b] = key.split("+");
              return (
                <div key={key} className="p-5 border border-border/60 rounded-xl hover:border-primary/40 transition-colors bg-white">
                  <span className="inline-block px-2 py-0.5 rounded bg-primary/10 text-primary text-[10px] font-bold uppercase tracking-wider mb-3">
                    {label}
                  </span>
                  <p className="font-semibold capitalize text-sm">{h} + {b}</p>
                  <p className="text-xs text-muted-foreground mt-1">{description}</p>
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
}
