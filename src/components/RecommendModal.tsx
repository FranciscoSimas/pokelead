"use client";

import { useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { PokemonSprite } from "./PokemonSprite";
import { MoveRow } from "./MoveChip";
import type { RecommendPick } from "@/lib/recommend";
import { formatEvoInvestLine, investBadgeLabel } from "@/lib/evoCandidates";

export function RecommendModal({
  open,
  onClose,
  slotLabel,
  currentName,
  picks,
  lookup,
  onUse,
  source,
  onSourceChange,
}: {
  open: boolean;
  onClose: () => void;
  slotLabel: string;
  currentName: string;
  picks: RecommendPick[];
  lookup: (id: string) => { name: string; type: string } | undefined;
  onUse?: (pick: RecommendPick) => void;
  source: "meta" | "box";
  onSourceChange: (source: "meta" | "box") => void;
}) {
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

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          key="backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          className="fixed inset-0 z-[100] flex items-end justify-center bg-black/70 backdrop-blur-sm sm:items-center sm:p-4"
          onClick={onClose}
          role="presentation"
        >
          <motion.div
            initial={{ y: 48, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 32, opacity: 0 }}
            transition={{ duration: 0.26, ease: [0.22, 1, 0.36, 1] }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="recommend-title"
            className="card flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-t-3xl sm:max-h-[88vh] sm:rounded-card"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mx-auto mt-2 h-1 w-10 shrink-0 rounded-full bg-white/25 sm:hidden" />

            <div className="flex shrink-0 items-start justify-between gap-3 border-b border-line px-4 py-3 sm:py-4">
              <div className="min-w-0 flex-1">
                <p id="recommend-title" className="text-base font-bold text-white sm:text-lg">
                  Recommended for {slotLabel}
                </p>
                <p className="mt-1 text-xs text-muted sm:text-sm">
                  {source === "meta"
                    ? `Top 50 meta options that change this team score if they replace ${currentName}. Ideal bulk IVs and PvPoke moves.`
                    : `Your box options for ${slotLabel}. Delta shows how many points the team score goes up or down with their real IVs.`}
                </p>
                <div className="mt-3 inline-flex rounded-full border border-line bg-black/30 p-0.5">
                  <button
                    type="button"
                    onClick={() => onSourceChange("meta")}
                    className={`rounded-full px-3 py-1 text-[11px] font-bold transition ${
                      source === "meta"
                        ? "bg-white/15 text-white"
                        : "text-sky-100/55 hover:text-white"
                    }`}
                  >
                    Meta top 50
                  </button>
                  <button
                    type="button"
                    onClick={() => onSourceChange("box")}
                    className={`rounded-full px-3 py-1 text-[11px] font-bold transition ${
                      source === "box"
                        ? "bg-white/15 text-white"
                        : "text-sky-100/55 hover:text-white"
                    }`}
                  >
                    My box only
                  </button>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                className="shrink-0 rounded-full border border-line px-3 py-1 text-sm text-sky-100 transition hover:bg-white/10"
              >
                Close
              </button>
            </div>

            <div className="min-h-0 flex-1 space-y-2 overflow-y-auto p-3">
              {picks.length === 0 ? (
                <p className="px-2 py-6 text-center text-sm text-muted">
                  {source === "box"
                    ? "No other eligible Pokémon in your box for this slot."
                    : "No replacements found for this league."}
                </p>
              ) : (
                picks.map((p, i) => {
                  const evo = p.boxPokemon?.evo;
                  return (
                  <motion.article
                    key={`${p.source}-${p.boxPokemon?.id ?? p.speciesId}`}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: Math.min(i, 8) * 0.03, duration: 0.25 }}
                    className={`flex items-center gap-2.5 rounded-2xl border px-2.5 py-2 transition sm:gap-3 sm:px-3 ${
                      evo?.kind === "power"
                        ? "border-sky-400/30 bg-sky-950/25 hover:border-sky-300/40"
                        : evo
                          ? "border-emerald-400/30 bg-emerald-950/25 hover:border-emerald-300/40"
                          : "border-white/5 bg-black/25 hover:border-sky-300/25 hover:bg-black/35"
                    }`}
                  >
                    <p className="w-5 shrink-0 text-xs font-bold text-sky-200/55">{i + 1}</p>
                    <PokemonSprite
                      speciesId={p.speciesId}
                      dex={p.dex}
                      alt={p.speciesName}
                      width={56}
                      height={56}
                      className="h-12 w-12 shrink-0 object-contain sm:h-14 sm:w-14"
                      shadow={p.shadow}
                    />
                    <div className="min-w-0 flex-1 space-y-1">
                      <p className="truncate text-sm font-bold text-white sm:text-base">
                        {p.shadow ? "Shadow " : ""}
                        {p.speciesName}
                        {evo ? (
                          <span
                            className={`ml-2 rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide ${
                              evo.kind === "power"
                                ? "bg-sky-400/20 text-sky-200"
                                : "bg-emerald-400/20 text-emerald-200"
                            }`}
                          >
                            {investBadgeLabel(evo)}
                          </span>
                        ) : null}
                        {p.overallRank < 9000 ? (
                          <span className="ml-2 text-[11px] font-semibold text-sky-200/55">
                            #{p.overallRank}
                          </span>
                        ) : null}
                      </p>
                      {evo ? (
                        <p className="text-[11px] text-emerald-100/80">
                          {evo.kind === "evolve" ? `from ${evo.sourceName} · ` : ""}
                          {formatEvoInvestLine(evo)}
                        </p>
                      ) : (
                        <p className="text-[11px] text-muted">
                          {p.cp ? `${p.cp} CP · ` : ""}
                          {source === "box" ? "Your IVs " : "Ideal IVs "}
                          {p.ivs.join("/")}
                        </p>
                      )}
                      <div className="origin-left scale-95">
                        <MoveRow moves={p.moves} lookup={lookup} eliteMoves={p.eliteMoves} />
                      </div>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1">
                      <p className="text-lg font-black tabular-nums text-white">{p.score}</p>
                      <p
                        className={`text-xs font-bold tabular-nums ${
                          p.delta > 0
                            ? "text-emerald-300"
                            : p.delta < 0
                              ? "text-rose-300"
                              : "text-faint"
                        }`}
                      >
                        {p.delta > 0 ? `+${p.delta}` : p.delta}
                      </p>
                      {onUse ? (
                        <button
                          type="button"
                          onClick={() => onUse(p)}
                          className="min-h-11 rounded-full bg-sky-500/30 px-3 py-2 text-xs font-bold uppercase tracking-wide text-sky-50 transition hover:bg-sky-500/50 active:scale-95"
                        >
                          Use
                        </button>
                      ) : null}
                    </div>
                  </motion.article>
                  );
                })
              )}
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
