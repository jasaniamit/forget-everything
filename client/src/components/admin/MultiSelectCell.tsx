import { useState, useEffect, useRef } from "react";
import { Check, X, ChevronDown, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { Font } from "@shared/schema";
import { parseArray, WEIGHT_OPTIONS } from "./schema";

export interface MultiSelectCellProps {
    fontId: number;
    colKey: keyof Font;
    value: any;
    options: string[];
    adminKey: string;
    onSaved: (fontId: number, key: keyof Font, value: any) => void;
}

export function MultiSelectCell({ fontId, colKey, value, options, adminKey, onSaved }: MultiSelectCellProps) {
    const [open, setOpen] = useState(false);
    // Weight defaults to all options if nothing is stored yet or only ["Regular"]
    const getDefault = (v: any) => {
        const arr = parseArray(v).map(x => String(x).trim());
        if (colKey === "weight") {
            // If empty or just the default ["Regular"] (case-insensitive), show all options as checked
            const isDefault = arr.length === 0 || (arr.length === 1 && arr[0].toLowerCase() === "regular");
            if (isDefault) return [...WEIGHT_OPTIONS];
        }
        return arr;
    };
    const [selected, setSelected] = useState<string[]>(() => getDefault(value));
    const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => { setSelected(getDefault(value)); }, [value]);

    // Close on outside click
    useEffect(() => {
        if (!open) return;
        const handler = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) {
                handleClose();
            }
        };
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, [open, selected]);

    const toggle = (opt: string) => {
        setSelected(prev => prev.includes(opt) ? prev.filter(x => x !== opt) : [...prev, opt]);
    };

    const handleClose = async () => {
        setOpen(false);
        const newVal = JSON.stringify(selected);
        const oldVal = JSON.stringify(parseArray(value));
        if (newVal === oldVal) return;
        setStatus("saving");
        try {
            const res = await fetch(`/api/admin/fonts/${fontId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json", "X-Admin-Key": adminKey },
                body: JSON.stringify({ [colKey]: newVal }),
            });
            if (!res.ok) throw new Error();
            const updated = await res.json();
            setStatus("saved");
            onSaved(fontId, colKey, updated[colKey]);
            setTimeout(() => setStatus("idle"), 1500);
        } catch {
            setStatus("error");
            setTimeout(() => { setStatus("idle"); setSelected(parseArray(value)); }, 2000);
        }
    };

    const bg =
        status === "saved" ? "bg-emerald-50 border-emerald-300" :
            status === "error" ? "bg-red-50 border-red-300" :
                status === "saving" ? "bg-blue-50 border-blue-200" :
                    "hover:bg-indigo-50/60 border-transparent";

    return (
        <div className="relative" ref={ref}>
            <div
                onClick={() => setOpen(o => !o)}
                className={cn(
                    "h-8 px-2 flex items-center gap-1 rounded border cursor-pointer transition-all text-[11px] group",
                    bg
                )}
            >
                {status === "saving" && <RefreshCw className="h-3 w-3 animate-spin text-blue-400 shrink-0" />}
                {status === "saved" && <Check className="h-3 w-3 text-emerald-500 shrink-0" />}
                {status === "error" && <X className="h-3 w-3 text-red-500 shrink-0" />}
                <span className={cn("flex-1 truncate", selected.length === 0 && "text-muted-foreground/30 italic", "group-hover:text-indigo-700")}>
                    {selected.length === 0 ? "—" : selected.length === 1 ? selected[0] : `${selected.length} selected`}
                </span>
                <ChevronDown className="h-3 w-3 text-slate-400 shrink-0" />
            </div>

            {open && (
                <div className="absolute z-50 top-9 left-0 w-48 bg-white border border-slate-200 rounded-xl shadow-xl py-1 max-h-60 overflow-y-auto">
                    <div className="px-2 py-1 border-b border-slate-100 flex justify-between items-center">
                        <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">
                            {selected.length} selected
                        </span>
                        {selected.length > 0 && (
                            <button
                                onClick={e => { e.stopPropagation(); setSelected([]); }}
                                className="text-[10px] text-red-400 hover:text-red-600"
                            >Clear</button>
                        )}
                    </div>
                    {options.map(opt => (
                        <label
                            key={opt}
                            className="flex items-center gap-2 px-3 py-1.5 hover:bg-indigo-50 cursor-pointer text-[11px] text-slate-700"
                            onClick={e => e.stopPropagation()}
                        >
                            <input
                                type="checkbox"
                                checked={selected.includes(opt)}
                                onChange={() => toggle(opt)}
                                className="rounded w-3.5 h-3.5 accent-indigo-600"
                            />
                            {opt}
                        </label>
                    ))}
                    <div className="border-t border-slate-100 px-2 py-1.5">
                        <button
                            onClick={() => handleClose()}
                            className="w-full h-7 bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-bold rounded-lg"
                        >
                            Save
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
