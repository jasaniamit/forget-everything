import { useState } from "react";
import { Link } from "wouter";
import { Navbar } from "@/components/Navbar";
import { Input } from "@/components/ui/input";
import { motion } from "framer-motion";
import { Search, Building2, Lock, ArrowRight, Plus } from "lucide-react";
import { BRANDS, INDUSTRIES, type BrandEntry } from "@/data/brands-data";
import { Button } from "@/components/ui/button";
import { BrandLogo } from "@/components/BrandLogo";

function BrandCard({ brand }: { brand: BrandEntry }) {
  const [imgFailed, setImgFailed] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="group bg-white border border-border/60 rounded-2xl overflow-hidden hover:shadow-lg hover:border-border transition-all flex flex-col"
    >
      {/* Preview image — shows logo/brand wordmark */}
      <div
        className="relative h-36 flex items-center justify-center overflow-hidden"
        style={{ backgroundColor: brand.bg }}
      >
        {brand.preview_image && !imgFailed ? (
          <img
            src={brand.preview_image}
            alt={`${brand.name} brand typography`}
            className="max-h-20 max-w-[70%] object-contain drop-shadow-sm"
            onError={() => setImgFailed(true)}
          />
        ) : (
          /* Fallback: render specimen text in free alternative font */
          <p
            className="text-4xl font-bold tracking-tight px-6 text-center"
            style={{ color: brand.color }}
          >
            {brand.specimen_text || brand.name}
          </p>
        )}
        {/* Industry badge */}
        <span
          className="absolute top-3 right-3 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider"
          style={{ backgroundColor: brand.color + "20", color: brand.color }}
        >
          {brand.industry}
        </span>
      </div>

      {/* Card body */}
      <div className="p-5 flex flex-col gap-3 flex-1">
        {/* Brand name row with logo */}
        <div className="flex items-center gap-3">
          <BrandLogo name={brand.name} website={brand.website} color={brand.color} size="sm" />
          <div>
            <p className="font-bold text-base text-foreground leading-tight">{brand.name}</p>
            {brand.proprietary && (
              <span className="flex items-center gap-0.5 text-[10px] text-amber-600 font-semibold">
                <Lock className="h-2.5 w-2.5" /> Proprietary font
              </span>
            )}
          </div>
        </div>

        {/* Brand font name */}
        <div>
          <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold mb-0.5">Brand Font</p>
          <p className="font-semibold text-sm text-foreground">{brand.brand_font}</p>
        </div>

        {/* Description snippet */}
        <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2 flex-1">
          {brand.description}
        </p>

        {/* Free alternatives */}
        <div>
          <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold mb-1.5">Free Alternatives</p>
          <div className="flex flex-wrap gap-1.5">
            {brand.free_alternatives.slice(0, 3).map(f => (
              <span key={f} className="px-2.5 py-1 rounded-full bg-muted/60 text-xs font-medium text-muted-foreground border border-border/40">{f}</span>
            ))}
          </div>
        </div>

        {/* CTA */}
        <Link href={`/brand/${brand.slug}`}>
          <button className="w-full flex items-center justify-between px-4 py-2.5 rounded-xl bg-muted/40 hover:bg-primary/5 hover:text-primary border border-border/40 hover:border-primary/30 transition-all text-sm font-semibold">
            View full story <ArrowRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
          </button>
        </Link>
      </div>
    </motion.div>
  );
}

function SubmitForm({ onClose }: { onClose: () => void }) {
  const [submitted, setSubmitted] = useState(false);
  if (submitted) return (
    <div className="text-center py-6 space-y-2">
      <p className="text-3xl">✅</p>
      <p className="font-bold">Thanks! We'll review and add it.</p>
      <Button size="sm" variant="outline" onClick={onClose}>Close</Button>
    </div>
  );
  return (
    <div className="space-y-4">
      <div>
        <h3 className="font-bold text-lg">Submit a Brand</h3>
        <p className="text-sm text-muted-foreground">Know what font a brand uses? Help us grow the database.</p>
      </div>
      {[
        { l: "Brand name", p: "e.g. Notion" },
        { l: "Font name", p: "e.g. Söhne (licensed)" },
        { l: "Source / evidence", p: "e.g. brand.notion.so/guidelines" },
      ].map(f => (
        <div key={f.l}>
          <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground block mb-1">{f.l}</label>
          <Input placeholder={f.p} className="h-9 text-sm" />
        </div>
      ))}
      <div className="flex gap-2">
        <Button size="sm" onClick={() => setSubmitted(true)} className="flex-1">Submit</Button>
        <Button size="sm" variant="outline" onClick={onClose}>Cancel</Button>
      </div>
    </div>
  );
}

export default function BrandFonts() {
  const [search, setSearch] = useState("");
  const [industry, setIndustry] = useState("All");
  const [showSubmit, setShowSubmit] = useState(false);

  const filtered = BRANDS.filter(b => {
    const q = search.toLowerCase();
    const matchSearch = !q || b.name.toLowerCase().includes(q) || b.brand_font.toLowerCase().includes(q) || b.free_alternatives.some(f => f.toLowerCase().includes(q)) || b.industry.toLowerCase().includes(q);
    return matchSearch && (industry === "All" || b.industry === industry);
  });

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <div className="bg-[#00153D] text-white py-16 px-4">
        <div className="container mx-auto max-w-4xl text-center space-y-4">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <span className="inline-block px-3 py-1 rounded-full bg-white/10 text-white/80 text-xs font-bold uppercase tracking-widest mb-4">Brand Typography</span>
            <h1 className="text-4xl md:text-6xl font-bold tracking-tight">What font does<br /><span className="text-blue-300">your favourite brand</span> use?</h1>
            <p className="mt-4 text-white/60 text-lg max-w-2xl mx-auto">Honest deep-dives — what's proprietary, what's free, and the best alternatives.</p>
          </motion.div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-10 max-w-6xl space-y-8">
        <div className="flex flex-col sm:flex-row gap-4 flex-wrap">
          <div className="relative max-w-sm w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input className="pl-10" placeholder="Search brand or font…" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <div className="flex flex-wrap gap-2">
            {INDUSTRIES.map(ind => (
              <button key={ind} onClick={() => setIndustry(ind)} className={`px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider transition-colors ${industry === ind ? "bg-primary text-white" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}>{ind}</button>
            ))}
          </div>
          <Button variant="outline" size="sm" className="gap-1.5 sm:ml-auto" onClick={() => setShowSubmit(s => !s)}>
            <Plus className="h-3.5 w-3.5" /> Submit a brand
          </Button>
        </div>

        {showSubmit && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="p-6 border border-primary/30 rounded-2xl bg-primary/5">
            <SubmitForm onClose={() => setShowSubmit(false)} />
          </motion.div>
        )}

        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Building2 className="h-4 w-4" />
          <span>Showing <strong className="text-foreground">{filtered.length}</strong> of {BRANDS.length} brands</span>
        </div>

        {filtered.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {filtered.map(b => <BrandCard key={b.slug} brand={b} />)}
          </div>
        ) : (
          <div className="text-center py-20 text-muted-foreground">
            <p className="text-4xl mb-4">🔍</p>
            <p className="font-medium">No brands found — <button className="text-primary underline" onClick={() => setShowSubmit(true)}>submit it</button></p>
          </div>
        )}

        <div className="p-5 bg-muted/30 rounded-xl border border-border/40 text-sm text-muted-foreground">
          <p className="font-bold text-foreground mb-1">About font accuracy</p>
          <p>Fonts marked <strong>Proprietary</strong> are not publicly available. We always list the closest free alternatives. Spot an error? Use the submit button above.</p>
        </div>
      </div>
    </div>
  );
}
