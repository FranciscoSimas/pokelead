"use client";

import { useEffect, useRef, useState } from "react";
import { TypeIcon, typeLabel } from "./TypeIcon";
import { useIsMobile } from "@/hooks/useIsMobile";
import { BottomSheet } from "./BottomSheet";

type Lookup = (id: string) => { name: string; type: string } | undefined;

export function MovePicker({
  label,
  value,
  set,
  options,
  lookup,
  eliteMoves = [],
}: {
  label: string;
  value: string;
  set: (v: string) => void;
  options: string[];
  lookup: Lookup;
  eliteMoves?: string[];
}) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const selected = value ? lookup(value) : undefined;
  const elite = new Set(eliteMoves.map((m) => m.toUpperCase()));
  const mobile = useIsMobile();

  useEffect(() => {
    if (mobile) return;
    function onDoc(e: MouseEvent) {
      if (!root.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [mobile]);

  function pick(o: string) {
    set(o);
    setOpen(false);
  }

  const list = (
    <ul className="p-1">
      {options.map((o) => {
        const m = o ? lookup(o) : undefined;
        const active = o === value;
        const isElite = o ? elite.has(o.toUpperCase()) : false;
        return (
          <li key={o || "none"}>
            <button
              type="button"
              onClick={() => pick(o)}
              className={`flex min-h-11 w-full items-center gap-2 rounded-field px-3 py-2 text-left text-sm font-semibold transition hover:bg-surface-3 ${
                active ? "bg-surface-3 text-white" : "text-fg"
              }`}
            >
              {o ? (
                <>
                  <TypeIcon type={m?.type} size={20} />
                  <span className="truncate">
                    {m?.name ?? o.replace(/_/g, " ")}
                    {isElite ? <span className="ml-1 text-warn">*</span> : null}
                  </span>
                  {isElite && (
                    <span className="text-[9px] font-bold uppercase text-warn">Elite</span>
                  )}
                  {m?.type && (
                    <span className="ml-auto text-[10px] font-bold uppercase tracking-wider text-faint">
                      {typeLabel(m.type)}
                    </span>
                  )}
                </>
              ) : (
                <span className="text-faint">No second charged</span>
              )}
            </button>
          </li>
        );
      })}
    </ul>
  );

  return (
    <div ref={root} className={`relative ${open ? "z-[80]" : "z-30"}`}>
      <p className="label">{label}</p>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="listbox"
        className="field mt-1.5 flex min-h-11 items-center gap-2 text-left font-semibold"
      >
        {value ? (
          <>
            <TypeIcon type={selected?.type} size={20} />
            <span className="truncate">
              {selected?.name ?? value.replace(/_/g, " ")}
              {elite.has(value.toUpperCase()) ? <span className="ml-1 text-warn">*</span> : null}
            </span>
            {selected?.type && (
              <span className="ml-auto text-[10px] font-bold uppercase tracking-wider text-faint">
                {typeLabel(selected.type)}
              </span>
            )}
          </>
        ) : (
          <span className="text-faint">No second charged</span>
        )}
      </button>

      {mobile ? (
        <BottomSheet open={open} onClose={() => setOpen(false)} title={label} zClass="z-[220]">
          {list}
        </BottomSheet>
      ) : (
        open && (
          <div className="card absolute left-0 right-0 z-[90] mt-1 max-h-56 w-full overflow-auto bg-surface-2">
            {list}
          </div>
        )
      )}
    </div>
  );
}
