import type { LeagueCp, RankingCategory, RankEntry, RoleRanks } from "./types";
import type { CupDef } from "./formats";

const PVPOKE_BASE = "https://pvpoke.com/data";

export type GmFamily = {
  id: string;
  evolutions?: string[];
  parent?: string;
};

export type GmPokemon = {
  speciesId: string;
  speciesName: string;
  dex: number;
  types: string[];
  fastMoves: string[];
  chargedMoves: string[];
  eliteMoves?: string[];
  baseStats?: { atk: number; def: number; hp: number };
  defaultIVs?: Record<string, number[]>;
  tags?: string[];
  family?: GmFamily;
};

export type GmMove = {
  moveId: string;
  name: string;
  type: string;
  energy?: number;
  energyGain?: number;
};

export type GameMaster = {
  pokemon: GmPokemon[];
  moves: GmMove[];
  cups?: CupDef[];
};

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    next: { revalidate: 3600 },
  });
  if (!res.ok) throw new Error(`Failed ${url}: ${res.status}`);
  return res.json() as Promise<T>;
}

export async function getGameMaster(): Promise<GameMaster> {
  return fetchJson<GameMaster>(`${PVPOKE_BASE}/gamemaster.json`);
}

export async function getRankings(
  cup: string,
  category: RankingCategory,
  cp: LeagueCp,
): Promise<RankEntry[]> {
  const url = `${PVPOKE_BASE}/rankings/${cup}/${category}/rankings-${cp}.json`;
  const raw = await fetchJson<
    { speciesId: string; speciesName: string; score: number; moveset?: string[] }[]
  >(url);
  return raw.map((r) => ({
    speciesId: r.speciesId,
    speciesName: r.speciesName,
    score: r.score,
    moveset: r.moveset,
  }));
}

export async function getAllRoleRanks(
  speciesId: string,
  cup: string,
  cp: LeagueCp,
): Promise<RoleRanks> {
  const cats: RankingCategory[] = [
    "overall",
    "leads",
    "closers",
    "switches",
    "chargers",
    "attackers",
    "consistency",
  ];
  const out: RoleRanks = {};
  await Promise.all(
    cats.map(async (cat) => {
      try {
        const list = await getRankings(cup, cat, cp);
        const idx = list.findIndex((p) => p.speciesId === speciesId);
        if (idx >= 0) {
          out[cat] = {
            rank: idx + 1,
            score: Math.round(list[idx].score * 10) / 10,
            moveset: list[idx].moveset,
          };
        }
      } catch {
        /* cup/category may not exist */
      }
    }),
  );
  return out;
}

function speciesMatchesQuery(p: GmPokemon, q: string): boolean {
  const name = p.speciesName.toLowerCase();
  const id = p.speciesId.toLowerCase();
  const base = p.speciesName.replace(/\s*\([^)]*\)\s*/g, "").trim().toLowerCase();
  return (
    name.includes(q) ||
    id.includes(q.replace(/\s+/g, "_")) ||
    base.startsWith(q) ||
    String(p.dex) === q
  );
}

/** Expand matches to the full PvPoke evolution family (same family.id). */
export function expandWithFamily(gm: GameMaster, matches: GmPokemon[]): GmPokemon[] {
  const familyIds = new Set(
    matches.map((p) => p.family?.id).filter((id): id is string => Boolean(id)),
  );
  if (familyIds.size === 0) return matches;

  const byId = new Map(matches.map((p) => [p.speciesId, p]));
  for (const p of gm.pokemon) {
    if (p.family?.id && familyIds.has(p.family.id)) {
      byId.set(p.speciesId, p);
    }
  }
  return [...byId.values()];
}

export function searchSpecies(
  gm: GameMaster,
  query: string,
  limit = 20,
  includeEvolutions = false,
): GmPokemon[] {
  const q = query.trim().toLowerCase();
  if (!q) return gm.pokemon.slice(0, limit);
  const matches = gm.pokemon.filter((p) => speciesMatchesQuery(p, q));
  const list = includeEvolutions ? expandWithFamily(gm, matches) : matches;
  return list
    .sort((a, b) => {
      const aExact =
        a.speciesName.replace(/\s*\([^)]*\)\s*/g, "").trim().toLowerCase() === q ? 0 : 1;
      const bExact =
        b.speciesName.replace(/\s*\([^)]*\)\s*/g, "").trim().toLowerCase() === q ? 0 : 1;
      if (aExact !== bExact) return aExact - bExact;
      if (a.dex !== b.dex) return a.dex - b.dex;
      return a.speciesName.localeCompare(b.speciesName);
    })
    .slice(0, limit);
}

export function moveDisplayName(gm: GameMaster, moveId: string): string {
  const m = gm.moves.find((x) => x.moveId === moveId);
  return m?.name ?? moveId.replace(/_/g, " ");
}

/** Rough IV quality vs PvPoke defaultIV for a CP cap (stat-product proxy via IV distance). */
export function ivHint(
  pokemon: GmPokemon,
  cp: LeagueCp,
  atk: number,
  def: number,
  hp: number,
): { ideal: number[] | null; label: string; score: number } {
  const key = cp === 1500 ? "cp1500" : cp === 2500 ? "cp2500" : null;
  const ideal = key && pokemon.defaultIVs?.[key] ? pokemon.defaultIVs[key].slice(1, 4) : null;
  if (!ideal) {
    return { ideal: null, label: "No default IV for this league", score: 50 };
  }
  const dist =
    Math.abs(ideal[0] - atk) + Math.abs(ideal[1] - def) + Math.abs(ideal[2] - hp);
  const score = Math.max(0, Math.round(100 - dist * 4));
  let label = "Playable";
  if (score >= 92) label = "Excellent";
  else if (score >= 80) label = "Good";
  else if (score >= 65) label = "OK";
  else label = "Suboptimal";
  return { ideal, label, score };
}
