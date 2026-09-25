"use client";

import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";

export function BottomSheet({
  open,
  onClose,
  title,
  subtitle,
  labelledBy = "sheet-title",
  zClass = "z-[200]",
  size = "default",
  children,
}: {
  open: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  labelledBy?: string;
  zClass?: string;
  /** large = taller + wider picker sheets (Teams / Analyze / Compare). */
  size?: "default" | "large";
  children: ReactNode;
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  const panelClass =
    size === "large"
      ? "card flex max-h-[94vh] w-full max-w-3xl flex-col overflow-hidden rounded-b-none sm:max-h-[92vh] sm:rounded-card"
      : "card flex max-h-[88vh] w-full max-w-lg flex-col overflow-hidden rounded-b-none sm:max-h-[80vh] sm:rounded-card";

  const node = (
    <AnimatePresence>
      {open ? (
        <motion.div
          key="sheet"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className={`fixed inset-0 ${zClass} flex items-end justify-center bg-black/65 backdrop-blur-[2px] sm:items-center sm:p-4`}
          onClick={onClose}
          role="presentation"
        >
          <motion.div
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 24, opacity: 0 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            role="dialog"
            aria-modal="true"
            aria-labelledby={title ? labelledBy : undefined}
            className={panelClass}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mx-auto mt-2 h-1 w-10 shrink-0 rounded-full bg-white/20 sm:hidden" />
            {title ? (
              <div className="flex shrink-0 items-start justify-between gap-3 border-b border-line px-4 py-3">
                <div>
                  <p id={labelledBy} className="text-base font-bold text-white">
                    {title}
                  </p>
                  {subtitle ? <p className="mt-0.5 text-xs text-muted">{subtitle}</p> : null}
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  className="min-h-11 rounded-full px-3 py-2 text-sm font-semibold text-muted hover:bg-surface-2 hover:text-white"
                >
                  Close
                </button>
              </div>
            ) : null}
            <div className="min-h-0 flex-1 overflow-auto">{children}</div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );

  if (!mounted) return null;
  return createPortal(node, document.body);
}
