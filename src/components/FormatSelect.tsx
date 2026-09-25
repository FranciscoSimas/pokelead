"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { FormatOption } from "@/lib/formats";
import { useIsMobile } from "@/hooks/useIsMobile";
import { BottomSheet } from "./BottomSheet";

export function FormatSelect({
  formats,
  value,
  onChange,
}: {
  formats: FormatOption[];
  value: string;
  onChange: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const featured = formats.filter((f) => f.featured);
  const rest = formats.filter((f) => !f.featured);
  const current = formats.find((f) => f.id === value) ?? formats[0];
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

  function pick(id: string) {
    onChange(id);
    setOpen(false);
  }

  const list = (
    <ul className="p-1" role="listbox" aria-label="League or cup">
      {featured.length > 0 && (
        <li className="px-2 py-1.5 text-[10px] font-bold uppercase tracking-wider text-warn">
          Active this week
        </li>
      )}
      {featured.map((f) => (
        <li key={f.id} role="option" aria-selected={f.id === value}>
          <button
            type="button"
            onClick={() => pick(f.id)}
            className={`flex min-h-11 w-full items-center justify-between gap-2 rounded-field px-3 py-2.5 text-left text-sm font-semibold transition hover:bg-surface-3 ${
              f.id === value ? "bg-surface-3 text-white" : "text-fg"
            }`}
          >
            <span className="truncate">
              ★ {f.label} ({f.cp})
            </span>
            {f.id === value ? <span className="text-accent">✓</span> : null}
          </button>
        </li>
      ))}
      <li className="px-2 py-1.5 text-[10px] font-bold uppercase tracking-wider text-faint">
        All leagues and cups
      </li>
      {rest.map((f) => (
        <li key={f.id} role="option" aria-selected={f.id === value}>
          <button
            type="button"
            onClick={() => pick(f.id)}
            className={`flex min-h-11 w-full items-center justify-between gap-2 rounded-field px-3 py-2.5 text-left text-sm font-semibold transition hover:bg-surface-3 ${
              f.id === value ? "bg-surface-3 text-white" : "text-fg"
            }`}
          >
            <span className="truncate">
              {f.label} ({f.cp})
            </span>
            {f.id === value ? <span className="text-accent">✓</span> : null}
          </button>
        </li>
      ))}
    </ul>
  );

  return (
    <div ref={root} className="relative w-full max-w-sm text-left">
      <p className="label">League / Cup</p>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="listbox"
        className="field mt-1.5 flex min-h-11 items-center justify-between text-left font-semibold"
      >
        <span className="truncate">
          {current?.featured ? "★ " : ""}
          {current?.label} ({current?.cp})
        </span>
        <motion.span
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: 0.2 }}
          className="ml-2 inline-block text-faint"
        >
          ▾
        </motion.span>
      </button>

      {mobile ? (
        <BottomSheet
          open={open}
          onClose={() => setOpen(false)}
          title="League / Cup"
          labelledBy="format-sheet-title"
        >
          {list}
        </BottomSheet>
      ) : (
        <AnimatePresence>
          {open ? (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.16, ease: [0.22, 1, 0.36, 1] }}
              className="card absolute left-0 top-full z-[80] mt-1 max-h-72 w-full min-w-[16rem] overflow-auto bg-surface-2"
            >
              {list}
            </motion.div>
          ) : null}
        </AnimatePresence>
      )}
    </div>
  );
}
