import { useState } from "react";
import { cn } from "@/lib/utils";
import { PROP_OPTIONS, MULTI_VALUE_FIELDS, COLUMNS } from "./schema";

export function BulkEditBar({
    selected, adminKey, onDone,
}: { selected: number[]; adminKey: string; onDone: () => void }) {
    const [field, setField] = useState("");
    const [value, setValue] = useState("");
    const [status, setStatus] = useState<"idle" | "saving" | "done" | "error">("idle");

    const apply = async () => {
        if (!field || !value || selected.length === 0) return;
        setStatus("saving");
        try {
            // For multi-value fields wrap in array if not already JSON
            let finalValue: string = value;
            if (MULTI_VALUE_FIELDS.has(field)) {
                finalValue = JSON.stringify([value]);
            }
            await Promise.all(selected.map(id =>
                fetch(`/api/admin/fonts/${id}`, {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json", "X-Admin-Key": adminKey },
                    body: JSON.stringify({ [field]: finalValue }),
                })
            ));
            setStatus("done");
            setTimeout(() => { setStatus("idle"); onDone(); }, 1500);
        } catch {
            setStatus("error");
            setTimeout(() => setStatus("idle"), 2000);
        }
    };

    const options = PROP_OPTIONS[field] || [];

    return (
        <div className="flex items-center gap-3 p-3 bg-indigo-50 border border-indigo-200 rounded-xl text-sm">
            <span className="font-bold text-indigo-700 text-[12px] whitespace-nowrap">
                {selected.length} selected —
            </span>
            <select
                value={field}
                onChange={e => { setField(e.target.value); setValue(""); }}
                className="h-8 border border-indigo-300 rounded-lg px-2 text-[11px] bg-white focus:outline-none"
            >
                <option value="">Pick property…</option>
                {Object.keys(PROP_OPTIONS).filter(k => !["name", "family"].includes(k)).map(k => (
                    <option key={k} value={k}>{COLUMNS.find(c => c.key === k)?.label || k}</option>
                ))}
            </select>

            {field && (
                <select
                    value={value}
                    onChange={e => setValue(e.target.value)}
                    className="h-8 border border-indigo-300 rounded-lg px-2 text-[11px] bg-white focus:outline-none"
                >
                    <option value="">Pick value…</option>
                    {options.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
            )}

            {MULTI_VALUE_FIELDS.has(field) && value && (
                <span className="text-[10px] text-indigo-500 italic">will set as single-item array</span>
            )}

            <button
                onClick={apply}
                disabled={!field || !value || status === "saving"}
                className={cn(
                    "h-8 px-4 rounded-lg text-[11px] font-bold transition-all",
                    status === "done" ? "bg-emerald-500 text-white" :
                        status === "error" ? "bg-red-500 text-white" :
                            "bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-40"
                )}
            >
                {status === "saving" ? "Saving..." : status === "done" ? "✓ Done!" : status === "error" ? "Error" : "Apply to All"}
            </button>
        </div>
    );
}
