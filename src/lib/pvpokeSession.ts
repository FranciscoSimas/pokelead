import type { GameMaster } from "./pvpoke";
import type { RankEntry } from "./types";
import { peekCachedJson } from "./localCache";
import { fetchGameMasterClient, fetchRankingsWithFallback } from "./fetchPvpokeClient";

const GM_URL = "/api/pvpoke/gamemaster.json";

let gm: GameMaster | null = peekCachedJson<GameMaster>(GM_URL);
let gmPromise: Promise<GameMaster> | null = null;

type RankHit = { list: RankEntry[]; source: "cup" | "open" };
const ranks = new Map<string, RankHit>();

function rankKey(cup: string, category: string, cp: number) {
  return `${cup}|${category}|${cp}`;
}

function rankingUrl(cup: string, category: string, cp: number) {
  return `/api/pvpoke/rankings/${cup}/${category}/rankings-${cp}.json`;
}

/** Shared Game Master for the SPA session (avoids remount waits). */
export function peekSessionGameMaster(): GameMaster | null {
  if (gm) return gm;
  gm = peekCachedJson<GameMaster>(GM_URL);
  return gm;
}

export function getSessionGameMaster(): Promise<GameMaster> {
  const peeked = peekSessionGameMaster();
  if (peeked) {
    gm = peeked;
    return Promise.resolve(peeked);
  }
  if (!gmPromise) {
    gmPromise = fetchGameMasterClient()
      .then((data) => {
        gm = data;
        return data;
      })
      .catch((e) => {
        gmPromise = null;
        throw e;
      });
  }
  return gmPromise;
}

export function peekSessionRankings(
  cup: string,
  category: string,
  cp: number,
): RankHit | null {
  const key = rankKey(cup, category, cp);
  const hit = ranks.get(key);
  if (hit) return hit;
  const data = peekCachedJson<RankEntry[]>(rankingUrl(cup, category, cp));
  if (data?.length) {
    const next = { list: data, source: cup === "all" ? ("open" as const) : ("cup" as const) };
    ranks.set(key, next);
    return next;
  }
  return null;
}

export async function getSessionRankingsWithFallback(
  cup: string,
  category: string,
  cp: number,
): Promise<RankHit> {
  const key = rankKey(cup, category, cp);
  const existing = ranks.get(key);
  if (existing?.list.length) return existing;

  // Prefer exact cup from memory before hitting network/fallback chain.
  const exact = peekCachedJson<RankEntry[]>(rankingUrl(cup, category, cp));
  if (exact?.length) {
    const hit = { list: exact, source: (cup === "all" ? "open" : "cup") as "cup" | "open" };
    ranks.set(key, hit);
    return hit;
  }

  const hit = await fetchRankingsWithFallback(cup, category, cp);
  ranks.set(key, hit);
  if (hit.source === "open" && cup !== "all") {
    ranks.set(rankKey("all", category, cp), { list: hit.list, source: "open" });
  }
  return hit;
}

const FORMAT_KEY = "pokelead-format-id";

export function readStoredFormatId(): string | null {
  try {
    return localStorage.getItem(FORMAT_KEY);
  } catch {
    return null;
  }
}

export function writeStoredFormatId(id: string) {
  try {
    localStorage.setItem(FORMAT_KEY, id);
  } catch {
    /* private mode */
  }
}
