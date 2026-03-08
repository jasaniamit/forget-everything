import { useState, useRef, useEffect, useCallback } from "react";
import { Navbar } from "@/components/Navbar";
import {
  Download, Undo2, Redo2, Trash2, RotateCcw,
  ChevronUp, ChevronDown, Copy, ZoomIn, RotateCw, Eraser,
} from "lucide-react";

// ─── Assets ───────────────────────────────────────────────────────────────────
const BASE = "https://emoji-maker.com/assets/emojis";
const CATS = [
  { id: "Shape",       label: "Shape",       icon: "😶", count: 20 },
  { id: "More Shape",  label: "More Shape",  icon: "⬤",  count: 15 },
  { id: "Eyes",        label: "Eyes",        icon: "👀", count: 30 },
  { id: "Eyes Big",    label: "Eyes Big",    icon: "😳", count: 20 },
  { id: "Eyebrows",    label: "Eyebrows",    icon: "🤨", count: 20 },
  { id: "Happy Mouth", label: "Happy Mouth", icon: "😄", count: 25 },
  { id: "Sad Mouth",   label: "Sad Mouth",   icon: "😢", count: 20 },
  { id: "Nose",        label: "Nose",        icon: "👃", count: 15 },
  { id: "Beard",       label: "Beard",       icon: "🧔", count: 10 },
  { id: "Stache",      label: "Stache",      icon: "🥸", count: 12 },
  { id: "Glasses",     label: "Glasses",     icon: "🕶️", count: 15 },
  { id: "Hair",        label: "Hair",        icon: "💇", count: 20 },
  { id: "Mask",        label: "Mask",        icon: "😷", count: 10 },
  { id: "Misc",        label: "Misc",        icon: "✨", count: 20 },
  { id: "Hats",        label: "Hats",        icon: "🎩", count: 18 },
  { id: "Hands",       label: "Hands",       icon: "✌️", count: 15 },
];
const assetUrl = (cat: string, n: number) =>
  `${BASE}/${encodeURIComponent(cat)}/${n}.png`;

// ─── Types ────────────────────────────────────────────────────────────────────
interface Layer {
  id: string;
  url: string;
  cat: string;
  left: number;   // % of stage width
  top: number;    // % of stage height
  w: number;      // px
  h: number;      // px
  rot: number;    // degrees
  flipX: boolean;
  z: number;      // stack order
}

const STAGE = 500;

const REPLACEABLE = new Set([
  "Shape","More Shape","Eyes","Eyes Big","Eyebrows",
  "Happy Mouth","Sad Mouth","Nose","Beard","Stache","Glasses","Hair","Mask",
]);

// Shape & More Shape share one slot; Eyes & Eyes Big share one slot
const slot = (c: string) =>
  c === "Shape" || c === "More Shape" ? "_face_" :
  c === "Eyes"  || c === "Eyes Big"   ? "_eyes_" : c;

const defSize = (c: string) =>
  c === "Shape" || c === "More Shape" ? 400 :
  c === "Hair"  || c === "Hats"       ? 280 :
  c === "Hands"                       ? 220 :
  c === "Beard" || c === "Stache"     ? 200 : 240;

const defPos = (c: string): Pick<Layer, "left" | "top"> =>
  c === "Shape" || c === "More Shape"      ? { left: 50, top: 50 } :
  c === "Eyes"  || c === "Eyes Big"        ? { left: 50, top: 42 } :
  c === "Eyebrows"                         ? { left: 50, top: 30 } :
  c === "Happy Mouth" || c === "Sad Mouth" ? { left: 50, top: 70 } :
  c === "Nose"    ? { left: 50, top: 56 } :
  c === "Hair"    ? { left: 50, top: 15 } :
  c === "Hats"    ? { left: 50, top:  8 } :
  c === "Beard"   ? { left: 50, top: 75 } :
  c === "Stache"  ? { left: 50, top: 65 } :
  c === "Glasses" ? { left: 50, top: 42 } :
  c === "Mask"    ? { left: 50, top: 60 } :
  c === "Hands"   ? { left: 72, top: 72 } :
  { left: 50, top: 50 };

// ─── Thumbnail ────────────────────────────────────────────────────────────────
function Thumb({ src, active, onAdd }: { src: string; active: boolean; onAdd: () => void }) {
  return (
    <button
      onClick={onAdd}
      className={`aspect-square rounded-xl p-1.5 border-2 transition-all hover:scale-105 active:scale-95 bg-zinc-50 ${
        active ? "border-primary bg-primary/5 shadow-md" : "border-transparent hover:border-zinc-300"
      }`}
    >
      <img
        src={src} alt="" draggable={false}
        onError={e => { (e.currentTarget.closest("button") as HTMLElement).style.display = "none"; }}
        className="w-full h-full object-contain"
      />
    </button>
  );
}

// ─── Toolbar button ───────────────────────────────────────────────────────────
function TB({ children, onClick, disabled, title, danger }: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  title?: string;
  danger?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`p-2 rounded-xl border border-transparent transition-all disabled:opacity-30 disabled:cursor-not-allowed ${
        danger
          ? "text-zinc-500 hover:bg-red-50 hover:text-red-500"
          : "text-zinc-600 hover:bg-zinc-100"
      }`}
    >
      {children}
    </button>
  );
}

// ─── Selection handles ────────────────────────────────────────────────────────
function Handles({
  layer, stageEl, onResize, onRotate, onCommit,
}: {
  layer: Layer;
  stageEl: HTMLDivElement | null;
  onResize: (w: number) => void;
  onRotate: (deg: number) => void;
  onCommit: () => void;
}) {
  const PAD = 10;
  const hw = layer.w / 2 + PAD;
  const hh = layer.h / 2 + PAD;

  const startResize = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    const ox = e.clientX;
    const oy = e.clientY;
    const startW = layer.w;
    const onMove = (me: MouseEvent) => {
      const d = (me.clientX - ox + (me.clientY - oy)) / 2;
      onResize(Math.max(40, startW + d * 2));
    };
    const onUp = () => {
      onCommit();
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  };

  const startRotate = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (!stageEl) return;
    const rect = stageEl.getBoundingClientRect();
    const cx = rect.left + (layer.left / 100) * rect.width;
    const cy = rect.top  + (layer.top  / 100) * rect.height;
    const baseA  = Math.atan2(e.clientY - cy, e.clientX - cx) * 180 / Math.PI;
    const startR = layer.rot;
    const onMove = (me: MouseEvent) => {
      const a = Math.atan2(me.clientY - cy, me.clientX - cx) * 180 / Math.PI;
      onRotate(startR + (a - baseA));
    };
    const onUp = () => {
      onCommit();
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  };

  const corners: [number, number][] = [
    [-hw, -hh], [0, -hh], [hw, -hh],
    [hw,  0],
    [hw,  hh], [0, hh], [-hw, hh],
    [-hw, 0],
  ];

  return (
    <div
      className="absolute pointer-events-none"
      style={{
        left: `${layer.left}%`,
        top: `${layer.top}%`,
        width: layer.w,
        height: layer.h,
        transform: `translate(-50%,-50%) rotate(${layer.rot}deg)`,
        zIndex: 9999,
      }}
    >
      {/* Border */}
      <div
        className="absolute border-2 border-primary/70 rounded pointer-events-none"
        style={{ inset: -PAD }}
      />

      {/* Resize corners */}
      {corners.map(([px, py], i) => (
        <div
          key={i}
          onMouseDown={startResize}
          className="absolute w-3 h-3 bg-white border-2 border-primary rounded-sm pointer-events-auto cursor-nwse-resize hover:bg-primary/20 transition-colors"
          style={{
            left: "50%",
            top: "50%",
            transform: `translate(calc(-50% + ${px}px), calc(-50% + ${py}px))`,
          }}
        />
      ))}

      {/* Line up to rotate handle */}
      <div
        className="absolute pointer-events-none bg-primary/40"
        style={{
          left: "50%",
          top: 0,
          width: 2,
          height: hh + 28,
          transform: "translateX(-50%) translateY(-100%)",
        }}
      />

      {/* Rotate handle */}
      <div
        onMouseDown={startRotate}
        className="absolute w-5 h-5 bg-primary rounded-full border-2 border-white shadow-md pointer-events-auto cursor-crosshair flex items-center justify-center"
        style={{
          left: "50%",
          top: "50%",
          transform: `translate(-50%, calc(-50% + ${-hh - 28}px))`,
        }}
      >
        <RotateCw className="w-2.5 h-2.5 text-white" />
      </div>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function EmojiCreator() {
  // ── Core state ───────────────────────────────────────────────────────────────
  const [layers,    setLayers]    = useState<Layer[]>([]);
  const [selId,     setSelId]     = useState<string | null>(null);
  const [past,      setPast]      = useState<Layer[][]>([]);
  const [future,    setFuture]    = useState<Layer[][]>([]);
  const [activeCat, setActiveCat] = useState("Shape");
  const [bgColor,   setBgColor]   = useState("transparent");

  // Refs for event-handler access (no stale closures)
  const stageRef  = useRef<HTMLDivElement>(null);
  const dragRef   = useRef<{ id: string; sx: number; sy: number; sl: number; st: number } | null>(null);
  const lRef      = useRef(layers);   lRef.current   = layers;
  const selRef    = useRef(selId);    selRef.current = selId;

  const sel = layers.find(l => l.id === selId) ?? null;

  // ── History helpers ──────────────────────────────────────────────────────────
  // Call BEFORE mutating layers to save the old state
  const saveHistory = useCallback((current: Layer[]) => {
    setPast(p => [...p, current.map(l => ({ ...l }))].slice(-40));
    setFuture([]);
  }, []);

  const undo = useCallback(() => {
    setPast(p => {
      if (p.length === 0) return p;
      const prev = p[p.length - 1];
      setFuture(f => [lRef.current.map(l => ({ ...l })), ...f].slice(0, 40));
      setLayers(prev.map(l => ({ ...l })));
      setSelId(null);
      return p.slice(0, -1);
    });
  }, []);

  const redo = useCallback(() => {
    setFuture(f => {
      if (f.length === 0) return f;
      const next = f[0];
      setPast(p => [...p, lRef.current.map(l => ({ ...l }))].slice(-40));
      setLayers(next.map(l => ({ ...l })));
      setSelId(null);
      return f.slice(1);
    });
  }, []);

  // ── Drag ─────────────────────────────────────────────────────────────────────
  const onMouseMove = useCallback((e: MouseEvent) => {
    if (!dragRef.current || !stageRef.current) return;
    const rect = stageRef.current.getBoundingClientRect();
    const dx = ((e.clientX - dragRef.current.sx) / rect.width)  * 100;
    const dy = ((e.clientY - dragRef.current.sy) / rect.height) * 100;
    const { id, sl, st } = dragRef.current;
    setLayers(prev => prev.map(l =>
      l.id === id ? { ...l, left: sl + dx, top: st + dy } : l
    ));
  }, []);

  const onMouseUp = useCallback(() => {
    if (!dragRef.current) return;
    // Save history after drag ends
    saveHistory(lRef.current);
    dragRef.current = null;
  }, [saveHistory]);

  useEffect(() => {
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup",   onMouseUp);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup",   onMouseUp);
    };
  }, [onMouseMove, onMouseUp]);

  // ── Keyboard ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;

      const ctrl = e.metaKey || e.ctrlKey;
      const k    = e.key;

      if (k === "Escape") { setSelId(null); return; }

      if (k === "Delete" || k === "Backspace") {
        const id = selRef.current;
        if (!id) return;
        saveHistory(lRef.current);
        setLayers(prev => prev.filter(l => l.id !== id));
        setSelId(null);
        return;
      }

      if (ctrl && k.toLowerCase() === "z" && !e.shiftKey) {
        e.preventDefault(); undo(); return;
      }
      if (ctrl && (k.toLowerCase() === "y" || (e.shiftKey && k.toLowerCase() === "z"))) {
        e.preventDefault(); redo(); return;
      }

      if (ctrl && k.toLowerCase() === "d") {
        e.preventDefault();
        const id = selRef.current;
        const orig = lRef.current.find(l => l.id === id);
        if (!orig) return;
        const copy: Layer = { ...orig, id: crypto.randomUUID(), left: orig.left + 3, top: orig.top + 3, z: lRef.current.length };
        saveHistory(lRef.current);
        setLayers(prev => [...prev, copy]);
        setSelId(copy.id);
        return;
      }

      if (["ArrowUp","ArrowDown","ArrowLeft","ArrowRight"].includes(k)) {
        const id = selRef.current;
        if (!id) return;
        e.preventDefault();
        const step = e.shiftKey ? 5 : 1;
        const dx = k === "ArrowLeft" ? -step : k === "ArrowRight" ? step : 0;
        const dy = k === "ArrowUp"   ? -step : k === "ArrowDown"  ? step : 0;
        setLayers(prev => prev.map(l =>
          l.id === id
            ? { ...l, left: l.left + (dx * 100) / STAGE, top: l.top + (dy * 100) / STAGE }
            : l
        ));
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [undo, redo, saveHistory]);

  // ── Add layer ─────────────────────────────────────────────────────────────────
  const addLayer = (cat: string, n: number) => {
    const pos = defPos(cat);
    const newLayer: Layer = {
      id: crypto.randomUUID(),
      url: assetUrl(cat, n),
      cat,
      ...pos,
      w: defSize(cat),
      h: defSize(cat),
      rot: 0,
      flipX: false,
      z: lRef.current.length,
    };

    saveHistory(lRef.current);

    setLayers(prev => {
      if (REPLACEABLE.has(cat)) {
        const idx = prev.findIndex(l => slot(l.cat) === slot(cat));
        if (idx >= 0) {
          return prev.map((l, i) => i === idx
            ? { ...newLayer, id: l.id, left: l.left, top: l.top, w: l.w, h: l.h, rot: l.rot, z: l.z }
            : l
          );
        }
      }
      return [...prev, newLayer];
    });

    setSelId(newLayer.id);
  };

  // ── Mutate selected ────────────────────────────────────────────────────────────
  const updateSel = (patch: Partial<Layer>) => {
    if (!selId) return;
    setLayers(prev => prev.map(l => l.id === selId ? { ...l, ...patch } : l));
  };

  const commitSel = () => saveHistory(lRef.current);

  const deleteSel = () => {
    if (!selId) return;
    saveHistory(lRef.current);
    setLayers(prev => prev.filter(l => l.id !== selId));
    setSelId(null);
  };

  const moveZ = (dir: 1 | -1) => {
    if (!selId) return;
    setLayers(prev => {
      const idx = prev.findIndex(l => l.id === selId);
      if (idx < 0) return prev;
      const t = idx + dir;
      if (t < 0 || t >= prev.length) return prev;
      saveHistory(prev);
      const next = [...prev];
      // Swap the z values so sort-by-z rendering order actually changes
      const zA = next[idx].z;
      const zB = next[t].z;
      next[idx] = { ...next[idx], z: zB };
      next[t]   = { ...next[t],   z: zA };
      return next;
    });
  };

  const duplicateSel = () => {
    if (!sel) return;
    const copy: Layer = { ...sel, id: crypto.randomUUID(), left: sel.left + 3, top: sel.top + 3, z: layers.length };
    saveHistory(layers);
    setLayers(prev => [...prev, copy]);
    setSelId(copy.id);
  };

  // ── Export ────────────────────────────────────────────────────────────────────
  const exportPng = async () => {
    const SIZE = 1024;                          // 2× for crisp output
    const sc   = SIZE / STAGE;
    const canvas = document.createElement("canvas");
    canvas.width  = SIZE;
    canvas.height = SIZE;
    const ctx = canvas.getContext("2d")!;

    // Transparent PNG by default — canvas is already clear, nothing to fill.
    // Only fill if user explicitly chose a background colour.
    if (bgColor !== "transparent") {
      ctx.fillStyle = bgColor;
      ctx.beginPath();
      ctx.roundRect(0, 0, SIZE, SIZE, Math.round(72 * sc));
      ctx.fill();
    }

    // Draw each layer via server proxy (avoids CORS canvas taint)
    for (const layer of [...layers].sort((a, b) => a.z - b.z)) {
      await new Promise<void>(res => {
        const img    = new Image();
        const proxied = `/api/image-proxy?url=${encodeURIComponent(layer.url)}`;
        img.onload = () => {
          ctx.save();
          ctx.translate((layer.left / 100) * SIZE, (layer.top / 100) * SIZE);
          ctx.rotate(layer.rot * Math.PI / 180);
          if (layer.flipX) ctx.scale(-1, 1);
          const iw = layer.w * sc;
          const ih = layer.h * sc;
          ctx.drawImage(img, -iw / 2, -ih / 2, iw, ih);
          ctx.restore();
          res();
        };
        img.onerror = () => res();
        img.src = proxied;
      });
    }

    const a = document.createElement("a");
    a.download = "my-emoji.png";
    a.href = canvas.toDataURL("image/png");
    a.click();
  };

  // ── Render ────────────────────────────────────────────────────────────────────
  const catDef    = CATS.find(c => c.id === activeCat)!;
  const thumbs    = Array.from({ length: catDef.count }, (_, i) => assetUrl(activeCat, i + 1));
  const activeUrl = layers.find(l => slot(l.cat) === slot(activeCat))?.url;

  const BG_PRESETS = [
    "transparent","#FFFFFF","#FFF9DB","#FFD93D",
    "#FF6B6B","#74C0FC","#51CF66","#CC5DE8","#FFA94D","#1A1A2E",
  ];

  return (
    <div className="min-h-screen bg-[#ECEEF2]">
      <Navbar />
      <div className="max-w-[1440px] mx-auto px-4 py-5 flex gap-4 items-start">

        {/* ── Category sidebar ── */}
        <div
          className="flex-shrink-0 bg-white rounded-2xl shadow border border-zinc-100 overflow-hidden"
          style={{ width: 72 }}
        >
          <div className="py-2 flex flex-col gap-0.5">
            {CATS.map(c => (
              <button
                key={c.id}
                onClick={() => setActiveCat(c.id)}
                title={c.label}
                className={`flex flex-col items-center gap-1 py-3 px-1 text-center transition-all ${
                  activeCat === c.id
                    ? "bg-primary/10 text-primary border-r-2 border-primary"
                    : "text-zinc-500 hover:bg-zinc-50"
                }`}
              >
                <span className="text-xl">{c.icon}</span>
                <span className="text-[9px] font-black uppercase tracking-tight leading-tight">{c.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* ── Stage + controls ── */}
        <div className="flex flex-col gap-3 flex-shrink-0" style={{ width: STAGE }}>

          {/* Stage */}
          <div
            ref={stageRef}
            className="relative rounded-2xl overflow-hidden shadow-2xl border border-zinc-200 select-none"
            style={{
              width: STAGE,
              height: STAGE,
              background: bgColor === "transparent"
                ? "repeating-conic-gradient(#ddd 0% 25%, white 0% 50%) 0 0 / 20px 20px"
                : bgColor,
              cursor: "default",
            }}
            onMouseDown={e => {
              if (e.target === e.currentTarget) setSelId(null);
            }}
          >
            {[...layers].sort((a, b) => a.z - b.z).map(layer => (
              <div
                key={layer.id}
                onMouseDown={e => {
                  e.stopPropagation();
                  e.preventDefault();
                  setSelId(layer.id);
                  dragRef.current = {
                    id: layer.id,
                    sx: e.clientX, sy: e.clientY,
                    sl: layer.left, st: layer.top,
                  };
                }}
                className="absolute cursor-move"
                style={{
                  left: `${layer.left}%`,
                  top: `${layer.top}%`,
                  width: layer.w,
                  height: layer.h,
                  transform: `translate(-50%,-50%) rotate(${layer.rot}deg) scaleX(${layer.flipX ? -1 : 1})`,
                  zIndex: layer.z + 1,
                }}
              >
                <img
                  src={layer.url} alt="" draggable={false}
                  className="w-full h-full object-contain pointer-events-none"
                />
              </div>
            ))}

            {sel && (
              <Handles
                layer={sel}
                stageEl={stageRef.current}
                onResize={w   => updateSel({ w, h: w })}
                onRotate={deg => updateSel({ rot: Math.round(deg) })}
                onCommit={commitSel}
              />
            )}

            {layers.length === 0 && (
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <div className="text-6xl opacity-10 mb-3">😶</div>
                <p className="text-zinc-400 text-sm font-medium">Pick a Shape to start →</p>
              </div>
            )}
          </div>

          {/* Toolbar */}
          <div className="bg-white rounded-2xl px-4 py-2.5 flex items-center gap-1.5 shadow border border-zinc-100">
            <TB onClick={undo} disabled={past.length === 0}   title="Undo (Ctrl+Z)"><Undo2 className="w-4 h-4" /></TB>
            <TB onClick={redo} disabled={future.length === 0} title="Redo (Ctrl+Y)"><Redo2 className="w-4 h-4" /></TB>
            <div className="w-px h-5 bg-zinc-200 mx-1" />
            {sel && (<>
              <TB onClick={() => moveZ(1)}  title="Bring Forward"><ChevronUp   className="w-4 h-4" /></TB>
              <TB onClick={() => moveZ(-1)} title="Send Backward"><ChevronDown className="w-4 h-4" /></TB>
              <TB
                title="Flip Horizontal"
                onClick={() => { updateSel({ flipX: !sel.flipX }); commitSel(); }}
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M8 3H5a2 2 0 0 0-2 2v14c0 1.1.9 2 2 2h3"/>
                  <path d="M16 3h3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-3"/>
                  <path d="M12 20v2"/><path d="M12 14v2"/><path d="M12 8v2"/><path d="M12 2v2"/>
                </svg>
              </TB>
              <TB onClick={duplicateSel} title="Duplicate (Ctrl+D)"><Copy  className="w-4 h-4" /></TB>
              <TB onClick={deleteSel}   title="Delete (Del)" danger><Trash2 className="w-4 h-4" /></TB>
              <div className="w-px h-5 bg-zinc-200 mx-1" />
            </>)}
            <TB
              title="Clear all"
              onClick={() => { saveHistory(layers); setLayers([]); setSelId(null); }}
            >
              <Eraser className="w-4 h-4" />
            </TB>
            <div className="flex-1" />
            <button
              onClick={exportPng}
              className="flex items-center gap-2 bg-primary text-white font-bold px-5 py-2 rounded-xl hover:opacity-90 active:scale-95 transition-all text-sm shadow-sm"
            >
              <Download className="w-4 h-4" /> Export PNG
            </button>
          </div>

          {/* Selected layer controls */}
          {sel && (
            <div className="bg-white rounded-2xl p-4 shadow border border-zinc-100 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase tracking-widest text-zinc-400">{sel.cat}</span>
                <button
                  onClick={() => { updateSel(defPos(sel.cat)); commitSel(); }}
                  className="text-xs text-primary font-bold hover:underline flex items-center gap-1"
                >
                  <RotateCcw className="w-3 h-3" /> Reset pos
                </button>
              </div>

              <div>
                <div className="flex justify-between mb-1.5">
                  <span className="text-xs font-bold text-zinc-500 flex items-center gap-1">
                    <ZoomIn className="w-3 h-3" /> Size
                  </span>
                  <span className="text-xs font-bold text-primary">{Math.round(sel.w)}px</span>
                </div>
                <input
                  type="range" min={40} max={500} step={4}
                  value={sel.w}
                  onChange={e => updateSel({ w: +e.target.value, h: +e.target.value })}
                  onMouseUp={commitSel}
                  className="w-full h-1.5 appearance-none rounded-full bg-zinc-200 accent-primary cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between mb-1.5">
                  <span className="text-xs font-bold text-zinc-500 flex items-center gap-1">
                    <RotateCw className="w-3 h-3" /> Rotation
                  </span>
                  <span className="text-xs font-bold text-primary">{Math.round(sel.rot)}°</span>
                </div>
                <input
                  type="range" min={-180} max={180} step={1}
                  value={sel.rot}
                  onChange={e => updateSel({ rot: +e.target.value })}
                  onMouseUp={commitSel}
                  className="w-full h-1.5 appearance-none rounded-full bg-zinc-200 accent-primary cursor-pointer"
                />
              </div>

              <div className="flex gap-1.5">
                {[-90, -45, 0, 45, 90].map(d => (
                  <button
                    key={d}
                    onClick={() => { updateSel({ rot: d }); commitSel(); }}
                    className={`flex-1 py-1.5 text-xs font-bold rounded-lg border transition-all ${
                      Math.round(sel.rot) === d
                        ? "bg-primary text-white border-primary"
                        : "bg-zinc-50 text-zinc-500 border-zinc-200 hover:border-zinc-400"
                    }`}
                  >
                    {d}°
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Background */}
          <div className="bg-white rounded-2xl p-4 shadow border border-zinc-100">
            <span className="text-xs font-black uppercase tracking-widest text-zinc-400 block mb-3">Background</span>
            <div className="flex flex-wrap gap-2">
              {BG_PRESETS.map(c => (
                <button
                  key={c}
                  onClick={() => setBgColor(c)}
                  className={`w-9 h-9 rounded-xl border-2 transition-all hover:scale-110 overflow-hidden ${
                    bgColor === c ? "border-primary scale-110 shadow-md" : "border-transparent"
                  }`}
                  style={c === "transparent" ? {} : {
                    background: c,
                    boxShadow: c === "#FFFFFF" ? "inset 0 0 0 1px #ddd" : undefined,
                  }}
                >
                  {c === "transparent" && (
                    <div className="w-full h-full" style={{
                      background: "repeating-conic-gradient(#ccc 0% 25%, white 0% 50%) 0 0 / 10px 10px",
                    }} />
                  )}
                </button>
              ))}
              <label className="w-9 h-9 rounded-xl border-2 border-dashed border-zinc-300 hover:border-primary flex items-center justify-center cursor-pointer hover:scale-110 transition-all">
                <span className="text-zinc-400 font-bold">+</span>
                <input
                  type="color"
                  defaultValue="#ffffff"
                  onChange={e => setBgColor(e.target.value)}
                  className="sr-only"
                />
              </label>
            </div>
          </div>

          {/* Shortcuts */}
          <div className="bg-white/70 rounded-xl px-4 py-2.5 border border-zinc-100">
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-zinc-400 font-medium">
              {[["Del","Delete"],["Ctrl+Z","Undo"],["Ctrl+Y","Redo"],["Ctrl+D","Duplicate"],["↑↓←→","Nudge"],["Esc","Deselect"]].map(([k,v]) => (
                <span key={k}>
                  <kbd className="bg-zinc-100 px-1.5 py-0.5 rounded text-zinc-600 font-mono text-[10px]">{k}</kbd> {v}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* ── Asset grid ── */}
        <div
          className="flex-1 bg-white rounded-2xl shadow border border-zinc-100 overflow-hidden flex flex-col"
          style={{ minHeight: 700 }}
        >
          <div className="p-4 border-b border-zinc-100 bg-zinc-50/60">
            <h3 className="font-black text-zinc-700">{catDef.label}</h3>
            <p className="text-xs text-zinc-400 mt-0.5">
              {REPLACEABLE.has(activeCat) ? "Replaces existing · " : "Layers on top · "}Click to add
            </p>
          </div>
          <div className="flex-1 overflow-y-auto p-4">
            <div className="grid grid-cols-4 gap-3">
              {thumbs.map((u, i) => (
                <Thumb
                  key={u}
                  src={u}
                  active={activeUrl === u}
                  onAdd={() => addLayer(activeCat, i + 1)}
                />
              ))}
            </div>
          </div>
          <div className="border-t border-zinc-100 px-4 py-3 bg-zinc-50/50">
            <p className="text-xs text-zinc-400 font-medium">
              Drag to move · Corner handles to resize · Top handle to rotate
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}
