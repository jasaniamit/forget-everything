import { useState, useEffect, useCallback } from "react";
import { Check, X, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { Font } from "@shared/schema";
import { ColType, PROP_OPTIONS } from "./schema";

export interface CellProps {
    fontId: number;
    colKey: keyof Font;
    value: any;
    type?: ColType;
    adminKey: string;
    onSaved: (fontId: number, key: keyof Font, value: any) => void;
}

export function EditableCell({ fontId, colKey, value, type, adminKey, onSaved }: CellProps) {
    const [editing, setEditing] = useState(false);
    const [draft, setDraft] = useState<string>(value ?? "");
    const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");

    useEffect(() => {
        setDraft(value ?? "");
        setStatus("idle");
    }, [value]);

    const save = useCallback(async (newVal: string) => {
        if (newVal === (value ?? "")) { setEditing(false); return; }
        setStatus("saving");
        try {
            const body: Record<string, any> = {};
            body[colKey] = type === "number" ? (newVal === "" ? null : Number(newVal)) : (newVal === "" ? null : newVal);
            const res = await fetch(`/api/admin/fonts/${fontId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json", "X-Admin-Key": adminKey },
                body: JSON.stringify(body),
            });
            if (!res.ok) throw new Error("Save failed");
            const updated = await res.json();
            setStatus("saved");
            onSaved(fontId, colKey, updated[colKey]);
            setTimeout(() => setStatus("idle"), 1500);
        } catch {
            setStatus("error");
            setTimeout(() => { setStatus("idle"); setDraft(value ?? ""); }, 2000);
        }
        setEditing(false);
    }, [fontId, colKey, value, type, adminKey, onSaved]);

    const options = PROP_OPTIONS[colKey as string] || [];

    const bg =
        status === "saved" ? "bg-emerald-50 border-emerald-300" :
            status === "error" ? "bg-red-50 border-red-300" :
                status === "saving" ? "bg-blue-50 border-blue-200" :
                    "hover:bg-indigo-50/60 border-transparent";

    if (type === "readonly") {
        return (
            <span className="h-8 px-2 flex items-center text-[11px] text-slate-600 font-medium truncate">
                {value ?? "—"}
            </span>
        );
    }

    if (editing && type === "select") {
        return (
            <div className="relative">
                <select
                    autoFocus
                    value={draft}
                    onChange={e => setDraft(e.target.value)}
                    onBlur={e => save(e.target.value)}
                    onKeyDown={e => { if (e.key === "Escape") { setEditing(false); setDraft(value ?? ""); } }}
                    className="w-full h-8 text-[11px] bg-white border border-indigo-400 rounded px-2 focus:outline-none shadow-md cursor-pointer"
                >
                    <option value="">— clear —</option>
                    {options.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
            </div>
        );
    }

    if (editing && (type === "text" || type === "number")) {
        return (
            <input
                autoFocus
                type={type === "number" ? "number" : "text"}
                value={draft}
                onChange={e => setDraft(e.target.value)}
                onBlur={e => save(e.target.value)}
                onKeyDown={e => {
                    if (e.key === "Enter") save(draft);
                    if (e.key === "Escape") { setEditing(false); setDraft(value ?? ""); }
                }}
                className="w-full h-8 text-[11px] bg-white border border-indigo-400 rounded px-2 focus:outline-none shadow-md"
            />
        );
    }

    return (
        <div
            onClick={() => setEditing(true)}
            className={cn(
                "h-8 px-2 flex items-center gap-1 rounded border cursor-pointer transition-all text-[11px] group",
                bg
            )}
            title="Click to edit"
        >
            {status === "saving" && <RefreshCw className="h-3 w-3 animate-spin text-blue-400 shrink-0" />}
            {status === "saved" && <Check className="h-3 w-3 text-emerald-500 shrink-0" />}
            {status === "error" && <X className="h-3 w-3 text-red-500 shrink-0" />}
            <span className={cn(
                "truncate",
                !draft && "text-muted-foreground/30 italic",
                status === "idle" && "group-hover:text-indigo-700"
            )}>
                {draft || "—"}
            </span>
        </div>
    );
}
