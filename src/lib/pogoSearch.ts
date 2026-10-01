import type { GameMaster } from "./pvpoke";
import type { RankEntry } from "./types";

export type IvPreset = {
  id: string;
  label: string;
  hint: string;
  /** Valid Pokémon GO IV-band search fragment */
  query: string;
};

/** Common PvP IV band filters (Atk / Def / HP bands 0–4). */
export const IV_PRESETS: IvPreset[] = [
  {
    id: "classic-bulk",
    label: "Classic bulk",
    hint: "0–5 Atk · 11–15 Def/HP — most GL/UL picks",
    query: "0-1attack&3-4defense&3-4hp",
  },
  {
    id: "0-4-4",
    label: "0 / 15 / 15",
    hint: "0 Atk · 15 Def · 15 HP",
    query: "0attack&4defense&4hp",
  },
  {
    id: "0-3-3",
    label: "0 / 11–14 / 11–14",
    hint: "0 Atk · high Def & HP bands",
    query: "0attack&3defense&3hp",
  },
  {
    id: "0-3-4",
    label: "0 / 11–14 / 15",
    hint: "0 Atk · mid Def · 15 HP",
    query: "0attack&3defense&4hp",
  },
  {
    id: "0-4-3",
    label: "0 / 15 / 11–14",
    hint: "0 Atk · 15 Def · mid HP",
    query: "0attack&4defense&3hp",
  },
  {
    id: "1-4-4",
    label: "1–5 / 15 / 15",
    hint: "Low Atk · perfect Def/HP",
    query: "1attack&4defense&4hp",
  },
  {
    id: "1-4-3",
    label: "1–5 / 15 / 11–14",
    hint: "Low Atk · 15 Def · mid HP",
    query: "1attack&4defense&3hp",
  },
  {
    id: "hundo",
    label: "Hundo 15/15/15",
    hint: "Perfect IVs (4★)",
    query: "4attack&4defense&4hp",
  },
];

const ROLE_KEYS = ["overall", "leads", "switches", "closers"] as const;

export type RoleRankLists = {
  overall: RankEntry[];
  leads: RankEntry[];
  switches: RankEntry[];
  closers: RankEntry[];
};

/** Strip ranking suffixes so we can resolve dex from GameMaster. */
export function rankingBaseId(speciesId: string): string {
  return speciesId.replace(/_shadow$/i, "").replace(/_xs$/i, "");
}

function buildDexMap(gm: GameMaster): Map<string, number> {
  const map = new Map<string, number>();
  for (const p of gm.pokemon) {
    map.set(p.speciesId, p.dex);
    const base = rankingBaseId(p.speciesId);
    if (!map.has(base)) map.set(base, p.dex);
  }
  return map;
}

export type DexUnionResult = {
  /** Unique national dex numbers, first-seen order across roles. */
  dexNumbers: number[];
  /** Comma-OR Pokémon GO search string. */
  speciesQuery: string;
  /** How many ranking entries contributed before dedupe. */
  sourceCount: number;
  /** Entries skipped (no dex in GM). */
  unresolved: number;
};

/**
 * Union unique national dex from top N of overall + leads + switches + closers.
 * First appearance wins (overall fills first, then other roles).
 */
export function unionTopDex(
  lists: RoleRankLists,
  gm: GameMaster,
  limitPerRole = 50,
): DexUnionResult {
  const dexMap = buildDexMap(gm);
  const seen = new Set<number>();
  const dexNumbers: number[] = [];
  let sourceCount = 0;
  let unresolved = 0;

  for (const key of ROLE_KEYS) {
    const slice = lists[key].slice(0, limitPerRole);
    sourceCount += slice.length;
    for (const entry of slice) {
      const dex =
        dexMap.get(entry.speciesId) ?? dexMap.get(rankingBaseId(entry.speciesId));
      if (dex == null || !Number.isFinite(dex) || dex <= 0) {
        unresolved += 1;
        continue;
      }
      if (seen.has(dex)) continue;
      seen.add(dex);
      dexNumbers.push(dex);
    }
  }

  return {
    dexNumbers,
    speciesQuery: dexNumbers.join(","),
    sourceCount,
    unresolved,
  };
}

/** Combine species OR-list with an IV band filter (AND). */
export function buildSearch(speciesQuery: string, ivQuery?: string): string {
  const species = speciesQuery.trim();
  const iv = ivQuery?.trim() ?? "";
  if (!species && !iv) return "";
  if (!species) return iv;
  if (!iv) return species;
  return `${species}&${iv}`;
}
