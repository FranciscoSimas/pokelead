import type { BoxPokemon } from "./types";
import type { FormatOption } from "./formats";
import type { GameMaster, GmPokemon } from "./pvpoke";
import {
  listEvolutions,
  type EvolutionTarget,
} from "./evolve";
import {
  calcCp,
  ivRankParams,
  monLevelCap,
  rankIvSpread,
  resolveMonLevel,
  shadowAdjustedBase,
  type BaseStats,
} from "./ivRank";
import { evolutionCandyCost } from "./evoCandy";
import { powerUpCandyBetween } from "./powerUpCosts";

export type InvestKind = "evolve" | "power";

export type EvoProjection = {
  kind: InvestKind;
  sourceId: string;
  sourceName: string;
  sourceDex: number;
  /** CP right after evolve (evolve) or current CP (power) */
  evolveCp: number;
  currentLevel: number;
  /** Max CP under the selected league / cup CP cap */
  leagueMaxCp: number;
  leagueMaxLevel: number;
  candyEvolve: number | null;
  candyPowerUp: number;
  xlCandyPowerUp: number;
};

function baseSpeciesId(id: string): string {
  return id.replace(/_shadow$/i, "");
}

function isShadowGm(p: GmPokemon): boolean {
  return (
    p.speciesId.toLowerCase().includes("_shadow") ||
    (p.tags ?? []).some((t) => t.toLowerCase() === "shadow")
  );
}

function resolveCurrentGm(
  gm: GameMaster,
  mon: BoxPokemon,
): GmPokemon | null {
  const base = baseSpeciesId(mon.speciesId);
  const want = mon.flags.shadow ? `${base}_shadow` : base;
  return (
    gm.pokemon.find((p) => p.speciesId === want) ??
    gm.pokemon.find((p) => p.speciesId === base) ??
    null
  );
}

/** Base stats for level/CP of the mon currently in the box. */
function statsForLevel(mon: BoxPokemon, currentGm: GmPokemon): BaseStats | null {
  if (!currentGm.baseStats) return null;
  if (mon.flags.shadow && !isShadowGm(currentGm)) {
    return shadowAdjustedBase(currentGm.baseStats);
  }
  return currentGm.baseStats;
}

function isMegaTarget(t: EvolutionTarget): boolean {
  const id = t.speciesId.toLowerCase();
  const tags = (t.gm.tags ?? []).map((x) => x.toLowerCase());
  return id.includes("_mega") || tags.includes("mega");
}

/** Final forms only (no further non-mega evolutions). */
function leafEvolutions(
  gm: GameMaster,
  mon: BoxPokemon,
): EvolutionTarget[] {
  const all = listEvolutions(gm, mon.speciesId, mon.flags.shadow).filter(
    (t) => !isMegaTarget(t),
  );
  return all.filter((t) => {
    const further = (t.gm.family?.evolutions ?? []).filter((id) => {
      const low = id.toLowerCase();
      return !low.includes("_mega");
    });
    return further.length === 0;
  });
}

function defaultMoves(target: EvolutionTarget, mon: BoxPokemon) {
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
    charged.length > 0 ? charged : target.gm.chargedMoves.slice(0, 2);
  return { fastMove: fast, chargedMoves };
}

/** Evo species stats; apply shadow multiplier when GM fell back to non-shadow. */
function statsForEvoTarget(target: EvolutionTarget): BaseStats | null {
  if (!target.gm.baseStats) return null;
  if (target.shadow && !isShadowGm(target.gm)) {
    return shadowAdjustedBase(target.gm.baseStats);
  }
  return target.gm.baseStats;
}

export function isEvoProjection(mon: BoxPokemon): boolean {
  return Boolean(mon.evo);
}

export function investBadgeLabel(evo: Pick<EvoProjection, "kind">): string {
  return evo.kind === "power" ? "Power" : "Evo";
}

/** Display: Original/Evolve X · max Y · ~N candy */
export function formatEvoInvestLine(
  evo: Pick<
    EvoProjection,
    | "kind"
    | "evolveCp"
    | "leagueMaxCp"
    | "candyEvolve"
    | "candyPowerUp"
    | "xlCandyPowerUp"
  >,
): string {
  const parts = [
    evo.kind === "power" ? `Original ${evo.evolveCp}` : `Evolve ${evo.evolveCp}`,
    `max ${evo.leagueMaxCp}`,
  ];
  if (evo.kind === "evolve" && evo.candyEvolve != null) {
    let candy = `~${evo.candyEvolve + evo.candyPowerUp} candy`;
    if (evo.xlCandyPowerUp > 0) candy += `, ${evo.xlCandyPowerUp} XL`;
    parts.push(candy);
  } else if (evo.candyPowerUp > 0 || evo.xlCandyPowerUp > 0) {
    let candy = "";
    if (evo.candyPowerUp > 0) candy = `~${evo.candyPowerUp} candy`;
    if (evo.xlCandyPowerUp > 0) {
      candy = candy
        ? `${candy}, ${evo.xlCandyPowerUp} XL`
        : `${evo.xlCandyPowerUp} XL`;
    }
    if (candy) parts.push(candy);
  }
  return parts.join(" · ");
}

/** True when the mon has no further non-mega evolutions (final form). */
export function isFinalEvolution(gm: GameMaster, mon: BoxPokemon): boolean {
  const leaves = leafEvolutions(gm, mon).filter(
    (t) => baseSpeciesId(t.speciesId) !== baseSpeciesId(mon.speciesId),
  );
  return leaves.length === 0;
}

/**
 * Build a virtual box mon: evolved species at league-max CP for scoring.
 * Returns null when evolving at the current level would exceed the league cap.
 */
export function projectEvoCandidate(
  mon: BoxPokemon,
  currentGm: GmPokemon,
  target: EvolutionTarget,
  format: FormatOption,
): BoxPokemon | null {
  const evoStats = statsForEvoTarget(target);
  if (!evoStats) return null;
  const levelStats = statsForLevel(mon, currentGm);
  if (!levelStats) return null;

  const levelCap = monLevelCap(format.cp, mon.flags.bestBuddy);
  const currentLevel = resolveMonLevel(
    levelStats,
    mon.atkIv,
    mon.defIv,
    mon.hpIv,
    mon.cp,
    mon.level,
    levelCap,
  );

  const evolveCp = calcCp(
    evoStats,
    mon.atkIv,
    mon.defIv,
    mon.hpIv,
    currentLevel,
  );

  const { cap } = ivRankParams(format.cp);
  const ranked = rankIvSpread(
    evoStats,
    mon.atkIv,
    mon.defIv,
    mon.hpIv,
    cap,
    levelCap,
  );

  if (evolveCp > cap) return null;
  if (ranked.level + 1e-9 < currentLevel) return null;

  const power = powerUpCandyBetween(currentLevel, ranked.level);
  const candyEvolve = evolutionCandyCost(mon.dex, target.dex);

  const moves = defaultMoves(target, mon);
  const evo: EvoProjection = {
    kind: "evolve",
    sourceId: mon.id,
    sourceName: mon.speciesName,
    sourceDex: mon.dex,
    evolveCp,
    currentLevel,
    leagueMaxCp: ranked.cp,
    leagueMaxLevel: ranked.level,
    candyEvolve,
    candyPowerUp: power.candy,
    xlCandyPowerUp: power.xlCandy,
  };

  return {
    id: `${mon.id}::evo::${target.speciesId}`,
    speciesId: baseSpeciesId(target.speciesId),
    speciesName: target.speciesName,
    dex: target.dex,
    formLabel: target.shadow ? "Shadow" : mon.formLabel,
    cp: ranked.cp,
    atkIv: mon.atkIv,
    defIv: mon.defIv,
    hpIv: mon.hpIv,
    level: ranked.level,
    fastMove: moves.fastMove,
    chargedMoves: moves.chargedMoves,
    flags: { ...mon.flags, shadow: target.shadow },
    tags: [...(mon.tags ?? []).filter((t) => t !== "Evo" && t !== "Power"), "Evo"],
    note: `Evo from ${mon.speciesName}`,
    createdAt: mon.createdAt,
    updatedAt: mon.updatedAt,
    evo,
  };
}

/**
 * Final-form mon that can still power up under the league cap:
 * replace at league-max CP (same id) with Power invest metadata.
 *
 * Skip when the box CP is already the league max for these IVs (including
 * 1-CP calc vs in-game mismatches) or when no half-level remains under the cap.
 */
export function projectPowerCandidate(
  mon: BoxPokemon,
  currentGm: GmPokemon,
  format: FormatOption,
): BoxPokemon | null {
  const levelStats = statsForLevel(mon, currentGm);
  if (!levelStats) return null;

  const { cap } = ivRankParams(format.cp);
  if (mon.cp > cap) return null;

  const levelCap = monLevelCap(format.cp, mon.flags.bestBuddy);
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

  // Need at least one half-level of room under the cap.
  if (ranked.level < currentLevel + 0.5 - 1e-9) return null;

  const cpAtCurrent = calcCp(
    levelStats,
    mon.atkIv,
    mon.defIv,
    mon.hpIv,
    currentLevel,
  );
  // Trust the higher of box CP and formula CP at the resolved level so a
  // 1499-in-game / 1500-calc mismatch does not invent a fake Power.
  const effectiveNow = Math.max(mon.cp, cpAtCurrent);
  if (ranked.cp <= effectiveNow) return null;

  const power = powerUpCandyBetween(currentLevel, ranked.level);
  if (power.candy === 0 && power.xlCandy === 0) return null;

  const evo: EvoProjection = {
    kind: "power",
    sourceId: mon.id,
    sourceName: mon.speciesName,
    sourceDex: mon.dex,
    evolveCp: mon.cp,
    currentLevel,
    leagueMaxCp: ranked.cp,
    leagueMaxLevel: ranked.level,
    candyEvolve: null,
    candyPowerUp: power.candy,
    xlCandyPowerUp: power.xlCandy,
  };

  return {
    ...mon,
    cp: ranked.cp,
    level: ranked.level,
    tags: [...(mon.tags ?? []).filter((t) => t !== "Evo" && t !== "Power"), "Power"],
    note: mon.note,
    evo,
  };
}

/**
 * Working box for Teams:
 * - includeEvos: add leaf evolution projections from pre-evos at league max
 * - includePower: replace final forms with league-max CP when they can still power up
 */
export function expandBoxWithEvos(
  box: BoxPokemon[],
  gm: GameMaster | null,
  format: FormatOption,
  includeEvos: boolean,
  includePower = false,
): BoxPokemon[] {
  if (!gm) return box;
  if (!includeEvos && !includePower) return box;

  const out: BoxPokemon[] = [];
  const extras: BoxPokemon[] = [];

  for (const mon of box) {
    if (mon.evo || mon.note === "lab") {
      out.push(mon);
      continue;
    }
    const currentGm = resolveCurrentGm(gm, mon);
    if (!currentGm) {
      out.push(mon);
      continue;
    }

    const leaves = leafEvolutions(gm, mon).filter(
      (t) => baseSpeciesId(t.speciesId) !== baseSpeciesId(mon.speciesId),
    );

    if (leaves.length > 0) {
      out.push(mon);
      if (includeEvos) {
        for (const target of leaves) {
          const projected = projectEvoCandidate(mon, currentGm, target, format);
          if (projected) extras.push(projected);
        }
      }
      continue;
    }

    if (includePower) {
      const powered = projectPowerCandidate(mon, currentGm, format);
      out.push(powered ?? mon);
    } else {
      out.push(mon);
    }
  }

  return extras.length ? [...out, ...extras] : out;
}
