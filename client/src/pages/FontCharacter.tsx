import { useState } from "react";
import { useFonts } from "@/hooks/use-fonts";
import { useQuery } from "@tanstack/react-query";
import { Navbar } from "@/components/Navbar";
import { Loader2, X, ArrowLeftRight, Search, ChevronRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Link } from "wouter";
import { cn } from "@/lib/utils";

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
const NUMBERS = "0123456789".split("");
const SPECIALS = ["@", "#", "&", "?", "!", "$", "%", "*"].map(String);

type CharSet = "alpha" | "num" | "special";

function useLoadFont(family: string) {
    const encoded = encodeURIComponent(family);
    const id = `gf-${family.replace(/\s+/g, '-')}`;
    if (!document.getElementById(id)) {
        const link = document.createElement("link");
        link.id = id;
        link.rel = "stylesheet";
        link.href = `https://fonts.googleapis.com/css2?family=${encoded}:wght@400&display=swap`;
        document.head.appendChild(link);
    }
}

function FontCharCard({ font, selectedChar, onClick, isSelected }: {
    font: any; selectedChar: string; onClick: () => void; isSelected: boolean;
}) {
    useLoadFont(font.family);
    return (
        <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            onClick={onClick}
            className={cn(
                "group p-4 bg-white border rounded-2xl hover:border-primary/40 hover:shadow-2xl hover:shadow-primary/5 transition-all cursor-pointer flex flex-col items-center justify-center gap-3 aspect-[3/4]",
                isSelected ? "border-primary shadow-xl shadow-primary/10 bg-primary/5" : "border-border/60"
            )}
        >
            <span
                className="text-4xl text-foreground group-hover:scale-125 transition-transform duration-500"
                style={{ fontFamily: font.family }}
            >
                {selectedChar}
            </span>
            <span className="text-[10px] font-bold tracking-tight text-muted-foreground/60 group-hover:text-primary transition-colors truncate w-full text-center px-1">
                {font.name}
            </span>
            {font.category && (
                <span className="text-[8px] uppercase tracking-widest text-primary/40 font-black">{font.category}</span>
            )}
        </motion.div>
    );
}

function SimilarFontCard({ font, char }: { font: any; char: string }) {
    useLoadFont(font.family);
    return (
        <Link href={`/font/${font.id}`}>
            <div className="flex items-center gap-3 p-3 rounded-xl hover:bg-primary/5 transition-colors cursor-pointer group">
                <div className="w-12 h-12 bg-white border border-border/60 rounded-xl flex items-center justify-center shrink-0 group-hover:border-primary/30">
                    <span className="text-2xl" style={{ fontFamily: font.family }}>{char}</span>
                </div>
                <div className="min-w-0">
                    <p className="text-[12px] font-bold text-foreground truncate">{font.name}</p>
                    <p className="text-[10px] text-muted-foreground/60">{font.category || "Font"}</p>
                </div>
                <ChevronRight className="h-3 w-3 text-muted-foreground/30 group-hover:text-primary ml-auto shrink-0" />
            </div>
        </Link>
    );
}

export default function FontCharacter() {
    const [selectedChar, setSelectedChar] = useState("A");
    const [charSet, setCharSet] = useState<CharSet>("alpha");
    const [page, setPage] = useState(1);
    const [selectedFont, setSelectedFont] = useState<any>(null);
    const [customText, setCustomText] = useState("");
    const [searchFilter, setSearchFilter] = useState("");

    const displayChar = customText || selectedChar;

    const { data, isLoading } = useFonts({ page, limit: 100 });
    const fonts = data?.fonts ?? [];
    const totalPages = data ? Math.ceil(data.total / data.limit) : 1;

    const filteredFonts = searchFilter
        ? fonts.filter(f => f.name.toLowerCase().includes(searchFilter.toLowerCase()))
        : fonts;

    const { data: similarData, isLoading: similarLoading } = useQuery<{ similar: any[]; opposite: any[] }>({
        queryKey: [`/api/fonts/${selectedFont?.id}/similar`],
        queryFn: async () => {
            const res = await fetch(`/api/fonts/${selectedFont?.id}/similar`);
            if (!res.ok) return { similar: [], opposite: [] };
            return res.json();
        },
        enabled: !!selectedFont,
    });

    const charOptions = charSet === "alpha" ? ALPHABET : charSet === "num" ? NUMBERS : SPECIALS;

    return (
        <div className="min-h-screen bg-background font-sans">
            <Navbar />

            <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-8 max-w-7xl">
                <div className="text-center space-y-2">
                    <h1 className="text-3xl font-black tracking-tight text-primary">Font Map</h1>
                    <p className="text-muted-foreground text-sm">See how every font renders any character — click a font to find similar & complementary fonts</p>
                </div>

                {/* Controls Card */}
                <div className="bg-white border border-border/60 rounded-3xl p-6 shadow-sm space-y-6">
                    {/* Char set toggle */}
                    <div className="flex items-center gap-3">
                        <span className="text-[11px] font-black uppercase tracking-widest text-primary/40 shrink-0">Type</span>
                        <div className="flex gap-1.5">
                            {(["alpha", "num", "special"] as CharSet[]).map(set => (
                                <button key={set} onClick={() => setCharSet(set)}
                                    className={cn("px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all",
                                        charSet === set ? "bg-primary text-white" : "bg-secondary/50 text-muted-foreground hover:bg-primary/10 hover:text-primary"
                                    )}>
                                    {set === "alpha" ? "A–Z" : set === "num" ? "0–9" : "#@!"}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Character selector */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-4">
                            <span className="text-[11px] font-black uppercase tracking-[0.2em] text-primary shrink-0">Select Character</span>
                            <div className="h-px flex-1 bg-border/50" />
                        </div>
                        <div className="flex flex-wrap items-center justify-center gap-2">
                            {charOptions.map((ch) => (
                                <button key={ch} onClick={() => { setSelectedChar(ch); setCustomText(""); }}
                                    className={cn(
                                        "w-11 h-11 rounded-xl text-base font-black transition-all duration-200 border-2",
                                        displayChar === ch && !customText
                                            ? "bg-primary border-primary text-white scale-110 shadow-lg shadow-primary/20"
                                            : "bg-white border-border/40 text-muted-foreground/60 hover:border-primary/40 hover:text-primary hover:scale-105"
                                    )}>
                                    {ch}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Custom text + search */}
                    <div className="flex gap-3">
                        <div className="flex-1 relative">
                            <Input
                                value={customText}
                                onChange={(e) => setCustomText(e.target.value.slice(0, 1))}
                                placeholder="Or type any character…"
                                className="h-10 bg-secondary/20 border-transparent focus-visible:border-primary/30 text-center text-lg font-medium"
                                maxLength={1}
                            />
                        </div>
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/40" />
                            <Input
                                value={searchFilter}
                                onChange={(e) => setSearchFilter(e.target.value)}
                                placeholder="Filter by font name…"
                                className="h-10 bg-secondary/20 border-transparent focus-visible:border-primary/30 pl-8"
                            />
                        </div>
                    </div>
                </div>

                {/* Selected font detail panel */}
                <AnimatePresence>
                    {selectedFont && (
                        <motion.div
                            initial={{ opacity: 0, y: -12 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -12 }}
                            className="bg-white border border-primary/20 rounded-3xl p-6 shadow-xl shadow-primary/5"
                        >
                            <div className="flex items-start justify-between mb-6">
                                <div>
                                    <h2 className="text-xl font-black text-foreground">{selectedFont.name}</h2>
                                    <p className="text-sm text-muted-foreground">{selectedFont.category} · {selectedFont.designer || "Unknown"}</p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Link href={`/font/${selectedFont.id}`}>
                                        <Button size="sm" className="rounded-xl text-xs font-bold">View Font</Button>
                                    </Link>
                                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setSelectedFont(null)}>
                                        <X className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>

                            {/* Big preview */}
                            <div className="text-center py-6 border border-border/40 rounded-2xl mb-6 bg-secondary/10">
                                <span className="text-8xl text-foreground/80" style={{ fontFamily: selectedFont.family }}>
                                    {displayChar}
                                </span>
                                <p className="text-xs text-muted-foreground/40 mt-2 font-mono">{selectedFont.family}</p>
                            </div>

                            {similarLoading ? (
                                <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-primary/40" /></div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    {/* Similar fonts */}
                                    <div>
                                        <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-primary mb-3">Similar Fonts</h3>
                                        <div className="space-y-1">
                                            {similarData?.similar?.slice(0, 6).map(f => (
                                                <SimilarFontCard key={f.id} font={f} char={displayChar} />
                                            ))}
                                            {!similarData?.similar?.length && (
                                                <p className="text-xs text-muted-foreground/40 py-4 text-center">No similar fonts found</p>
                                            )}
                                        </div>
                                    </div>

                                    {/* Opposite / pairing fonts */}
                                    <div>
                                        <div className="flex items-center gap-2 mb-3">
                                            <ArrowLeftRight className="h-3.5 w-3.5 text-primary/60" />
                                            <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-primary">Pair With</h3>
                                        </div>
                                        <div className="space-y-1">
                                            {similarData?.opposite?.slice(0, 6).map(f => (
                                                <SimilarFontCard key={f.id} font={f} char={displayChar} />
                                            ))}
                                            {!similarData?.opposite?.length && (
                                                <p className="text-xs text-muted-foreground/40 py-4 text-center">No pairing suggestions</p>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Font grid */}
                <div className="relative min-h-[400px]">
                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center py-24 text-muted-foreground">
                            <Loader2 className="h-10 w-10 animate-spin mb-4 text-primary" />
                            <p className="font-bold text-sm uppercase tracking-widest">Loading glyphs…</p>
                        </div>
                    ) : (
                        <>
                            <div className="flex items-center justify-between mb-4">
                                <p className="text-[11px] font-black uppercase tracking-widest text-muted-foreground/40">
                                    {filteredFonts.length} fonts · Page {page} of {totalPages}
                                </p>
                                <p className="text-[10px] text-muted-foreground/30">Click any font to see similar & pairing fonts</p>
                            </div>
                            <motion.div
                                key={`${page}-${displayChar}`}
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10 gap-3"
                            >
                                {filteredFonts.map((font, idx) => (
                                    <motion.div key={font.id} initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: idx * 0.01 }}>
                                        <FontCharCard
                                            font={font}
                                            selectedChar={displayChar}
                                            onClick={() => setSelectedFont(selectedFont?.id === font.id ? null : font)}
                                            isSelected={selectedFont?.id === font.id}
                                        />
                                    </motion.div>
                                ))}
                            </motion.div>
                        </>
                    )}
                </div>

                {!isLoading && totalPages > 1 && (
                    <div className="flex items-center justify-center gap-4 pt-8 pb-12">
                        <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1} className="rounded-xl font-bold px-6">Previous</Button>
                        <span className="text-sm font-medium text-muted-foreground">Page {page} of {totalPages} ({data?.total} fonts)</span>
                        <Button variant="outline" size="sm" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages} className="rounded-xl font-bold px-6">Next</Button>
                    </div>
                )}
            </main>
        </div>
    );
}
