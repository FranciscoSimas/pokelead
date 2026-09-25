import type { BoxPokemon, RankEntry } from "./types";
import { ivRankParams, monLevelCap, rankIvSpread, shadowAdjustedBase, type BaseStats, type IvRankResult } from "./ivRank";
import {
  isEligibleSpecies,
  type CupDef,
  type FormatOption,
} from "./formats";
import {
  analyzeTeamCoverage,
  type MoveInfo,
  type TeamCoverage,
} from "./coverage";

/** Box row id shared by a mon and its virtual Evo projections. */
export function physicalBoxId(mon: Pick<BoxPokemon, "id" | "evo">): string {
  return mon.evo?.sourceId ?? mon.id;
}

export function hasDuplicatePhysical(
  lead: Pick<BoxPokemon, "id" | "evo">,
  switchMon: Pick<BoxPokemon, "id" | "evo">,
  closer: Pick<BoxPokemon, "id" | "evo">,
): boolean {
  const keys = [physicalBoxId(lead), physicalBoxId(switchMon), physicalBoxId(closer)];
  return new Set(keys).size < 3;
}

export type RoleScores = {
  overall: number;
  leadRank: number;
  switchRank: number;
  closerRank: number;
  leadScore: number;
  switchScore: number;
  closerScore: number;
  avgIvPct: number;
  coverage: TeamCoverage;
};

export type SuggestedTeam = {
  lead: BoxPokemon;
  switchMon: BoxPokemon;
  closer: BoxPokemon;
  score: number;
  reason: string;
  coverage: TeamCoverage;
  roles: RoleScores;
};

type Scored = BoxPokemon & {
  overall: number;
  lead: number;
  switchRank: number;
  closer: number;
  leadScore: number;
  switchScore: number;
  closerScore: number;
  iv: IvRankResult | null;
  /** overall × IV quality */
  power: number;
};

/** Min CP to count as playable in a league. */
export function minCpForLeague(cp: number): number {
  if (cp <= 500) return 10;
  if (cp <= 1500) return 1300;
  if (cp <= 2500) return 2300;
  return 3000;
}

export function isPlayableInLeague(mon: BoxPokemon, leagueCp: number): boolean {
  return mon.cp >= minCpForLeague(leagueCp) && mon.cp <= leagueCp;
}

function resolveIds(b: BoxPokemon): string[] {
  const sid = b.flags.shadow ? `${b.speciesId}_shadow` : b.speciesId;
  // Never fall back to the other form - shadow and non-shadow ranks differ.
  return [sid];
}

/** GBL species key (shadow / purified share the same species slot). */
export function speciesKey(b: Pick<BoxPokemon, "speciesId">): string {
  return b.speciesId.replace(/_shadow$/i, "").toLowerCase();
}

export function hasDuplicateSpecies(
  lead: Pick<BoxPokemon, "speciesId">,
  switchMon: Pick<BoxPokemon, "speciesId">,
  closer: Pick<BoxPokemon, "speciesId">,
): boolean {
  const keys = [speciesKey(lead), speciesKey(switchMon), speciesKey(closer)];
  return new Set(keys).size < 3;
}

function rankOf(list: RankEntry[], id: string) {
  const i = list.findIndex((p) => p.speciesId === id);
  return i < 0 ? 9999 : i + 1;
}

function scoreOf(list: RankEntry[], id: string) {
  return list.find((x) => x.speciesId === id)?.score ?? 0;
}

function pickRank(list: RankEntry[], ids: string[]) {
  for (const id of ids) {
    const r = rankOf(list, id);
    if (r < 9999) return r;
  }
  return 9999;
}

function pickScore(list: RankEntry[], ids: string[]) {
  for (const id of ids) {
    const s = scoreOf(list, id);
    if (s > 0) return s;
  }
  return 0;
}

/** IV factor: #1 -> 1.0, #4096 -> ~0.4. Unknown IVs do not pretend to be average. */
export function ivFactor(iv: IvRankResult | null): number {
  if (!iv) return 0.5;
  const byRank = (4097 - iv.rank) / 4096;
  const byPct = iv.pctOfBest / 100;
  return 0.35 + 0.65 * (0.55 * byRank + 0.45 * byPct);
}

export function scoreBoxMon(
  b: BoxPokemon,
  overall: RankEntry[],
  leads: RankEntry[],
  switches: RankEntry[],
  closers: RankEntry[],
  baseStats?: BaseStats,
  leagueCp: number = 1500,
  assumePerfectIvs = false,
): Scored {
  const ids = resolveIds(b);
  const overallScore = pickScore(overall, ids);
  const { cap } = ivRankParams(leagueCp);
  const maxLevel = monLevelCap(leagueCp, b.flags.bestBuddy);
  const iv: IvRankResult | null = assumePerfectIvs
    ? {
        rank: 1,
        total: 4096,
        percentile: 100,
        pctOfBest: 100,
        statProduct: 0,
        bestStatProduct: 0,
        bestIvs: [b.atkIv, b.defIv, b.hpIv],
        level: maxLevel,
        cp: b.cp,
        league: cap,
      }
    : baseStats
      ? rankIvSpread(baseStats, b.atkIv, b.defIv, b.hpIv, cap, maxLevel)
      : null;
  const factor = ivFactor(iv);
  return {
    ...b,
    overall: overallScore,
    lead: pickRank(leads, ids),
    switchRank: pickRank(switches, ids),
    closer: pickRank(closers, ids),
    leadScore: pickScore(leads, ids),
    switchScore: pickScore(switches, ids),
    closerScore: pickScore(closers, ids),
    iv,
    power: Math.round(overallScore * factor * 10) / 10,
  };
}

export function teamScoreFromRoles(
  lead: Scored,
  sw: Scored,
  cl: Scored,
  lookup?: (id: string) => MoveInfo | undefined,
  typeMap?: GmTypeMap,
  rankingCeiling = 100,
  movePools?: Record<string, string[]>,
): { score: number; reason: string; coverage: TeamCoverage; roles: RoleScores } {
  const duplicate = hasDuplicateSpecies(lead, sw, cl);
  const samePhysical = hasDuplicatePhysical(lead, sw, cl);
  const roleFit =
    100 -
    Math.min(30, lead.lead / 10) -
    Math.min(30, sw.switchRank / 10) -
    Math.min(30, cl.closer / 10);
  const rawPower = (lead.power + sw.power + cl.power) / 3;
  const ceiling = rankingCeiling > 1 ? rankingCeiling : 100;
  const power = Math.min(100, (rawPower / ceiling) * 100);
  const knownIvs = [lead.iv?.pctOfBest, sw.iv?.pctOfBest, cl.iv?.pctOfBest].filter(
    (n): n is number => typeof n === "number",
  );
  const avgIv =
    knownIvs.length > 0
      ? Math.round((knownIvs.reduce((a, b) => a + b, 0) / knownIvs.length) * 10) / 10
      : null;
  const coverage = analyzeTeamCoverage(
    [lead, sw, cl],
    lookup ?? (() => undefined),
    typeMap,
    movePools,
  );
  // GBL forbids duplicate species - score as illegal instead of a soft −10.
  // Same box mon as both itself and an Evo candidate is also illegal.
  const illegal = duplicate || samePhysical;
  const score = illegal
    ? 0
    : Math.round(
        Math.max(0, Math.min(100, power * 0.58 + roleFit * 0.17 + coverage.score * 0.25)),
      );
  return {
    score,
    coverage,
    reason: duplicate
      ? "Illegal: duplicate species (GBL)"
      : samePhysical
        ? "Illegal: same box Pokémon used twice (including Evos)"
        : `Lead #${lead.lead} · Switch #${sw.switchRank} · Closer #${cl.closer} · ${
          avgIv == null ? "IV unknown" : `IV ~${avgIv}%`
        } · Cov ${coverage.grade}`,
    roles: {
      overall: Math.round(((lead.overall + sw.overall + cl.overall) / 3) * 10) / 10,
      leadRank: lead.lead,
      switchRank: sw.switchRank,
      closerRank: cl.closer,
      leadScore: lead.leadScore,
      switchScore: sw.switchScore,
      closerScore: cl.closerScore,
      avgIvPct: avgIv ?? 0,
      coverage,
    },
  };
}

export type GmTypeMap = Record<string, { types: string[]; tags?: string[] }>;

export type StatsMap = Record<string, BaseStats | undefined>;

export function statsFor(b: BoxPokemon, stats: StatsMap | undefined): BaseStats | undefined {
  if (!stats) return undefined;
  const sid = b.flags.shadow ? `${b.speciesId}_shadow` : b.speciesId;
  if (stats[sid]) return stats[sid];
  if (b.flags.shadow && stats[b.speciesId]) return shadowAdjustedBase(stats[b.speciesId]!);
  return stats[b.speciesId];
}

export function suggestTeams(
  box: BoxPokemon[],
  overall: RankEntry[],
  leads: RankEntry[],
  switches: RankEntry[],
  closers: RankEntry[],
  topN = 20,
  format: FormatOption,
  cups?: CupDef[],
  statsMap?: StatsMap,
  typeMap?: GmTypeMap,
  lookup?: (id: string) => MoveInfo | undefined,
  movePools?: Record<string, string[]>,
): SuggestedTeam[] {
  const cup = cups?.find((c) => c.name === format.cup);
  const leagueCp = format.cp;
  const eligible = filterBoxForFormat(box, format, cups, typeMap);

  void cup;
  const scored = eligible
    .map((b) =>
      scoreBoxMon(
        b,
        overall,
        leads,
        switches,
        closers,
        statsFor(b, statsMap),
        leagueCp,
      ),
    )
    .filter((p) => p.overall > 0 || p.power > 0);

  if (scored.length < 3) return [];

  const ceiling = overall[0]?.score ?? 100;
  const teams: SuggestedTeam[] = [];
  const byLead = [...scored].sort((a, b) => a.lead - b.lead || b.power - a.power);
  const bySwitch = [...scored].sort(
    (a, b) => a.switchRank - b.switchRank || b.power - a.power,
  );
  const byCloser = [...scored].sort((a, b) => a.closer - b.closer || b.power - a.power);
  // Wider role windows for larger topN without exploding to topN³.
  const window = Math.min(14, Math.max(10, Math.ceil(topN * 0.6)));

  for (const lead of byLead.slice(0, window)) {
    for (const sw of bySwitch.slice(0, window)) {
      if (sw.id === lead.id || speciesKey(sw) === speciesKey(lead)) continue;
      if (physicalBoxId(sw) === physicalBoxId(lead)) continue;
      for (const cl of byCloser.slice(0, window)) {
        if (cl.id === lead.id || cl.id === sw.id) continue;
        if (
          speciesKey(cl) === speciesKey(lead) ||
          speciesKey(cl) === speciesKey(sw)
        ) {
          continue;
        }
        if (hasDuplicatePhysical(lead, sw, cl)) continue;
        const { score, reason, coverage, roles } = teamScoreFromRoles(
          lead,
          sw,
          cl,
          lookup,
          typeMap,
          ceiling,
          movePools,
        );
        if (score <= 0) continue;
        teams.push({ lead, switchMon: sw, closer: cl, score, reason, coverage, roles });
      }
    }
  }

  teams.sort((a, b) => b.score - a.score);
  const seen = new Set<string>();
  const unique: SuggestedTeam[] = [];
  for (const t of teams) {
    const key = [speciesKey(t.lead), speciesKey(t.switchMon), speciesKey(t.closer)]
      .sort()
      .join("|");
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(t);
    if (unique.length >= topN) break;
  }
  return unique;
}

export function filterBoxForFormat(
  box: BoxPokemon[],
  format: FormatOption,
  cups: CupDef[] | undefined,
  typeMap: GmTypeMap | undefined,
): BoxPokemon[] {
  const cup = cups?.find((c) => c.name === format.cup);
  return box.filter((b) => {
    if (!isPlayableInLeague(b, format.cp)) return false;
    const meta = typeMap?.[b.speciesId] ?? typeMap?.[`${b.speciesId}_shadow`];
    const tags = [
      ...(meta?.tags ?? []),
      ...(b.flags.shadow ? ["shadow"] : []),
      ...(b.formLabel?.toLowerCase().includes("mega") ? ["mega"] : []),
    ];
    return isEligibleSpecies(b.speciesId, meta?.types ?? [], tags, format, cup);
  });
}

export function evaluateCustomTeam(
  lead: BoxPokemon,
  switchMon: BoxPokemon,
  closer: BoxPokemon,
  overall: RankEntry[],
  leads: RankEntry[],
  switches: RankEntry[],
  closers: RankEntry[],
  format: FormatOption,
  statsMap?: StatsMap,
  typeMap?: GmTypeMap,
  lookup?: (id: string) => MoveInfo | undefined,
  movePools?: Record<string, string[]>,
  cups?: CupDef[],
): SuggestedTeam & { warnings: string[]; roles: RoleScores } {
  const leagueCp = format.cp;
  const warnings: string[] = [];
  const cup = cups?.find((c) => c.name === format.cup);
  if (hasDuplicateSpecies(lead, switchMon, closer)) {
    warnings.push("Duplicate species - illegal in GBL (including Shadow vs non-Shadow).");
  }
  if (hasDuplicatePhysical(lead, switchMon, closer)) {
    warnings.push("Same box Pokémon used twice (including as an Evo candidate).");
  }
  for (const [slot, mon] of [
    ["Lead", lead],
    ["Switch", switchMon],
    ["Closer", closer],
  ] as const) {
    if (!isPlayableInLeague(mon, leagueCp)) {
      warnings.push(
        `${slot} ${mon.speciesName} (${mon.cp} CP) is outside the playable range (${minCpForLeague(leagueCp)}-${leagueCp}).`,
      );
    }
    const sid = mon.flags.shadow ? `${mon.speciesId}_shadow` : mon.speciesId;
    const meta = typeMap?.[sid] ?? typeMap?.[mon.speciesId];
    const tags = [
      ...(meta?.tags ?? []),
      ...(mon.flags.shadow ? ["shadow"] : []),
      ...(mon.formLabel?.toLowerCase().includes("mega") ? ["mega"] : []),
    ];
    if (
      format.cup !== "all" &&
      !isEligibleSpecies(mon.speciesId, meta?.types ?? [], tags, format, cup)
    ) {
      warnings.push(`${slot} ${mon.speciesName} is not eligible in ${format.label}.`);
    }
  }

  const lab = (m: BoxPokemon) => m.note === "lab";
  const L = scoreBoxMon(
    lead,
    overall,
    leads,
    switches,
    closers,
    statsFor(lead, statsMap),
    leagueCp,
    lab(lead),
  );
  const S = scoreBoxMon(
    switchMon,
    overall,
    leads,
    switches,
    closers,
    statsFor(switchMon, statsMap),
    leagueCp,
    lab(switchMon),
  );
  const C = scoreBoxMon(
    closer,
    overall,
    leads,
    switches,
    closers,
    statsFor(closer, statsMap),
    leagueCp,
    lab(closer),
  );
  const { score: rawScore, reason, coverage, roles } = teamScoreFromRoles(
    L,
    S,
    C,
    lookup,
    typeMap,
    overall[0]?.score ?? 100,
    movePools,
  );
  const illegal = warnings.length > 0;
  const score = illegal ? 0 : rawScore;

  return {
    lead,
    switchMon,
    closer,
    score,
    reason: illegal ? warnings[0] : reason,
    coverage,
    warnings,
    roles,
  };
}

export function movesDelta(
  currentFast?: string,
  currentCharged: string[] = [],
  recommended?: string[],
  eliteMoves: string[] = [],
): {
  currentOk: boolean;
  recommended: string[];
  missing: string[];
  missingElite: string[];
  missingTm: string[];
} {
  if (!recommended?.length) {
    return {
      currentOk: true,
      recommended: [],
      missing: [],
      missingElite: [],
      missingTm: [],
    };
  }
  const elite = new Set(eliteMoves.map((m) => m.toUpperCase()));
  const rec = recommended.map((m) => m.toUpperCase());
  const have = new Set(
    [currentFast, ...currentCharged].filter(Boolean).map((m) => String(m).toUpperCase()),
  );
  const missing = rec.filter((m) => !have.has(m));
  const missingElite = missing.filter((m) => elite.has(m));
  const missingTm = missing.filter((m) => !elite.has(m));
  return {
    currentOk: missing.length === 0,
    recommended: rec,
    missing,
    missingElite,
    missingTm,
  };
}

export function isEliteMove(moveId: string, eliteMoves: string[] = []): boolean {
  return eliteMoves.some((e) => e.toUpperCase() === moveId.toUpperCase());
}
