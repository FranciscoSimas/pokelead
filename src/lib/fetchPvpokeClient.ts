import { CACHE_TTL, cachedJsonFetch } from "./localCache";
import type { GameMaster } from "./pvpoke";
import type { RankEntry } from "./types";

export function fetchGameMasterClient(): Promise<GameMaster> {
  return cachedJsonFetch<GameMaster>("/api/pvpoke/gamemaster.json", CACHE_TTL.gamemaster);
}

export function fetchRankingsClient(
  cup: string,
  category: string,
  cp: number,
): Promise<RankEntry[]> {
  const url = `/api/pvpoke/rankings/${cup}/${category}/rankings-${cp}.json`;
  return cachedJsonFetch<RankEntry[]>(url, CACHE_TTL.rankings);
}

/** Try cup rankings, fall back to open league. */
export async function fetchRankingsWithFallback(
  cup: string,
  category: string,
  cp: number,
): Promise<{ list: RankEntry[]; source: "cup" | "open" }> {
  try {
    const list = await fetchRankingsClient(cup, category, cp);
    return { list, source: "cup" };
  } catch {
    if (cup === "all") throw new Error(`Rankings ${category} failed`);
    // Keep the same CP cap (Little Cup stays 500 - never remap to Great League).
    const list = await fetchRankingsClient("all", category, cp);
    return { list, source: "open" };
  }
}
