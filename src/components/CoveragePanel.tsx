"use client";

import { useCallback, useEffect, useRef, useState, type PointerEvent } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import type { TeamCoverage, TeamTypeTag } from "@/lib/coverage";
import { fmtMult, GO_DOUBLE_SE, GO_IMMUNE, GO_NVE, GO_SE } from "@/lib/coverage";
import { TypeIcon, typeLabel } from "./TypeIcon";

type Kind = "se" | "weak" | "resist";

export function CoveragePanel({
  coverage,
  defaultOpen = false,
}: {
  coverage: TeamCoverage;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);

  const tone =
    coverage.score >= 84
      ? "border-emerald-400/35 bg-emerald-500/10"
      : coverage.score >= 64
        ? "border-sky-400/30 bg-sky-500/10"
        : coverage.score >= 50
          ? "border-amber-400/30 bg-amber-500/10"
          : "border-rose-400/30 bg-rose-500/10";

  const gradeTone =
    coverage.score >= 84
      ? "bg-emerald-400/20 text-emerald-100"
      : coverage.score >= 64
        ? "bg-sky-400/20 text-sky-50"
        : coverage.score >= 50
          ? "bg-amber-400/20 text-amber-100"
          : "bg-rose-400/20 text-rose-100";

  const hitsSe = coverage.hitsSe ?? [];
  const weaknesses = coverage.teamWeaknesses ?? [];
  const resists = coverage.teamResists ?? [];
  const chargedAdvice = coverage.chargedAdvice ?? [];
  const extra = coverage.extraNotes ?? coverage.notes ?? [];

  return (
    <div className={`mt-3 overflow-hidden rounded-2xl border ${tone}`}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-2 px-2.5 py-2 text-left transition hover:bg-white/5 sm:px-3"
      >
        <span className="flex min-w-0 items-center gap-2">
          <span
            className={`grid h-6 w-7 shrink-0 place-items-center rounded-lg text-[11px] font-black ${gradeTone}`}
          >
            {coverage.grade}
          </span>
          <span className="truncate text-[10px] font-bold uppercase tracking-widest text-muted">
            Coverage
          </span>
        </span>
        <span className="flex shrink-0 items-center gap-1.5 text-xs font-bold text-white sm:gap-2 sm:text-sm">
          <span className="tabular-nums">{coverage.score}</span>
          <span className="text-faint">·</span>
          <span className="font-semibold text-muted">
            {coverage.dualCharged}/3
            <span className="hidden sm:inline"> dual charged</span>
            <span className="sm:hidden"> CM</span>
          </span>
          <motion.span
            animate={{ rotate: open ? 180 : 0 }}
            transition={{ duration: 0.2 }}
            className="inline-block text-faint"
          >
            ▾
          </motion.span>
        </span>
      </button>

      <AnimatePresence initial={false}>
        {open ? (
          <motion.div
            key="body"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            <div className="space-y-2.5 border-t border-line px-2.5 py-2.5 sm:px-3 sm:py-3">
              <TypeRow
                label="Hits SE"
                tags={hitsSe}
                kind="se"
                empty="No super effective moves yet."
              />
              <TypeRow
                label="Weakness"
                tags={weaknesses}
                kind="weak"
                empty="Nothing hits this team super effective."
              />
              <TypeRow label="Resists" tags={resists} kind="resist" empty="No resists yet." />

              {chargedAdvice.length > 0 ? (
                <section className="rounded-xl border-l-2 border-sky-300/40 bg-black/20 px-2.5 py-2">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-muted">
                    Charged Moves
                  </p>
                  <ul className="mt-1 space-y-1">
                    {chargedAdvice.map((n) => (
                      <li key={n} className="text-[11px] leading-snug text-muted sm:text-xs">
                        {n}
                      </li>
                    ))}
                  </ul>
                </section>
              ) : null}

              {extra.length > 0 ? (
                <section className="rounded-xl border-l-2 border-line-strong bg-black/20 px-2.5 py-2">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-muted">
                    Extra
                  </p>
                  {extra.map((n) => (
                    <p key={n} className="mt-1 text-[11px] leading-snug text-muted sm:text-xs">
                      {n}
                    </p>
                  ))}
                </section>
              ) : null}
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

function tooltipMembers(tag: TeamTypeTag, kind: Kind) {
  return tag.members.filter((m) => {
    if (Math.abs(m.multiplier - 1) < 0.02) return false;
    if (kind === "resist") return m.multiplier <= GO_NVE + 0.01;
    return m.multiplier >= GO_SE - 0.01;
  });
}

function isHot(multiplier: number, kind: Kind) {
  return kind === "resist"
    ? multiplier <= GO_IMMUNE + 0.01
    : multiplier >= GO_DOUBLE_SE - 0.01;
}

function TypeRow({
  label,
  tags,
  kind,
  empty,
}: {
  label: string;
  tags: TeamTypeTag[];
  kind: Kind;
  empty: string;
}) {
  return (
    <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:gap-3">
      <p className="text-[10px] font-bold uppercase tracking-widest text-muted sm:w-20 sm:shrink-0 sm:pt-1">
        {label}
      </p>
      {tags.length ? (
        <div className="flex flex-wrap items-center gap-1.5">
          {tags.map((t) => (
            <TypeBadge key={`${kind}-${t.type}`} tag={t} kind={kind} />
          ))}
        </div>
      ) : (
        <p className="text-[11px] text-faint sm:text-xs">{empty}</p>
      )}
    </div>
  );
}

function TypeBadge({ tag, kind }: { tag: TeamTypeTag; kind: Kind }) {
  const [tip, setTip] = useState<{ left: number; top: number; below: boolean } | null>(null);
  const ref = useRef<HTMLButtonElement>(null);

  const highlight = tag.members.some((m) => isHot(m.multiplier, kind));
  const ring =
    kind === "resist"
      ? "ring-2 ring-emerald-300"
      : kind === "weak"
        ? "ring-2 ring-rose-300"
        : "ring-2 ring-amber-300";

  const place = useCallback(() => {
    const r = ref.current?.getBoundingClientRect();
    if (!r) return;
    const half = 96;
    const left = Math.min(Math.max(r.left + r.width / 2, half + 8), window.innerWidth - half - 8);
    const below = r.top < 150;
    setTip({ left, top: below ? r.bottom + 8 : r.top - 8, below });
  }, []);

  useEffect(() => {
    if (!tip) return;
    const close = () => setTip(null);
    function onDown(e: globalThis.PointerEvent) {
      if (ref.current?.contains(e.target as Node)) return;
      setTip(null);
    }
    document.addEventListener("pointerdown", onDown);
    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", close);
    };
  }, [tip]);

  const rows = tooltipMembers(tag, kind);

  return (
    <>
      <button
        ref={ref}
        type="button"
        aria-label={`${typeLabel(tag.type)} details`}
        onPointerEnter={(e: PointerEvent<HTMLButtonElement>) => {
          if (e.pointerType === "mouse") place();
        }}
        onPointerLeave={(e: PointerEvent<HTMLButtonElement>) => {
          if (e.pointerType === "mouse") setTip(null);
        }}
        onClick={() => (tip ? setTip(null) : place())}
        className={`inline-flex rounded-full transition hover:scale-110 active:scale-95 ${
          highlight ? ring : ""
        }`}
      >
        <TypeIcon type={tag.type} size={24} />
      </button>

      {tip
        ? createPortal(
            <div
              role="tooltip"
              style={{ left: tip.left, top: tip.top }}
              className={`tip-in pointer-events-none fixed z-[300] w-max max-w-[min(15rem,calc(100vw-1.5rem))] -translate-x-1/2 rounded-xl border border-line-strong bg-[#08161f] px-2.5 py-2 shadow-2xl ${
                tip.below ? "" : "-translate-y-full"
              }`}
            >
              <p className="mb-1 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide text-muted">
                <TypeIcon type={tag.type} size={14} />
                {typeLabel(tag.type)}
              </p>
              {rows.length ? (
                rows.map((m) => (
                  <p
                    key={m.name}
                    className={`flex items-baseline justify-between gap-4 text-[12px] leading-5 ${
                      isHot(m.multiplier, kind)
                        ? kind === "resist"
                          ? "font-bold text-emerald-200"
                          : kind === "weak"
                            ? "font-bold text-rose-200"
                            : "font-bold text-amber-200"
                        : "text-white"
                    }`}
                  >
                    <span className="truncate">{m.name}</span>
                    <span className="tabular-nums">{fmtMult(m.multiplier)}</span>
                  </p>
                ))
              ) : (
                <p className="text-[12px] text-muted">Neutral for the whole team.</p>
              )}
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
