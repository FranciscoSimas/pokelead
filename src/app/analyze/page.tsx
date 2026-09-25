"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useBoxStore } from "@/store/box";
import { RANK_CATEGORIES, type BoxPokemon, type RankingCategory, type RoleRanks } from "@/lib/types";
import { type GmPokemon } from "@/lib/pvpoke";
import { filterBoxForFormat, movesDelta, statsFor } from "@/lib/teams";
import { ivRankParams, rankIvSpread } from "@/lib/ivRank";
import { isEligibleSpecies, openLeagueLabel } from "@/lib/formats";
import { PokemonSprite } from "@/components/PokemonSprite";
import { MoveRow } from "@/components/MoveChip";
import { IvRankBadge } from "@/components/IvRankBadge";
import { FormatSelect } from "@/components/FormatSelect";
import { TeamMonPicker } from "@/components/TeamMonPicker";
import { RankingsSkeleton } from "@/components/RankingsSkeleton";
import { useFormatRankings } from "@/hooks/useFormatRankings";

const ANALYZE_CATS = RANK_CATEGORIES.map((c) => c.id) as RankingCategory[];

export default function AnalyzePage() {
  const box = useBoxStore((s) => s.pokemon);
  const [selected, setSelected] = useState<BoxPokemon | null>(null);
  const {
    formats,
    formatId,
    setFormatId,
    format,
    gm,
    cups,
    statsMap,
    typeMap,
    moveLookup,
    rankLists,
    lists,
    rankSource,
    err,
    loadingRanks,
  } = useFormatRankings(ANALYZE_CATS);

  const overall = lists.overall;
  const playable = useMemo(
    () => filterBoxForFormat(box, format, cups, typeMap),
    [box, format, cups, typeMap],
  );
  const cupDef = useMemo(() => cups.find((c) => c.name === format.cup), [cups, format.cup]);
  const isEligible = (speciesId: string, types: string[], tags?: string[]) =>
    isEligibleSpecies(speciesId, types, tags, format, cupDef);

  const gmMon: GmPokemon | null = useMemo(() => {
    if (!gm || !selected) return null;
    const speciesId = selected.flags.shadow
      ? `${selected.speciesId}_shadow`
      : selected.speciesId;
    return (
      gm.pokemon.find((p) => p.speciesId === speciesId) ??
      gm.pokemon.find((p) => p.speciesId === selected.speciesId) ??
      null
    );
  }, [gm, selected]);

  const ranks: RoleRanks = useMemo(() => {
    if (!selected) return {};
    const speciesId = selected.flags.shadow
      ? `${selected.speciesId}_shadow`
      : selected.speciesId;
    const out: RoleRanks = {};
    for (const c of RANK_CATEGORIES) {
      const list = rankLists[c.id];
      if (!list) continue;
      const idx = list.findIndex((p) => p.speciesId === speciesId);
      if (idx >= 0) {
        out[c.id] = {
          rank: idx + 1,
          score: Math.round(list[idx].score * 10) / 10,
          moveset: list[idx].moveset,
        };
      }
    }
    return out;
  }, [selected, rankLists]);

  const ivRank = useMemo(() => {
    if (!selected) return null;
    const base = statsFor(selected, statsMap);
    if (!base) return null;
    const { cap, maxLevel } = ivRankParams(format.cp);
    return rankIvSpread(base, selected.atkIv, selected.defIv, selected.hpIv, cap, maxLevel);
  }, [selected, statsMap, format.cp]);

  const elite = (() => {
    const e = gmMon?.eliteMoves as string[] | string | undefined;
    if (!e) return [] as string[];
    return Array.isArray(e) ? e : [e];
  })();
  const rec = ranks?.overall?.moveset;
  const delta = movesDelta(selected?.fastMove, selected?.chargedMoves, rec, elite);
  const spriteId = selected?.flags.shadow
    ? `${selected.speciesId}_shadow`
    : selected?.speciesId ?? "";

  return (
    <div className="space-y-5 sm:space-y-6">
      <div>
        <h1 className="font-[family-name:var(--font-lilita)] text-3xl leading-none tracking-wide text-white sm:text-4xl">
          Analyze
        </h1>
        <p className="mt-2 text-sm text-muted">
          PvPoke role ranks, IVs, and recommended moves for this league or cup.
        </p>
      </div>

      <div className="relative z-30 flex flex-col gap-3 sm:flex-row sm:items-end sm:gap-4">
        <div className="relative z-10 shrink-0 sm:order-2">
          <FormatSelect formats={formats} value={formatId} onChange={setFormatId} />
        </div>
        <div className="min-w-0 flex-1 sm:order-1 sm:max-w-md">
          <TeamMonPicker
            label="Pokémon"
            value={selected}
            onChange={setSelected}
            box={box}
            gm={gm}
            overall={overall}
            role={overall}
            format={format}
            lookup={moveLookup}
            playableIds={new Set(playable.map((p) => p.id))}
            excludeIds={new Set()}
            isEligible={isEligible}
          />
        </div>
      </div>

      {rankSource === "open" && format.cup !== "all" ? (
        <p className="rounded-card border border-warn/30 bg-warn/10 px-3 py-2 text-xs text-warn">
          {format.label} is not ranked on PvPoke. Using {openLeagueLabel(format.cp)} ranks filtered
          by the cup rules.
        </p>
      ) : null}
      {format.rules?.length ? (
        <div className="flex flex-wrap gap-1.5">
          {format.rules.map((r) => (
            <span key={r} className="chip py-1 text-[11px]">
              {r}
            </span>
          ))}
        </div>
      ) : null}
      {err ? (
        <p className="rounded-card border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">
          {err}
        </p>
      ) : null}

      {loadingRanks ? <RankingsSkeleton cards={1} /> : null}

      {!loadingRanks && !selected ? (
        <p className="text-sm text-muted">
          Choose a Pokémon above
          {box.length === 0 ? (
            <>
              , or add some on the{" "}
              <Link className="font-semibold text-accent underline underline-offset-2" href="/box">
                Box
              </Link>{" "}
              page
            </>
          ) : null}
          .
        </p>
      ) : null}

      {!loadingRanks && selected ? (
        <div className="card relative z-0 flex flex-col gap-6 p-4 sm:p-5 md:flex-row">
          <div className="flex flex-col items-center gap-3 md:w-48 md:shrink-0">
            <PokemonSprite
              speciesId={spriteId}
              dex={selected.dex}
              alt={selected.speciesName}
              width={160}
              height={160}
              className="object-contain"
              shadow={selected.flags.shadow}
            />
            <p className="text-center text-xl font-bold text-white">
              {selected.flags.shadow ? "Shadow " : ""}
              {selected.speciesName}
              {selected.note === "lab" ? (
                <span className="ml-2 text-xs font-bold uppercase text-warn">Test</span>
              ) : null}
            </p>
            {selected.formLabel && selected.formLabel !== "Standard" && (
              <p className="text-sm text-muted">{selected.formLabel}</p>
            )}
            <p className="text-sm text-muted">
              <span className="font-semibold text-fg">{selected.cp} CP</span>
              {" · "}
              {selected.atkIv}/{selected.defIv}/{selected.hpIv}
            </p>
            <IvRankBadge result={ivRank} />
          </div>

          <div className="min-w-0 flex-1 space-y-4">
            <div>
              <p className="label mb-2">Role ranks</p>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
                {RANK_CATEGORIES.map((c) => {
                  const r = ranks?.[c.id];
                  const isOverall = c.id === "overall";
                  return (
                    <div
                      key={c.id}
                      className={`rounded-field border px-3 py-2.5 ${
                        isOverall
                          ? "border-accent/35 bg-accent/10"
                          : "border-line bg-surface-2"
                      }`}
                    >
                      <p className="text-[10px] uppercase tracking-wider text-faint">{c.label}</p>
                      <p className="text-2xl font-bold tabular-nums text-white">
                        {r ? `#${r.rank}` : "n/a"}
                      </p>
                      <p className="text-xs text-muted">{r ? `${r.score}` : "n/a"}</p>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="space-y-3 rounded-field border border-line bg-surface-2 p-3 sm:p-4">
              <p className="label">Moves</p>
              <div>
                <p className="mb-1.5 text-[11px] uppercase tracking-wider text-faint">Current</p>
                <MoveRow
                  moves={[selected.fastMove ?? "", ...selected.chargedMoves]}
                  lookup={moveLookup}
                  eliteMoves={elite}
                />
              </div>
              <div>
                <p className="mb-1.5 text-[11px] uppercase tracking-wider text-faint">
                  Recommended (Overall)
                </p>
                <MoveRow moves={delta.recommended} lookup={moveLookup} eliteMoves={elite} />
              </div>
              {delta.missingTm.length > 0 && (
                <p className="text-sm text-danger">
                  Regular TM / unlock:{" "}
                  {delta.missingTm
                    .map((id) => moveLookup(id)?.name ?? id.replace(/_/g, " "))
                    .join(", ")}
                </p>
              )}
              {delta.missingElite.length > 0 && (
                <p className="text-sm text-warn">
                  Elite / legacy (*) not a regular TM:{" "}
                  {delta.missingElite
                    .map((id) => `${moveLookup(id)?.name ?? id.replace(/_/g, " ")}*`)
                    .join(", ")}
                </p>
              )}
              {delta.missing.length === 0 && (
                <p className="text-sm text-positive">Playable now. Matches the recommended set.</p>
              )}
              <p className="text-[11px] text-faint">
                * = Elite TM / event / legacy. Cannot be learned with a normal TM.
              </p>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
