import { useRoute, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Navbar } from "@/components/Navbar";
import { motion } from "framer-motion";
import { getBrandBySlug } from "@/data/brands-data";
import { ArrowLeft, ExternalLink, Lock, Unlock, Copy, Check } from "lucide-react";
import { BrandLogo } from "@/components/BrandLogo";
import { Button } from "@/components/ui/button";
import { useState } from "react";

function useFontByName(name: string) {
  return useQuery<{ fonts: any[] }>({
    queryKey: ["/api/fonts/search-name", name],
    queryFn: async () => {
      const r = await fetch(`/api/fonts?search=${encodeURIComponent(name)}&limit=1`);
      return r.json();
    },
    enabled: !!name,
    staleTime: 1000 * 60 * 60,
  });
}

function FontMatchCard({ fontName, isPrimary }: { fontName: string; isPrimary?: boolean }) {
  const { data, isLoading } = useFontByName(fontName);
  const font = data?.fonts?.[0];

  // Load Google Font for preview
  if (font && typeof document !== "undefined") {
    const id = `gf-brand-${font.id}`;
    if (!document.getElementById(id)) {
      const link = document.createElement("link");
      link.id = id;
      link.rel = "stylesheet";
      link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(font.family)}:wght@400;700&display=swap`;
      document.head.appendChild(link);
    }
  }

  if (isLoading) return (
    <div className="h-24 bg-muted/50 rounded-xl animate-pulse" />
  );

  if (!font) return (
    <div className="p-4 border border-dashed border-border rounded-xl text-sm text-muted-foreground">
      <p className="font-medium text-foreground">{fontName}</p>
      <p className="text-xs mt-1">Not in our library — search Google Fonts</p>
    </div>
  );

  return (
    <Link href={`/font/${font.id}`}>
      <div className={`group p-5 border rounded-xl cursor-pointer transition-all hover:shadow-md ${
        isPrimary
          ? "border-primary/40 bg-primary/5 hover:border-primary"
          : "border-border/60 bg-white hover:border-border"
      }`}>
        <p
          className="text-3xl font-bold mb-2 truncate"
          style={{ fontFamily: font.family }}
        >
          Aa Bb Cc
        </p>
        <div className="flex items-center justify-between">
          <div>
            <p className="font-semibold text-sm">{font.name}</p>
            <p className="text-xs text-muted-foreground">{font.category} · {font.license}</p>
          </div>
          {isPrimary && (
            <span className="text-[10px] font-bold uppercase tracking-wider text-primary bg-primary/10 px-2 py-0.5 rounded-full">
              Best match
            </span>
          )}
          <ExternalLink className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
        </div>
      </div>
    </Link>
  );
}

export default function BrandDetail() {
  const [, params] = useRoute("/brand/:slug");
  const [copied, setCopied] = useState(false);
  const brand = getBrandBySlug(params?.slug || "");

  const copyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!brand) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex items-center justify-center min-h-[60vh] text-center px-4">
          <div>
            <p className="text-6xl mb-4">🔍</p>
            <h1 className="text-2xl font-bold mb-2">Brand not found</h1>
            <Link href="/brand-fonts">
              <Button variant="outline">← Back to Brand Fonts</Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* SEO meta - handled via document title */}
      {typeof document !== "undefined" && (
        (() => {
          document.title = `${brand.name} Font — What Typeface Does ${brand.name} Use? | ukfont`;
          return null;
        })()
      )}

      {/* Hero banner */}
      <div className="relative overflow-hidden" style={{ backgroundColor: brand.color }}>
        <div className="absolute inset-0 opacity-10"
          style={{ backgroundImage: "radial-gradient(circle at 20% 80%, white 1px, transparent 1px), radial-gradient(circle at 80% 20%, white 1px, transparent 1px)", backgroundSize: "40px 40px" }}
        />
        <div className="container mx-auto px-4 py-16 relative">
          <Link href="/brand-fonts">
            <button className="flex items-center gap-2 text-white/70 hover:text-white text-sm mb-8 transition-colors">
              <ArrowLeft className="h-4 w-4" /> Back to Brand Fonts
            </button>
          </Link>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col md:flex-row items-start md:items-center gap-8"
          >
            {/* Logo */}
            <BrandLogo name={brand.name} website={brand.website} color="rgba(255,255,255,0.3)" size="lg" />

            <div className="text-white">
              <span className="inline-block px-3 py-1 rounded-full bg-white/20 text-white/80 text-xs font-bold uppercase tracking-widest mb-3">
                {brand.industry}
              </span>
              <h1 className="text-5xl md:text-6xl font-black tracking-tight">
                {brand.name}
              </h1>
              <p className="text-white/70 text-xl mt-2">Typography deep-dive</p>
            </div>
          </motion.div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-12 max-w-4xl space-y-12">

        {/* Brand preview image */}
        {brand.preview_image && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl overflow-hidden border border-border/60 bg-white shadow-sm"
          >
            <div className="relative h-48 md:h-64 flex items-center justify-center" style={{ backgroundColor: brand.bg }}>
              <img
                src={brand.preview_image}
                alt={`${brand.name} logo and typography`}
                className="max-h-36 max-w-[60%] object-contain drop-shadow-md"
                onError={e => { (e.target as HTMLImageElement).style.display = "none"; }}
              />
            </div>
            <div className="px-5 py-3 border-t border-border/40 bg-muted/20">
              <p className="text-xs text-muted-foreground">
                <strong>{brand.name}</strong> official brand mark · Font used: <strong>{brand.brand_font}</strong>
                {brand.proprietary && " (proprietary — not publicly available)"}
              </p>
            </div>
          </motion.div>
        )}

      {/* TL;DR card */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-6 rounded-2xl border-2 border-border bg-muted/20 flex flex-col sm:flex-row gap-6 items-start"
        >
          <div className="flex-1">
            <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-1">Brand Font</p>
            <p className="text-2xl font-bold text-foreground">{brand.brand_font}</p>
            <div className="flex items-center gap-2 mt-2">
              {brand.proprietary ? (
                <span className="flex items-center gap-1.5 text-xs font-bold text-amber-700 bg-amber-100 px-2.5 py-1 rounded-full">
                  <Lock className="h-3 w-3" /> Proprietary — not publicly available
                </span>
              ) : (
                <span className="flex items-center gap-1.5 text-xs font-bold text-green-700 bg-green-100 px-2.5 py-1 rounded-full">
                  <Unlock className="h-3 w-3" /> Publicly available
                </span>
              )}
            </div>
          </div>
          <div className="flex gap-2">
            {brand.website && (
              <a href={brand.website} target="_blank" rel="noopener noreferrer">
                <Button variant="outline" size="sm" className="gap-1.5">
                  <ExternalLink className="h-3.5 w-3.5" /> Visit {brand.name}
                </Button>
              </a>
            )}
            <Button variant="ghost" size="sm" onClick={copyLink} className="gap-1.5">
              {copied ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
              {copied ? "Copied!" : "Share"}
            </Button>
          </div>
        </motion.div>

        {/* Full story */}
        <section className="space-y-4">
          <h2 className="text-2xl font-bold">The Typography Story</h2>
          <p className="text-muted-foreground leading-relaxed text-lg">{brand.description}</p>
        </section>

        {/* Free alternatives */}
        <section className="space-y-6">
          <div>
            <h2 className="text-2xl font-bold">Free Alternatives in Our Library</h2>
            <p className="text-muted-foreground mt-1">
              {brand.proprietary
                ? `Since ${brand.brand_font} is proprietary, here are the closest open-source alternatives you can use freely.`
                : `${brand.brand_font} is publicly available — and here are similar fonts from our library.`
              }
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {brand.free_alternatives.map((name, i) => (
              <FontMatchCard key={name} fontName={name} isPrimary={i === 0} />
            ))}
          </div>
        </section>

        {/* Google Fonts alternatives */}
        {brand.google_fonts_alternatives.length > 0 && (
          <section className="space-y-4 pt-8 border-t">
            <h2 className="text-xl font-bold">Google Fonts Alternatives</h2>
            <p className="text-sm text-muted-foreground">These fonts are available free from Google Fonts and work well as alternatives.</p>
            <div className="flex flex-wrap gap-2">
              {brand.google_fonts_alternatives.map(name => (
                <a
                  key={name}
                  href={`https://fonts.google.com/specimen/${encodeURIComponent(name)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 rounded-full border border-border bg-white hover:border-primary hover:bg-primary/5 text-sm font-medium transition-colors flex items-center gap-1.5"
                >
                  {name}
                  <ExternalLink className="h-3 w-3 text-muted-foreground" />
                </a>
              ))}
            </div>
          </section>
        )}

        {/* Brand facts */}
        {(brand.founded || brand.website) && (
          <section className="pt-8 border-t">
            <h2 className="text-xl font-bold mb-4">About {brand.name}</h2>
            <dl className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {brand.founded && (
                <div className="p-4 bg-muted/30 rounded-xl border border-border/40">
                  <dt className="text-xs text-muted-foreground mb-1">Founded</dt>
                  <dd className="font-bold">{brand.founded}</dd>
                </div>
              )}
              <div className="p-4 bg-muted/30 rounded-xl border border-border/40">
                <dt className="text-xs text-muted-foreground mb-1">Industry</dt>
                <dd className="font-bold">{brand.industry}</dd>
              </div>
              <div className="p-4 bg-muted/30 rounded-xl border border-border/40">
                <dt className="text-xs text-muted-foreground mb-1">Font status</dt>
                <dd className="font-bold">{brand.proprietary ? "Proprietary" : "Open source"}</dd>
              </div>
            </dl>
          </section>
        )}

        {/* Back nav */}
        <div className="pt-8 border-t flex justify-between items-center">
          <Link href="/brand-fonts">
            <Button variant="outline" className="gap-2">
              <ArrowLeft className="h-4 w-4" /> All Brands
            </Button>
          </Link>
          <p className="text-xs text-muted-foreground">
            Typography data maintained by <strong>ukfont.com</strong>
          </p>
        </div>

      </div>
    </div>
  );
}
