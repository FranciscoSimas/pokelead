import type { BoxPokemon, RankEntry } from "./types";
import { ivRankParams, monLevelCap, rankIvSpread, type IvRankResult } from "./ivRank";
import {
  analyzeTeamCoverage,
  resolveTypes,
  type MoveInfo,
  type TeamCoverage,
} from "./coverage";
import { scoreBoxMon, statsFor, type GmTypeMap, type StatsMap } from "./teams";
import type { FormatOption } from "./formats";

export type CompareSide = {
  mon: BoxPokemon;
  rankingId: string;
  overallRank: number;
  leadRank: number;
  switchRank: number;
  closerRank: number;
  overallScore: number;
  power: number;
  iv: IvRankResult | null;
  types: string[];
  coverage: TeamCoverage;
};

export type CompareResult = {
  left: CompareSide;
  right: CompareSide;
  winner: "left" | "right" | "tie";
  powerDelta: number;
  overallRankDelta: number;
  ivDelta: number;
  coverageDelta: number;
};

function findRank(list: RankEntry[], ids: string[]): { rank: number; score: number } {
  for (let i = 0; i < list.length; i++) {
    if (ids.includes(list[i].speciesId)) {
      return { rank: i + 1, score: list[i].score };
    }
  }
  return { rank: 0, score: 0 };
}

/** Exact ranking IDs only - never borrow the other form's rank. */
function idsFor(mon: BoxPokemon): string[] {
  const rankingId = mon.flags.shadow ? `${mon.speciesId}_shadow` : mon.speciesId;
  return [rankingId];
}

export function buildCompareSide(
  mon: BoxPokemon,
  format: FormatOption,
  overall: RankEntry[],
  leads: RankEntry[],
  switches: RankEntry[],
  closers: RankEntry[],
  statsMap: StatsMap | undefined,
  typeMap: GmTypeMap | undefined,
  lookup: (id: string) => MoveInfo | undefined,
  movePools?: Record<string, string[]>,
): CompareSide {
  const rankingId = mon.flags.shadow ? `${mon.speciesId}_shadow` : mon.speciesId;
  const ids = idsFor(mon);
  const leagueCp = format.cp;
  const scored = scoreBoxMon(
    mon,
    overall,
    leads,
    switches,
    closers,
    statsFor(mon, statsMap),
    leagueCp,
  );
  const overallHit = findRank(overall, ids);
  const leadHit = findRank(leads, ids);
  const switchHit = findRank(switches, ids);
  const closerHit = findRank(closers, ids);
  const base = statsFor(mon, statsMap);
  const { cap } = ivRankParams(format.cp);
  const maxLevel = monLevelCap(format.cp, mon.flags.bestBuddy);
  const iv = base
    ? rankIvSpread(base, mon.atkIv, mon.defIv, mon.hpIv, cap, maxLevel)
    : scored.iv;
  const types = resolveTypes(mon, typeMap);
  const coverage = analyzeTeamCoverage([mon], lookup, typeMap, movePools);

  return {
    mon,
    rankingId,
    overallRank: overallHit.rank,
    leadRank: leadHit.rank,
    switchRank: switchHit.rank,
    closerRank: closerHit.rank,
    overallScore: overallHit.score || scored.overall,
    power: scored.power,
    iv,
    types,
    coverage,
  };
}

export function comparePokemon(
  leftMon: BoxPokemon,
  rightMon: BoxPokemon,
  format: FormatOption,
  overall: RankEntry[],
  leads: RankEntry[],
  switches: RankEntry[],
  closers: RankEntry[],
  statsMap: StatsMap | undefined,
  typeMap: GmTypeMap | undefined,
  lookup: (id: string) => MoveInfo | undefined,
  movePools?: Record<string, string[]>,
): CompareResult {
  const left = buildCompareSide(
    leftMon,
    format,
    overall,
    leads,
    switches,
    closers,
    statsMap,
    typeMap,
    lookup,
    movePools,
  );
  const right = buildCompareSide(
    rightMon,
    format,
    overall,
    leads,
    switches,
    closers,
    statsMap,
    typeMap,
    lookup,
    movePools,
  );
  const powerDelta = Math.round((left.power - right.power) * 10) / 10;
  const overallRankDelta =
    left.overallRank && right.overallRank ? right.overallRank - left.overallRank : 0;
  const ivDelta =
    left.iv && right.iv
      ? Math.round((left.iv.pctOfBest - right.iv.pctOfBest) * 10) / 10
      : 0;
  const coverageDelta = Math.round((left.coverage.score - right.coverage.score) * 10) / 10;
  // Unknown IVs: 50% (same idea as Teams ivFactor(null) = 0.5), not ~80-90%.
  const unknownIvPct = 50;
  const leftScore =
    (left.overallScore || left.power) * 0.55 +
    (left.iv?.pctOfBest ?? unknownIvPct) * 0.2 +
    left.coverage.score * 0.25;
  const rightScore =
    (right.overallScore || right.power) * 0.55 +
    (right.iv?.pctOfBest ?? unknownIvPct) * 0.2 +
    right.coverage.score * 0.25;
  const winner =
    Math.abs(leftScore - rightScore) < 0.5 ? "tie" : leftScore > rightScore ? "left" : "right";

  return {
    left,
    right,
    winner,
    powerDelta,
    overallRankDelta,
    ivDelta,
    coverageDelta,
  };
}
