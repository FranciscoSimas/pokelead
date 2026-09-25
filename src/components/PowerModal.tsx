"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { BoxPokemon, LeagueCp } from "@/lib/types";
import type { GmPokemon } from "@/lib/pvpoke";
import {
  calcCp,
  formatLevel,
  ivRankParams,
  monLevelCap,
  leagueShortName,
  rankIvSpread,
  resolveMonLevel,
  shadowAdjustedBase,
  type BaseStats,
} from "@/lib/ivRank";
import { powerUpCandyBetween } from "@/lib/powerUpCosts";
import { PokemonSprite } from "./PokemonSprite";

const LEAGUES: LeagueCp[] = [1500, 2500, 10000];

function statsForLevel(mon: BoxPokemon, currentGm: GmPokemon): BaseStats | null {
  if (!currentGm.baseStats) return null;
  const isShadowGm =
    currentGm.speciesId.toLowerCase().includes("_shadow") ||
    (currentGm.tags ?? []).some((t) => t.toLowerCase() === "shadow");
  if (mon.flags.shadow && !isShadowGm) {
    return shadowAdjustedBase(currentGm.baseStats);
  }
  return currentGm.baseStats;
}

export function PowerModal({
  open,
  onClose,
  mon,
  currentGm,
}: {
  open: boolean;
  onClose: () => void;
  mon: BoxPokemon | null;
  currentGm: GmPokemon | null;
}) {
  const [league, setLeague] = useState<LeagueCp>(1500);

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

  const invest = useMemo(() => {
    if (!mon || !currentGm) return null;
    const levelStats = statsForLevel(mon, currentGm);
    if (!levelStats) return null;

    const { cap } = ivRankParams(league);
    const levelCap = monLevelCap(league, mon.flags.bestBuddy);
    const currentLevel = resolveMonLevel(
      levelStats,
      mon.atkIv,
      mon.defIv,
      mon.hpIv,
      mon.cp,
      mon.level,
      levelCap,
    );
    const ranked = rankIvSpread(
      levelStats,
      mon.atkIv,
      mon.defIv,
      mon.hpIv,
      cap,
      levelCap,
    );

    const overCap = mon.cp > cap;
    const cpAtCurrent = calcCp(
      levelStats,
      mon.atkIv,
      mon.defIv,
      mon.hpIv,
      currentLevel,
    );
    const effectiveNow = Math.max(mon.cp, cpAtCurrent);
    const hasHalfLevel = ranked.level >= currentLevel + 0.5 - 1e-9;
    const alreadyMax = !overCap && (!hasHalfLevel || ranked.cp <= effectiveNow);
    const canReach = !overCap && hasHalfLevel && ranked.cp > effectiveNow;
    const power = canReach
      ? powerUpCandyBetween(currentLevel, ranked.level)
      : { candy: 0, xlCandy: 0 };
    const canReachReal = canReach && (power.candy > 0 || power.xlCandy > 0);

    return {
      overCap,
      alreadyMax: alreadyMax || (canReach && !canReachReal),
      canReach: canReachReal,
      currentLevel,
      leagueMaxCp: alreadyMax || !canReachReal ? effectiveNow : ranked.cp,
      leagueMaxLevel: alreadyMax || !canReachReal ? currentLevel : ranked.level,
      candy: power.candy,
      xlCandy: power.xlCandy,
    };
  }, [mon, currentGm, league]);

  if (!open || !mon) return null;

  const sid = mon.flags.shadow ? `${mon.speciesId}_shadow` : mon.speciesId;

  return (
    <AnimatePresence>
      <motion.div
        key="power-backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[80] bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />
      <motion.div
        key="power-sheet"
        role="dialog"
        aria-modal="true"
        aria-label="Power up"
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 24 }}
        transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
        className="fixed inset-x-0 bottom-0 z-[81] mx-auto max-h-[88vh] w-full max-w-lg overflow-y-auto rounded-t-3xl border border-white/10 bg-[#0c2436] shadow-2xl sm:inset-y-auto sm:bottom-8 sm:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 z-10 flex items-start justify-between gap-3 border-b border-white/10 bg-[#0c2436]/95 px-4 py-3 backdrop-blur-md">
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-sky-200/55">
              Power
            </p>
            <h2 className="truncate text-lg font-bold text-white">
              {mon.flags.shadow ? "Shadow " : ""}
              {mon.speciesName}
            </h2>
            <p className="text-xs text-sky-100/55">
              Max CP in each league and candy to get there
            </p>
          </div>
          <button type="button" onClick={onClose} className="btn btn-quiet min-h-10 px-3 text-sm">
            Close
          </button>
        </div>

        <div className="space-y-4 p-4">
          <div className="flex items-center gap-3 rounded-2xl border border-sky-400/25 bg-sky-950/30 p-3">
            <PokemonSprite
              speciesId={sid}
              dex={mon.dex}
              alt=""
              width={64}
              height={64}
              className="h-14 w-14 object-contain"
              shadow={mon.flags.shadow}
            />
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-sky-200/55">
                Current
              </p>
              <p className="text-2xl font-bold tabular-nums text-white">
                {mon.cp}
                <span className="ml-1 text-sm font-semibold text-sky-100/50">CP</span>
              </p>
              <p className="text-xs text-sky-100/55">
                {mon.atkIv}/{mon.defIv}/{mon.hpIv}
                {invest ? ` · L${formatLevel(invest.currentLevel)}` : ""}
              </p>
            </div>
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
                {leagueShortName(league)} max
              </p>
              {invest.overCap ? (
                <p className="mt-1 text-sm text-warn">
                  Already over the {leagueShortName(league)} cap ({league} CP).
                </p>
              ) : invest.alreadyMax ? (
                <p className="mt-1 text-sm text-white">
                  Already at league max:{" "}
                  <span className="font-bold tabular-nums">{invest.leagueMaxCp} CP</span>
                  <span className="text-sky-100/55">
                    {" "}
                    at L{formatLevel(invest.leagueMaxLevel)}
                  </span>
                </p>
              ) : (
                <>
                  <p className="mt-1 text-sm text-white">
                    Max in {leagueShortName(league)}:{" "}
                    <span className="font-bold tabular-nums text-sky-200">
                      {invest.leagueMaxCp} CP
                    </span>
                    <span className="text-sky-100/55">
                      {" "}
                      at L{formatLevel(invest.leagueMaxLevel)}
                    </span>
                  </p>
                  <p className="mt-1 text-xs text-sky-100/65">
                    From original {mon.cp} CP
                    {invest.candy > 0 ? ` · ~${invest.candy} candy` : ""}
                    {invest.xlCandy > 0 ? `, ${invest.xlCandy} XL` : ""}
                    {invest.candy === 0 && invest.xlCandy === 0 ? " · no candy needed" : ""}
                  </p>
                </>
              )}
            </div>
          ) : (
            <p className="text-sm text-muted">Could not estimate power-up for this Pokémon.</p>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
