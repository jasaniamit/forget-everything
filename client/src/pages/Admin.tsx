import { useState, useEffect, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Search, LogIn, LogOut, RefreshCw, ChevronLeft, ChevronRight, Filter } from "lucide-react";
import { cn } from "@/lib/utils";
import { Font } from "@shared/schema";
import { PROP_OPTIONS, SUBSET_OPTIONS, COLUMNS } from "../components/admin/schema";
import { MultiSelectCell } from "../components/admin/MultiSelectCell";
import { EditableCell } from "../components/admin/EditableCell";
import { BulkEditBar } from "../components/admin/BulkEditBar";

export default function Admin() {
    const [adminKey, setAdminKey] = useState(() => localStorage.getItem("ukfont_admin_key") || "");
    const [keyInput, setKeyInput] = useState("");
    const [authed, setAuthed] = useState(false);
    const [authError, setAuthError] = useState("");
    const [search, setSearch] = useState("");
    const [debouncedSearch, setDebouncedSearch] = useState("");
    const [categoryFilter, setCategoryFilter] = useState("");
    const [subsetFilter, setSubsetFilter] = useState("");
    const [page, setPage] = useState(1);
    const [selected, setSelected] = useState<number[]>([]);
    const [fonts, setFonts] = useState<Font[]>([]);

    const queryClient = useQueryClient();

    // Debounce search
    useEffect(() => {
        const t = setTimeout(() => setDebouncedSearch(search), 400);
        return () => clearTimeout(t);
    }, [search]);

    // Check if stored key is valid on mount
    useEffect(() => {
        if (adminKey) {
            fetch("/api/admin/fonts?limit=1&page=1", {
                headers: { "X-Admin-Key": adminKey }
            }).then(r => {
                if (r.ok) setAuthed(true);
                else { localStorage.removeItem("ukfont_admin_key"); setAdminKey(""); }
            });
        }
    }, []);

    const params = new URLSearchParams({
        page: String(page),
        limit: "50",
        ...(debouncedSearch && { search: debouncedSearch }),
        ...(categoryFilter && { category: categoryFilter }),
        ...(subsetFilter && { subset: subsetFilter }),
    });

    const [queryError, setQueryError] = useState<string | null>(null);
    const [ingestStatus, setIngestStatus] = useState<"idle" | "running" | "done" | "error">("idle");

    const { data, isLoading, refetch } = useQuery({
        queryKey: ["/api/admin/fonts", adminKey, page, debouncedSearch, categoryFilter, subsetFilter],
        queryFn: async () => {
            setQueryError(null);
            const res = await fetch(`/api/admin/fonts?${params}`, {
                headers: { "X-Admin-Key": adminKey },
            });
            if (res.status === 401) {
                const msg = "401 Unauthorized — admin key was rejected. Try logging out and back in.";
                setQueryError(msg);
                throw new Error(msg);
            }
            if (!res.ok) {
                const msg = `Server error ${res.status}: ${await res.text().catch(() => "unknown")}`;
                setQueryError(msg);
                throw new Error(msg);
            }
            return res.json() as Promise<{ fonts: Font[]; total: number; page: number; limit: number }>;
        },
        enabled: authed && !!adminKey,
        retry: false,
    });

    useEffect(() => {
        if (data?.fonts) setFonts(data.fonts);
    }, [data]);

    // Compute missing-property stats
    const missingWeight = fonts.filter(f => !f.weight || f.weight === "[]" || f.weight === "null").length;
    const missingUseCase = fonts.filter(f => !f.useCase || f.useCase === "[]" || f.useCase === "null").length;

    // Optimistic local update so the row shows new value immediately
    const handleSaved = useCallback((fontId: number, key: keyof Font, value: any) => {
        setFonts(prev => prev.map(f => f.id === fontId ? { ...f, [key]: value } : f));
    }, []);

    const handleLogin = async () => {
        setAuthError("");
        const res = await fetch("/api/admin/fonts?limit=1&page=1", {
            headers: { "X-Admin-Key": keyInput }
        });
        if (res.ok) {
            localStorage.setItem("ukfont_admin_key", keyInput);
            setAdminKey(keyInput);
            setAuthed(true);
        } else {
            setAuthError("Invalid admin key. Check your .env ADMIN_API_KEY.");
        }
    };

    const handleLogout = () => {
        localStorage.removeItem("ukfont_admin_key");
        setAdminKey("");
        setAuthed(false);
        setKeyInput("");
    };

    const totalPages = data ? Math.ceil(data.total / data.limit) : 1;

    const toggleSelect = (id: number) =>
        setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

    const toggleAll = () =>
        setSelected(prev => prev.length === fonts.length ? [] : fonts.map(f => f.id));

    // ── Login Gate ──────────────────────────────────────────────────────────────
    if (!authed) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 flex items-center justify-center p-4">
                <div className="w-full max-w-sm bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-8 space-y-6 shadow-2xl">
                    <div className="text-center space-y-2">
                        <div className="text-4xl font-black text-white tracking-tight">Admin</div>
                        <div className="text-indigo-300/70 text-sm">ukfont Font Manager</div>
                    </div>

                    <div className="space-y-3">
                        <input
                            type="password"
                            placeholder="Enter ADMIN_API_KEY…"
                            value={keyInput}
                            onChange={e => setKeyInput(e.target.value)}
                            onKeyDown={e => e.key === "Enter" && handleLogin()}
                            className="w-full h-12 rounded-xl bg-white/10 border border-white/20 text-white placeholder-white/30 px-4 focus:outline-none focus:border-indigo-400 transition-colors"
                        />
                        {authError && (
                            <p className="text-red-400 text-xs font-medium px-1">{authError}</p>
                        )}
                        <button
                            onClick={handleLogin}
                            className="w-full h-12 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold tracking-wide transition-colors flex items-center justify-center gap-2"
                        >
                            <LogIn className="h-4 w-4" />
                            Enter Admin Panel
                        </button>
                    </div>

                    <p className="text-center text-white/20 text-[10px] uppercase tracking-widest">
                        Key is stored in your .env file
                    </p>
                </div>
            </div>
        );
    }

    // ── Main Admin UI ───────────────────────────────────────────────────────────
    return (
        <div className="min-h-screen bg-slate-50 flex flex-col">
            {/* Top Bar */}
            <header className="sticky top-0 z-40 bg-white border-b border-slate-200 shadow-sm px-6 py-3 flex items-center gap-4">
                <div className="font-black text-slate-800 text-lg tracking-tight mr-2">
                    ukfont <span className="text-indigo-500">Admin</span>
                </div>

                <div className="flex-1 relative max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input
                        value={search}
                        onChange={e => { setSearch(e.target.value); setPage(1); }}
                        placeholder="Search fonts…"
                        className="w-full h-9 pl-9 pr-4 rounded-xl bg-slate-100 border-transparent border text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                    />
                </div>

                <div className="flex items-center gap-2">
                    <Filter className="h-4 w-4 text-slate-400" />
                    <select
                        value={categoryFilter}
                        onChange={e => { setCategoryFilter(e.target.value); setPage(1); }}
                        className="h-9 rounded-xl bg-slate-100 border-transparent border text-sm px-3 focus:outline-none"
                    >
                        <option value="">All Categories</option>
                        {PROP_OPTIONS.category.map((c: string) => {
                            const label = c.split('-').map((word: string) => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
                            return <option key={c} value={c}>{label}</option>
                        })}
                    </select>

                    <Filter className="h-4 w-4 text-slate-400 ml-2" />
                    <select
                        value={subsetFilter}
                        onChange={e => { setSubsetFilter(e.target.value); setPage(1); }}
                        className="h-9 rounded-xl bg-slate-100 border-transparent border text-sm px-3 focus:outline-none"
                    >
                        <option value="">All Languages</option>
                        {SUBSET_OPTIONS.map((s: string) => {
                            const label = s.split('-').map((word: string) => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
                            return <option key={s} value={s}>{label}</option>
                        })}
                    </select>
                </div>

                {/* Missing property indicators */}
                {
                    (missingWeight > 0 || missingUseCase > 0) && (
                        <div className="flex items-center gap-2 ml-2">
                            {missingWeight > 0 && (
                                <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 text-[10px] font-bold whitespace-nowrap">
                                    {missingWeight} missing weight
                                </span>
                            )}
                            {missingUseCase > 0 && (
                                <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 text-[10px] font-bold whitespace-nowrap">
                                    {missingUseCase} missing useCase
                                </span>
                            )}
                        </div>
                    )
                }

                <div className="ml-auto flex items-center gap-3">
                    <span className="text-xs text-slate-500">
                        {data?.total ?? 0} fonts
                    </span>
                    <button
                        onClick={async () => {
                            if (!confirm("This will normalize all categories to lowercase slugs (e.g., 'Sans Serif' -> 'sans-serif'). Proceed?")) return;
                            setIngestStatus("running");
                            try {
                                const res = await fetch("/api/admin/fonts/migrate-categories", {
                                    method: "POST",
                                    headers: { "X-Admin-Key": adminKey }
                                });
                                const data = await res.json();
                                setIngestStatus("done");
                                alert(data.message);
                                refetch();
                            } catch (err) {
                                setIngestStatus("error");
                                alert("Repair failed");
                            }
                        }}
                        disabled={ingestStatus === "running"}
                        className="h-9 px-4 rounded-xl border border-slate-200 bg-white text-slate-600 text-[11px] font-bold hover:bg-slate-50 transition-colors flex items-center gap-2"
                        title="Fix category naming mismatch"
                    >
                        <RefreshCw className={cn("h-3 w-3", ingestStatus === "running" && "animate-spin")} />
                        Repair Categories
                    </button>
                    <button
                        onClick={() => refetch()}
                        className="h-9 w-9 rounded-xl bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-colors"
                        title="Refresh"
                    >
                        <RefreshCw className="h-4 w-4 text-slate-500" />
                    </button>
                    <button
                        onClick={handleLogout}
                        className="h-9 px-4 rounded-xl bg-red-50 text-red-500 hover:bg-red-100 text-xs font-bold flex items-center gap-2 transition-colors"
                    >
                        <LogOut className="h-3.5 w-3.5" />
                        Logout
                    </button>
                </div>
            </header >

            {/* Bulk Edit Bar */}
            {
                selected.length > 0 && (
                    <div className="sticky top-[57px] z-30 px-6 py-2 bg-white border-b border-indigo-100">
                        <BulkEditBar
                            selected={selected}
                            adminKey={adminKey}
                            onDone={() => { setSelected([]); refetch(); }}
                        />
                    </div>
                )
            }

            {/* Table */}
            <main className="flex-1 overflow-auto px-4 pb-8">
                {isLoading ? (
                    <div className="flex items-center justify-center py-32 text-slate-400 gap-3">
                        <RefreshCw className="h-5 w-5 animate-spin" />
                        <span className="text-sm font-medium">Loading fonts…</span>
                    </div>
                ) : queryError ? (
                    <div className="flex flex-col items-center justify-center py-24 gap-4">
                        <div className="bg-red-50 border border-red-200 rounded-2xl p-6 max-w-lg text-center space-y-3">
                            <p className="text-red-600 font-bold text-sm">API Error</p>
                            <p className="text-red-500 text-xs font-mono break-all">{queryError}</p>
                            <button onClick={() => { setQueryError(null); refetch(); }}
                                className="mt-2 h-8 px-6 rounded-lg bg-red-600 text-white text-xs font-bold hover:bg-red-700">
                                Retry
                            </button>
                        </div>
                    </div>
                ) : fonts.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-24 gap-4 text-slate-400">
                        <p className="text-sm font-medium">No fonts found in database.</p>
                        <p className="text-xs text-slate-300">The database may be empty. Trigger Google Fonts import to populate it.</p>
                        <button
                            onClick={async () => {
                                setIngestStatus("running");
                                try {
                                    const r = await fetch("/api/admin/fonts/fetch-google", {
                                        method: "POST",
                                        headers: { "X-Admin-Key": adminKey }
                                    });
                                    if (r.ok) { setIngestStatus("done"); setTimeout(() => { setIngestStatus("idle"); refetch(); }, 5000); }
                                    else setIngestStatus("error");
                                } catch { setIngestStatus("error"); }
                            }}
                            disabled={ingestStatus === "running"}
                            className={cn(
                                "h-9 px-6 rounded-xl text-xs font-bold transition-all",
                                ingestStatus === "done" ? "bg-emerald-500 text-white" :
                                    ingestStatus === "error" ? "bg-red-500 text-white" :
                                        ingestStatus === "running" ? "bg-indigo-300 text-white" :
                                            "bg-indigo-600 text-white hover:bg-indigo-700"
                            )}
                        >
                            {ingestStatus === "running" ? "⏳ Importing from Google Fonts…" :
                                ingestStatus === "done" ? "✓ Import started — wait 30s, then Refresh" :
                                    ingestStatus === "error" ? "Error — check server logs" :
                                        "⬇ Import Google Fonts Now"}
                        </button>
                        <button onClick={() => refetch()} className="text-xs text-slate-400 underline hover:text-slate-600">Refresh table</button>
                        <AutoTagButton adminKey={adminKey} onDone={() => refetch()} />
                        <GeometryAnalyzerButton adminKey={adminKey} />
                    </div>
                ) : (
                    <div className="overflow-x-auto mt-4 rounded-2xl border border-slate-200 shadow-sm bg-white">
                        <table className="text-sm border-collapse" style={{ minWidth: "2200px" }}>
                            <thead>
                                <tr className="bg-slate-50 border-b border-slate-200">
                                    <th className="sticky left-0 z-10 bg-slate-50 px-3 py-3 w-10">
                                        <input
                                            type="checkbox"
                                            checked={selected.length === fonts.length && fonts.length > 0}
                                            onChange={toggleAll}
                                            className="rounded"
                                        />
                                    </th>
                                    <th className="px-3 py-3 text-left text-[10px] font-black uppercase tracking-widest text-slate-400 w-12">#</th>
                                    {COLUMNS.map(col => (
                                        <th
                                            key={col.key}
                                            style={{ minWidth: col.width }}
                                            className="px-2 py-3 text-left text-[10px] font-black uppercase tracking-widest text-slate-400 whitespace-nowrap"
                                        >
                                            {col.label}
                                            {col.editable && <span className="ml-1 text-indigo-300">✎</span>}
                                            {col.type === "multiselect" && <span className="ml-1 text-purple-300 text-[8px]">[]</span>}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {fonts.map((font, idx) => (
                                    <tr
                                        key={font.id}
                                        className={cn(
                                            "border-b border-slate-100 transition-colors",
                                            selected.includes(font.id) ? "bg-indigo-50/60" : "hover:bg-slate-50/80"
                                        )}
                                    >
                                        {/* Checkbox */}
                                        <td className="sticky left-0 z-10 bg-inherit px-3 py-1.5">
                                            <input
                                                type="checkbox"
                                                checked={selected.includes(font.id)}
                                                onChange={() => toggleSelect(font.id)}
                                                className="rounded"
                                            />
                                        </td>

                                        {/* Row number */}
                                        <td className="px-3 py-1.5 text-[10px] text-slate-400 font-mono">
                                            {(page - 1) * 50 + idx + 1}
                                        </td>

                                        {/* All property columns */}
                                        {COLUMNS.map(col => (
                                            <td key={col.key} className="px-2 py-1.5" style={{ minWidth: col.width }}>
                                                {col.type === "multiselect" ? (
                                                    <MultiSelectCell
                                                        fontId={font.id}
                                                        colKey={col.key}
                                                        value={(font as any)[col.key]}
                                                        options={PROP_OPTIONS[col.key as string] || []}
                                                        adminKey={adminKey}
                                                        onSaved={handleSaved}
                                                    />
                                                ) : col.editable ? (
                                                    <EditableCell
                                                        fontId={font.id}
                                                        colKey={col.key}
                                                        value={(font as any)[col.key]}
                                                        type={col.type}
                                                        adminKey={adminKey}
                                                        onSaved={handleSaved}
                                                    />
                                                ) : (
                                                    <span className="text-[11px] text-slate-500 px-2">
                                                        {(font as any)[col.key] ?? "—"}
                                                    </span>
                                                )}
                                            </td>
                                        ))}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* Pagination */}
                {!isLoading && totalPages > 1 && (
                    <div className="flex items-center justify-center gap-4 pt-6">
                        <button
                            onClick={() => setPage(p => Math.max(1, p - 1))}
                            disabled={page <= 1}
                            className="h-9 px-4 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 disabled:opacity-40 flex items-center gap-2 text-sm font-medium transition-colors"
                        >
                            <ChevronLeft className="h-4 w-4" />
                            Prev
                        </button>
                        <span className="text-sm text-slate-500 font-medium">
                            Page {page} of {totalPages} ({data?.total} total)
                        </span>
                        <button
                            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                            disabled={page >= totalPages}
                            className="h-9 px-4 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 disabled:opacity-40 flex items-center gap-2 text-sm font-medium transition-colors"
                        >
                            Next
                            <ChevronRight className="h-4 w-4" />
                        </button>
                    </div>
                )}
            </main>
        </div >
    );
}


function AutoTagButton({ adminKey, onDone }: { adminKey: string; onDone: () => void }) {
    const [status, setStatus] = useState<"idle" | "running" | "done" | "error">("idle");
    const [result, setResult] = useState<string>("");

    const run = async () => {
        if (!confirm("This will re-tag all fonts in the database with smart property inference.\n\nThis may take 30-60 seconds. Continue?")) return;
        setStatus("running");
        try {
            const r = await fetch("/api/admin/fonts/auto-tag", {
                method: "POST",
                headers: { "X-Admin-Key": adminKey }
            });
            const data = await r.json();
            if (r.ok) {
                setStatus("done");
                setResult(`✓ Tagged ${data.updated} fonts`);
                setTimeout(() => { setStatus("idle"); onDone(); }, 4000);
            } else {
                setStatus("error");
                setResult(data.message || "Error");
            }
        } catch (e: any) {
            setStatus("error");
            setResult(e.message);
        }
    };

    return (
        <button
            onClick={run}
            disabled={status === "running"}
            className={cn(
                "h-9 px-6 rounded-xl text-xs font-bold transition-all",
                status === "done" ? "bg-emerald-500 text-white" :
                status === "error" ? "bg-red-500 text-white" :
                status === "running" ? "bg-amber-400 text-white" :
                "bg-amber-600 text-white hover:bg-amber-700"
            )}
            title="Re-tag all fonts with weight, contrast, x-height, a-story, g-story etc."
        >
            {status === "running" ? "⏳ Auto-tagging fonts…" :
             status === "done" ? result :
             status === "error" ? `Error: ${result}` :
             "🏷 Auto-Tag All Fonts"}
        </button>
    );
}


function GeometryAnalyzerButton({ adminKey }: { adminKey: string }) {
    const [open, setOpen] = useState(false);
    const [limit, setLimit] = useState(50);
    const [force, setForce] = useState(false);
    const [running, setRunning] = useState(false);
    const [rows, setRows] = useState<any[]>([]);
    const [summary, setSummary] = useState<{ ok: number; failed: number; total: number } | null>(null);

    const run = async () => {
        setRunning(true);
        setRows([]);
        setSummary(null);

        try {
            const resp = await fetch("/api/admin/fonts/analyze-geometry", {
                method: "POST",
                headers: { "X-Admin-Key": adminKey, "Content-Type": "application/json" },
                body: JSON.stringify({ limit, force }),
            });

            if (!resp.body) { setRunning(false); return; }

            const reader = resp.body.getReader();
            const decoder = new TextDecoder();
            let buf = "";

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                buf += decoder.decode(value);
                const lines = buf.split("\n");
                buf = lines.pop() ?? "";
                for (const line of lines) {
                    if (!line.startsWith("data: ")) continue;
                    try {
                        const evt = JSON.parse(line.slice(6));
                        if (evt.type === "progress") {
                            setRows(prev => [evt, ...prev].slice(0, 300));
                        } else if (evt.type === "done") {
                            setSummary({ ok: evt.ok, failed: evt.failed, total: evt.total });
                            setRunning(false);
                        }
                    } catch {}
                }
            }
        } catch (e) {
            setRunning(false);
        }
    };

    const statusColor = (s: string) =>
        s === "ok" ? "text-emerald-600" : s === "skip" ? "text-amber-500" : "text-red-500";

    const MEASURES = [
        ["🔡 x-Height", "Measures xHeight/capHeight ratio from OS/2 table or 'x' glyph bounding box. Low <0.52, Medium 0.52–0.68, High >0.68"],
        ["◎ Contrast",  "Samples O glyph inner/outer contour distances. maxStroke÷minStroke. Low <1.6x, Medium 1.6–2.8x, High >2.8x"],
        ["↔ Width",     "Avg advance width of A–Z ÷ unitsPerEm. Condensed <0.48, Normal 0.48–0.68, Expanded >0.68"],
        ["Aa Case",     "Compares 'a' glyph height vs 'A' — if same height, font is Caps Only (Bebas, Trajan, Cinzel)"],
        ["a ɑ a-Story", "Counts closed contours in 'a' — 2 contours = double-story, 1 = single-story"],
        ["g ɡ g-Story", "Counts closed contours in 'g' — 2+ contours = looptail (double), 1 = opentail (single)"],
    ];

    return (
        <>
            <button onClick={() => setOpen(true)}
                className="h-9 px-6 rounded-xl text-xs font-bold bg-violet-600 text-white hover:bg-violet-700 transition-all">
                🔬 Geometry Analyzer
            </button>

            {open && (
                <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={(e) => { if (e.target === e.currentTarget) setOpen(false); }}>
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col">

                        {/* Header */}
                        <div className="flex items-center justify-between px-6 py-4 border-b shrink-0">
                            <div>
                                <h2 className="text-lg font-black text-slate-800">🔬 Font Geometry Analyzer</h2>
                                <p className="text-xs text-slate-400 mt-0.5">Downloads each font file and measures real glyph geometry — no guessing, pure math.</p>
                            </div>
                            <button onClick={() => setOpen(false)} className="text-slate-400 hover:text-slate-700 text-2xl leading-none">&times;</button>
                        </div>

                        {/* Controls */}
                        <div className="px-6 py-3 border-b bg-slate-50 flex flex-wrap items-center gap-4 shrink-0">
                            <div className="flex items-center gap-2">
                                <label className="text-xs font-bold text-slate-600">Batch:</label>
                                <select value={limit} onChange={e => setLimit(Number(e.target.value))}
                                    className="border rounded-lg px-2 py-1 text-xs font-medium bg-white">
                                    {[10, 50, 100, 500, 9999].map(n => (
                                        <option key={n} value={n}>{n === 9999 ? "All fonts" : `${n} fonts`}</option>
                                    ))}
                                </select>
                            </div>
                            <label className="flex items-center gap-2 text-xs font-medium text-slate-600 cursor-pointer select-none">
                                <input type="checkbox" checked={force} onChange={e => setForce(e.target.checked)} className="rounded" />
                                Re-analyze already tagged fonts
                            </label>
                            <button onClick={run} disabled={running}
                                className={cn("ml-auto h-9 px-8 rounded-xl text-xs font-bold transition-all",
                                    running ? "bg-violet-300 text-white cursor-not-allowed" : "bg-violet-600 text-white hover:bg-violet-700")}>
                                {running ? "⏳ Analyzing…" : "▶ Run Analysis"}
                            </button>
                        </div>

                        {/* Body */}
                        <div className="flex-1 overflow-auto">
                            {/* What it measures — shown before run */}
                            {rows.length === 0 && !running && (
                                <div className="p-6 grid grid-cols-2 sm:grid-cols-3 gap-3">
                                    {MEASURES.map(([title, desc]) => (
                                        <div key={title} className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                                            <p className="text-[11px] font-black text-slate-700 mb-1">{title}</p>
                                            <p className="text-[10px] text-slate-400 leading-relaxed">{desc}</p>
                                        </div>
                                    ))}
                                    <div className="col-span-full bg-amber-50 border border-amber-200 rounded-xl p-3 text-[11px] text-amber-700">
                                        <strong>Note:</strong> Each font file is downloaded from Google Fonts CDN (~20–100KB each).
                                        A batch of 100 fonts takes ~15–30 seconds. Start with 50 to test.
                                    </div>
                                </div>
                            )}

                            {/* Spinner before first result */}
                            {running && rows.length === 0 && (
                                <div className="flex flex-col items-center justify-center py-20 text-slate-400 gap-3">
                                    <div className="text-4xl animate-spin">⚙</div>
                                    <p className="text-xs font-medium">Downloading font files and measuring geometry…</p>
                                </div>
                            )}

                            {/* Live results table */}
                            {rows.length > 0 && (
                                <div className="p-4">
                                    {summary && (
                                        <div className="flex gap-4 text-xs font-bold mb-3 px-1">
                                            <span className="text-emerald-600">✓ {summary.ok} analyzed</span>
                                            <span className="text-red-500">✗ {summary.failed} failed</span>
                                            <span className="text-slate-400">of {summary.total} total</span>
                                            <span className="text-violet-600 ml-auto">✅ Complete — refresh table to see changes</span>
                                        </div>
                                    )}
                                    {running && (
                                        <div className="text-xs text-violet-500 font-medium mb-3 animate-pulse px-1">
                                            ⏳ Analyzing… {rows.length} processed so far
                                        </div>
                                    )}
                                    <table className="w-full text-[11px] border-collapse">
                                        <thead>
                                            <tr className="text-left text-slate-400 font-black text-[10px] uppercase tracking-wider border-b">
                                                <th className="pb-2 pr-3">#</th>
                                                <th className="pb-2 pr-3">Font</th>
                                                <th className="pb-2 pr-3">x-Height</th>
                                                <th className="pb-2 pr-3">Contrast</th>
                                                <th className="pb-2 pr-3">Width</th>
                                                <th className="pb-2 pr-3">Case</th>
                                                <th className="pb-2 pr-3">a-story</th>
                                                <th className="pb-2">g-story</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {rows.map((r, idx) => (
                                                <tr key={idx} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                                                    <td className="py-1.5 pr-3 text-slate-300 font-mono">{r.i}</td>
                                                    <td className="py-1.5 pr-3 font-semibold text-slate-700">{r.name}</td>
                                                    <td className={cn("py-1.5 pr-3 font-medium", statusColor(r.status))}>
                                                        {r.status === "ok" ? (
                                                            <span>{r.xHeight} <span className="text-slate-300 font-normal">({r.raw?.xHeightRatio})</span></span>
                                                        ) : <span className="text-amber-500">{r.msg?.slice(0,25) ?? r.status}</span>}
                                                    </td>
                                                    <td className="py-1.5 pr-3 font-medium text-slate-600">
                                                        {r.status === "ok" && <span>{r.contrast} <span className="text-slate-300">({r.raw?.contrastRatio}x)</span></span>}
                                                    </td>
                                                    <td className="py-1.5 pr-3 font-medium text-slate-600">
                                                        {r.status === "ok" && <span>{r.width} <span className="text-slate-300">({r.raw?.widthRatio})</span></span>}
                                                    </td>
                                                    <td className="py-1.5 pr-3 text-slate-500">{r.caps ?? ""}</td>
                                                    <td className="py-1.5 pr-3 text-slate-500">{r.aStory ?? ""}</td>
                                                    <td className="py-1.5 text-slate-500">{r.gStory ?? ""}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}

