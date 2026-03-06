import logoSvg from "@assets/logo_1768878013498.jpg";
import { useQuery } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { useFonts } from "@/hooks/use-fonts";
import { FontCard } from "@/components/FontCard";
import { getPreviewWeight } from "@/hooks/use-load-font";
import { Navbar } from "@/components/Navbar";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Search, Loader2, LayoutGrid, Type as TypeIcon, ChevronDown, Copy, Check, RefreshCw } from "lucide-react";
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

export default function Home() {
  const [location] = useLocation();
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");
  const [activeUseCase, setActiveUseCase] = useState("All");
  const [previewText, setPreviewText] = useState("The quick brown fox jumps over the lazy dog");
  const [fontSize, setFontSize] = useState(40);
  const [fontColor, setFontColor] = useState("#66768D");
  const [isCommercial, setIsCommercial] = useState(false);
  const [page, setPage] = useState(1);
  // Rotation seed — changes every 30min automatically, or instantly on shuffle click
  const [seed, setSeed] = useState(() => Math.floor(Date.now() / (30 * 60 * 1000)));

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
  const [activeStyles, setActiveStyles] = useState<string[]>([]);

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
    page,
    seed,
  });

  const fonts = data?.fonts;
  const totalPages = data ? Math.ceil(data.total / data.limit) : 1;

  const toggleStyle = (slug: string) => {
    setPage(1);
    setActiveStyles(prev => prev.includes(slug) ? prev.filter(s => s !== slug) : [...prev, slug]);
  };

  const toggleFilter = (key: string, value: string) => {
    setPage(1);
    setFilters((prev: any) => ({
      ...prev,
      [key]: prev[key] === value ? null : value
    }));
  };

  return (
    <div className="min-h-screen bg-background font-sans">
      <Navbar />

      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col lg:flex-row gap-8 items-start">
          {/* Left Sidebar Menu */}
          <HomeSidebar
            location={location}
            logoSvg={logoSvg}
            filters={filters}
            setFilters={setFilters}
            setPage={setPage}
            totalFonts={data?.total}
          />

          {/* Main Content Area */}
          <div className="flex-1 space-y-10 w-full overflow-hidden">
            <div className="flex flex-col gap-10 items-start relative">
              {/* Search Bar & Primary Interaction Area */}
              <div className="w-full space-y-10">
                <section className="relative w-full">
                  <div className="relative group max-w-3xl mx-auto">
                    <Input
                      placeholder="Search Font..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="h-14 sm:h-16 pl-6 sm:pl-8 pr-12 sm:pr-16 text-lg sm:text-xl bg-white border-primary/10 shadow-xl rounded-2xl focus-visible:ring-1 focus-visible:ring-primary/20"
                    />
                    <Search className="absolute right-4 sm:right-8 top-1/2 -translate-y-1/2 h-5 w-5 sm:h-6 sm:w-6 text-muted-foreground group-focus-within:text-primary transition-colors" />
                  </div>
                </section>

                <section className="space-y-12">
                  {taxonomy?.categories.filter((cat: any) => cat.slug === 'basic').map((cat: any) => (
                    <div key={cat.id} className="space-y-4">
                      <h3 className="text-[12px] font-black uppercase tracking-[0.2em] text-primary/40 border-b border-primary/5 pb-2">{cat.name}</h3>
                      <div className="flex flex-wrap gap-2">
                        {taxonomy.styles.filter((s: any) => s.categoryId === cat.id).map((style: any) => (
                          <Button
                            key={style.id}
                            variant={activeStyles.includes(style.slug) ? "default" : "outline"}
                            onClick={() => toggleStyle(style.slug)}
                            className={cn(
                              "rounded-lg px-4 h-8 text-[11px] font-bold uppercase tracking-wider transition-all",
                              activeStyles.includes(style.slug)
                                ? "bg-primary text-white border-primary shadow-lg scale-105"
                                : "border-primary/10 text-muted-foreground hover:bg-primary/5"
                            )}
                          >
                            {style.name}
                          </Button>
                        ))}
                      </div>
                    </div>
                  ))}

                  {/* Font Preview Customizer Bar */}
                  <div className="flex items-center mx-auto w-full max-w-4xl bg-white rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-black/5 p-2 h-16 shrink-0 mt-8 mb-4">
                    <div className="flex-1 px-4 flex items-center h-full">
                      <Input
                        value={previewText}
                        onChange={(e) => setPreviewText(e.target.value)}
                        placeholder="Type or choose sample text..."
                        className="border-0 shadow-none focus-visible:ring-0 text-base font-medium h-full p-0 bg-transparent w-full"
                      />
                    </div>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <div className="h-12 w-12 bg-primary/5 hover:bg-primary/10 rounded-xl flex items-center justify-center text-primary/60 cursor-pointer transition-colors mr-6 shrink-0">
                          <ChevronDown size={18} />
                        </div>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-[400px] max-h-[500px] overflow-y-auto rounded-xl shadow-2xl p-2 z-50">
                        {SAMPLE_TEXTS.map((text, i) => (
                          <DropdownMenuItem
                            key={i}
                            className="text-[14px] py-3 px-4 cursor-pointer rounded-lg font-medium border-b border-border/5 last:border-0 hover:bg-primary/5"
                            onClick={() => setPreviewText(text)}
                          >
                            {text}
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>

                    <div className="flex items-center gap-4 mr-6 w-32 shrink-0">
                      <Slider
                        value={[fontSize]}
                        onValueChange={(v) => setFontSize(v[0])}
                        min={12}
                        max={120}
                        step={1}
                        className="w-full relative z-10"
                      />
                      <span className="text-[14px] font-bold text-primary/40 w-6 text-right">{fontSize}</span>
                    </div>

                    <div
                      className="w-10 h-10 rounded-xl shadow-inner cursor-pointer mr-4 shrink-0 transition-transform hover:scale-105"
                      style={{ backgroundColor: fontColor }}
                      onClick={() => document.getElementById('font-color-picker')?.click()}
                    >
                      <input
                        id="font-color-picker"
                        type="color"
                        value={fontColor}
                        onChange={(e) => setFontColor(e.target.value)}
                        className="sr-only"
                      />
                    </div>

                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center hover:bg-primary/5 cursor-pointer transition-colors shrink-0 group mr-2"
                      onClick={() => {
                        setFontColor("#66768D");
                        setPreviewText("The quick brown fox jumps over the lazy dog");
                        setFontSize(40);
                      }}
                    >
                      <RefreshCw className="text-primary/40 group-hover:text-primary transition-colors" size={18} />
                    </div>
                  </div>
                </section>
              </div>
            </div>

            {/* View Specific Content */}
            <section className="space-y-8">

              {/* Results header — shows count + shuffle on default browse, just count on search/filter */}
              {(() => {
                const hasFilters = search || activeStyles.length > 0 ||
                  Object.entries(filters).some(([k, v]) =>
                    k !== "familySize" ? !!v : (v[0] !== 1 || v[1] !== 25)
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
                ) : (
                  <motion.div
                    key="grid"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex flex-col space-y-2 mt-4"
                  >
                    {fonts?.map((font, idx) => (
                      <FontCard
                        key={font.id}
                        font={font}
                        previewText={previewText}
                        fontSize={fontSize}
                        color={fontColor}
                        index={idx}
                        previewWeight={getPreviewWeight(filters.weight)}
                      />
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

          <aside className="hidden xl:block w-72 shrink-0 space-y-10 sticky top-24">
            <div className="space-y-6">
              <h4 className="text-[13px] font-black uppercase tracking-[0.2em] text-primary/40">RELATED STYLES</h4>
              <div className="grid grid-cols-2 gap-2">
                {["Cartoon", "Comic", "Groovy", "Trash", "Graffiti", "Old School", "Horror", "School", "Outline", "Curly", "Various", "Brush"].map(style => (
                  <button key={style} className="px-4 py-2.5 bg-secondary/30 border border-transparent rounded-xl text-[11px] font-black uppercase tracking-wider text-muted-foreground hover:bg-white hover:border-primary/20 hover:text-primary hover:shadow-lg hover:shadow-primary/5 transition-all">
                    {style}
                  </button>
                ))}
              </div>
            </div>
          </aside>
        </div >
      </main >
    </div >
  );
}
