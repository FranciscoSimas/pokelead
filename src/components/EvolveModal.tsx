"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { BoxPokemon, LeagueCp } from "@/lib/types";
import type { GameMaster, GmPokemon } from "@/lib/pvpoke";
import {
  buildEvolvedPokemon,
  listEvolutions,
  previewEvolution,
  type EvolutionPreview,
  type LeagueRankBundle,
} from "@/lib/evolve";
import { formatLevel, leagueShortName } from "@/lib/ivRank";
import { ensureEvolutionCandyLoaded, evolutionCandyCost } from "@/lib/evoCandy";
import { powerUpCandyBetween } from "@/lib/powerUpCosts";
import { fetchRankingsClient } from "@/lib/fetchPvpokeClient";
import { PokemonSprite } from "./PokemonSprite";
import { ConfirmDialog } from "./ConfirmDialog";

const LEAGUES: LeagueCp[] = [1500, 2500, 10000];

function fmtRank(n: number | null): string {
  return n == null ? "-" : `#${n}`;
}

function deltaRank(before: number | null, after: number | null): string {
  if (before == null || after == null) return "";
  const d = before - after;
  if (d === 0) return "±0";
  return d > 0 ? `↑${d}` : `↓${Math.abs(d)}`;
}

export function EvolveModal({
  open,
  onClose,
  mon,
  gm,
  currentGm,
  onApply,
}: {
  open: boolean;
  onClose: () => void;
  mon: BoxPokemon | null;
  gm: GameMaster | null;
  currentGm: GmPokemon | null;
  onApply: (patch: Partial<BoxPokemon>) => void;
}) {
  const [ranks, setRanks] = useState<Partial<Record<LeagueCp, LeagueRankBundle>>>({});
  const [loading, setLoading] = useState(false);
  const [league, setLeague] = useState<LeagueCp>(1500);
  const [picked, setPicked] = useState<string | null>(null);
  const [candyReady, setCandyReady] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const targets = useMemo(() => {
    if (!gm || !mon) return [];
    return listEvolutions(gm, mon.speciesId, mon.flags.shadow).filter((t) => {
      const id = t.speciesId.toLowerCase();
      const tags = (t.gm.tags ?? []).map((x) => x.toLowerCase());
      return !id.includes("_mega") && !tags.includes("mega");
    });
  }, [gm, mon]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        if (confirmOpen) setConfirmOpen(false);
        else onClose();
      }
    }
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener("keydown", onKey);
    };
  }, [open, onClose, confirmOpen]);

  useEffect(() => {
    if (!open || !mon) return;
    setPicked(null);
    setConfirmOpen(false);
    setLeague(mon.cp <= 1500 ? 1500 : mon.cp <= 2500 ? 2500 : 10000);
  }, [open, mon]);

  useEffect(() => {
    if (!open) {
      setCandyReady(false);
      return;
    }
    let cancelled = false;
    ensureEvolutionCandyLoaded()
      .then(() => {
        if (!cancelled) setCandyReady(true);
      })
      .catch(() => {
        if (!cancelled) setCandyReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, [open]);

  useEffect(() => {
    if (!open || targets.length === 0) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const next: Partial<Record<LeagueCp, LeagueRankBundle>> = {};
        await Promise.all(
          LEAGUES.map(async (cp) => {
            const [overall, leads, switches, closers] = await Promise.all([
              fetchRankingsClient("all", "overall", cp),
              fetchRankingsClient("all", "leads", cp),
              fetchRankingsClient("all", "switches", cp),
              fetchRankingsClient("all", "closers", cp),
            ]);
            next[cp] = { overall, leads, switches, closers };
          }),
        );
        if (!cancelled) setRanks(next);
      } catch {
        if (!cancelled) setRanks({});
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, targets.length]);

  const previews: EvolutionPreview[] = useMemo(() => {
    if (!mon || !currentGm) return [];
    return targets
      .map((t) => previewEvolution(mon, currentGm, t, ranks))
      .filter((p): p is EvolutionPreview => Boolean(p));
  }, [mon, currentGm, targets, ranks]);

  const active = previews.find((p) => p.target.speciesId === picked) ?? previews[0] ?? null;

  const leagueIv = active?.ivByLeague[league as 1500 | 2500 | 10000] ?? null;

  const invest = useMemo(() => {
    if (!mon || !active || !leagueIv) return null;
    void candyReady;
    const candyEvolve = evolutionCandyCost(mon.dex, active.target.dex);
    const canPowerToLeague = leagueIv.level + 1e-9 >= active.level && active.cpAtLevel <= league;
    const power = canPowerToLeague
      ? powerUpCandyBetween(active.level, leagueIv.level)
      : { candy: 0, xlCandy: 0 };
    return {
      leagueMaxCp: leagueIv.cp,
      leagueMaxLevel: leagueIv.level,
      overCap: active.cpAtLevel > league,
      canPowerToLeague,
      candyEvolve,
      candyPowerUp: power.candy,
      xlCandyPowerUp: power.xlCandy,
    };
  }, [mon, active, leagueIv, league, candyReady]);

  if (!mon) return null;

  function requestEvolve() {
    setConfirmOpen(true);
  }

  function applyEvolve() {
    if (!currentGm || !active || !mon) return;
    onApply(buildEvolvedPokemon(mon, currentGm, active.target));
    setConfirmOpen(false);
    onClose();
  }

  return (
    <AnimatePresence>
      {open ? (
        <>
        <motion.div
          key="evolve-backdrop"
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
            aria-labelledby="evolve-title"
            className="glass flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-t-3xl sm:max-h-[88vh] sm:rounded-card"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mx-auto mt-2 h-1 w-10 shrink-0 rounded-full bg-white/25 sm:hidden" />

            <div className="flex shrink-0 items-start justify-between gap-3 border-b border-white/10 px-4 py-3">
              <div>
                <p id="evolve-title" className="text-base font-bold text-white sm:text-lg">
                  Evolve {mon.flags.shadow ? "Shadow " : ""}
                  {mon.speciesName}
                </p>
                <p className="mt-1 text-xs text-sky-100/65">
                  {mon.cp} CP
                  {active ? ` · L${formatLevel(active.level)}` : ""}
                  {" · "}
                  {mon.atkIv}/{mon.defIv}/{mon.hpIv} IVs
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                className="shrink-0 rounded-full border border-white/10 px-3 py-1 text-sm text-sky-100 transition hover:bg-white/10"
              >
                Close
              </button>
            </div>

            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4">
              {targets.length === 0 ? (
                <p className="py-8 text-center text-sm text-sky-100/60">
                  No evolutions found for this Pokémon.
                </p>
              ) : previews.length === 0 ? (
                <p className="py-8 text-center text-sm text-sky-100/60">
                  Could not estimate CP for this evolution. Check species and base stats.
                </p>
              ) : (
                <>
                  <div className="flex flex-wrap gap-2">
                    {previews.map((p) => {
                      const selected =
                        (picked ?? previews[0]?.target.speciesId) === p.target.speciesId;
                      return (
                        <button
                          key={p.target.speciesId}
                          type="button"
                          onClick={() => {
                            setPicked(p.target.speciesId);
                            setConfirmOpen(false);
                          }}
                          className={`flex items-center gap-2 rounded-2xl border px-2.5 py-2 transition ${
                            selected
                              ? "border-emerald-400/50 bg-emerald-950/40"
                              : "border-white/10 bg-black/25 hover:border-sky-300/35"
                          }`}
                        >
                          <PokemonSprite
                            speciesId={p.target.speciesId}
                            dex={p.target.dex}
                            alt=""
                            width={40}
                            height={40}
                            className="h-10 w-10 object-contain"
                            shadow={p.target.shadow}
                          />
                          <span className="text-left">
                            <span className="block text-sm font-bold text-white">
                              {p.target.shadow ? "Shadow " : ""}
                              {p.target.speciesName}
                            </span>
                            <span className="block text-[11px] font-semibold tabular-nums text-emerald-200/90">
                              {p.cpAtLevel} CP
                            </span>
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  {active ? (
                    <div className="space-y-3">
                      <div className="rounded-2xl border border-emerald-400/25 bg-emerald-950/30 p-3">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-200/60">
                          After evolve at L{formatLevel(active.level)}
                        </p>
                        <div className="mt-2 flex items-end justify-between gap-3">
                          <div>
                            <p className="text-[11px] text-sky-100/55">
                              {mon.flags.shadow ? "Shadow " : ""}
                              {mon.speciesName}
                            </p>
                            <p className="text-2xl font-bold tabular-nums text-white">
                              {mon.cp}
                              <span className="ml-1 text-sm font-semibold text-sky-100/50">CP</span>
                            </p>
                          </div>
                          <p className="pb-1 text-lg font-bold text-sky-100/40" aria-hidden>
                            →
                          </p>
                          <div className="text-right">
                            <p className="text-[11px] text-emerald-200/70">
                              {active.target.shadow ? "Shadow " : ""}
                              {active.target.speciesName}
                            </p>
                            <p className="text-2xl font-bold tabular-nums text-emerald-200">
                              {active.cpAtLevel}
                              <span className="ml-1 text-sm font-semibold text-emerald-200/55">
                                CP
                              </span>
                            </p>
                          </div>
                        </div>
                        <p className="mt-2 text-xs text-sky-100/55">
                          Same level after evolve. Absolute max L40 {active.maxCp40} CP, L
                          {formatLevel(mon.flags.bestBuddy ? 51 : 50)} {active.maxCp50} CP.
                        </p>
                      </div>

                      <div className="flex gap-1 rounded-full border border-white/10 bg-black/20 p-1">
                        {LEAGUES.map((cp) => (
                          <button
                            key={cp}
                            type="button"
                            onClick={() => setLeague(cp)}
                            className={`flex-1 rounded-full px-2 py-1.5 text-xs font-bold transition ${
                              league === cp
                                ? "bg-sky-500/35 text-white"
                                : "text-sky-100/60 hover:text-white"
                            }`}
                          >
                            {leagueShortName(cp)}
                          </button>
                        ))}
                      </div>

                      {invest ? (
                        <div className="rounded-2xl border border-white/10 bg-black/25 p-3">
                          <p className="text-[10px] font-bold uppercase tracking-wider text-sky-200/55">
                            {leagueShortName(league)} investment
                          </p>
                          {invest.overCap ? (
                            <p className="mt-1 text-sm text-warn">
                              After evolve this hits {active.cpAtLevel} CP, over the{" "}
                              {leagueShortName(league)} cap ({league}). Not usable in this league
                              at the current level.
                            </p>
                          ) : (
                            <>
                              <p className="mt-1 text-sm text-white">
                                Max in {leagueShortName(league)}:{" "}
                                <span className="font-bold tabular-nums">
                                  {invest.leagueMaxCp} CP
                                </span>
                                <span className="text-sky-100/55">
                                  {" "}
                                  at L{formatLevel(invest.leagueMaxLevel)}
                                </span>
                              </p>
                              <p className="mt-1 text-xs text-sky-100/65">
                                {invest.candyEvolve != null
                                  ? `~${invest.candyEvolve + invest.candyPowerUp} candy`
                                  : invest.candyPowerUp > 0
                                    ? `~${invest.candyPowerUp} candy to power up`
                                    : "Candy estimate pending"}
                                {invest.xlCandyPowerUp > 0
                                  ? `, ${invest.xlCandyPowerUp} XL`
                                  : ""}
                                {invest.candyEvolve != null
                                  ? ` (evolve ${invest.candyEvolve} + power-up ${invest.candyPowerUp})`
                                  : ""}
                                .
                              </p>
                            </>
                          )}
                        </div>
                      ) : null}

                      {loading ? (
                        <p className="text-center text-xs text-sky-100/50">Loading ranks…</p>
                      ) : (
                        <>
                          <div className="rounded-2xl border border-white/10 bg-black/25 p-3">
                            <p className="text-[10px] font-bold uppercase tracking-wider text-sky-200/55">
                              IV quality as {active.target.speciesName} ·{" "}
                              {leagueShortName(league)}
                            </p>
                            {leagueIv ? (
                              <p className="mt-1 text-sm text-white">
                                Rank #{leagueIv.rank}
                                <span className="text-sky-100/55">
                                  {" "}
                                  · {leagueIv.pctOfBest}% of #1 · ideal{" "}
                                  {leagueIv.bestIvs.join("/")}
                                </span>
                              </p>
                            ) : (
                              <p className="mt-1 text-sm text-sky-100/50">n/a</p>
                            )}
                          </div>

                          <div className="overflow-hidden rounded-2xl border border-white/10 bg-black/25">
                            <table className="w-full text-left text-xs sm:text-sm">
                              <thead className="border-b border-white/10 text-[10px] uppercase tracking-wider text-sky-200/50">
                                <tr>
                                  <th className="px-3 py-2 font-semibold">Role</th>
                                  <th className="px-3 py-2 font-semibold">Now</th>
                                  <th className="px-3 py-2 font-semibold">After</th>
                                  <th className="px-3 py-2 font-semibold">Δ</th>
                                </tr>
                              </thead>
                              <tbody className="text-sky-50">
                                {(
                                  [
                                    ["Overall", "overall"],
                                    ["Leads", "leads"],
                                    ["Switches", "switches"],
                                    ["Closers", "closers"],
                                  ] as const
                                ).map(([label, key]) => {
                                  const before = active.ranksNow[league][key];
                                  const after = active.ranksAfter[league][key];
                                  const d = deltaRank(before, after);
                                  return (
                                    <tr key={key} className="border-t border-white/5">
                                      <td className="px-3 py-2 font-semibold">{label}</td>
                                      <td className="px-3 py-2 tabular-nums text-sky-100/70">
                                        {fmtRank(before)}
                                      </td>
                                      <td className="px-3 py-2 tabular-nums font-bold">
                                        {fmtRank(after)}
                                      </td>
                                      <td
                                        className={`px-3 py-2 tabular-nums font-bold ${
                                          d.startsWith("↑")
                                            ? "text-emerald-300"
                                            : d.startsWith("↓")
                                              ? "text-rose-300"
                                              : "text-sky-100/45"
                                        }`}
                                      >
                                        {d || "-"}
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        </>
                      )}

                      <button
                        type="button"
                        onClick={requestEvolve}
                        className="w-full rounded-full bg-gradient-to-r from-emerald-400 via-emerald-500 to-teal-600 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-emerald-700/25 transition hover:brightness-110 active:scale-[0.99]"
                      >
                        Evolve to {active.target.speciesName} ({active.cpAtLevel} CP at L
                        {formatLevel(active.level)})
                      </button>
                    </div>
                  ) : null}
                </>
              )}
            </div>
          </motion.div>
        </motion.div>

          <ConfirmDialog
            key="evolve-confirm"
            open={confirmOpen && Boolean(active)}
            title={`Evolve to ${active?.target.speciesName ?? ""}?`}
            body={
              active
                ? `This updates your box entry from ${mon.flags.shadow ? "Shadow " : ""}${mon.speciesName} (${mon.cp} CP) to ${active.target.shadow ? "Shadow " : ""}${active.target.speciesName} at ${active.cpAtLevel} CP (L${formatLevel(active.level)}). IVs stay ${mon.atkIv}/${mon.defIv}/${mon.hpIv}. This only changes PokeLead, not the game.`
                : ""
            }
            confirmLabel={`Yes, evolve to ${active?.target.speciesName ?? ""}`}
            variant="primary"
            onClose={() => setConfirmOpen(false)}
            onConfirm={applyEvolve}
          />
        </>
      ) : null}
    </AnimatePresence>
  );
}
