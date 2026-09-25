import type { LeagueCp } from "./types";

export type CupFilter = {
  filterType: string;
  values: (string | number)[];
  name?: string;
  leagues?: number[];
};

export type CupDef = {
  name: string;
  title: string;
  include?: CupFilter[];
  exclude?: CupFilter[];
  league?: number;
  levelCap?: number; // reserved for cups with a hard level ceiling (not wired yet)
  rankingAlias?: string;
  partySize?: number;
};

export type FormatOption = {
  id: string;
  cup: string;
  rankingCup: string;
  label: string;
  cp: LeagueCp | 500;
  featured?: boolean;
  rules?: string[];
};

/** Twilight Trails season rotations (PDT weeks, Hub schedule). */
const SEASON_WEEKS: { start: string; end: string; featuredIds: string[] }[] = [
  {
    start: "2026-09-08",
    end: "2026-09-15",
    featuredIds: ["mega-1500", "mega-2500", "mega-10000"],
  },
  {
    start: "2026-09-15",
    end: "2026-09-22",
    featuredIds: ["all-1500", "mega-2500", "willpower-1500"],
  },
  {
    start: "2026-09-22",
    end: "2026-09-29",
    featuredIds: ["all-2500", "mega-10000", "retro-1500"],
  },
  {
    start: "2026-09-29",
    end: "2026-10-06",
    featuredIds: ["all-10000", "color-1500", "mega-1500"],
  },
  {
    start: "2026-10-06",
    end: "2026-10-13",
    featuredIds: ["mega-1500", "mega-2500", "mega-10000"],
  },
  {
    start: "2026-10-13",
    end: "2026-10-20",
    featuredIds: ["all-1500", "mega-2500", "little-500"],
  },
  {
    start: "2026-10-20",
    end: "2026-10-27",
    featuredIds: ["all-2500", "mega-10000", "fantasy-1500"],
  },
  {
    start: "2026-10-27",
    end: "2026-11-03",
    featuredIds: ["all-10000", "halloween-1500", "mega-1500"],
  },
  {
    start: "2026-11-03",
    end: "2026-11-10",
    featuredIds: ["mega-1500", "mega-2500", "mega-10000"],
  },
  {
    start: "2026-11-10",
    end: "2026-11-18",
    featuredIds: ["all-1500", "mega-2500", "naic2026-1500"],
  },
  {
    start: "2026-11-18",
    end: "2026-11-24",
    featuredIds: ["all-2500", "mega-10000", "naic2026-1500"],
  },
  {
    start: "2026-11-24",
    end: "2026-12-02",
    featuredIds: ["all-10000", "catch-1500", "mega-1500"],
  },
];

const CORE: FormatOption[] = [
  { id: "all-1500", cup: "all", rankingCup: "all", label: "Great League", cp: 1500 },
  { id: "all-2500", cup: "all", rankingCup: "all", label: "Ultra League", cp: 2500 },
  { id: "all-10000", cup: "all", rankingCup: "all", label: "Master League", cp: 10000 },
  {
    id: "mega-1500",
    cup: "mega",
    rankingCup: "mega",
    label: "Great League: Mega Edition",
    cp: 1500,
    rules: ["≤1500 CP", "Megas eligible"],
  },
  {
    id: "mega-2500",
    cup: "mega",
    rankingCup: "mega",
    label: "Ultra League: Mega Edition",
    cp: 2500,
    rules: ["≤2500 CP", "Megas eligible"],
  },
  {
    id: "mega-10000",
    cup: "mega",
    rankingCup: "mega",
    label: "Master League: Mega Edition",
    cp: 10000,
    rules: ["No CP limit", "Megas eligible"],
  },
];

/** Cups we always expose even if not in GM formats list (season cups). */
const EXTRA_CUPS: FormatOption[] = [
  {
    id: "retro-1500",
    cup: "retro",
    rankingCup: "retro",
    label: "Retro Cup (GL)",
    cp: 1500,
    rules: ["≤1500 CP", "No Dark / Steel / Fairy"],
  },
  {
    id: "fantasy-1500",
    cup: "fantasy",
    rankingCup: "fantasy",
    label: "Fantasy Cup (GL)",
    cp: 1500,
    rules: ["≤1500 CP", "Dragon / Steel / Fairy only"],
  },
  {
    id: "little-500",
    cup: "little",
    rankingCup: "little",
    label: "Little Cup",
    cp: 500,
    rules: ["≤500 CP", "Unevolved only"],
  },
  {
    id: "catch-1500",
    cup: "catch",
    rankingCup: "catch",
    label: "Catch Cup (GL)",
    cp: 1500,
  },
  {
    id: "naic2026-1500",
    cup: "naic2026",
    rankingCup: "naic2026",
    label: "2026 GO LAIC Cup",
    cp: 1500,
  },
  {
    id: "premier-10000",
    cup: "premier",
    rankingCup: "premier",
    label: "Master Premier",
    cp: 10000,
  },
  {
    id: "evolution-1500",
    cup: "evolution",
    rankingCup: "evolution",
    label: "Evolution Cup (GL)",
    cp: 1500,
  },
  {
    id: "scroll-1500",
    cup: "scroll",
    rankingCup: "scroll",
    label: "Scroll Cup (GL)",
    cp: 1500,
  },
  {
    id: "summer-1500",
    cup: "summer",
    rankingCup: "summer",
    label: "Summer Cup (GL)",
    cp: 1500,
  },
  {
    id: "weather-1500",
    cup: "weather",
    rankingCup: "weather",
    label: "Weather Cup (GL)",
    cp: 1500,
  },
  {
    id: "willpower-1500",
    cup: "willpower",
    rankingCup: "willpower",
    label: "Willpower Cup (GL)",
    cp: 1500,
    rules: ["≤1500 CP", "Fighting / Psychic / Dark", "No Gardevoir / Zorua / Zoroark"],
  },
  {
    id: "color-1500",
    cup: "color",
    rankingCup: "color",
    label: "Mega Color Cup (GL)",
    cp: 1500,
    rules: ["≤1500 CP", "Grass / Fire / Water / Electric", "Megas OK"],
  },
  {
    id: "halloween-1500",
    cup: "halloween",
    rankingCup: "halloween",
    label: "Mega Halloween Cup (GL)",
    cp: 1500,
    rules: ["≤1500 CP", "Bug / Poison / Ghost / Dark / Fairy", "Megas OK"],
  },
  {
    id: "sunshine-1500",
    cup: "sunshine",
    rankingCup: "sunshine",
    label: "Sunshine Cup (GL)",
    cp: 1500,
    rules: ["≤1500 CP", "Normal / Fire / Grass / Ground", "No Charizard"],
  },
];

function ymd(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function featuredIdsForDate(now = new Date()): string[] {
  const day = ymd(now);
  for (const w of SEASON_WEEKS) {
    if (day >= w.start && day < w.end) return w.featuredIds;
  }
  return ["all-1500", "all-2500", "all-10000"];
}

export function buildFormatOptions(cups?: CupDef[]): FormatOption[] {
  const map = new Map<string, FormatOption>();
  for (const f of [...CORE, ...EXTRA_CUPS]) map.set(f.id, { ...f });

  if (cups) {
    for (const c of cups) {
      if (c.name === "all" || c.name === "custom" || c.name === "gobattleleague") continue;
      const cp = (c.league as LeagueCp | 500 | undefined) ?? 1500;
      const id = `${c.name}-${cp}`;
      if (map.has(id)) continue;
      // skip if we already have this cup at a standard CP
      const exists = [...map.values()].some((x) => x.cup === c.name);
      if (exists) continue;
      map.set(id, {
        id,
        cup: c.name,
        rankingCup: c.rankingAlias || c.name,
        label: c.title,
        cp: cp === 500 || cp === 1500 || cp === 2500 || cp === 10000 ? cp : 1500,
      });
    }
  }

  const featured = new Set(featuredIdsForDate());
  const list = [...map.values()].map((f) => ({
    ...f,
    featured: featured.has(f.id),
  }));

  list.sort((a, b) => {
    if (a.featured !== b.featured) return a.featured ? -1 : 1;
    const order = ["all-1500", "all-2500", "all-10000"];
    const ai = order.indexOf(a.id);
    const bi = order.indexOf(b.id);
    if (ai >= 0 || bi >= 0) return (ai < 0 ? 99 : ai) - (bi < 0 ? 99 : bi);
    return a.label.localeCompare(b.label);
  });

  return list;
}

export type GmMonLite = {
  speciesId: string;
  types: string[];
  tags?: string[];
};

export type CupRuleSet = {
  includeTypes?: string[];
  excludeTypes?: string[];
  bannedIds?: string[];
  allowMega?: boolean;
};

/** Rules for cups that PvPoke may not rank. Rankings fall back to the open league. */
const MANUAL_CUP_RULES: Record<string, CupRuleSet> = {
  sunshine: {
    includeTypes: ["normal", "fire", "grass", "ground"],
    bannedIds: ["charizard"],
  },
  willpower: {
    includeTypes: ["fighting", "psychic", "dark"],
    bannedIds: ["gardevoir", "zorua", "zoroark"],
  },
  color: {
    includeTypes: ["grass", "fire", "water", "electric"],
    allowMega: true,
  },
  halloween: {
    includeTypes: ["bug", "poison", "ghost", "dark", "fairy"],
    allowMega: true,
  },
};

function cupKey(cup: string): string {
  return cup.toLowerCase().replace(/[^a-z0-9]/g, "");
}

export function manualRulesForCup(cup: string): CupRuleSet | undefined {
  const key = cupKey(cup);
  if (MANUAL_CUP_RULES[cup.toLowerCase()]) return MANUAL_CUP_RULES[cup.toLowerCase()];
  if (key.includes("sunshine")) return MANUAL_CUP_RULES.sunshine;
  if (key.includes("willpower")) return MANUAL_CUP_RULES.willpower;
  if (key.includes("halloween")) return MANUAL_CUP_RULES.halloween;
  return MANUAL_CUP_RULES[cup.toLowerCase()];
}

function cleanTypes(types: string[]): string[] {
  return types.map((t) => t.toLowerCase()).filter((t) => t && t !== "none");
}

function bannedMatch(speciesId: string, banned: string[]): boolean {
  const id = speciesId.replace(/_shadow$/i, "").toLowerCase();
  return banned.some((b) => id === b || id.startsWith(`${b}_`));
}

export type RankLite = { speciesId: string };

/** Keep open-league rank order, drop species that fail this cup's rules. */
export function filterRankEntries<T extends RankLite>(
  list: T[],
  format: FormatOption,
  typeMap: Record<string, { types: string[]; tags?: string[] }> | undefined,
  cup?: CupDef,
): T[] {
  if (!typeMap) return list;
  return list.filter((r) => {
    const sid = r.speciesId;
    const base = sid.replace(/_shadow$/i, "");
    const meta = typeMap[sid] ?? typeMap[base];
    return isEligibleSpecies(sid, meta?.types ?? [], meta?.tags, format, cup);
  });
}

export function openLeagueLabel(cp: number): string {
  if (cp === 500) return "Little Cup";
  if (cp === 1500) return "Great League";
  if (cp === 2500) return "Ultra League";
  return "Master League";
}

/** Eligibility for a cup, including synthetic cups that only exist as type/ban filters. */
export function isEligibleSpecies(
  speciesId: string,
  types: string[],
  tags: string[] | undefined,
  format: FormatOption,
  cup?: CupDef,
): boolean {
  const id = speciesId.replace(/_shadow$/i, "").toLowerCase();
  const typesClean = cleanTypes(types);
  const tagsClean = (tags ?? []).map((t) => t.toLowerCase());
  const mega = tagsClean.includes("mega") || id.includes("_mega");

  if (!passesManualCupRules(id, format.cup)) return false;

  if (format.cup === "all" && mega) return false;

  const rules = manualRulesForCup(format.cup);
  if (rules) {
    if (rules.bannedIds && bannedMatch(id, rules.bannedIds)) return false;
    if (rules.includeTypes?.length) {
      if (typesClean.length === 0) return false;
      if (!typesClean.some((t) => rules.includeTypes!.includes(t))) return false;
    }
    if (rules.excludeTypes?.length && typesClean.some((t) => rules.excludeTypes!.includes(t))) {
      return false;
    }
    if (!rules.allowMega && mega) return false;
  } else if (mega && format.cup !== "mega") {
    return false;
  }

  return isLegalInCup(
    { speciesId, types: typesClean, tags },
    cup,
    format.cp === 500 ? 500 : format.cp,
  );
}

function matchesFilter(mon: GmMonLite, f: CupFilter, leagueCp: number): boolean {
  if (f.leagues && !f.leagues.includes(leagueCp)) return false;
  const vals = f.values.map((v) => String(v).toLowerCase());
  switch (f.filterType) {
    case "type":
      return mon.types.some((t) => vals.includes(t.toLowerCase()));
    case "tag":
      return (mon.tags ?? []).some((t) => vals.includes(t.toLowerCase()));
    case "id":
      return vals.includes(mon.speciesId.toLowerCase());
    default:
      return true;
  }
}

/** Whether a species is legal in a cup (include/exclude). */
export function isLegalInCup(
  mon: GmMonLite,
  cup: CupDef | undefined,
  leagueCp: number,
): boolean {
  if (!cup) {
    // synthetic season cups without GM entry
    return true;
  }
  if (cup.include?.length) {
    const ok = cup.include.some((f) => matchesFilter(mon, f, leagueCp));
    if (!ok) return false;
  }
  if (cup.exclude?.length) {
    for (const f of cup.exclude) {
      if (matchesFilter(mon, f, leagueCp)) return false;
    }
  }
  return true;
}

/** Manual bans for season cups not fully in PvPoke GM yet. */
export function passesManualCupRules(speciesId: string, cupName: string): boolean {
  const id = speciesId.toLowerCase();
  if (cupName === "willpower") {
    if (["gardevoir", "zorua", "zoroark"].some((b) => id === b || id.startsWith(`${b}_`))) {
      return false;
    }
  }
  if (cupName === "sunshine") {
    if (id === "charizard" || id.startsWith("charizard_")) return false;
  }
  if (cupName === "naic2026") {
    const banned = [
      "chansey",
      "snorlax",
      "furret",
      "wobbuffet",
      "corsola_galarian",
      "kingdra",
      "medicham",
      "altaria",
      "dusclops",
      "jellicent",
      "araquanid",
      "oranguru",
      "annihilape",
      "clodsire",
    ];
    if (banned.includes(id)) return false;
  }
  return true;
}
