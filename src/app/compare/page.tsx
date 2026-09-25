"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { useBoxStore } from "@/store/box";
import type { BoxPokemon } from "@/lib/types";
import { isEligibleSpecies, openLeagueLabel } from "@/lib/formats";
import { filterBoxForFormat } from "@/lib/teams";
import { FormatSelect } from "@/components/FormatSelect";
import { TeamMonPicker } from "@/components/TeamMonPicker";
import { PokemonSprite } from "@/components/PokemonSprite";
import { MoveRow } from "@/components/MoveChip";
import { IvRankBadge } from "@/components/IvRankBadge";
import { TypeDots } from "@/components/TypeIcon";
import { CoveragePanel } from "@/components/CoveragePanel";
import { RankingsSkeleton } from "@/components/RankingsSkeleton";
import { comparePokemon, type CompareSide } from "@/lib/compare";
import { useFormatRankings } from "@/hooks/useFormatRankings";

function fmtRank(n: number): string {
  return n > 0 ? `#${n}` : "-";
}

function deltaClass(n: number, invert = false): string {
  const v = invert ? -n : n;
  if (v > 0) return "text-positive";
  if (v < 0) return "text-danger";
  return "text-faint";
}

function SideCard({
  side,
  label,
  lookup,
  highlight,
}: {
  side: CompareSide;
  label: string;
  lookup: (id: string) => { name: string; type: string } | undefined;
  highlight?: boolean;
}) {
  const mon = side.mon;
  return (
    <article
      className={`card space-y-3 p-4 ${highlight ? "ring-1 ring-accent/40" : ""}`}
    >
      <p className="label">{label}</p>
      <div className="flex items-center gap-3">
        <PokemonSprite
          speciesId={side.rankingId}
          dex={mon.dex}
          alt={mon.speciesName}
          width={88}
          height={88}
          className="h-20 w-20 object-contain"
          shadow={mon.flags.shadow}
        />
        <div className="min-w-0 space-y-1">
          <p className="truncate text-lg font-bold text-white">
            {mon.flags.shadow ? "Shadow " : ""}
            {mon.speciesName}
          </p>
          <TypeDots types={side.types} />
          <p className="text-sm text-muted">
            <span className="font-semibold text-fg">{mon.cp} CP</span>
            {" · "}
            {mon.atkIv}/{mon.defIv}/{mon.hpIv}
          </p>
          <IvRankBadge result={side.iv} compact />
        </div>
      </div>
      <MoveRow moves={[mon.fastMove ?? "", ...mon.chargedMoves]} lookup={lookup} />
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {[
          { label: "Overall", value: fmtRank(side.overallRank) },
          { label: "Lead", value: fmtRank(side.leadRank) },
          { label: "Switch", value: fmtRank(side.switchRank) },
          { label: "Closer", value: fmtRank(side.closerRank) },
        ].map((r) => (
          <div key={r.label} className="rounded-field border border-line bg-surface-2 px-2 py-1.5">
            <p className="text-[9px] uppercase tracking-wider text-faint">{r.label}</p>
            <p className="text-sm font-bold tabular-nums text-white">{r.value}</p>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-3 gap-2">
        <div
          className="rounded-field border border-line bg-surface-2 px-2 py-1.5"
          title="PvPoke overall score × IV quality for this format (1v1, not a team score)."
        >
          <p className="text-[9px] uppercase tracking-wider text-faint">Power</p>
          <p className="text-sm font-bold tabular-nums text-white">{side.power}</p>
        </div>
        <div className="rounded-field border border-line bg-surface-2 px-2 py-1.5">
          <p className="text-[9px] uppercase tracking-wider text-faint">IV bulk</p>
          <p className="text-sm font-bold tabular-nums text-white">
            {side.iv ? `${side.iv.pctOfBest}%` : "-"}
          </p>
        </div>
        <div className="rounded-field border border-line bg-surface-2 px-2 py-1.5">
          <p className="text-[9px] uppercase tracking-wider text-faint">Coverage</p>
          <p className="text-sm font-bold tabular-nums text-white">{side.coverage.grade}</p>
        </div>
      </div>
      <CoveragePanel coverage={side.coverage} defaultOpen={false} />
    </article>
  );
}

export default function ComparePage() {
  const box = useBoxStore((s) => s.pokemon);
  const [left, setLeft] = useState<BoxPokemon | null>(null);
  const [right, setRight] = useState<BoxPokemon | null>(null);
  const {
    formats,
    formatId,
    setFormatId,
    format,
    gm,
    cups,
    statsMap,
    typeMap,
    moveLookup,
    movePools,
    lists,
    rankSource,
    err,
    loadingRanks,
  } = useFormatRankings();

  const cupDef = useMemo(() => cups.find((c) => c.name === format.cup), [cups, format.cup]);
  const isEligible = (speciesId: string, types: string[], tags?: string[]) =>
    isEligibleSpecies(speciesId, types, tags, format, cupDef);
  const playable = useMemo(
    () => filterBoxForFormat(box, format, cups, typeMap),
    [box, format, cups, typeMap],
  );

  const result = useMemo(() => {
    if (!left || !right || loadingRanks || !lists.overall.length || !format) return null;
    return comparePokemon(
      left,
      right,
      format,
      lists.overall,
      lists.leads,
      lists.switches,
      lists.closers,
      statsMap,
      typeMap,
      moveLookup,
      movePools,
    );
  }, [left, right, lists, format, statsMap, typeMap, moveLookup, movePools, loadingRanks]);

  const excludeLeft = useMemo(() => new Set(left ? [left.id] : []), [left]);
  const excludeRight = useMemo(() => new Set(right ? [right.id] : []), [right]);
  const playableIds = useMemo(() => new Set(playable.map((p) => p.id)), [playable]);

  return (
    <div className="space-y-5 sm:space-y-6">
      <div>
        <h1 className="font-[family-name:var(--font-lilita)] text-3xl leading-none tracking-wide text-white sm:text-4xl">
          Compare
        </h1>
        <p className="mt-2 max-w-xl text-sm text-muted">
          1v1 for this format: ranks, IVs, moves, and coverage. Not a full team score (that lives
          on Teams, where each pick depends on the other two).
        </p>
      </div>

      <FormatSelect formats={formats} value={formatId} onChange={setFormatId} />

      {rankSource === "open" && format.cup !== "all" ? (
        <p className="rounded-card border border-warn/30 bg-warn/10 px-3 py-2 text-xs text-warn">
          {format.label} is not ranked on PvPoke. Using {openLeagueLabel(format.cp)} ranks filtered
          by the cup rules.
        </p>
      ) : null}

      {err ? (
        <p className="rounded-card border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">
          {err}
        </p>
      ) : null}

      {loadingRanks ? <RankingsSkeleton cards={1} /> : null}

      <div className="grid gap-3 sm:grid-cols-2">
        <TeamMonPicker
          label="Pokémon A"
          value={left}
          onChange={setLeft}
          box={box}
          gm={gm}
          overall={lists.overall}
          role={lists.overall}
          format={format}
          lookup={moveLookup}
          playableIds={playableIds}
          excludeIds={excludeRight}
          isEligible={isEligible}
        />
        <TeamMonPicker
          label="Pokémon B"
          value={right}
          onChange={setRight}
          box={box}
          gm={gm}
          overall={lists.overall}
          role={lists.overall}
          format={format}
          lookup={moveLookup}
          playableIds={playableIds}
          excludeIds={excludeLeft}
          isEligible={isEligible}
        />
      </div>

      {result ? (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4"
        >
          <div className="card flex flex-wrap items-center justify-between gap-3 px-4 py-3">
            <p className="text-sm font-semibold text-white">
              {result.winner === "tie"
                ? "Roughly even in this 1v1"
                : result.winner === "left"
                  ? `${result.left.mon.speciesName} edges ahead`
                  : `${result.right.mon.speciesName} edges ahead`}
            </p>
            <div className="flex flex-wrap gap-3 text-xs font-bold tabular-nums">
              <span
                className={deltaClass(result.powerDelta)}
                title="Meta score × IV quality. Positive means A is stronger."
              >
                Power {result.powerDelta > 0 ? "+" : ""}
                {result.powerDelta}
              </span>
              <span className={deltaClass(result.overallRankDelta)}>
                {result.overallRankDelta === 0
                  ? "Same overall rank"
                  : result.overallRankDelta > 0
                    ? `A is ${result.overallRankDelta} ranks higher`
                    : `B is ${-result.overallRankDelta} ranks higher`}
              </span>
              <span className={deltaClass(result.ivDelta)}>
                IV {result.ivDelta > 0 ? "+" : ""}
                {result.ivDelta}%
              </span>
              <span className={deltaClass(result.coverageDelta)}>
                Cov {result.coverageDelta > 0 ? "+" : ""}
                {result.coverageDelta}
              </span>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <SideCard
              side={result.left}
              label="Pokémon A"
              lookup={moveLookup}
              highlight={result.winner === "left"}
            />
            <SideCard
              side={result.right}
              label="Pokémon B"
              lookup={moveLookup}
              highlight={result.winner === "right"}
            />
          </div>
        </motion.div>
      ) : loadingRanks ? null : (
        <p className="rounded-card border border-dashed border-line-strong px-4 py-8 text-center text-sm text-faint">
          Select two Pokémon to compare 1v1 in {format.label}.
        </p>
      )}
    </div>
  );
}
