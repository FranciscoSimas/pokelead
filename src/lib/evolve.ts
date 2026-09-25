import type { BoxPokemon, LeagueCp, RankEntry } from "./types";
import type { GameMaster, GmPokemon } from "./pvpoke";
import {
  calcCp,
  monLevelCap,
  resolveMonLevel,
  rankIvSpread,
  shadowAdjustedBase,
  type BaseStats,
  type IvRankResult,
} from "./ivRank";

export type EvolutionTarget = {
  speciesId: string;
  speciesName: string;
  dex: number;
  shadow: boolean;
  gm: GmPokemon;
};

export type RoleRankSnap = {
  overall: number | null;
  leads: number | null;
  switches: number | null;
  closers: number | null;
};

export type EvolutionPreview = {
  target: EvolutionTarget;
  level: number;
  cpAtLevel: number;
  maxCp40: number;
  maxCp50: number;
  ivByLeague: Record<1500 | 2500 | 10000, IvRankResult | null>;
  ranksNow: Record<LeagueCp, RoleRankSnap>;
  ranksAfter: Record<LeagueCp, RoleRankSnap>;
};

function baseName(p: GmPokemon): string {
  return p.speciesName.replace(/\s*\([^)]*\)\s*/g, "").trim();
}

function baseSpeciesId(id: string): string {
  return id.replace(/_shadow$/i, "");
}

function resolveGm(gm: GameMaster, speciesId: string, shadow: boolean): GmPokemon | null {
  const base = baseSpeciesId(speciesId);
  const want = shadow ? `${base}_shadow` : base;
  return (
    gm.pokemon.find((p) => p.speciesId === want) ??
    gm.pokemon.find((p) => p.speciesId === base) ??
    null
  );
}

/** Follow family.evolutions chains (and shadow counterparts when needed). */
export function listEvolutions(
  gm: GameMaster,
  speciesId: string,
  shadow: boolean,
): EvolutionTarget[] {
  const start = resolveGm(gm, speciesId, shadow);
  if (!start) return [];

  const out: EvolutionTarget[] = [];
  const seen = new Set<string>();
  const queue = [...(start.family?.evolutions ?? [])];

  while (queue.length) {
    const nextId = queue.shift()!;
    if (seen.has(nextId)) continue;
    seen.add(nextId);

    const resolvedShadow = shadow ? resolveGm(gm, nextId, true) : null;
    const evo = resolvedShadow ?? resolveGm(gm, nextId, false);
    if (!evo) continue;

    out.push({
      speciesId: evo.speciesId,
      speciesName: baseName(evo),
      dex: evo.dex,
      // Keep shadow even if GM fell back to a non-shadow row (CP uses adjusted stats).
      shadow,
      gm: evo,
    });

    for (const further of evo.family?.evolutions ?? []) {
      if (!seen.has(further)) queue.push(further);
    }
  }

  return out;
}

function rankOf(list: RankEntry[] | undefined, ids: string[]): number | null {
  if (!list?.length) return null;
  for (const id of ids) {
    const i = list.findIndex((r) => r.speciesId === id);
    if (i >= 0) return i + 1;
  }
  return null;
}

function snapFor(
  speciesId: string,
  shadow: boolean,
  lists: {
    overall?: RankEntry[];
    leads?: RankEntry[];
    switches?: RankEntry[];
    closers?: RankEntry[];
  },
): RoleRankSnap {
  const base = baseSpeciesId(speciesId);
  const ids = shadow ? [`${base}_shadow`, base] : [base, `${base}_shadow`];
  return {
    overall: rankOf(lists.overall, ids),
    leads: rankOf(lists.leads, ids),
    switches: rankOf(lists.switches, ids),
    closers: rankOf(lists.closers, ids),
  };
}

export type LeagueRankBundle = {
  overall: RankEntry[];
  leads: RankEntry[];
  switches: RankEntry[];
  closers: RankEntry[];
};

function isShadowGmEntry(p: GmPokemon): boolean {
  return (
    p.speciesId.toLowerCase().includes("_shadow") ||
    (p.tags ?? []).some((t) => t.toLowerCase() === "shadow")
  );
}

function statsForCurrentMon(mon: BoxPokemon, currentGm: GmPokemon): BaseStats | null {
  if (!currentGm.baseStats) return null;
  if (mon.flags.shadow && !isShadowGmEntry(currentGm)) {
    return shadowAdjustedBase(currentGm.baseStats);
  }
  return currentGm.baseStats;
}

function statsForEvoTarget(target: EvolutionTarget): BaseStats | null {
  if (!target.gm.baseStats) return null;
  if (target.shadow && !isShadowGmEntry(target.gm)) {
    return shadowAdjustedBase(target.gm.baseStats);
  }
  return target.gm.baseStats;
}

export function previewEvolution(
  mon: BoxPokemon,
  currentGm: GmPokemon,
  target: EvolutionTarget,
  ranksByLeague: Partial<Record<LeagueCp, LeagueRankBundle>>,
): EvolutionPreview | null {
  const levelStats = statsForCurrentMon(mon, currentGm);
  const evoStats = statsForEvoTarget(target);
  if (!levelStats || !evoStats) return null;

  const maxLevel = monLevelCap(10000, mon.flags.bestBuddy);
  const level = resolveMonLevel(
    levelStats,
    mon.atkIv,
    mon.defIv,
    mon.hpIv,
    mon.cp,
    mon.level,
    maxLevel,
  );
  const cpAtLevel = calcCp(evoStats, mon.atkIv, mon.defIv, mon.hpIv, level);
  const maxCp40 = calcCp(evoStats, mon.atkIv, mon.defIv, mon.hpIv, 40);
  const maxCp50 = calcCp(evoStats, mon.atkIv, mon.defIv, mon.hpIv, maxLevel);

  const leagues: (1500 | 2500 | 10000)[] = [1500, 2500, 10000];
  const ivByLeague = {} as EvolutionPreview["ivByLeague"];
  const ranksNow = {} as EvolutionPreview["ranksNow"];
  const ranksAfter = {} as EvolutionPreview["ranksAfter"];

  for (const league of leagues) {
    ivByLeague[league] = rankIvSpread(
      evoStats,
      mon.atkIv,
      mon.defIv,
      mon.hpIv,
      league,
      monLevelCap(league, mon.flags.bestBuddy),
    );
    const bundle = ranksByLeague[league];
    ranksNow[league] = snapFor(mon.speciesId, mon.flags.shadow, bundle ?? {});
    ranksAfter[league] = snapFor(target.speciesId, target.shadow, bundle ?? {});
  }

  return {
    target,
    level,
    cpAtLevel,
    maxCp40,
    maxCp50,
    ivByLeague,
    ranksNow,
    ranksAfter,
  };
}

/** Apply evolution in-place: keep IVs/tags/flags, update species + CP at same level. */
export function buildEvolvedPokemon(
  mon: BoxPokemon,
  currentGm: GmPokemon,
  target: EvolutionTarget,
): Partial<BoxPokemon> {
  const maxLevel = monLevelCap(10000, mon.flags.bestBuddy);
  const levelStats = statsForCurrentMon(mon, currentGm);
  const level = levelStats
    ? resolveMonLevel(
        levelStats,
        mon.atkIv,
        mon.defIv,
        mon.hpIv,
        mon.cp,
        mon.level,
        maxLevel,
      )
    : 20;
  const evoStats = statsForEvoTarget(target);
  const cp = evoStats
    ? calcCp(evoStats, mon.atkIv, mon.defIv, mon.hpIv, level)
    : mon.cp;

  const fastPool = new Set(target.gm.fastMoves.map((m) => m.toUpperCase()));
  const chargedPool = new Set(target.gm.chargedMoves.map((m) => m.toUpperCase()));
  const fast =
    mon.fastMove && fastPool.has(mon.fastMove.toUpperCase())
      ? mon.fastMove
      : target.gm.fastMoves[0];
  const charged = mon.chargedMoves
    .filter((m) => chargedPool.has(m.toUpperCase()))
    .slice(0, 2);
  const chargedMoves =
    charged.length > 0
      ? charged
      : target.gm.chargedMoves.slice(0, 2);

  const keptForm =
    mon.formLabel && mon.formLabel.toLowerCase() !== "shadow"
      ? mon.formLabel
      : undefined;

  return {
    speciesId: baseSpeciesId(target.speciesId),
    speciesName: target.speciesName,
    dex: target.dex,
    formLabel: target.shadow ? "Shadow" : keptForm,
    cp,
    level,
    fastMove: fast,
    chargedMoves,
    flags: { ...mon.flags, shadow: target.shadow },
  };
}
