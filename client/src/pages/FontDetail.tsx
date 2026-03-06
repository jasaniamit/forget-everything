import { useEffect, useState } from "react";
import { useRoute } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useFont, useIncrementDownload, useFonts } from "@/hooks/use-fonts";
import { useLoadFont } from "@/hooks/use-load-font";
import { Navbar } from "@/components/Navbar";
import { FontTester } from "@/components/FontTester";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Download, Loader2, ArrowLeft, FileText, User, Layers, RotateCcw } from "lucide-react";
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { FontToolsTabs } from "@/components/FontToolsTabs";

// ─── Types ────────────────────────────────────────────────────────────────────

interface FontVariant {
  raw: string;      // "100", "regular", "700italic" …
  label: string;    // "Thin", "Regular", "Bold Italic" …
  weight: number;   // 100 … 900
  italic: boolean;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function parseJsonArray(val: any): string[] {
  if (!val) return [];
  if (Array.isArray(val)) return val as string[];
  try { const p = JSON.parse(val); return Array.isArray(p) ? p : [val]; }
  catch { return [String(val)]; }
}

// ─── Hook: fetch real variants from our backend ───────────────────────────────

function useFontVariants(fontId: number) {
  return useQuery<{ variants: FontVariant[]; family: string }>({
    queryKey: [`/api/fonts/${fontId}/variants`],
    queryFn: async () => {
      const res = await fetch(`/api/fonts/${fontId}/variants`);
      if (!res.ok) return { variants: [], family: "" };
      return res.json();
    },
    enabled: !!fontId && !isNaN(fontId),
    staleTime: 1000 * 60 * 30, // cache 30 min
  });
}

// ─── Load ALL weight variants + italics via Google Fonts CSS v2 ───────────────

function useLoadAllWeights(fontFamily: string, variants: FontVariant[]) {
  useEffect(() => {
    if (!fontFamily || variants.length === 0) return;

    const id = `gf-all-${fontFamily.replace(/\s+/g, "-").toLowerCase()}`;
    if (document.getElementById(id)) return;

    // Build ital,wght tuples e.g. "0,100;0,400;1,400;1,700"
    const tuples = variants
      .map(v => `${v.italic ? 1 : 0},${v.weight}`)
      .sort()
      .join(";");

    const href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(fontFamily)}:ital,wght@${tuples}&display=swap`;

    const link = document.createElement("link");
    link.id = id;
    link.rel = "stylesheet";
    link.href = href;
    document.head.appendChild(link);
  }, [fontFamily, variants.length]);
}

// ─── Related Fonts ────────────────────────────────────────────────────────────

function RelatedFonts({ category, excludeId }: { category: string; excludeId: number }) {
  const { data } = useFonts({ category, limit: 5 });
  const related = data?.fonts.filter((f) => f.id !== excludeId).slice(0, 4);
  if (!related || related.length === 0) return null;
  return (
    <section className="space-y-8 pt-12 border-t">
      <h3 className="text-3xl font-bold font-display">Related Typefaces</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {related.map((f) => (
          <Link key={f.id} href={`/font/${f.id}`}>
            <div className="group p-5 bg-white border border-border/60 rounded-2xl hover:border-primary/40 hover:shadow-lg transition-all cursor-pointer space-y-3">
              <p className="text-3xl font-bold text-foreground truncate group-hover:text-primary transition-colors"
                style={{ fontFamily: f.family }}>Aa</p>
              <div>
                <p className="text-sm font-semibold truncate">{f.name}</p>
                <p className="text-xs text-muted-foreground truncate">{f.designer}</p>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}

// ─── All Styles Section ───────────────────────────────────────────────────────

function AllStylesSection({
  fontFamily,
  variants,
  isLoading,
}: {
  fontFamily: string;
  variants: FontVariant[];
  isLoading: boolean;
}) {
  const DEFAULT_TEXT = "Pack my box with five dozen liquor jugs";
  const DEFAULT_SIZE = 32;

  const [previewText, setPreviewText] = useState(DEFAULT_TEXT);
  const [previewSize, setPreviewSize] = useState(DEFAULT_SIZE);

  // Actually load every weight/italic via Google Fonts CDN
  useLoadAllWeights(fontFamily, variants);

  const handleReset = () => {
    setPreviewText(DEFAULT_TEXT);
    setPreviewSize(DEFAULT_SIZE);
  };

  return (
    <section className="space-y-8 pt-12 border-t">
      {/* Header */}
      <div>
        <h3 className="text-2xl font-bold font-display flex items-center gap-2 text-foreground">
          <Layers className="h-5 w-5 text-primary" />
          Styles
        </h3>
        {!isLoading && (
          <p className="text-sm text-muted-foreground mt-1 font-medium">
            {variants.length} {variants.length === 1 ? "style" : "styles"} available
          </p>
        )}
      </div>

      {/* Unified Google-style Control Bar */}
      <div className="flex flex-col lg:flex-row items-center gap-4 bg-white/50 backdrop-blur-sm border border-slate-200 rounded-[2rem] p-2 pl-6 shadow-sm ring-1 ring-slate-900/5 transition-all hover:bg-white hover:shadow-md">
        {/* Fill input */}
        <input
          value={previewText}
          onChange={(e) => setPreviewText(e.target.value)}
          placeholder="Type here to preview text"
          className="flex-1 w-full bg-transparent border-none text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-0 text-base py-2"
        />

        {/* Separator on desktop */}
        <div className="hidden lg:block w-px h-8 bg-slate-200" />

        <div className="flex items-center gap-4 px-4 w-full lg:w-auto shrink-0 justify-between lg:justify-start py-2 lg:py-0">
          <div className="flex items-center gap-3">
            {/* Numeric Input with px */}
            <div className="relative flex items-center">
              <input
                type="number"
                min={8}
                max={200}
                value={previewSize}
                onChange={(e) => setPreviewSize(Number(e.target.value))}
                className="w-16 h-10 bg-slate-100/80 rounded-xl border-none text-sm font-bold text-center appearance-none focus:outline-none focus:ring-2 focus:ring-primary/20 pr-4"
              />
              <span className="absolute right-3 text-[10px] font-black text-slate-400 pointer-events-none uppercase">px</span>
            </div>

            {/* Slider */}
            <input
              type="range"
              min={8}
              max={200}
              step={1}
              value={previewSize}
              onChange={(e) => setPreviewSize(Number(e.target.value))}
              className="w-24 sm:w-32 lg:w-40 h-1.5 bg-slate-100 rounded-full appearance-none cursor-pointer accent-primary hover:accent-primary/80 transition-all [&::-webkit-slider-runnable-track]:rounded-full [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:bg-primary [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:shadow-lg [&::-webkit-slider-thumb]:ring-2 [&::-webkit-slider-thumb]:ring-white [&::-webkit-slider-thumb]:-mt-[6px]"
            />
          </div>

          <button
            onClick={handleReset}
            className="p-2 text-slate-400 hover:text-primary hover:bg-primary/5 rounded-full transition-all"
            title="Reset to default"
          >
            <RotateCcw className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Skeleton while loading */}
      {isLoading && (
        <div className="space-y-px border border-border/60 rounded-2xl overflow-hidden">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex items-center gap-6 px-6 py-5 bg-white border-b border-border/40 last:border-0">
              <Skeleton className="h-4 w-28 shrink-0" />
              <Skeleton className="h-8 flex-1" />
            </div>
          ))}
        </div>
      )}

      {/* Variant rows */}
      {!isLoading && variants.length > 0 && (
        <div className="divide-y divide-border/60 border border-border/60 rounded-2xl overflow-hidden bg-white shadow-sm">
          {variants.map((v) => (
            <div
              key={v.raw}
              className="flex items-baseline gap-6 px-6 py-5 hover:bg-slate-50/70 transition-colors group"
            >
              {/* Label column */}
              <div className="w-40 shrink-0 select-none pt-1">
                <div className="text-[11px] font-black uppercase tracking-widest text-muted-foreground/60 group-hover:text-primary transition-colors">
                  {v.label}
                </div>
                <div className="text-[10px] text-muted-foreground/30 font-mono mt-0.5">
                  {v.weight}
                </div>
              </div>

              {/* Live preview text at this exact weight/style */}
              <p
                className="flex-1 min-w-0 leading-snug text-foreground overflow-hidden text-ellipsis whitespace-nowrap"
                style={{
                  fontFamily: `'${fontFamily}', sans-serif`,
                  fontWeight: v.weight,
                  fontStyle: v.italic ? "italic" : "normal",
                  fontSize: `${previewSize}px`,
                  lineHeight: 1.25,
                }}
              >
                {previewText || "The quick brown fox jumps over the lazy dog"}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* No variants fallback */}
      {!isLoading && variants.length === 0 && (
        <div className="border border-dashed border-border/60 rounded-2xl p-8 text-center text-sm text-muted-foreground">
          Style information unavailable for this font.
        </div>
      )}
    </section>
  );
}

// ─── Main FontDetail Page ─────────────────────────────────────────────────────

export default function FontDetail() {
  const [, params] = useRoute("/font/:id");
  const id = parseInt(params?.id || "0");
  const { data: font, isLoading, error } = useFont(id);
  const { data: variantData, isLoading: variantsLoading } = useFontVariants(id);
  const { mutate: incrementDownload, isPending: isDownloading } = useIncrementDownload();
  const { toast } = useToast();

  // Load the single-file version via our proxy (for FontTester)
  useLoadFont(font?.id ?? 0, font?.family ?? "");

  useEffect(() => { window.scrollTo(0, 0); }, [id]);

  const handleDownload = () => {
    if (!font) return;
    incrementDownload(id, {
      onSuccess: () => {
        const iframe = document.createElement("iframe");
        iframe.style.display = "none";
        iframe.src = font.fileUrl;
        document.body.appendChild(iframe);
        setTimeout(() => document.body.removeChild(iframe), 30000);
        toast({ title: "Download Started", description: `You are downloading ${font.name}.` });
      },
      onError: () => {
        toast({ variant: "destructive", title: "Download Failed", description: "Could not start download. Please try again." });
      },
    });
  };

  // All 9 standard weight labels used as default fallback
  const ALL_WEIGHT_VARIANTS: FontVariant[] = [
    { raw: "100", label: "Thin", weight: 100, italic: false },
    { raw: "200", label: "Extra Light", weight: 200, italic: false },
    { raw: "300", label: "Light", weight: 300, italic: false },
    { raw: "regular", label: "Regular", weight: 400, italic: false },
    { raw: "500", label: "Medium", weight: 500, italic: false },
    { raw: "600", label: "Semibold", weight: 600, italic: false },
    { raw: "700", label: "Bold", weight: 700, italic: false },
    { raw: "800", label: "Extra Bold", weight: 800, italic: false },
    { raw: "900", label: "Black", weight: 900, italic: false },
  ];

  // Use real Google Fonts variants if available. 
  // If API returns 0 or 1 variant (likely a mismatch or seed default), 
  // fallback to ALL 9 weights to ensure a robust specimen page.
  const variants: FontVariant[] = (variantData?.variants && variantData.variants.length > 1)
    ? variantData.variants
    : ALL_WEIGHT_VARIANTS;

  const useCases = font ? parseJsonArray(font.useCase) : [];

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <h1 className="text-2xl font-bold text-destructive">Font Not Found</h1>
          <Link href="/"><Button variant="outline">Return Home</Button></Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background font-sans pb-24">
      <Navbar />

      {isLoading ? (
        <main className="container mx-auto px-4 py-12 space-y-8">
          <div className="space-y-4">
            <Skeleton className="h-12 w-3/4 max-w-xl" />
            <Skeleton className="h-6 w-1/2 max-w-sm" />
          </div>
          <Skeleton className="h-[400px] w-full rounded-xl" />
        </main>
      ) : font ? (
        <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-12">

          {/* ── Header ── */}
          <div className="space-y-6">
            <Link href="/" className="inline-flex items-center text-sm font-medium text-muted-foreground hover:text-primary transition-colors">
              <ArrowLeft className="mr-2 h-4 w-4" /> Back to Collection
            </Link>

            <div className="flex flex-col md:flex-row md:items-start justify-between gap-8">
              <div className="space-y-4">
                <h1 className="text-5xl md:text-7xl font-bold font-display tracking-tight text-foreground">
                  {font.name}
                </h1>
                <div className="flex flex-wrap items-center gap-4 text-muted-foreground text-sm">
                  <span className="flex items-center gap-2"><User className="h-4 w-4" /> {font.designer}</span>
                  <span className="w-1.5 h-1.5 rounded-full bg-border" />
                  <span>{font.category}</span>
                  <span className="w-1.5 h-1.5 rounded-full bg-border" />
                  <span className="flex items-center gap-2"><FileText className="h-4 w-4" /> {font.license}</span>
                </div>

                {useCases.length > 0 && (
                  <div className="flex flex-wrap gap-2 pt-1">
                    {useCases.map((uc) => (
                      <span key={uc} className="px-3 py-1 rounded-full bg-primary/10 text-primary text-[11px] font-bold uppercase tracking-wider">
                        {uc}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <Button
                size="lg"
                className="w-full md:w-auto px-8 h-14 text-base font-semibold shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 transition-all hover:-translate-y-0.5 shrink-0"
                onClick={handleDownload}
                disabled={isDownloading}
              >
                {isDownloading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Download className="mr-2 h-5 w-5" />}
                Download Family
              </Button>
            </div>
          </div>

          {/* ── All Styles Section (Integrated Preview) ── */}
          <AllStylesSection
            fontFamily={font.family}
            variants={variants}
            isLoading={variantsLoading}
          />

          {/* ── About + Font Details ── */}
          <section className="grid md:grid-cols-3 gap-12 pt-12 border-t">
            <div className="md:col-span-2 space-y-6">
              <h3 className="text-2xl font-bold font-display">About the Typeface</h3>
              <div className="prose prose-lg text-muted-foreground">
                <p>
                  {font.description || `The ${font.name} typeface is a ${font.category.toLowerCase()} font designed by ${font.designer}. It features a modern aesthetic perfect for both digital and print media.`}
                </p>
                <p>
                  This font is licensed under {font.license}, making it suitable for a wide range of projects.
                  The glyph set includes standard Latin characters, numerals, and punctuation.
                </p>
              </div>
            </div>

            <div className="space-y-6">
              <h3 className="text-xl font-bold font-display">Font Details</h3>
              <dl className="text-sm divide-y divide-dashed">
                <div className="flex justify-between py-3">
                  <dt className="text-muted-foreground">Total Downloads</dt>
                  <dd className="font-semibold tabular-nums">{(font.downloadCount ?? 0).toLocaleString()}</dd>
                </div>
                <div className="flex justify-between py-3">
                  <dt className="text-muted-foreground">Styles</dt>
                  <dd className="font-semibold">{variantsLoading ? "…" : variants.length}</dd>
                </div>
                <div className="flex justify-between py-3">
                  <dt className="text-muted-foreground">Category</dt>
                  <dd className="font-semibold">{font.category}</dd>
                </div>
                <div className="flex justify-between py-3">
                  <dt className="text-muted-foreground">Designer</dt>
                  <dd className="font-semibold text-right max-w-[160px]">{font.designer}</dd>
                </div>
                <div className="flex justify-between py-3">
                  <dt className="text-muted-foreground">License</dt>
                  <dd className="font-semibold">{font.license}</dd>
                </div>
                <div className="flex justify-between py-3">
                  <dt className="text-muted-foreground">Date Added</dt>
                  <dd className="font-semibold">{new Date(font.createdAt || Date.now()).toLocaleDateString()}</dd>
                </div>
              </dl>
            </div>
          </section>

          {/* ── Glyph Set ── */}
          <section className="space-y-6 pt-12 border-t">
            <h3 className="text-2xl font-bold font-display">Glyph Set</h3>
            <div
              className="p-8 bg-muted/20 rounded-xl border border-border text-center text-4xl leading-relaxed tracking-widest break-words"
              style={{ fontFamily: font.family }}
            >
              ABCDEFGHIJKLMNOPQRSTUVWXYZ<br />
              abcdefghijklmnopqrstuvwxyz<br />
              0123456789<br />
              {"!@#$%^&*()_+-=[]{};':\",./?><!"}
            </div>
          </section>


          {/* ── Font Tools: Variable Playground + CSS Generator ── */}
          <FontToolsTabs font={font} variants={variants} />

          {/* AdSense Space */}
          <div className="w-full h-48 bg-secondary/30 border border-dashed border-border rounded-2xl flex items-center justify-center text-muted-foreground text-sm font-medium">
            Google AdSense - In-feed / Vertical
          </div>

          {/* Related Fonts */}
          <RelatedFonts category={font.category} excludeId={font.id} />

        </main>
      ) : null}
    </div>
  );
}
