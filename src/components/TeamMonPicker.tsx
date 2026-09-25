"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { BoxPokemon, RankEntry } from "@/lib/types";
import type { GameMaster, GmPokemon } from "@/lib/pvpoke";
import { expandWithFamily } from "@/lib/pvpoke";
import type { FormatOption } from "@/lib/formats";
import { buildLabPokemon } from "@/lib/recommend";
import { PokemonSprite } from "./PokemonSprite";
import { SpeciesPickTile } from "./SpeciesPickTile";
import { MoveRow } from "./MoveChip";
import { TypeDots } from "./TypeIcon";
import { BottomSheet } from "./BottomSheet";
import { formatEvoInvestLine, investBadgeLabel } from "@/lib/evoCandidates";

function isShadowGm(p: GmPokemon): boolean {
  return (
    p.speciesId.toLowerCase().includes("_shadow") ||
    (p.tags ?? []).some((t) => t.toLowerCase() === "shadow")
  );
}

function baseName(p: GmPokemon): string {
  return p.speciesName.replace(/\s*\([^)]*\)\s*/g, "").trim();
}

function eliteList(mon: GmPokemon | null | undefined): string[] {
  const e = mon?.eliteMoves as string[] | string | undefined;
  if (!e) return [];
  return Array.isArray(e) ? e : [e];
}

function cleanTypes(types?: string[]): string[] {
  return (types ?? []).map((t) => t.toLowerCase()).filter((t) => t && t !== "none");
}

function rankMap(list: RankEntry[]): Map<string, number> {
  const m = new Map<string, number>();
  list.forEach((r, i) => {
    if (!m.has(r.speciesId)) m.set(r.speciesId, i + 1);
  });
  return m;
}

function lookupRank(map: Map<string, number>, ids: string[]): number {
  for (const id of ids) {
    const n = map.get(id);
    if (n) return n;
  }
  return 0;
}

function boxRankIds(p: BoxPokemon): string[] {
  const rankingId = p.flags.shadow ? `${p.speciesId}_shadow` : p.speciesId;
  return [rankingId];
}

function gmRankIds(p: GmPokemon): string[] {
  return [p.speciesId];
}

function fmtRank(n: number): string {
  return n > 0 ? `#${n}` : "-";
}

function rankLine(roleLabel: string, roleRank: number, overallRank: number): string {
  return `${roleLabel} ${fmtRank(roleRank)} | Overall ${fmtRank(overallRank)}`;
}

export function TeamMonPicker({
  label,
  value,
  onChange,
  box,
  gm,
  overall,
  role,
  format,
  lookup,
  playableIds,
  excludeIds,
  isEligible,
}: {
  label: string;
  value: BoxPokemon | null;
  onChange: (mon: BoxPokemon | null) => void;
  box: BoxPokemon[];
  gm: GameMaster | null;
  overall: RankEntry[];
  role: RankEntry[];
  format: FormatOption;
  lookup: (id: string) => { name: string; type: string } | undefined;
  playableIds: Set<string>;
  excludeIds: Set<string>;
  isEligible?: (speciesId: string, types: string[], tags?: string[]) => boolean;
}) {
  const [tab, setTab] = useState<"box" | "any">("box");
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [includeEvos, setIncludeEvos] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const btn = useRef<HTMLButtonElement>(null);

  const roleList = role.length ? role : overall;
  const roleMap = useMemo(() => rankMap(roleList), [roleList]);
  const overallMap = useMemo(() => rankMap(overall), [overall]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  const boxResults = useMemo(() => {
    const qq = q.trim().toLowerCase();
    const filtered = box.filter((p) => {
      if (!qq) return true;
      return (
        p.speciesName.toLowerCase().includes(qq) ||
        p.speciesId.toLowerCase().includes(qq) ||
        String(p.dex) === qq
      );
    });
    return [...filtered].sort((a, b) => {
      const ar = lookupRank(roleMap, boxRankIds(a)) || 99999;
      const br = lookupRank(roleMap, boxRankIds(b)) || 99999;
      if (ar !== br) return ar - br;
      const ao = lookupRank(overallMap, boxRankIds(a)) || 99999;
      const bo = lookupRank(overallMap, boxRankIds(b)) || 99999;
      return ao - bo;
    });
  }, [box, q, roleMap, overallMap]);

  const anyResults = useMemo(() => {
    if (!gm) return [];
    const qq = q.trim().toLowerCase();

    if (!qq) {
      return roleList
        .slice(0, 80)
        .flatMap((r) => {
          const p =
            gm.pokemon.find((x) => x.speciesId === r.speciesId) ??
            gm.pokemon.find((x) => x.speciesId === r.speciesId.replace(/_shadow$/i, ""));
          if (!p) return [];
          if (isEligible && !isEligible(p.speciesId, p.types, p.tags)) return [];
          return [
            {
              rankingId: r.speciesId,
              gm: p,
              roleRank: lookupRank(roleMap, [r.speciesId, ...gmRankIds(p)]),
              overallRank: lookupRank(overallMap, [r.speciesId, ...gmRankIds(p)]),
            },
          ];
        })
        .slice(0, 40);
    }

    const matched = gm.pokemon.filter((p) => {
      const name = p.speciesName.toLowerCase();
      const id = p.speciesId.toLowerCase();
      const base = baseName(p).toLowerCase();
      return (
        name.includes(qq) ||
        id.includes(qq.replace(/\s+/g, "_")) ||
        base.startsWith(qq) ||
        String(p.dex) === qq
      );
    });
    const pool = includeEvos ? expandWithFamily(gm, matched) : matched;

    return pool
      .filter((p) => !isEligible || isEligible(p.speciesId, p.types, p.tags))
      .map((p) => ({
        rankingId: p.speciesId,
        gm: p,
        roleRank: lookupRank(roleMap, gmRankIds(p)),
        overallRank: lookupRank(overallMap, gmRankIds(p)),
      }))
      .sort((a, b) => {
        const ar = a.roleRank || 99999;
        const br = b.roleRank || 99999;
        if (ar !== br) return ar - br;
        return (a.overallRank || 99999) - (b.overallRank || 99999);
      })
      .slice(0, 40);
  }, [gm, roleList, q, isEligible, roleMap, overallMap, includeEvos]);

  function pickBox(p: BoxPokemon) {
    onChange(p);
    setOpen(false);
    setQ("");
  }

  function pickAny(rankingId: string, mon: GmPokemon) {
    if (!gm) return;
    onChange(buildLabPokemon(rankingId, mon, overall, format, label.toLowerCase(), roleList));
    setOpen(false);
    setQ("");
  }

  const sid = value
    ? value.flags.shadow
      ? `${value.speciesId}_shadow`
      : value.speciesId
    : "";
  const gmForValue =
    value && gm
      ? (gm.pokemon.find((x) => x.speciesId === sid) ??
        gm.pokemon.find((x) => x.speciesId === value.speciesId))
      : null;
  const selectedTypes = cleanTypes(gmForValue?.types);
  const selectedRanks = value
    ? rankLine(
        label,
        lookupRank(roleMap, boxRankIds(value)),
        lookupRank(overallMap, boxRankIds(value)),
      )
    : "";

  return (
    <div ref={root} className="relative text-left">
      <p className="text-xs font-semibold uppercase tracking-wider text-sky-200/80">{label}</p>
      <button
        ref={btn}
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="mt-1 flex min-h-11 w-full items-center gap-2 rounded-2xl border border-white/15 bg-black/25 px-3 py-2 text-left outline-none transition hover:border-sky-300/35 hover:bg-black/35 focus:ring-2 focus:ring-sky-400/40"
      >
        {value ? (
          <>
            <PokemonSprite
              speciesId={sid}
              dex={value.dex}
              alt=""
              width={40}
              height={40}
              className="h-10 w-10 object-contain"
              shadow={value.flags.shadow}
            />
            <span className="min-w-0 flex-1">
              <span className="flex items-center gap-1">
                <span className="truncate text-sm font-semibold text-white">
                  {value.flags.shadow ? "Shadow " : ""}
                  {value.speciesName}
                  {value.evo ? (
                    <span
                      className={`ml-1 text-[10px] font-bold uppercase ${
                        value.evo.kind === "power" ? "text-sky-200" : "text-emerald-200"
                      }`}
                    >
                      {investBadgeLabel(value.evo)}
                    </span>
                  ) : null}
                  {value.note === "lab" ? (
                    <span className="ml-1 text-[10px] font-bold uppercase text-amber-200">
                      Test
                    </span>
                  ) : null}
                </span>
                <TypeDots types={selectedTypes} size={14} />
              </span>
              <span className="text-[11px] text-sky-100/60">
                {value.evo
                  ? formatEvoInvestLine(value.evo)
                  : `${value.cp} CP · ${value.atkIv}/${value.defIv}/${value.hpIv}`}
              </span>
            </span>
          </>
        ) : (
          <span className="text-sm text-sky-100/40">Choose Pokémon</span>
        )}
      </button>

      <BottomSheet
        open={open}
        onClose={() => setOpen(false)}
        title={`Choose ${label}`}
        subtitle="Box Pokémon or a test pick with ideal IVs and recommended moves."
        size="large"
      >
        <div className="sticky top-0 z-10 border-b border-white/10 bg-[#0c2436]/95 backdrop-blur-md">
          <div className="flex gap-1 p-2">
            <button
              type="button"
              onClick={() => setTab("box")}
              className={`min-h-11 rounded-full px-4 py-2 text-sm font-bold ${
                tab === "box" ? "bg-sky-500/30 text-white" : "text-sky-100/60"
              }`}
            >
              My Box
            </button>
            <button
              type="button"
              onClick={() => setTab("any")}
              className={`min-h-11 rounded-full px-4 py-2 text-sm font-bold ${
                tab === "any" ? "bg-sky-500/30 text-white" : "text-sky-100/60"
              }`}
            >
              Any Pokémon
            </button>
            {value ? (
              <button
                type="button"
                onClick={() => {
                  onChange(null);
                  setOpen(false);
                }}
                className="ml-auto min-h-11 px-3 text-sm text-rose-200 hover:underline"
              >
                Clear
              </button>
            ) : null}
          </div>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={tab === "box" ? "Search your box" : "Search any Pokémon"}
            className="w-full border-t border-white/10 bg-black/25 px-3 py-3 text-base text-white outline-none placeholder:text-sky-100/40"
            autoComplete="off"
            autoFocus
          />
          {tab === "any" ? (
            <label className="flex cursor-pointer items-center gap-2 border-t border-white/10 px-3 py-2 text-xs text-sky-100/70">
              <input
                type="checkbox"
                checked={includeEvos}
                onChange={(e) => setIncludeEvos(e.target.checked)}
                className="rounded border-white/20"
              />
              Include evolution family
            </label>
          ) : null}
        </div>
        <div className="p-2 pb-6 sm:p-3">
          {tab === "box" ? (
            boxResults.length === 0 ? (
              <p className="px-2 py-8 text-center text-sm text-sky-100/50">
                No Pokémon in your box.
              </p>
            ) : (
              <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-4 sm:gap-2 lg:grid-cols-5">
                {boxResults.map((p) => {
                  const taken = excludeIds.has(p.id) && p.id !== value?.id;
                  const ok = playableIds.has(p.id);
                  const psid = p.flags.shadow ? `${p.speciesId}_shadow` : p.speciesId;
                  return (
                    <SpeciesPickTile
                      key={p.id}
                      speciesId={psid}
                      dex={p.dex}
                      shadow={p.flags.shadow}
                      selected={value?.id === p.id}
                      disabled={taken}
                      onPick={() => pickBox(p)}
                      spriteClassName="h-14 w-14 object-contain sm:h-16 sm:w-16"
                      name={
                        <>
                          {p.flags.shadow ? "Shadow " : ""}
                          {p.speciesName}
                          {p.evo ? (
                            <span
                              className={`ml-1 text-[9px] font-bold uppercase ${
                                p.evo.kind === "power" ? "text-sky-200" : "text-emerald-200"
                              }`}
                            >
                              {investBadgeLabel(p.evo)}
                            </span>
                          ) : null}
                        </>
                      }
                      subtitle={
                        <>
                          {ok ? "" : "Out · "}
                          {rankLine(
                            label,
                            lookupRank(roleMap, boxRankIds(p)),
                            lookupRank(overallMap, boxRankIds(p)),
                          )}
                        </>
                      }
                      footer={
                        <span className="text-[9px] text-faint sm:text-[10px]">
                          {p.evo
                            ? formatEvoInvestLine(p.evo)
                            : `${p.cp} · ${p.atkIv}/${p.defIv}/${p.hpIv}`}
                        </span>
                      }
                    />
                  );
                })}
              </div>
            )
          ) : anyResults.length === 0 ? (
            <p className="px-2 py-8 text-center text-sm text-sky-100/50">
              Type a name, or wait for rankings.
            </p>
          ) : (
            <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-4 sm:gap-2 lg:grid-cols-5">
              {anyResults.map((row) => {
                const shadow = isShadowGm(row.gm);
                return (
                  <SpeciesPickTile
                    key={row.rankingId}
                    speciesId={row.gm.speciesId}
                    dex={row.gm.dex}
                    shadow={shadow}
                    onPick={() => pickAny(row.rankingId, row.gm)}
                    spriteClassName="h-14 w-14 object-contain sm:h-16 sm:w-16"
                    name={
                      <>
                        {shadow ? "Shadow " : ""}
                        {baseName(row.gm)}
                      </>
                    }
                    subtitle={rankLine(label, row.roleRank, row.overallRank)}
                    footer={
                      <span className="text-[9px] text-amber-200/80 sm:text-[10px]">Test IVs</span>
                    }
                  />
                );
              })}
            </div>
          )}
        </div>
      </BottomSheet>

      {value && !open ? (
        <div className="mt-2">
          <p className="mb-1 text-[10px] text-sky-100/55">{selectedRanks}</p>
          <MoveRow
            moves={[value.fastMove ?? "", ...value.chargedMoves]}
            lookup={lookup}
            eliteMoves={eliteList(gmForValue)}
          />
        </div>
      ) : null}
    </div>
  );
}
