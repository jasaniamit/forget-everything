/**
 * FontToolsTabs.tsx
 * Adds to FontDetail page:
 *   Tab 1 — Variable Font Playground (sliders for wght/wdth/slnt axes)
 *   Tab 2 — CSS & Tailwind Code Generator
 */

import { useState } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Copy, Check, Code2, Sliders } from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────
interface FontVariant {
  raw: string; label: string; weight: number; italic: boolean;
}
interface Font {
  id: number; name: string; family: string; category: string;
  license: string; designer: string; weight?: string;
}

// ── Variable axes definitions ─────────────────────────────────────────────────
const AXES = [
  { id: "wght", label: "Weight",  min: 100, max: 900, step: 1,   default: 400,  css: "font-weight" },
  { id: "wdth", label: "Width",   min: 50,  max: 200, step: 1,   default: 100,  css: "font-stretch" },
  { id: "slnt", label: "Slant",   min: -15, max: 15,  step: 0.5, default: 0,    css: "--slnt" },
  { id: "ital", label: "Italic",  min: 0,   max: 1,   step: 0.1, default: 0,    css: "font-style" },
  { id: "opsz", label: "Optical", min: 8,   max: 144, step: 1,   default: 14,   css: "font-optical-sizing" },
];

// ── Variable Font Playground ──────────────────────────────────────────────────
function VariablePlayground({ font, variants }: { font: Font; variants: FontVariant[] }) {
  const isVariable = variants.length > 6; // heuristic: many weights = likely variable
  const [values, setValues] = useState<Record<string, number>>({
    wght: 400, wdth: 100, slnt: 0, ital: 0, opsz: 14,
  });
  const [text, setText] = useState(`The quick brown fox jumps over the lazy dog`);
  const [size, setSize] = useState(48);

  const fontVariationSettings = Object.entries(values)
    .filter(([k]) => k !== "wght")
    .map(([k, v]) => `"${k}" ${v}`)
    .join(", ");

  const previewStyle: React.CSSProperties = {
    fontFamily: font.family,
    fontWeight: values.wght,
    fontSize: `${size}px`,
    lineHeight: 1.2,
    fontVariationSettings: fontVariationSettings || undefined,
    fontStretch: `${values.wdth}%`,
    transition: "all 0.1s ease",
  };

  return (
    <div className="space-y-8">
      {!isVariable && (
        <div className="flex items-center gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-sm">
          <span className="text-lg">⚠️</span>
          <span><strong>{font.name}</strong> may not be a variable font. Sliders still work for weight if multiple weights are available.</span>
        </div>
      )}

      {/* Live preview */}
      <div
        className="min-h-[140px] p-8 bg-gradient-to-br from-slate-50 to-white border border-border rounded-2xl flex items-center justify-center"
        contentEditable
        suppressContentEditableWarning
        onInput={e => setText(e.currentTarget.textContent || "")}
        style={previewStyle}
      >
        {text}
      </div>
      <p className="text-xs text-muted-foreground text-center -mt-4">Click to edit preview text</p>

      {/* Size slider */}
      <div className="flex items-center gap-4">
        <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground w-16">Size</span>
        <Slider
          min={12} max={120} step={1}
          value={[size]}
          onValueChange={([v]) => setSize(v)}
          className="flex-1"
        />
        <span className="text-sm font-mono w-12 text-right">{size}px</span>
      </div>

      {/* Axis sliders */}
      <div className="space-y-5">
        {AXES.map(axis => (
          <div key={axis.id} className="flex items-center gap-4">
            <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground w-16">{axis.label}</span>
            <Slider
              min={axis.min} max={axis.max} step={axis.step}
              value={[values[axis.id]]}
              onValueChange={([v]) => setValues(prev => ({ ...prev, [axis.id]: v }))}
              className="flex-1"
            />
            <span className="text-sm font-mono w-12 text-right">{values[axis.id]}</span>
          </div>
        ))}
      </div>

      {/* Generated CSS */}
      <div className="bg-slate-900 rounded-xl p-5 text-sm font-mono text-slate-300 space-y-1">
        <p className="text-slate-500 text-xs mb-3">/* Generated CSS */</p>
        <p><span className="text-blue-400">font-family</span>: <span className="text-green-300">'{font.family}'</span>;</p>
        <p><span className="text-blue-400">font-weight</span>: <span className="text-orange-300">{values.wght}</span>;</p>
        {values.wdth !== 100 && <p><span className="text-blue-400">font-stretch</span>: <span className="text-orange-300">{values.wdth}%</span>;</p>}
        {fontVariationSettings && <p><span className="text-blue-400">font-variation-settings</span>: <span className="text-orange-300">"{fontVariationSettings}"</span>;</p>}
        <p><span className="text-blue-400">font-size</span>: <span className="text-orange-300">{size}px</span>;</p>
      </div>
    </div>
  );
}

// ── CSS / Tailwind Generator ──────────────────────────────────────────────────
function CodeGenerator({ font, variants }: { font: Font; variants: FontVariant[] }) {
  const [tab, setTab] = useState<"css" | "tailwind" | "next" | "react">("css");
  const [copied, setCopied] = useState(false);

  const weights = variants.map(v => v.weight).filter((v, i, a) => a.indexOf(v) === i).sort((a, b) => a - b);
  const hasItalic = variants.some(v => v.italic);

  const weightString = weights.length > 1
    ? `wght@${weights.join(";")}`
    : `wght@${weights[0] || 400}`;

  const googleUrl = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(font.family)}:${hasItalic ? `ital,${weightString}` : weightString}&display=swap`;

  const codes: Record<string, string> = {
    css: `/* 1. Import */
@import url('${googleUrl}');

/* 2. Usage */
.heading {
  font-family: '${font.family}', ${font.category === 'serif' ? 'serif' : font.category === 'monospace' ? 'monospace' : 'sans-serif'};
  font-weight: 700;
}

.body-text {
  font-family: '${font.family}', ${font.category === 'serif' ? 'serif' : 'sans-serif'};
  font-weight: 400;
  line-height: 1.6;
}`,

    tailwind: `// tailwind.config.js
const { fontFamily } = require('tailwindcss/defaultTheme');

module.exports = {
  theme: {
    extend: {
      fontFamily: {
        '${font.family.toLowerCase().replace(/\s+/g, "-")}': [
          '${font.family}',
          ...fontFamily.${font.category === 'serif' ? 'serif' : 'sans'},
        ],
      },
    },
  },
};

// In your HTML/JSX:
// <h1 className="font-${font.family.toLowerCase().replace(/\s+/g, "-")} font-bold">
//   Your heading here
// </h1>`,

    next: `// app/layout.tsx (Next.js 13+)
import { ${font.family.replace(/\s+/g, "_")} } from 'next/font/google';

const font = ${font.family.replace(/\s+/g, "_")}({
  subsets: ['latin'],
  weight: [${weights.map(w => `'${w}'`).join(", ")}],${hasItalic ? "\n  style: ['normal', 'italic']," : ""}
  variable: '--font-${font.family.toLowerCase().replace(/\s+/g, "-")}',
});

export default function RootLayout({ children }) {
  return (
    <html className={font.variable}>
      <body>{children}</body>
    </html>
  );
}`,

    react: `// React + @fontsource (npm install @fontsource/${font.family.toLowerCase().replace(/\s+/g, "-")})
import '@fontsource/${font.family.toLowerCase().replace(/\s+/g, "-")}';

// Or with specific weights:
${weights.slice(0, 3).map(w => `import '@fontsource/${font.family.toLowerCase().replace(/\s+/g, "-")}/${w}';`).join("\n")}

// Then use in CSS:
// font-family: '${font.family}';`,
  };

  const copy = () => {
    navigator.clipboard.writeText(codes[tab]);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-4">
      {/* Sub-tabs */}
      <div className="flex gap-2 flex-wrap">
        {(["css", "tailwind", "next", "react"] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider transition-colors ${
              tab === t
                ? "bg-primary text-white"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            {t === "next" ? "Next.js" : t === "react" ? "React" : t.toUpperCase()}
          </button>
        ))}
      </div>

      {/* Code block */}
      <div className="relative">
        <pre className="bg-slate-900 text-slate-300 rounded-xl p-6 text-xs font-mono overflow-x-auto leading-relaxed whitespace-pre-wrap">
          {codes[tab]}
        </pre>
        <Button
          size="sm"
          variant="secondary"
          className="absolute top-3 right-3"
          onClick={copy}
        >
          {copied ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
          <span className="ml-1.5">{copied ? "Copied!" : "Copy"}</span>
        </Button>
      </div>

      {/* Quick reference */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Google Fonts", value: "Free" },
          { label: "Styles available", value: `${variants.length}` },
          { label: "License", value: font.license },
          { label: "Category", value: font.category },
        ].map(item => (
          <div key={item.label} className="p-3 bg-muted/30 rounded-lg border border-border/40">
            <p className="text-xs text-muted-foreground">{item.label}</p>
            <p className="font-semibold text-sm mt-0.5 truncate">{item.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Exported main component ───────────────────────────────────────────────────
export function FontToolsTabs({ font, variants }: { font: Font; variants: FontVariant[] }) {
  return (
    <section className="space-y-6 pt-12 border-t">
      <h3 className="text-2xl font-bold font-display">Font Tools</h3>
      <Tabs defaultValue="variable">
        <TabsList className="h-10">
          <TabsTrigger value="variable" className="gap-2">
            <Sliders className="h-4 w-4" /> Variable Playground
          </TabsTrigger>
          <TabsTrigger value="code" className="gap-2">
            <Code2 className="h-4 w-4" /> CSS / Code
          </TabsTrigger>
        </TabsList>
        <div className="mt-6">
          <TabsContent value="variable">
            <VariablePlayground font={font} variants={variants} />
          </TabsContent>
          <TabsContent value="code">
            <CodeGenerator font={font} variants={variants} />
          </TabsContent>
        </div>
      </Tabs>
    </section>
  );
}
