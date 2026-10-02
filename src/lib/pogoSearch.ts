import type { GameMaster } from "./pvpoke";
import type { RankEntry } from "./types";

/** Matches the Pokémon GO client language (search keywords are localized). */
export type PogoSearchLang = "en" | "pt";

export const POGO_SEARCH_LANGS: { id: PogoSearchLang; label: string; short: string }[] = [
  { id: "pt", label: "Português", short: "PT" },
  { id: "en", label: "English", short: "EN" },
];

const STORAGE_KEY = "pokelead-pogo-search-lang";

export function readPogoSearchLang(): PogoSearchLang {
  if (typeof window === "undefined") return "pt";
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    if (v === "en" || v === "pt") return v;
  } catch {
    /* private mode */
  }
  return "pt";
}

export function writePogoSearchLang(lang: PogoSearchLang): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, lang);
  } catch {
    /* private mode */
  }
}

/** Localized IV / HP stat keywords used in GO storage search. */
const STAT = {
  en: { attack: "attack", defense: "defense", hp: "hp" },
  pt: { attack: "ataque", defense: "defesa", hp: "ps" },
} as const;

type StatKey = keyof (typeof STAT)["en"];

/** Band fragment like "0-1" or "4" for one stat. */
type BandFrag = { band: string; stat: StatKey };

export type IvPresetDef = {
  id: string;
  label: string;
  hint: string;
  /** Ordered Atk / Def / HP band fragments (joined with &). */
  bands: [BandFrag, BandFrag, BandFrag];
};

/**
 * Common PvP IV band filters.
 * Bands: 0=0 · 1=1–5 · 2=6–10 · 3=11–14 · 4=15
 * Verified against Niantic help + GO Hub (EN attack/defense/hp, PT ataque/defesa/ps).
 */
export const IV_PRESET_DEFS: IvPresetDef[] = [
  {
    id: "classic-bulk",
    label: "Classic bulk",
    hint: "0–5 Atk · 11–15 Def/HP — most GL/UL picks",
    bands: [
      { band: "0-1", stat: "attack" },
      { band: "3-4", stat: "defense" },
      { band: "3-4", stat: "hp" },
    ],
  },
  {
    id: "0-4-4",
    label: "0 / 15 / 15",
    hint: "0 Atk · 15 Def · 15 HP",
    bands: [
      { band: "0", stat: "attack" },
      { band: "4", stat: "defense" },
      { band: "4", stat: "hp" },
    ],
  },
  {
    id: "0-3-3",
    label: "0 / 11–14 / 11–14",
    hint: "0 Atk · high Def & HP bands",
    bands: [
      { band: "0", stat: "attack" },
      { band: "3", stat: "defense" },
      { band: "3", stat: "hp" },
    ],
  },
  {
    id: "0-3-4",
    label: "0 / 11–14 / 15",
    hint: "0 Atk · mid Def · 15 HP",
    bands: [
      { band: "0", stat: "attack" },
      { band: "3", stat: "defense" },
      { band: "4", stat: "hp" },
    ],
  },
  {
    id: "0-4-3",
    label: "0 / 15 / 11–14",
    hint: "0 Atk · 15 Def · mid HP",
    bands: [
      { band: "0", stat: "attack" },
      { band: "4", stat: "defense" },
      { band: "3", stat: "hp" },
    ],
  },
  {
    id: "1-4-4",
    label: "1–5 / 15 / 15",
    hint: "Low Atk · perfect Def/HP",
    bands: [
      { band: "1", stat: "attack" },
      { band: "4", stat: "defense" },
      { band: "4", stat: "hp" },
    ],
  },
  {
    id: "1-3-3",
    label: "1–5 / 11–14 / 11–14",
    hint: "Low Atk · mid Def & HP bands",
    bands: [
      { band: "1", stat: "attack" },
      { band: "3", stat: "defense" },
      { band: "3", stat: "hp" },
    ],
  },
  {
    id: "1-4-3",
    label: "1–5 / 15 / 11–14",
    hint: "Low Atk · 15 Def · mid HP",
    bands: [
      { band: "1", stat: "attack" },
      { band: "4", stat: "defense" },
      { band: "3", stat: "hp" },
    ],
  },
  {
    id: "hundo",
    label: "Hundo 15/15/15",
    hint: "Perfect IVs (4★)",
    bands: [
      { band: "4", stat: "attack" },
      { band: "4", stat: "defense" },
      { band: "4", stat: "hp" },
    ],
  },
];

export type IvPreset = {
  id: string;
  label: string;
  hint: string;
  query: string;
};

export function ivQueryFor(def: IvPresetDef, lang: PogoSearchLang): string {
  const words = STAT[lang];
  return def.bands.map((b) => `${b.band}${words[b.stat]}`).join("&");
}

export function presetsForLang(lang: PogoSearchLang): IvPreset[] {
  return IV_PRESET_DEFS.map((def) => ({
    id: def.id,
    label: def.label,
    hint: def.hint,
    query: ivQueryFor(def, lang),
  }));
}

/** Shadow keyword in GO search (localized). */
export function shadowKeyword(lang: PogoSearchLang): string {
  return lang === "pt" ? "sombra" : "shadow";
}

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
 * Dex numbers are language-agnostic (national Pokédex).
 */
export function unionTopDex(
  lists: RoleRankLists,
  gm: GameMaster,
  limitPerRole = 100,
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
