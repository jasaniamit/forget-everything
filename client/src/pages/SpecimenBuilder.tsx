import { useState, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { motion } from "framer-motion";
import { Download, Plus, Trash2, RefreshCw, Search, Type } from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────
interface Font { id: number; name: string; family: string; category: string; designer: string; }
interface SpecimenRow { id: string; text: string; size: number; weight: number; color: string; italic: boolean; }

const PALETTE = ["#0f172a","#1e3a5f","#7c3aed","#be185d","#b45309","#065f46","#374151","#6b7280"];
const SIZES   = [12, 14, 18, 24, 32, 48, 64, 96, 120];
const WEIGHTS = [100, 200, 300, 400, 500, 600, 700, 800, 900];

const DEFAULT_ROWS: SpecimenRow[] = [
  { id: "1", text: "ABCDEFGHIJKLMNOPQRSTUVWXYZ", size: 32, weight: 400, color: "#0f172a", italic: false },
  { id: "2", text: "abcdefghijklmnopqrstuvwxyz", size: 32, weight: 400, color: "#0f172a", italic: false },
  { id: "3", text: "0123456789 !@#$%^&*()", size: 24, weight: 400, color: "#374151", italic: false },
  { id: "4", text: "The quick brown fox jumps over the lazy dog", size: 48, weight: 700, color: "#0f172a", italic: false },
  { id: "5", text: "Designing for humans, not machines.", size: 24, weight: 300, color: "#6b7280", italic: true },
];

// ── Font search ───────────────────────────────────────────────────────────────
function useFontSearch(q: string) {
  return useQuery<{ fonts: Font[] }>({
    queryKey: ["/api/fonts", { search: q, limit: 8 }],
    queryFn: async () => {
      const p = new URLSearchParams({ limit: "8" });
      if (q) p.set("search", q);
      const r = await fetch(`/api/fonts?${p}`);
      return r.json();
    },
  });
}

// ── Row editor ────────────────────────────────────────────────────────────────
function RowEditor({ row, fontFamily, onChange, onDelete }: {
  row: SpecimenRow;
  fontFamily: string;
  onChange: (r: SpecimenRow) => void;
  onDelete: () => void;
}) {
  return (
    <div className="group relative p-4 border border-border/50 rounded-xl bg-white hover:border-primary/30 transition-colors space-y-3">
      {/* Preview */}
      <div
        className="min-h-[60px] flex items-center px-2 overflow-hidden"
        style={{
          fontFamily,
          fontSize: `${row.size}px`,
          fontWeight: row.weight,
          color: row.color,
          fontStyle: row.italic ? "italic" : "normal",
          lineHeight: 1.2,
        }}
      >
        <span
          contentEditable
          suppressContentEditableWarning
          onBlur={e => onChange({ ...row, text: e.currentTarget.textContent || row.text })}
          className="outline-none w-full"
        >
          {row.text}
        </span>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-border/30">
        {/* Size */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground w-7">Size</span>
          <div className="flex gap-1">
            {[14, 24, 32, 48, 64, 96].map(s => (
              <button
                key={s}
                onClick={() => onChange({ ...row, size: s })}
                className={`px-2 py-0.5 rounded text-xs font-mono transition-colors ${
                  row.size === s ? "bg-primary text-white" : "bg-muted hover:bg-muted/80"
                }`}
              >{s}</button>
            ))}
          </div>
        </div>

        {/* Weight */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground w-10">Weight</span>
          <div className="flex gap-1">
            {[300, 400, 500, 700, 900].map(w => (
              <button
                key={w}
                onClick={() => onChange({ ...row, weight: w })}
                className={`px-2 py-0.5 rounded text-xs font-mono transition-colors ${
                  row.weight === w ? "bg-primary text-white" : "bg-muted hover:bg-muted/80"
                }`}
              >{w}</button>
            ))}
          </div>
        </div>

        {/* Color */}
        <div className="flex items-center gap-1.5">
          {PALETTE.map(c => (
            <button
              key={c}
              onClick={() => onChange({ ...row, color: c })}
              className={`w-4 h-4 rounded-full border-2 transition-transform hover:scale-110 ${
                row.color === c ? "border-primary scale-110" : "border-transparent"
              }`}
              style={{ backgroundColor: c }}
            />
          ))}
        </div>

        {/* Italic */}
        <button
          onClick={() => onChange({ ...row, italic: !row.italic })}
          className={`px-3 py-0.5 rounded text-xs font-bold italic transition-colors ${
            row.italic ? "bg-primary text-white" : "bg-muted text-muted-foreground hover:bg-muted/80"
          }`}
        >I</button>

        <button
          onClick={onDelete}
          className="ml-auto p-1.5 rounded-lg hover:bg-destructive/10 hover:text-destructive transition-colors"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function SpecimenBuilder() {
  const [search, setSearch] = useState("");
  const [selectedFont, setSelectedFont] = useState<Font | null>(null);
  const [showSearch, setShowSearch] = useState(false);
  const [rows, setRows] = useState<SpecimenRow[]>(DEFAULT_ROWS);
  const [bgColor, setBgColor] = useState("#ffffff");
  const specimenRef = useRef<HTMLDivElement>(null);

  const { data } = useFontSearch(search);

  const updateRow = (id: string, r: SpecimenRow) =>
    setRows(prev => prev.map(row => row.id === id ? r : row));
  const deleteRow = (id: string) =>
    setRows(prev => prev.filter(r => r.id !== id));
  const addRow = () =>
    setRows(prev => [...prev, {
      id: Date.now().toString(),
      text: "Type something beautiful",
      size: 32, weight: 400, color: "#0f172a", italic: false,
    }]);

  const printSpecimen = () => {
    const w = window.open("", "_blank");
    if (!w || !specimenRef.current) return;
    const fontLink = selectedFont
      ? `<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=${encodeURIComponent(selectedFont.family)}:ital,wght@0,100;0,200;0,300;0,400;0,500;0,600;0,700;0,800;0,900;1,400;1,700&display=swap">`
      : "";
    w.document.write(`
      <!DOCTYPE html><html><head>
      <meta charset="utf-8">
      <title>${selectedFont?.name || "Font"} Specimen</title>
      ${fontLink}
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { background: ${bgColor}; padding: 60px; }
        .header { border-bottom: 2px solid #e2e8f0; padding-bottom: 24px; margin-bottom: 40px; }
        .title { font-family: '${selectedFont?.family || "serif"}'; font-size: 64px; font-weight: 700; color: #0f172a; }
        .meta { color: #6b7280; font-size: 14px; margin-top: 8px; font-family: sans-serif; }
        .row { margin-bottom: 32px; }
        @media print { body { padding: 20mm; } }
      </style>
      </head><body>
      <div class="header">
        <div class="title">${selectedFont?.name || "Font Specimen"}</div>
        <div class="meta">Designed by ${selectedFont?.designer || "Unknown"} · Generated by ukfont.com</div>
      </div>
      ${rows.map(r => `
        <div class="row" style="
          font-family:'${selectedFont?.family || "serif"}';
          font-size:${r.size}px;
          font-weight:${r.weight};
          color:${r.color};
          font-style:${r.italic ? "italic" : "normal"};
          line-height:1.2;
        ">${r.text}</div>
      `).join("")}
      </body></html>
    `);
    w.document.close();
    setTimeout(() => w.print(), 500);
  };

  const fontFamily = selectedFont?.family || "Georgia";

  // Load Google Font
  if (selectedFont) {
    const linkId = `gf-specimen-${selectedFont.id}`;
    if (!document.getElementById(linkId)) {
      const link = document.createElement("link");
      link.id = linkId;
      link.rel = "stylesheet";
      link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(selectedFont.family)}:ital,wght@0,100;0,300;0,400;0,700;0,900;1,400&display=swap`;
      document.head.appendChild(link);
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Hero */}
      <div className="bg-[#00153D] text-white py-14 px-4">
        <div className="container mx-auto max-w-4xl">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
            <span className="inline-block px-3 py-1 rounded-full bg-white/10 text-white/80 text-xs font-bold uppercase tracking-widest">
              Specimen Builder
            </span>
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
              Build a font specimen<br />
              <span className="text-blue-300">in seconds</span>
            </h1>
            <p className="text-white/60 text-lg">
              Pick a font, customize text rows, print or save as PDF.
            </p>
          </motion.div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-10 max-w-4xl space-y-6">

        {/* Toolbar */}
        <div className="flex flex-wrap gap-3 items-center justify-between">
          {/* Font picker */}
          <div className="relative">
            <Button
              variant="outline"
              className="gap-2 h-10"
              onClick={() => setShowSearch(s => !s)}
            >
              <Type className="h-4 w-4" />
              {selectedFont ? (
                <span style={{ fontFamily: selectedFont.family }}>{selectedFont.name}</span>
              ) : "Choose Font"}
            </Button>

            {showSearch && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                className="absolute z-50 top-full mt-2 w-72 bg-white border border-border rounded-xl shadow-xl overflow-hidden"
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
                <div className="max-h-56 overflow-y-auto">
                  {data?.fonts.map(f => (
                    <div
                      key={f.id}
                      className="flex items-center gap-3 px-4 py-3 hover:bg-muted/50 cursor-pointer"
                      onClick={() => { setSelectedFont(f); setShowSearch(false); setSearch(""); }}
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
          </div>

          {/* Background color */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Background</span>
            {["#ffffff", "#0f172a", "#f8f5f0", "#fef3c7", "#f0f9ff"].map(c => (
              <button
                key={c}
                onClick={() => setBgColor(c)}
                className={`w-6 h-6 rounded-full border-2 transition-transform hover:scale-110 ${
                  bgColor === c ? "border-primary scale-110" : "border-border"
                }`}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>

          {/* Actions */}
          <div className="flex gap-2 ml-auto">
            <Button variant="outline" size="sm" onClick={() => setRows(DEFAULT_ROWS)} className="gap-1.5">
              <RefreshCw className="h-3.5 w-3.5" /> Reset
            </Button>
            <Button size="sm" onClick={printSpecimen} className="gap-1.5">
              <Download className="h-3.5 w-3.5" /> Export PDF
            </Button>
          </div>
        </div>

        {/* Specimen canvas */}
        <div
          ref={specimenRef}
          className="border border-border rounded-2xl overflow-hidden shadow-sm"
          style={{ backgroundColor: bgColor }}
        >
          {/* Header strip */}
          <div className="px-8 py-6 border-b border-border/30" style={{ borderColor: bgColor === "#0f172a" ? "#334155" : undefined }}>
            <p
              className="text-5xl font-bold"
              style={{
                fontFamily,
                color: bgColor === "#0f172a" ? "#f8fafc" : "#0f172a",
              }}
            >
              {selectedFont?.name || "Select a Font"}
            </p>
            <p style={{ color: bgColor === "#0f172a" ? "#94a3b8" : "#6b7280", fontSize: 13, marginTop: 8, fontFamily: "sans-serif" }}>
              {selectedFont?.designer ? `Designed by ${selectedFont.designer}` : "Choose a font to begin"}
              {" · "}{selectedFont?.category || ""}{" · ukfont.com"}
            </p>
          </div>

          {/* Rows */}
          <div className="p-8 space-y-4">
            {rows.map(row => (
              <RowEditor
                key={row.id}
                row={row}
                fontFamily={fontFamily}
                onChange={r => updateRow(row.id, r)}
                onDelete={() => deleteRow(row.id)}
              />
            ))}
          </div>
        </div>

        {/* Add row */}
        <button
          onClick={addRow}
          className="w-full py-4 border-2 border-dashed border-border rounded-xl text-muted-foreground hover:border-primary/50 hover:text-primary transition-colors flex items-center justify-center gap-2 text-sm font-medium"
        >
          <Plus className="h-4 w-4" /> Add text row
        </button>
      </div>
    </div>
  );
}
