import { useState, useCallback, useRef } from "react";
import { Link } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { useLoadFont } from "@/hooks/use-load-font";

// ── Individual font match card ────────────────────────────────────────────────
function MatchCard({ font, rank, analysis }: { font: any; rank: number; analysis: any }) {
  useLoadFont(font.id, font.family, font.weight);

  const [copied, setCopied] = useState(false);
  const copyFamily = () => {
    navigator.clipboard.writeText(font.family);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const score = font.matchScore ?? 0;
  const isTop = rank === 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: rank * 0.06, duration: 0.4 }}
      className={`relative rounded-2xl border overflow-hidden transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl ${
        isTop
          ? "border-violet-200 bg-gradient-to-br from-violet-50/60 to-white shadow-lg shadow-violet-100"
          : "border-slate-100 bg-white hover:border-slate-200"
      }`}
    >
      {isTop && (
        <div className="absolute top-3 right-3 bg-violet-600 text-white text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full">
          Best Match
        </div>
      )}

      <div className="p-5">
        {/* Font preview */}
        <div
          className="text-3xl leading-tight text-slate-800 mb-3 overflow-hidden"
          style={{ fontFamily: font.family, fontWeight: 400 }}
        >
          {analysis?.textDetected?.slice(0, 40) || "The quick brown fox"}
        </div>

        {/* Name + score */}
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="font-bold text-sm text-slate-800">{font.name}</h3>
            <p className="text-[10px] text-slate-400">{font.family}</p>
          </div>
          <div className="text-right">
            <div className={`text-xs font-black ${score >= 80 ? "text-violet-600" : score >= 60 ? "text-amber-500" : "text-slate-400"}`}>
              {score}%
            </div>
            <div className="text-[9px] text-slate-300">{font.matchReason}</div>
          </div>
        </div>

        {/* Properties */}
        <div className="flex flex-wrap gap-1.5 mb-4">
          {font.xHeight && <Tag label={font.xHeight + " x-height"} />}
          {font.contrast && <Tag label={font.contrast + " contrast"} />}
          {font.width && font.width !== "Normal" && <Tag label={font.width} />}
          {font.familySize && <Tag label={`${font.familySize} styles`} />}
          {font.aStory && <Tag label={`${font.aStory}-story a`} subtle />}
          {font.gStory && <Tag label={`${font.gStory}-story g`} subtle />}
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <Link href={`/font/${font.id}`}
            className="flex-1 text-center text-[11px] font-bold py-2 rounded-lg bg-slate-900 text-white hover:bg-violet-600 transition-colors">
            View Font
          </Link>
          <button onClick={copyFamily}
            className="px-3 py-2 text-[11px] font-bold rounded-lg border border-slate-200 text-slate-500 hover:border-violet-300 hover:text-violet-600 transition-colors">
            {copied ? "✓" : "CSS"}
          </button>
        </div>
      </div>
    </motion.div>
  );
}

function Tag({ label, subtle = false }: { label: string; subtle?: boolean }) {
  return (
    <span className={`text-[9px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full ${
      subtle ? "bg-slate-50 text-slate-300" : "bg-slate-100 text-slate-500"
    }`}>
      {label}
    </span>
  );
}

// ── Analysis summary panel ───────────────────────────────────────────────────
function AnalysisSummary({ analysis }: { analysis: any }) {
  const props = [
    ["Category",    analysis.category],
    ["Weight",      Array.isArray(analysis.weight) ? analysis.weight.join(", ") : analysis.weight],
    ["Width",       analysis.width],
    ["x-Height",    analysis.xHeight],
    ["Contrast",    analysis.contrast],
    ["Serif Type",  analysis.serifType],
    ["Italics",     analysis.italics],
    ["a-Story",     analysis.aStory],
    ["g-Story",     analysis.gStory],
  ].filter(([, v]) => v && v !== "null" && v !== "undefined");

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm"
    >
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-black text-sm text-slate-800">AI Analysis</h3>
          <p className="text-[10px] text-slate-400">Claude Vision detected</p>
        </div>
        <div className={`text-[10px] font-black uppercase px-2 py-1 rounded-full ${
          analysis.confidence === "High" ? "bg-emerald-100 text-emerald-600" :
          analysis.confidence === "Medium" ? "bg-amber-100 text-amber-600" :
          "bg-slate-100 text-slate-400"
        }`}>
          {analysis.confidence} confidence
        </div>
      </div>

      {/* Detected font name */}
      <div className="bg-violet-50 rounded-xl p-3 mb-4 border border-violet-100">
        <div className="text-[9px] font-black uppercase tracking-widest text-violet-400 mb-0.5">Identified as</div>
        <div className="text-lg font-black text-violet-800">{analysis.fontName}</div>
        {analysis.alternativeNames?.length > 0 && (
          <div className="text-[10px] text-violet-400 mt-0.5">
            Also could be: {analysis.alternativeNames.join(", ")}
          </div>
        )}
      </div>

      {/* Detected text */}
      {analysis.textDetected && (
        <div className="bg-slate-50 rounded-lg px-3 py-2 mb-4 text-xs text-slate-500 italic border border-slate-100">
          "{analysis.textDetected.slice(0, 80)}"
        </div>
      )}

      {/* Properties grid */}
      <div className="grid grid-cols-2 gap-x-4 gap-y-2 mb-4">
        {props.map(([label, value]) => (
          <div key={label as string}>
            <div className="text-[9px] font-black uppercase tracking-widest text-slate-300">{label as string}</div>
            <div className="text-[11px] font-semibold text-slate-700 capitalize">{value as string}</div>
          </div>
        ))}
      </div>

      {/* Style description */}
      {analysis.styleDescription && (
        <p className="text-[11px] text-slate-400 leading-relaxed border-t border-slate-50 pt-3">
          {analysis.styleDescription}
        </p>
      )}

      {/* Keywords */}
      {analysis.searchKeywords?.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-3">
          {analysis.searchKeywords.map((kw: string) => (
            <span key={kw} className="text-[9px] font-medium bg-slate-50 text-slate-400 px-2 py-0.5 rounded-full border border-slate-100">
              {kw}
            </span>
          ))}
        </div>
      )}
    </motion.div>
  );
}

// ── Drop zone ────────────────────────────────────────────────────────────────
function DropZone({ onFile }: { onFile: (f: File) => void }) {
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file?.type.startsWith("image/")) onFile(file);
  }, [onFile]);

  return (
    <div
      onDrop={handleDrop}
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onClick={() => inputRef.current?.click()}
      className={`relative cursor-pointer rounded-3xl border-2 border-dashed transition-all duration-300 ${
        dragging
          ? "border-violet-400 bg-violet-50 scale-[1.01]"
          : "border-slate-200 bg-slate-50/50 hover:border-violet-300 hover:bg-violet-50/30"
      }`}
    >
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])}
      />

      <div className="flex flex-col items-center justify-center py-20 px-8 text-center">
        {/* Upload icon */}
        <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-6 transition-all duration-300 ${
          dragging ? "bg-violet-200 scale-110" : "bg-white shadow-md shadow-slate-200/60"
        }`}>
          <svg className={`w-7 h-7 transition-colors ${dragging ? "text-violet-600" : "text-slate-400"}`}
            viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>

        <h3 className="text-lg font-black text-slate-700 mb-2">Drop your image here</h3>
        <p className="text-sm text-slate-400 mb-6 max-w-sm leading-relaxed">
          Screenshots, photos, logos, posters — any image with visible text will work.
          Claude Vision will analyze the typography.
        </p>

        <div className="flex items-center gap-6 text-[10px] font-black uppercase tracking-widest text-slate-300">
          <span>JPEG</span><span>·</span><span>PNG</span><span>·</span><span>WEBP</span><span>·</span><span>GIF</span>
        </div>

        <p className="text-[10px] text-slate-300 mt-3">or click to browse · max 10MB</p>
      </div>
    </div>
  );
}

// ── Main page ────────────────────────────────────────────────────────────────
export default function FontFromImage() {
  const [preview, setPreview]     = useState<string | null>(null);
  const [status,  setStatus]      = useState<"idle" | "analyzing" | "done" | "error">("idle");
  const [analysis, setAnalysis]   = useState<any>(null);
  const [matches,  setMatches]    = useState<any[]>([]);
  const [error,    setError]      = useState<string>("");

  const handleFile = async (file: File) => {
    // Show preview immediately
    const reader = new FileReader();
    reader.onload = (e) => setPreview(e.target?.result as string);
    reader.readAsDataURL(file);

    setStatus("analyzing");
    setAnalysis(null);
    setMatches([]);
    setError("");

    try {
      const form = new FormData();
      form.append("image", file);

      const resp = await fetch("/api/identify-font", { method: "POST", body: form });
      const data = await resp.json();

      if (!resp.ok) throw new Error(data.error || "Analysis failed");

      setAnalysis(data.analysis);
      setMatches(data.matches ?? []);
      setStatus("done");
    } catch (err: any) {
      setError(err.message);
      setStatus("error");
    }
  };

  const reset = () => {
    setPreview(null);
    setStatus("idle");
    setAnalysis(null);
    setMatches([]);
    setError("");
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">

      {/* Header */}
      <div className="border-b border-slate-100 bg-white/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 group">
            <span className="text-xs font-black uppercase tracking-widest text-slate-300 group-hover:text-slate-500 transition-colors">← ukfont</span>
          </Link>
          <div className="text-center">
            <h1 className="text-sm font-black text-slate-800 tracking-tight">Font From Image</h1>
            <p className="text-[9px] text-slate-400 uppercase tracking-widest font-bold">AI-Powered · Claude Vision</p>
          </div>
          <div className="text-[9px] font-bold text-slate-300 uppercase tracking-widest">
            /find-font
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-12">

        {/* Hero — only shown before upload */}
        {status === "idle" && !preview && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-12"
          >
            <div className="inline-flex items-center gap-2 bg-violet-100 text-violet-700 text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full mb-6">
              <span className="w-1.5 h-1.5 bg-violet-500 rounded-full animate-pulse" />
              Powered by Claude Vision AI
            </div>

            <h2 className="text-4xl sm:text-5xl font-black text-slate-900 mb-4 leading-tight tracking-tight">
              Find any font<br />
              <span className="text-violet-600">from any image</span>
            </h2>

            <p className="text-slate-500 text-lg max-w-xl mx-auto mb-4 leading-relaxed">
              Upload a screenshot, photo, or design. Claude Vision analyzes the typography —
              x-height, contrast, stroke width, letterform details — and matches it to our font library.
            </p>

            {/* How it differs */}
            <div className="flex flex-wrap justify-center gap-6 mb-10 text-[11px]">
              {[
                ["🔬", "Analyzes glyph geometry, not just pixels"],
                ["🧠", "Understands style, mood, and use case"],
                ["🎯", "Matches to our curated font library"],
                ["⚡", "Instant results, no login needed"],
              ].map(([icon, text]) => (
                <div key={text as string} className="flex items-center gap-2 text-slate-500">
                  <span>{icon as string}</span><span>{text as string}</span>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Upload + results layout */}
        <div className={`${status === "done" ? "grid grid-cols-1 lg:grid-cols-[380px_1fr] gap-8" : "max-w-2xl mx-auto"}`}>

          {/* Left panel — upload + analysis */}
          <div className="space-y-4">

            {/* Image preview or drop zone */}
            {preview ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                className="relative rounded-3xl overflow-hidden border border-slate-200 shadow-sm bg-slate-50"
              >
                <img src={preview} alt="Uploaded" className="w-full max-h-64 object-contain" />
                <button onClick={reset}
                  className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/90 shadow-md flex items-center justify-center text-slate-500 hover:text-slate-800 transition-colors text-sm">
                  ✕
                </button>
              </motion.div>
            ) : (
              <DropZone onFile={handleFile} />
            )}

            {/* Analyzing state */}
            {status === "analyzing" && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="bg-white rounded-2xl border border-violet-100 p-6 text-center shadow-sm"
              >
                <div className="flex justify-center mb-4">
                  <div className="relative w-10 h-10">
                    <div className="absolute inset-0 border-2 border-violet-200 rounded-full" />
                    <div className="absolute inset-0 border-2 border-violet-600 border-t-transparent rounded-full animate-spin" />
                  </div>
                </div>
                <p className="text-sm font-bold text-slate-700 mb-1">Claude Vision is analyzing…</p>
                <p className="text-xs text-slate-400">Reading letterforms, stroke weight, x-height, contrast…</p>
                <div className="mt-4 space-y-1">
                  {["Detecting text regions", "Analyzing glyph structure", "Measuring typographic properties", "Matching to font library"].map((step, i) => (
                    <motion.div key={step} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.5 }}
                      className="text-[10px] text-slate-300 flex items-center gap-2 justify-center">
                      <span className="w-1 h-1 bg-violet-300 rounded-full" />{step}
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Error state */}
            {status === "error" && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className="bg-red-50 border border-red-100 rounded-2xl p-5 text-center">
                <p className="text-sm font-bold text-red-600 mb-1">Analysis failed</p>
                <p className="text-xs text-red-400">{error}</p>
                <button onClick={reset} className="mt-3 text-xs font-bold text-red-500 underline">Try again</button>
              </motion.div>
            )}

            {/* Analysis summary — shown after done */}
            {status === "done" && analysis && (
              <AnalysisSummary analysis={analysis} />
            )}

            {/* Try different image button */}
            {(status === "done" || status === "error") && (
              <button onClick={reset}
                className="w-full py-3 rounded-2xl border-2 border-dashed border-slate-200 text-xs font-bold text-slate-400 hover:border-violet-300 hover:text-violet-500 transition-colors">
                + Try a different image
              </button>
            )}
          </div>

          {/* Right panel — matches */}
          {status === "done" && matches.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-black text-slate-800">
                  {matches.length} font{matches.length !== 1 ? "s" : ""} found
                </h2>
                <p className="text-xs text-slate-400">Ranked by match confidence</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {matches.map((font, i) => (
                  <MatchCard key={font.id} font={font} rank={i} analysis={analysis} />
                ))}
              </div>
            </div>
          )}

          {status === "done" && matches.length === 0 && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className="flex flex-col items-center justify-center py-16 text-center">
              <div className="text-4xl mb-4">🔍</div>
              <h3 className="text-lg font-black text-slate-700 mb-2">No matches found</h3>
              <p className="text-sm text-slate-400 max-w-sm">
                The font may not be in our library yet, or the image quality may be too low.
                Try a higher-resolution image with clearer text.
              </p>
              <Link href={`/?search=${encodeURIComponent(analysis?.fontName || "")}`}
                className="mt-4 text-xs font-bold text-violet-600 underline">
                Search "{analysis?.fontName}" manually →
              </Link>
            </motion.div>
          )}
        </div>

        {/* Tips — only shown idle */}
        {status === "idle" && !preview && (
          <div className="max-w-2xl mx-auto mt-10 grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              ["📸", "Screenshots", "Works great with UI screenshots, website captures"],
              ["🖼️", "Logos", "Identify fonts used in brand logos and wordmarks"],
              ["📰", "Print", "Magazines, posters, book covers — any printed text"],
              ["✍️", "Handwriting", "Even handwritten or brush script fonts"],
            ].map(([icon, title, desc]) => (
              <div key={title as string} className="bg-white rounded-2xl p-4 border border-slate-100 text-center hover:border-violet-100 transition-colors">
                <div className="text-2xl mb-2">{icon as string}</div>
                <h4 className="text-[11px] font-black text-slate-700 mb-1">{title as string}</h4>
                <p className="text-[10px] text-slate-400 leading-relaxed">{desc as string}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
