import type { BoxPokemon } from "./types";

/** Pokémon GO PvP type chart (same matchups as main series, different multipliers). */
export const GO_TYPES = [
  "normal",
  "fire",
  "water",
  "electric",
  "grass",
  "ice",
  "fighting",
  "poison",
  "ground",
  "flying",
  "psychic",
  "bug",
  "rock",
  "ghost",
  "dragon",
  "dark",
  "steel",
  "fairy",
] as const;

export type GoType = (typeof GO_TYPES)[number];

/** Super-effective / resisted / immune (treated as double resist). */
export const GO_SE = 1.6;
export const GO_NVE = 0.625;
export const GO_IMMUNE = 0.390625; // 0.625^2. GO has no true immunities.
export const GO_DOUBLE_SE = 2.56; // 1.6²

type Chart = Record<string, Partial<Record<GoType, number>>>;

/** Attacker → defender. Missing = 1. Values are one-step: SE / NVE / immune. */
const CHART: Chart = {
  normal: { rock: GO_NVE, ghost: GO_IMMUNE, steel: GO_NVE },
  fire: {
    fire: GO_NVE,
    water: GO_NVE,
    grass: GO_SE,
    ice: GO_SE,
    bug: GO_SE,
    rock: GO_NVE,
    dragon: GO_NVE,
    steel: GO_SE,
  },
  water: {
    fire: GO_SE,
    water: GO_NVE,
    grass: GO_NVE,
    ground: GO_SE,
    rock: GO_SE,
    dragon: GO_NVE,
  },
  electric: {
    water: GO_SE,
    electric: GO_NVE,
    grass: GO_NVE,
    ground: GO_IMMUNE,
    flying: GO_SE,
    dragon: GO_NVE,
  },
  grass: {
    fire: GO_NVE,
    water: GO_SE,
    grass: GO_NVE,
    poison: GO_NVE,
    ground: GO_SE,
    flying: GO_NVE,
    bug: GO_NVE,
    rock: GO_SE,
    dragon: GO_NVE,
    steel: GO_NVE,
  },
  ice: {
    fire: GO_NVE,
    water: GO_NVE,
    grass: GO_SE,
    ice: GO_NVE,
    ground: GO_SE,
    flying: GO_SE,
    dragon: GO_SE,
    steel: GO_NVE,
  },
  fighting: {
    normal: GO_SE,
    ice: GO_SE,
    poison: GO_NVE,
    flying: GO_NVE,
    psychic: GO_NVE,
    bug: GO_NVE,
    rock: GO_SE,
    ghost: GO_IMMUNE,
    dark: GO_SE,
    steel: GO_SE,
    fairy: GO_NVE,
  },
  poison: {
    grass: GO_SE,
    poison: GO_NVE,
    ground: GO_NVE,
    rock: GO_NVE,
    ghost: GO_NVE,
    steel: GO_IMMUNE,
    fairy: GO_SE,
  },
  ground: {
    fire: GO_SE,
    electric: GO_SE,
    grass: GO_NVE,
    poison: GO_SE,
    flying: GO_IMMUNE,
    bug: GO_NVE,
    rock: GO_SE,
    steel: GO_SE,
  },
  flying: {
    electric: GO_NVE,
    grass: GO_SE,
    fighting: GO_SE,
    bug: GO_SE,
    rock: GO_NVE,
    steel: GO_NVE,
  },
  psychic: {
    fighting: GO_SE,
    poison: GO_SE,
    psychic: GO_NVE,
    dark: GO_IMMUNE,
    steel: GO_NVE,
  },
  bug: {
    fire: GO_NVE,
    grass: GO_SE,
    fighting: GO_NVE,
    poison: GO_NVE,
    flying: GO_NVE,
    psychic: GO_SE,
    ghost: GO_NVE,
    dark: GO_SE,
    steel: GO_NVE,
    fairy: GO_NVE,
  },
  rock: {
    fire: GO_SE,
    ice: GO_SE,
    fighting: GO_NVE,
    ground: GO_NVE,
    flying: GO_SE,
    bug: GO_SE,
    steel: GO_NVE,
  },
  ghost: { normal: GO_IMMUNE, psychic: GO_SE, ghost: GO_SE, dark: GO_NVE },
  dragon: { dragon: GO_SE, steel: GO_NVE, fairy: GO_IMMUNE },
  dark: { fighting: GO_NVE, psychic: GO_SE, ghost: GO_SE, dark: GO_NVE, fairy: GO_NVE },
  steel: {
    fire: GO_NVE,
    water: GO_NVE,
    electric: GO_NVE,
    ice: GO_SE,
    rock: GO_SE,
    steel: GO_NVE,
    fairy: GO_SE,
  },
  fairy: {
    fire: GO_NVE,
    fighting: GO_SE,
    poison: GO_NVE,
    dragon: GO_SE,
    dark: GO_SE,
    steel: GO_NVE,
  },
};

export function typeMultiplier(attackType: string, defenderTypes: string[]): number {
  const atk = attackType.toLowerCase();
  let m = 1;
  for (const d of defenderTypes) {
    const step = CHART[atk]?.[d.toLowerCase() as GoType];
    m *= step ?? 1;
  }
  return m;
}

export type MoveInfo = { type: string; energy?: number; name: string };

export type MatchupTag = {
  type: string;
  multiplier: number;
};

export type MemberMatchup = {
  name: string;
  multiplier: number;
};

export type TeamTypeTag = {
  type: string;
  multiplier: number;
  members: MemberMatchup[];
};

export type MemberCoverage = {
  speciesName: string;
  types: string[];
  weaknesses: MatchupTag[];
  resists: MatchupTag[];
};

export type TeamCoverage = {
  /** 0-100 blended coverage score used in team ranking */
  score: number;
  grade: string;
  seCount: number;
  doubleSeCount: number;
  holes: string[];
  doubleHoles: string[];
  resists: string[];
  strongVs: string[];
  dualCharged: number;
  typeOverlap: string[];
  notes: string[];
  members: MemberCoverage[];
  hitsSe: TeamTypeTag[];
  teamWeaknesses: TeamTypeTag[];
  teamResists: TeamTypeTag[];
  chargedAdvice: string[];
  extraNotes: string[];
};

export function fmtMult(m: number): string {
  if (m >= GO_DOUBLE_SE - 0.01) return "2.56x";
  if (m >= GO_SE - 0.01) return "1.6x";
  if (m <= GO_IMMUNE + 0.01) return "0.39x";
  if (m <= GO_NVE + 0.01) return "0.625x";
  return `${Math.round(m * 100) / 100}x`;
}

/**
 * Common Great/Ultra League cores. Dual types stack in GO:
 * Electric vs Water is 1.6x, but Electric vs Water/Ground is 0.625x
 * because Ground treats Electric as 0.39x.
 */
const META_CORES: string[][] = [
  ["water", "ground"],
  ["steel", "flying"],
  ["water", "poison"],
  ["ice", "fairy"],
  ["ghost", "poison"],
  ["electric", "steel"],
  ["bug", "steel"],
  ["ground", "flying"],
  ["rock", "water"],
  ["ice", "ground"],
  ["fighting", "steel"],
  ["grass", "steel"],
  ["dark", "flying"],
  ["fire"],
  ["water"],
  ["grass"],
  ["fighting"],
  ["dragon"],
  ["dark"],
  ["ghost"],
  ["fairy"],
  ["normal"],
  ["steel"],
  ["electric"],
  ["psychic"],
];

function gradeOf(score: number): string {
  if (score >= 92) return "A+";
  if (score >= 84) return "A";
  if (score >= 76) return "B+";
  if (score >= 68) return "B";
  if (score >= 58) return "C";
  if (score >= 48) return "D";
  return "F";
}

export function resolveTypes(
  mon: BoxPokemon,
  typeMap?: Record<string, { types: string[]; tags?: string[] }>,
): string[] {
  const sid = mon.flags.shadow ? `${mon.speciesId}_shadow` : mon.speciesId;
  return (typeMap?.[sid]?.types ?? typeMap?.[mon.speciesId]?.types ?? [])
    .map((t) => t.toLowerCase())
    .filter((t) => t && t !== "none");
}

export function memberName(mon: BoxPokemon): string {
  const n = mon.speciesName.replace(/\s*\(Shadow\)\s*/i, "").trim();
  return mon.flags.shadow && !/^shadow\s/i.test(n) ? `Shadow ${n}` : n;
}

function moveTypesOf(mon: BoxPokemon, lookup: (id: string) => MoveInfo | undefined): string[] {
  const ids = [mon.fastMove, ...mon.chargedMoves].filter(Boolean) as string[];
  return ids
    .map((id) => lookup(id)?.type?.toLowerCase())
    .filter((t): t is string => Boolean(t));
}

function chargedTypesOf(mon: BoxPokemon, lookup: (id: string) => MoveInfo | undefined): string[] {
  return mon.chargedMoves
    .filter(Boolean)
    .map((id) => lookup(id)?.type?.toLowerCase())
    .filter((t): t is string => Boolean(t));
}

function bestHit(moveTypes: string[], defender: string[]): number {
  if (!moveTypes.length) return 1;
  let best = 0;
  for (const atk of moveTypes) {
    const m = typeMultiplier(atk, defender);
    if (m > best) best = m;
  }
  return best;
}

/**
 * Offensive coverage vs real cores, shared holes, dual charged moves, and stacked typing.
 */
export function analyzeTeamCoverage(
  team: BoxPokemon[],
  lookup: (id: string) => MoveInfo | undefined,
  typeMap?: Record<string, { types: string[]; tags?: string[] }>,
  movePools?: Record<string, string[]>,
): TeamCoverage {
  const uniqueMoveTypes = [...new Set(team.flatMap((m) => moveTypesOf(m, lookup)))];

  const strongVs: string[] = [];
  let seCount = 0;
  let doubleSeCount = 0;
  for (const def of GO_TYPES) {
    const best = bestHit(uniqueMoveTypes, [def]);
    if (best >= GO_DOUBLE_SE - 0.01) {
      doubleSeCount++;
      seCount++;
      strongVs.push(def);
    } else if (best >= GO_SE - 0.01) {
      seCount++;
      strongVs.push(def);
    }
  }
  // 1.6x vs a type/core is the goal. 2.56x is a bonus, not the expected max.
  const typeScore = (seCount / GO_TYPES.length) * 100;

  let coresCovered = 0;
  for (const core of META_CORES) {
    if (bestHit(uniqueMoveTypes, core) >= GO_SE - 0.01) coresCovered++;
  }
  const coreScore = (coresCovered / META_CORES.length) * 100;
  const offense = Math.round(typeScore * 0.55 + coreScore * 0.45);

  const holes: string[] = [];
  const doubleHoles: string[] = [];
  const resists: string[] = [];
  for (const atk of GO_TYPES) {
    let weak = 0;
    let doubleWeak = 0;
    let resistCount = 0;
    for (const mon of team) {
      const types = resolveTypes(mon, typeMap);
      if (!types.length) continue;
      const m = typeMultiplier(atk, types);
      if (m >= GO_DOUBLE_SE - 0.01) {
        doubleWeak++;
        weak++;
      } else if (m >= GO_SE - 0.01) {
        weak++;
      } else if (m <= GO_NVE + 0.01) {
        resistCount++;
      }
    }
    if (doubleWeak >= 2) doubleHoles.push(atk);
    if (weak >= 2) holes.push(atk);
    if (resistCount >= 2 && weak === 0) resists.push(atk);
  }

  const dualCharged = team.filter((m) => m.chargedMoves.filter(Boolean).length >= 2).length;
  const dualScore = Math.round((dualCharged / Math.max(1, team.length)) * 100);

  let sameChargedPenalty = 0;
  for (const mon of team) {
    const charged = chargedTypesOf(mon, lookup);
    if (charged.length >= 2 && new Set(charged).size === 1) {
      sameChargedPenalty += 3;
    }
  }

  const typeCounts: Record<string, number> = {};
  for (const mon of team) {
    for (const t of resolveTypes(mon, typeMap)) {
      typeCounts[t] = (typeCounts[t] ?? 0) + 1;
    }
  }
  const typeOverlap = Object.entries(typeCounts)
    .filter(([t, n]) => n >= 2 && t !== "none")
    .map(([t]) => t);

  const holePenalty = holes.length * 4 + doubleHoles.length * 8;
  const overlapPenalty = typeOverlap.length * 4;
  const resistBonus = Math.min(10, resists.length * 2);

  const members: MemberCoverage[] = team.map((mon) => {
    const types = resolveTypes(mon, typeMap);
    const weaknesses: MatchupTag[] = [];
    const memberResists: MatchupTag[] = [];
    for (const atk of GO_TYPES) {
      if (!types.length) break;
      const m = typeMultiplier(atk, types);
      if (m >= GO_SE - 0.01) weaknesses.push({ type: atk, multiplier: m });
      else if (m <= GO_NVE + 0.01) memberResists.push({ type: atk, multiplier: m });
    }
    weaknesses.sort((a, b) => b.multiplier - a.multiplier);
    memberResists.sort((a, b) => a.multiplier - b.multiplier);
    return { speciesName: memberName(mon), types, weaknesses, resists: memberResists };
  });

  const hitsSe: TeamTypeTag[] = [];
  for (const def of GO_TYPES) {
    const rows = team.map((mon) => ({
      name: memberName(mon),
      multiplier: bestHit(moveTypesOf(mon, lookup), [def]),
    }));
    const best = Math.max(0, ...rows.map((m) => m.multiplier));
    if (best >= GO_SE - 0.01) hitsSe.push({ type: def, multiplier: best, members: rows });
  }
  hitsSe.sort(sortHits);

  const teamWeaknesses: TeamTypeTag[] = [];
  const teamResists: TeamTypeTag[] = [];
  for (const atk of GO_TYPES) {
    const rows = team.map((mon) => {
      const types = resolveTypes(mon, typeMap);
      return { name: memberName(mon), multiplier: types.length ? typeMultiplier(atk, types) : 1 };
    });
    const best = Math.max(0, ...rows.map((m) => m.multiplier));
    const safest = Math.min(1, ...rows.map((m) => m.multiplier));
    if (best >= GO_SE - 0.01) {
      teamWeaknesses.push({ type: atk, multiplier: best, members: rows });
    }
    if (safest <= GO_NVE + 0.01) {
      teamResists.push({ type: atk, multiplier: safest, members: rows });
    }
  }
  teamWeaknesses.sort(sortWeak);
  teamResists.sort(sortResist);

  const chargedAdvice: string[] = [];
  const uncovered = GO_TYPES.filter((t) => !hitsSe.some((h) => h.type === t));
  for (const mon of team) {
    const charged = chargedTypesOf(mon, lookup);
    const nCharged = mon.chargedMoves.filter(Boolean).length;
    const sid = mon.flags.shadow ? `${mon.speciesId}_shadow` : mon.speciesId;
    const pool = movePools?.[sid] ?? movePools?.[mon.speciesId] ?? [];
    const have = new Set(mon.chargedMoves.filter(Boolean).map((m) => m.toUpperCase()));
    const currentTypes = moveTypesOf(mon, lookup);

    if (nCharged < 2) {
      const pick = bestCoverageCharged(pool, have, currentTypes, uniqueMoveTypes, lookup, uncovered);
      chargedAdvice.push(
        pick
          ? `${mon.speciesName} has 1 charged move. Add ${pick.name} (${cap(pick.type)}) for coverage.`
          : `${mon.speciesName} has 1 charged move. Add a second charged of another type (Ice, Fighting, or Ground).`,
      );
    } else if (new Set(charged).size === 1) {
      const pick = bestCoverageCharged(pool, have, currentTypes, uniqueMoveTypes, lookup, uncovered);
      chargedAdvice.push(
        pick
          ? `${mon.speciesName} has two ${cap(charged[0])} charged moves. Learn ${pick.name} (${cap(pick.type)}) instead of a duplicate.`
          : `${mon.speciesName} has two ${cap(charged[0])} charged moves. A second type covers more.`,
      );
    } else {
      const named = mon.chargedMoves
        .filter(Boolean)
        .map((id) => lookup(id)?.name ?? id.replace(/_/g, " "));
      const energies = mon.chargedMoves
        .filter(Boolean)
        .map((id) => lookup(id)?.energy)
        .filter((e): e is number => typeof e === "number" && e > 0);
      const bait =
        energies.length >= 2 && energies[0] !== energies[1]
          ? energies[0] < energies[1]
            ? named[0]
            : named[1]
          : null;
      chargedAdvice.push(
        bait
          ? `${mon.speciesName}: ${named.join(" + ")}. ${bait} is the cheaper bait.`
          : `${mon.speciesName}: ${named.join(" + ")}. Two types is the right idea.`,
      );
    }
  }

  const extraNotes: string[] = [];
  if (typeOverlap.length) {
    extraNotes.push(
      `Two or more share ${typeOverlap.map(cap).join(" / ")} typing. They can share the same weakness.`,
    );
  }
  if (coresCovered < 10) {
    extraNotes.push("Offensive coverage is thin. Add a second charged type (Ice, Fighting, or Ground).");
  }

  const score = Math.max(
    0,
    Math.min(
      100,
      Math.round(
        offense * 0.72 +
          dualScore * 0.16 +
          14 +
          resistBonus -
          holePenalty -
          overlapPenalty -
          sameChargedPenalty,
      ),
    ),
  );

  return {
    score,
    grade: gradeOf(score),
    seCount,
    doubleSeCount,
    holes,
    doubleHoles,
    resists,
    strongVs,
    dualCharged,
    typeOverlap,
    notes: extraNotes,
    members,
    hitsSe,
    teamWeaknesses,
    teamResists,
    chargedAdvice,
    extraNotes,
  };
}

function seCountOf(tag: TeamTypeTag): number {
  return tag.members.filter((m) => m.multiplier >= GO_SE - 0.01).length;
}

function resistCountOf(tag: TeamTypeTag): number {
  return tag.members.filter((m) => m.multiplier <= GO_NVE + 0.01).length;
}

function sortHits(a: TeamTypeTag, b: TeamTypeTag): number {
  if (b.multiplier !== a.multiplier) return b.multiplier - a.multiplier;
  return seCountOf(b) - seCountOf(a);
}

function sortWeak(a: TeamTypeTag, b: TeamTypeTag): number {
  if (b.multiplier !== a.multiplier) return b.multiplier - a.multiplier;
  return seCountOf(b) - seCountOf(a);
}

function sortResist(a: TeamTypeTag, b: TeamTypeTag): number {
  if (a.multiplier !== b.multiplier) return a.multiplier - b.multiplier;
  return resistCountOf(b) - resistCountOf(a);
}

function bestCoverageCharged(
  pool: string[],
  have: Set<string>,
  currentMonTypes: string[],
  teamMoveTypes: string[],
  lookup: (id: string) => MoveInfo | undefined,
  uncovered: string[],
): { name: string; type: string } | null {
  let best: { name: string; type: string; gain: number } | null = null;
  for (const id of pool) {
    if (!id || have.has(id.toUpperCase())) continue;
    const info = lookup(id);
    const type = info?.type?.toLowerCase();
    if (!type || currentMonTypes.includes(type)) continue;
    let gain = 0;
    for (const def of GO_TYPES) {
      const now = bestHit(teamMoveTypes, [def]);
      const next = Math.max(now, typeMultiplier(type, [def]));
      if (next >= GO_SE - 0.01 && now < GO_SE - 0.01) gain += 3;
      else if (next >= GO_DOUBLE_SE - 0.01 && now < GO_DOUBLE_SE - 0.01) gain += 2;
    }
    if (uncovered.includes(type)) gain += 1;
    if (!best || gain > best.gain) {
      best = { name: info?.name ?? id.replace(/_/g, " "), type, gain };
    }
  }
  return best;
}

function cap(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
