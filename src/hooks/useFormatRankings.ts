"use client";

import { useEffect, useMemo, useState } from "react";
import {
  buildFormatOptions,
  filterRankEntries,
  type CupDef,
  type FormatOption,
} from "@/lib/formats";
import type { GameMaster } from "@/lib/pvpoke";
import type { RankingCategory, RankEntry } from "@/lib/types";
import type { GmTypeMap, StatsMap } from "@/lib/teams";
import type { MoveInfo } from "@/lib/coverage";
import {
  getSessionGameMaster,
  getSessionRankingsWithFallback,
  peekSessionGameMaster,
  peekSessionRankings,
  readStoredFormatId,
  writeStoredFormatId,
} from "@/lib/pvpokeSession";

const DEFAULT_CATS: RankingCategory[] = ["overall", "leads", "switches", "closers"];

function initialFormatId(formats: FormatOption[]): string {
  const stored = typeof window !== "undefined" ? readStoredFormatId() : null;
  if (stored && formats.some((f) => f.id === stored)) return stored;
  return formats.find((f) => f.featured)?.id ?? "all-1500";
}

export function useFormatRankings(categories: RankingCategory[] = DEFAULT_CATS) {
  const peekedGm = typeof window !== "undefined" ? peekSessionGameMaster() : null;
  const [formats, setFormats] = useState<FormatOption[]>(() =>
    buildFormatOptions(peekedGm?.cups),
  );
  const [formatId, setFormatIdState] = useState(() => initialFormatId(formats));
  const [gm, setGm] = useState<GameMaster | null>(() => peekedGm);
  const [cups, setCups] = useState<CupDef[]>(() => peekedGm?.cups ?? []);
  const [rankLists, setRankLists] = useState<Partial<Record<string, RankEntry[]>>>({});
  const [rankSource, setRankSource] = useState<"cup" | "open">("cup");
  const [err, setErr] = useState<string | null>(null);
  const [loadingGm, setLoadingGm] = useState(!peekedGm);
  const [loadingRanks, setLoadingRanks] = useState(true);

  const format = formats.find((f) => f.id === formatId) ?? formats[0];

  function setFormatId(id: string) {
    setFormatIdState(id);
    writeStoredFormatId(id);
  }

  useEffect(() => {
    let cancelled = false;
    if (!peekSessionGameMaster()) setLoadingGm(true);
    getSessionGameMaster()
      .then((data) => {
        if (cancelled) return;
        setGm(data);
        setCups(data.cups ?? []);
        const next = buildFormatOptions(data.cups);
        setFormats(next);
        setFormatIdState((id) => {
          if (next.some((f) => f.id === id)) return id;
          const stored = readStoredFormatId();
          if (stored && next.some((f) => f.id === stored)) return stored;
          return next.find((f) => f.featured)?.id ?? next[0].id;
        });
        setLoadingGm(false);
      })
      .catch((e) => {
        if (!cancelled) {
          setErr(e instanceof Error ? e.message : "Couldn’t load game data");
          setLoadingGm(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const statsMap = useMemo<StatsMap | undefined>(() => {
    if (!gm) return undefined;
    const m: StatsMap = {};
    for (const p of gm.pokemon) m[p.speciesId] = p.baseStats;
    return m;
  }, [gm]);

  const typeMap = useMemo<GmTypeMap | undefined>(() => {
    if (!gm) return undefined;
    const m: GmTypeMap = {};
    for (const p of gm.pokemon) {
      m[p.speciesId] = {
        types: (p.types ?? []).map((t) => t.toLowerCase()).filter((t) => t && t !== "none"),
        tags: p.tags,
      };
    }
    return m;
  }, [gm]);

  const moveLookup = useMemo(() => {
    const map = new Map<string, MoveInfo>();
    if (!gm) return (id: string) => map.get(id);
    for (const m of gm.moves) map.set(m.moveId, { name: m.name, type: m.type, energy: m.energy });
    return (id: string) => map.get(id);
  }, [gm]);

  const movePools = useMemo(() => {
    if (!gm) return undefined;
    const pools: Record<string, string[]> = {};
    for (const p of gm.pokemon) pools[p.speciesId] = p.chargedMoves ?? [];
    return pools;
  }, [gm]);

  const catKey = categories.join("|");

  useEffect(() => {
    if (!format) return;
    let cancelled = false;
    const cupDef = cups.find((c) => c.name === format.cup);

    const peeked: Partial<Record<string, RankEntry[]>> = {};
    const peekedSources: ("cup" | "open")[] = [];
    for (const c of categories) {
      const hit = peekSessionRankings(format.rankingCup, c, format.cp);
      if (hit?.list.length) {
        peeked[c] = hit.list;
        peekedSources.push(hit.source);
      }
    }

    const coreReady = categories
      .filter((c) => ["overall", "leads", "switches", "closers"].includes(c))
      .every((c) => (peeked[c]?.length ?? 0) > 0);

    if (coreReady && peeked.overall?.length) {
      const next = { ...peeked };
      const usedOpen = peekedSources.includes("open");
      if (usedOpen) {
        for (const key of Object.keys(next) as (keyof typeof next)[]) {
          const list = next[key];
          if (list) next[key] = filterRankEntries(list, format, typeMap, cupDef);
        }
      }
      setRankLists(next);
      setRankSource(usedOpen ? "open" : "cup");
      setLoadingRanks(false);
      setErr(null);
    } else {
      setLoadingRanks(true);
      setErr(null);
    }

    (async () => {
      try {
        const next: Partial<Record<string, RankEntry[]>> = {};
        const sources: ("cup" | "open")[] = [];
        await Promise.all(
          categories.map(async (c) => {
            try {
              const { list, source } = await getSessionRankingsWithFallback(
                format.rankingCup,
                c,
                format.cp,
              );
              sources.push(source);
              next[c] = list;
            } catch {
              /* category may be missing for some cups */
            }
          }),
        );
        if (cancelled) return;
        if (!next.overall?.length) {
          setErr("Couldn’t load rankings for this format.");
          setRankLists({});
          setLoadingRanks(false);
          return;
        }
        const usedOpen = sources.includes("open");
        setRankSource(usedOpen ? "open" : "cup");
        if (usedOpen) {
          for (const key of Object.keys(next) as (keyof typeof next)[]) {
            const list = next[key];
            if (list) next[key] = filterRankEntries(list, format, typeMap, cupDef);
          }
        }
        setRankLists(next);
        setLoadingRanks(false);
      } catch (e) {
        if (!cancelled) {
          setErr(e instanceof Error ? e.message : "Couldn’t load rankings");
          setRankLists({});
          setLoadingRanks(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [format, cups, typeMap, catKey]);

  const lists = useMemo(
    () => ({
      overall: rankLists.overall ?? [],
      leads: rankLists.leads ?? [],
      switches: rankLists.switches ?? [],
      closers: rankLists.closers ?? [],
    }),
    [rankLists],
  );

  return {
    formats,
    formatId,
    setFormatId,
    format,
    gm,
    cups,
    statsMap,
    typeMap,
    moveLookup,
    movePools,
    rankLists,
    lists,
    rankSource,
    err,
    loadingGm,
    loadingRanks,
  };
}
