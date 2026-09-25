"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { motion, AnimatePresence } from "framer-motion";
import { useBoxStore } from "@/store/box";
import type { GmPokemon, GameMaster } from "@/lib/pvpoke";
import { expandWithFamily } from "@/lib/pvpoke";
import { DEFAULT_FLAGS, type LeagueCp } from "@/lib/types";
import { rankIvSpread, ivRankParams, monLevelCap, leagueShortName, shadowAdjustedBase, resolveMonLevel, formatLevel, type IvRankResult } from "@/lib/ivRank";
import { statsFor, type StatsMap } from "@/lib/teams";
import { listEvolutions } from "@/lib/evolve";
import { GO_TYPES } from "@/lib/coverage";
import { PokemonSprite } from "@/components/PokemonSprite";
import { SpeciesPickTile } from "@/components/SpeciesPickTile";
import { MoveRow } from "@/components/MoveChip";
import { MovePicker } from "@/components/MovePicker";
import { IvRankBadge } from "@/components/IvRankBadge";
import { EvolveModal } from "@/components/EvolveModal";
import { PowerModal } from "@/components/PowerModal";
import { TypeIcon, typeLabel } from "@/components/TypeIcon";
import { ScreenshotThumb } from "@/components/ScreenshotThumb";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { BottomSheet } from "@/components/BottomSheet";
import { Segment } from "@/components/Segment";
import { useAuth } from "@/components/AuthProvider";
import { useFavorites } from "@/components/FavoritesProvider";
import { flushPendingBoxSync } from "@/lib/boxHydrate";
import { getSessionGameMaster, peekSessionGameMaster } from "@/lib/pvpokeSession";
import { isFinalEvolution } from "@/lib/evoCandidates";

const ScreenshotImport = dynamic(
  () => import("@/components/ScreenshotImport").then((m) => m.ScreenshotImport),
  { ssr: false },
);

function formBadge(p: GmPokemon): string {
  const id = p.speciesId.toLowerCase();
  const tags = (p.tags ?? []).map((t) => t.toLowerCase());
  const parts: string[] = [];
  if (id.includes("_shadow") || tags.includes("shadow")) parts.push("Shadow");
  if (id.includes("alolan") || tags.includes("alolan")) parts.push("Alolan");
  if (id.includes("galarian") || tags.includes("galarian")) parts.push("Galarian");
  if (id.includes("hisuian") || tags.includes("hisuian")) parts.push("Hisuian");
  if (id.includes("paldean") || tags.includes("paldean")) parts.push("Paldean");
  if (id.includes("_mega") || tags.includes("mega")) parts.push("Mega");
  if (parts.length) return parts.join(" · ");
  const paren = p.speciesName.match(/\((.+)\)/);
  if (paren) return paren[1];
  return "Standard";
}

function isShadow(p: GmPokemon): boolean {
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

function resolveSpeciesId(speciesId: string, shadow: boolean) {
  if (shadow && !speciesId.includes("_shadow")) return `${speciesId}_shadow`;
  return speciesId;
}

function cleanTypes(types?: string[]): string[] {
  return (types ?? []).map((t) => t.toLowerCase()).filter((t) => t && t !== "none");
}

type ShadowFilter = "all" | "shadow" | "normal";
type LeagueFilter = "all" | "gl" | "ul" | "ml";
type IvFilter = "all" | "top50" | "top200" | "top500";

const SHADOW_LABEL: Record<ShadowFilter, string> = {
  all: "All",
  shadow: "Shadow only",
  normal: "Non-shadow",
};

const IV_LABEL: Record<IvFilter, string> = {
  all: "Any rank",
  top50: "Top 50",
  top200: "Top 200",
  top500: "Top 500",
};

export default function BoxPage() {
  const { pokemon, add, update, remove, addTag, removeTag, attachScreenshot, dirtyIds, pendingDeletes } =
    useBoxStore();
  const { user } = useAuth();
  const { favorites } = useFavorites();
  const favoriteName = favorites[0]?.speciesName;
  const [gm, setGm] = useState<GameMaster | null>(() =>
    typeof window !== "undefined" ? peekSessionGameMaster() : null,
  );
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState<GmPokemon | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [cp, setCp] = useState(1500);
  const [atk, setAtk] = useState(0);
  const [def, setDef] = useState(15);
  const [hp, setHp] = useState(15);
  const [fast, setFast] = useState("");
  const [charged1, setCharged1] = useState("");
  const [charged2, setCharged2] = useState("");
  const [formTags, setFormTags] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [includeEvos, setIncludeEvos] = useState(false);
  const [formOpen, setFormOpen] = useState(false);

  const [filtersOpen, setFiltersOpen] = useState(false);
  const [filterQ, setFilterQ] = useState("");
  const [filterTypes, setFilterTypes] = useState<string[]>([]);
  const [filterShadow, setFilterShadow] = useState<ShadowFilter>("all");
  const [filterLeague, setFilterLeague] = useState<LeagueFilter>("all");
  const [filterIv, setFilterIv] = useState<IvFilter>("all");
  const [filterCpMin, setFilterCpMin] = useState("");
  const [filterCpMax, setFilterCpMax] = useState("");
  const [filterTag, setFilterTag] = useState("all");

  const [evolveId, setEvolveId] = useState<string | null>(null);
  const [powerId, setPowerId] = useState<string | null>(null);
  const [removeId, setRemoveId] = useState<string | null>(null);
  const [ivLeague, setIvLeague] = useState<LeagueCp>(1500);
  const [tagDraft, setTagDraft] = useState<Record<string, string>>({});
  const [tagOpenId, setTagOpenId] = useState<string | null>(null);
  const [importOpen, setImportOpen] = useState(false);

  useEffect(() => {
    getSessionGameMaster()
      .then(setGm)
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load"));
  }, []);

  const moveLookup = useMemo(() => {
    const map = new Map<string, { name: string; type: string }>();
    if (!gm) return (id: string) => map.get(id);
    for (const m of gm.moves) map.set(m.moveId, { name: m.name, type: m.type });
    return (id: string) => map.get(id);
  }, [gm]);

  const statsMap = useMemo<StatsMap | undefined>(() => {
    if (!gm) return undefined;
    const m: StatsMap = {};
    for (const p of gm.pokemon) m[p.speciesId] = p.baseStats;
    return m;
  }, [gm]);

  const typeMap = useMemo(() => {
    const m = new Map<string, string[]>();
    if (!gm) return m;
    for (const p of gm.pokemon) m.set(p.speciesId, cleanTypes(p.types));
    return m;
  }, [gm]);

  const allTags = useMemo(() => {
    const set = new Set<string>();
    for (const p of pokemon) for (const t of p.tags ?? []) set.add(t);
    return [...set].sort((a, b) => a.localeCompare(b));
  }, [pokemon]);

  const results = useMemo(() => {
    if (!gm || !q.trim() || selected) return [];
    const qq = q.toLowerCase().trim();
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
    const list = includeEvos ? expandWithFamily(gm, matched) : matched;
    return [...list]
      .sort((a, b) => {
        const aExact = baseName(a).toLowerCase() === qq ? 0 : 1;
        const bExact = baseName(b).toLowerCase() === qq ? 0 : 1;
        if (aExact !== bExact) return aExact - bExact;
        if (a.dex !== b.dex) return a.dex - b.dex;
        return a.speciesName.localeCompare(b.speciesName);
      })
      .slice(0, 40);
  }, [gm, q, selected, includeEvos]);

  const draftRank = useMemo(() => {
    if (!selected?.baseStats) return null;
    const { cap } = ivRankParams(ivLeague);
    const maxLevel = monLevelCap(ivLeague, false);
    const base =
      isShadow(selected) && !selected.speciesId.toLowerCase().includes("_shadow")
        ? shadowAdjustedBase(selected.baseStats)
        : selected.baseStats;
    return rankIvSpread(base, atk, def, hp, cap, maxLevel);
  }, [selected, atk, def, hp, ivLeague]);

  const ivRankById = useMemo(() => {
    const map = new Map<string, IvRankResult>();
    if (!statsMap) return map;
    const { cap } = ivRankParams(ivLeague);
    for (const p of pokemon) {
      const base = statsFor(p, statsMap);
      if (!base) continue;
      const maxLevel = monLevelCap(ivLeague, p.flags.bestBuddy);
      map.set(p.id, rankIvSpread(base, p.atkIv, p.defIv, p.hpIv, cap, maxLevel));
    }
    return map;
  }, [pokemon, statsMap, ivLeague]);

  const filteredBox = useMemo(() => {
    const qq = filterQ.trim().toLowerCase();
    const cpMin = filterCpMin ? Number(filterCpMin) : null;
    const cpMax = filterCpMax ? Number(filterCpMax) : null;
    const ivMax =
      filterIv === "top50" ? 50 : filterIv === "top200" ? 200 : filterIv === "top500" ? 500 : null;

    return pokemon.filter((p) => {
      if (qq) {
        const hit =
          p.speciesName.toLowerCase().includes(qq) ||
          p.speciesId.toLowerCase().includes(qq) ||
          String(p.dex) === qq ||
          (p.tags ?? []).some((t) => t.toLowerCase().includes(qq));
        if (!hit) return false;
      }
      if (filterShadow === "shadow" && !p.flags.shadow) return false;
      if (filterShadow === "normal" && p.flags.shadow) return false;
      if (filterLeague === "gl" && p.cp > 1500) return false;
      if (filterLeague === "ul" && (p.cp <= 1500 || p.cp > 2500)) return false;
      if (filterLeague === "ml" && p.cp <= 2500) return false;
      if (cpMin != null && !Number.isNaN(cpMin) && p.cp < cpMin) return false;
      if (cpMax != null && !Number.isNaN(cpMax) && p.cp > cpMax) return false;
      if (filterTag !== "all") {
        const tags = p.tags ?? [];
        if (!tags.some((t) => t.toLowerCase() === filterTag.toLowerCase())) return false;
      }
      if (filterTypes.length > 0) {
        const sid = resolveSpeciesId(p.speciesId, p.flags.shadow);
        const types = typeMap.get(sid) ?? typeMap.get(p.speciesId) ?? [];
        if (!filterTypes.some((t) => types.includes(t))) return false;
      }
      if (ivMax != null) {
        const ivr = ivRankById.get(p.id);
        if (ivr && ivr.rank > ivMax) return false;
      }
      return true;
    });
  }, [
    pokemon,
    filterQ,
    filterShadow,
    filterLeague,
    filterCpMin,
    filterCpMax,
    filterTag,
    filterTypes,
    filterIv,
    typeMap,
    ivRankById,
  ]);

  const evolveMon = evolveId ? pokemon.find((p) => p.id === evolveId) ?? null : null;
  const evolveGm = useMemo(() => {
    if (!gm || !evolveMon) return null;
    const sid = resolveSpeciesId(evolveMon.speciesId, evolveMon.flags.shadow);
    return (
      gm.pokemon.find((x) => x.speciesId === sid) ??
      gm.pokemon.find((x) => x.speciesId === evolveMon.speciesId) ??
      null
    );
  }, [gm, evolveMon]);

  const powerMon = powerId ? pokemon.find((p) => p.id === powerId) ?? null : null;
  const powerGm = useMemo(() => {
    if (!gm || !powerMon) return null;
    const sid = resolveSpeciesId(powerMon.speciesId, powerMon.flags.shadow);
    return (
      gm.pokemon.find((x) => x.speciesId === sid) ??
      gm.pokemon.find((x) => x.speciesId === powerMon.speciesId) ??
      null
    );
  }, [gm, powerMon]);

  function pick(p: GmPokemon) {
    setSelected(p);
    setQ(p.speciesName);
    setOpen(false);
    setFast(p.fastMoves[0] ?? "");
    setCharged1(p.chargedMoves[0] ?? "");
    setCharged2("");
  }

  function resetForm() {
    setQ("");
    setSelected(null);
    setEditingId(null);
    setFormTags("");
    setOpen(false);
  }

  function closeForm() {
    resetForm();
    setFormOpen(false);
  }

  function startAdd() {
    resetForm();
    setFormOpen(true);
  }

  function startEdit(id: string) {
    if (!gm) return;
    const p = pokemon.find((x) => x.id === id);
    if (!p) return;
    const sid = p.flags.shadow ? `${p.speciesId}_shadow` : p.speciesId;
    const mon =
      gm.pokemon.find((x) => x.speciesId === sid) ??
      gm.pokemon.find((x) => x.speciesId === p.speciesId);
    if (!mon) return;
    setEditingId(id);
    setSelected(mon);
    setQ(mon.speciesName);
    setCp(p.cp);
    setAtk(p.atkIv);
    setDef(p.defIv);
    setHp(p.hpIv);
    setFast(p.fastMove ?? mon.fastMoves[0] ?? "");
    setCharged1(p.chargedMoves[0] ?? "");
    setCharged2(p.chargedMoves[1] ?? "");
    setFormTags((p.tags ?? []).join(", "));
    setOpen(false);
    setFormOpen(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function onAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!selected) return;
    const shadow = isShadow(selected);
    const tags = formTags
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);
    const existing = editingId ? pokemon.find((x) => x.id === editingId) : null;
    const payload = {
      speciesId: selected.speciesId.replace(/_shadow$/i, ""),
      speciesName: baseName(selected),
      dex: selected.dex,
      formLabel: formBadge(selected),
      cp,
      atkIv: atk,
      defIv: def,
      hpIv: hp,
      fastMove: fast || undefined,
      chargedMoves: [charged1, charged2].filter(Boolean),
      flags: { ...(existing?.flags ?? DEFAULT_FLAGS), shadow },
      tags,
    };
    if (editingId) {
      update(editingId, payload);
    } else {
      add(payload);
    }
    closeForm();
  }

  function clearFilters() {
    setFilterQ("");
    setFilterTypes([]);
    setFilterShadow("all");
    setFilterLeague("all");
    setFilterIv("all");
    setFilterCpMin("");
    setFilterCpMax("");
    setFilterTag("all");
  }

  function toggleFilterType(t: string) {
    setFilterTypes((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]));
  }

  /** Filters that live behind the sheet, so the button can show a count. */
  const advancedCount =
    filterTypes.length +
    (filterShadow !== "all" ? 1 : 0) +
    (filterIv !== "all" ? 1 : 0) +
    (filterCpMin || filterCpMax ? 1 : 0) +
    (filterTag !== "all" ? 1 : 0);

  const filtersActive = Boolean(filterQ) || filterLeague !== "all" || advancedCount > 0;

  const activeChips: { key: string; label: string; clear: () => void }[] = [];
  for (const t of filterTypes) {
    activeChips.push({ key: `type-${t}`, label: typeLabel(t), clear: () => toggleFilterType(t) });
  }
  if (filterShadow !== "all") {
    activeChips.push({
      key: "shadow",
      label: SHADOW_LABEL[filterShadow],
      clear: () => setFilterShadow("all"),
    });
  }
  if (filterIv !== "all") {
    activeChips.push({ key: "iv", label: IV_LABEL[filterIv], clear: () => setFilterIv("all") });
  }
  if (filterCpMin || filterCpMax) {
    activeChips.push({
      key: "cp",
      label: `CP ${filterCpMin || "0"}-${filterCpMax || "∞"}`,
      clear: () => {
        setFilterCpMin("");
        setFilterCpMax("");
      },
    });
  }
  if (filterTag !== "all") {
    activeChips.push({ key: "tag", label: `#${filterTag}`, clear: () => setFilterTag("all") });
  }

  const emptyBox = pokemon.length === 0;

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-[family-name:var(--font-lilita)] text-3xl leading-none tracking-wide text-white sm:text-4xl">
            My Box
          </h1>
          <p className="mt-2 text-sm text-muted">
            {pokemon.length} saved
            {filtersActive && !emptyBox ? ` · ${filteredBox.length} shown` : ""}
            {" · "}
            {user ? "Synced to your account" : "Saved on this device"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={startAdd} className="btn btn-primary">
            <IconPlus className="h-4 w-4" />
            Add Pokémon
          </button>
          <button type="button" onClick={() => setImportOpen(true)} className="btn btn-ghost">
            <IconCamera className="h-4 w-4" />
            Import
          </button>
        </div>
      </header>

      {error ? (
        <p className="rounded-card border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">
          {error}
        </p>
      ) : null}

      {dirtyIds.length + pendingDeletes.length > 0 ? (
        <p className="flex flex-wrap items-center gap-2 rounded-card border border-warn/30 bg-warn/10 px-3 py-2 text-sm text-warn">
          Couldn’t sync {dirtyIds.length + pendingDeletes.length} change
          {dirtyIds.length + pendingDeletes.length === 1 ? "" : "s"}.
          <button
            type="button"
            className="font-semibold underline underline-offset-2"
            onClick={() => void flushPendingBoxSync()}
          >
            Retry
          </button>
        </p>
      ) : null}

      <AnimatePresence initial={false}>
        {formOpen ? (
          <motion.div
            key="add-form"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
            className="relative z-40"
          >
            <form onSubmit={onAdd} className="card space-y-4 overflow-visible p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="font-[family-name:var(--font-lilita)] text-lg tracking-wide text-white">
                  {editingId ? "Edit Pokémon" : "Add Pokémon"}
                </p>
                <button type="button" onClick={closeForm} className="btn btn-quiet px-2 py-1">
                  <IconX className="h-4 w-4" />
                  Close
                </button>
              </div>

              <div className="relative">
                <label className="label" htmlFor="species-search">
                  Species / form
                </label>
                <input
                  id="species-search"
                  value={q}
                  onChange={(e) => {
                    setQ(e.target.value);
                    setSelected(null);
                    setOpen(true);
                  }}
                  onFocus={() => setOpen(true)}
                  placeholder="Type a name… e.g. Ninetales"
                  className="field mt-1.5"
                  autoComplete="off"
                />
                <label className="mt-2 inline-flex cursor-pointer items-center gap-2 text-xs text-muted">
                  <input
                    type="checkbox"
                    checked={includeEvos}
                    onChange={(e) => setIncludeEvos(e.target.checked)}
                    className="h-3.5 w-3.5 rounded border-white/20 bg-black/40"
                  />
                  Include evolution family
                </label>

                <AnimatePresence>
                  {open && results.length > 0 && !selected && (
                    <motion.div
                      initial={{ opacity: 0, y: -6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                      transition={{ duration: 0.15 }}
                      className="card absolute left-0 right-0 top-full z-50 mt-2 max-h-[min(28rem,55vh)] w-full overflow-auto bg-surface-2 p-3"
                    >
                      <p className="mb-2 px-1 text-[11px] font-semibold uppercase tracking-wider text-faint">
                        {results.length} form{results.length === 1 ? "" : "s"}
                      </p>
                      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6">
                        {results.map((p) => (
                          <SpeciesPickTile
                            key={p.speciesId}
                            speciesId={p.speciesId}
                            dex={p.dex}
                            shadow={isShadow(p)}
                            onPick={() => pick(p)}
                            name={baseName(p)}
                            subtitle={formBadge(p)}
                          />
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {selected && (
                <div className="flex flex-wrap items-center gap-3 rounded-field border border-accent/25 bg-accent/10 p-2.5">
                  <PokemonSprite
                    speciesId={selected.speciesId}
                    dex={selected.dex}
                    alt=""
                    width={48}
                    height={48}
                    className="h-12 w-12 object-contain"
                    shadow={isShadow(selected)}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-white">{baseName(selected)}</p>
                    <p className="text-xs text-muted">
                      #{selected.dex} · {formBadge(selected)}
                    </p>
                  </div>
                  {draftRank && <IvRankBadge result={draftRank} compact />}
                  <button type="button" onClick={resetForm} className="btn btn-quiet px-2 py-1 text-xs">
                    Change
                  </button>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <Num label="CP" value={cp} set={setCp} min={10} max={5000} />
                <Num label="Atk IV" value={atk} set={setAtk} min={0} max={15} />
                <Num label="Def IV" value={def} set={setDef} min={0} max={15} />
                <Num label="HP IV" value={hp} set={setHp} min={0} max={15} />
              </div>

              {selected && (
                <div className="relative z-30 grid gap-3 overflow-visible sm:grid-cols-3">
                  <MovePicker
                    label="Fast move"
                    value={fast}
                    set={setFast}
                    options={selected.fastMoves}
                    lookup={moveLookup}
                    eliteMoves={eliteList(selected)}
                  />
                  <MovePicker
                    label="Charged 1"
                    value={charged1}
                    set={setCharged1}
                    options={selected.chargedMoves}
                    lookup={moveLookup}
                    eliteMoves={eliteList(selected)}
                  />
                  <MovePicker
                    label="Charged 2"
                    value={charged2}
                    set={setCharged2}
                    options={["", ...selected.chargedMoves]}
                    lookup={moveLookup}
                    eliteMoves={eliteList(selected)}
                  />
                </div>
              )}

              <div>
                <label className="label" htmlFor="form-tags">
                  Tags
                </label>
                <input
                  id="form-tags"
                  value={formTags}
                  onChange={(e) => setFormTags(e.target.value)}
                  placeholder="Great League, trade, keep…"
                  className="field mt-1.5"
                />
                <p className="mt-1.5 text-[11px] text-faint">
                  Comma-separated. Reuse a tag across Pokémon to filter by it later.
                </p>
              </div>

              {eliteList(selected).length ? (
                <p className="text-[11px] text-warn/80">
                  * Elite / legacy move. Needs an Elite TM or event - a regular TM can’t teach it.
                </p>
              ) : null}

              <div className="flex items-center gap-2">
                <button type="submit" disabled={!selected} className="btn btn-primary">
                  {editingId ? "Save changes" : "Add to box"}
                </button>
                <button type="button" onClick={closeForm} className="btn btn-quiet">
                  Cancel
                </button>
              </div>
            </form>
          </motion.div>
        ) : null}
      </AnimatePresence>

      {emptyBox ? (
        <div className="card flex flex-col items-center gap-3 px-6 py-12 text-center">
          <p className="font-[family-name:var(--font-lilita)] text-xl tracking-wide text-white">
            Your box is empty
          </p>
          <p className="max-w-sm text-sm text-muted">
            Add a Pokémon by hand, or import appraisal screenshots and let PokeLead read the IVs.
            {favoriteName ? (
              <>
                {" "}
                Start with your favorite{" "}
                <span className="font-semibold text-fg">{favoriteName}</span>.
              </>
            ) : null}
          </p>
          <div className="mt-1 flex flex-wrap justify-center gap-2">
            <button type="button" onClick={startAdd} className="btn btn-primary">
              <IconPlus className="h-4 w-4" />
              Add Pokémon
            </button>
            <button type="button" onClick={() => setImportOpen(true)} className="btn btn-ghost">
              <IconCamera className="h-4 w-4" />
              Import screenshots
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="card space-y-2.5 p-2.5">
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <IconSearch className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-faint" />
                <input
                  value={filterQ}
                  onChange={(e) => setFilterQ(e.target.value)}
                  placeholder="Search your box…"
                  aria-label="Search your box"
                  className="field pl-9 pr-9"
                />
                {filterQ ? (
                  <button
                    type="button"
                    onClick={() => setFilterQ("")}
                    aria-label="Clear search"
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1 text-faint hover:text-white"
                  >
                    <IconX className="h-4 w-4" />
                  </button>
                ) : null}
              </div>
              <button
                type="button"
                onClick={() => setFiltersOpen(true)}
                className="chip min-h-[38px] px-3"
                data-on={advancedCount > 0}
              >
                <IconSliders className="h-4 w-4" />
                <span className="hidden sm:inline">Filters</span>
                {advancedCount > 0 ? (
                  <span className="rounded-full bg-accent/25 px-1.5 text-[11px] font-bold text-white">
                    {advancedCount}
                  </span>
                ) : null}
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
              <div className="flex items-center gap-2">
                <span className="label">League</span>
                <Segment
                  ariaLabel="Filter by league"
                  value={filterLeague}
                  onChange={setFilterLeague}
                  options={[
                    { value: "all", label: "All" },
                    { value: "gl", label: "Great", title: "CP ≤ 1500" },
                    { value: "ul", label: "Ultra", title: "CP 1501-2500" },
                    { value: "ml", label: "Master", title: "CP > 2500" },
                  ]}
                />
              </div>
              <div className="flex items-center gap-2">
                <span className="label">IV rank vs</span>
                <Segment
                  ariaLabel="League used for IV ranking"
                  value={ivLeague}
                  onChange={setIvLeague}
                  options={([500, 1500, 2500, 10000] as LeagueCp[]).map((c) => ({
                    value: c,
                    label: leagueShortName(c),
                    title:
                      c === 500
                        ? "Little Cup, level 15"
                        : c === 10000
                          ? "Master League, #1 is 15/15/15"
                          : `${c} CP cap`,
                  }))}
                />
              </div>
            </div>

            {activeChips.length > 0 ? (
              <div className="flex flex-wrap items-center gap-1.5 border-t border-line pt-2.5">
                {activeChips.map((c) => (
                  <button
                    key={c.key}
                    type="button"
                    onClick={c.clear}
                    className="chip py-1 text-xs"
                    data-on="true"
                    title="Remove filter"
                  >
                    {c.label}
                    <IconX className="h-3 w-3 opacity-70" />
                  </button>
                ))}
                <button
                  type="button"
                  onClick={clearFilters}
                  className="ml-1 text-xs font-semibold text-faint underline underline-offset-2 hover:text-white"
                >
                  Clear all
                </button>
              </div>
            ) : null}
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {filteredBox.length === 0 ? (
              <div className="card col-span-full flex flex-col items-center gap-3 px-6 py-10 text-center">
                <p className="text-sm text-muted">No Pokémon match these filters.</p>
                <button type="button" onClick={clearFilters} className="btn btn-ghost">
                  Clear filters
                </button>
              </div>
            ) : null}

            {filteredBox.map((p) => {
              const sid = resolveSpeciesId(p.speciesId, p.flags.shadow);
              const gmMon =
                gm?.pokemon.find((x) => x.speciesId === sid) ??
                gm?.pokemon.find((x) => x.speciesId === p.speciesId);
              const ivr = ivRankById.get(p.id) ?? null;
              const canEvolve = gm
                ? listEvolutions(gm, p.speciesId, p.flags.shadow).some((t) => {
                    const id = t.speciesId.toLowerCase();
                    const tags = (t.gm.tags ?? []).map((x) => x.toLowerCase());
                    return !id.includes("_mega") && !tags.includes("mega");
                  })
                : false;
              const canPower = gm ? isFinalEvolution(gm, p) : false;
              const tags = p.tags ?? [];
              const baseForLevel = statsMap ? statsFor(p, statsMap) : null;
              const estimatedLevel = baseForLevel
                ? resolveMonLevel(
                    baseForLevel,
                    p.atkIv,
                    p.defIv,
                    p.hpIv,
                    p.cp,
                    p.level,
                    p.flags.bestBuddy ? 51 : 50,
                  )
                : p.level ?? null;
              return (
                <article key={p.id} className="card card-hover flex flex-col gap-2.5 p-3">
                  <div className="flex items-start gap-3">
                    <PokemonSprite
                      speciesId={sid}
                      dex={p.dex}
                      alt={p.speciesName}
                      width={64}
                      height={64}
                      className="h-14 w-14 shrink-0 object-contain"
                      shadow={p.flags.shadow}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold text-white">
                        {p.flags.shadow ? "Shadow " : ""}
                        {p.speciesName}
                      </p>
                      <p className="mt-0.5 text-xs text-muted">
                        <span className="font-semibold text-fg">{p.cp} CP</span>
                        {estimatedLevel != null ? (
                          <>
                            {" · "}
                            <span className="font-semibold text-fg">
                              L{formatLevel(estimatedLevel)}
                            </span>
                          </>
                        ) : null}
                        {" · "}
                        {p.atkIv}/{p.defIv}/{p.hpIv}
                        {p.formLabel && p.formLabel !== "Standard" ? ` · ${p.formLabel}` : ""}
                      </p>
                      <div className="mt-1.5">
                        <IvRankBadge result={ivr} compact />
                      </div>
                    </div>
                    <ScreenshotThumb path={p.screenshotPath} />
                  </div>

                  <MoveRow
                    moves={[p.fastMove ?? "", ...p.chargedMoves]}
                    lookup={moveLookup}
                    eliteMoves={eliteList(gmMon)}
                  />

                  <div className="flex flex-wrap items-center gap-1.5">
                    {tags.map((t) => (
                      <button
                        key={t}
                        type="button"
                        title="Remove tag"
                        onClick={() => removeTag(p.id, t)}
                        className="rounded-full border border-warn/25 bg-warn/10 px-2.5 py-1 text-[11px] font-semibold text-warn transition hover:border-danger/40 hover:bg-danger/10 hover:text-danger"
                      >
                        {t} ×
                      </button>
                    ))}
                    {tagOpenId === p.id ? (
                      <form
                        className="flex min-w-[7rem] flex-1 items-center"
                        onSubmit={(e) => {
                          e.preventDefault();
                          addTag(p.id, tagDraft[p.id] ?? "");
                          setTagDraft((d) => ({ ...d, [p.id]: "" }));
                          setTagOpenId(null);
                        }}
                      >
                        <input
                          autoFocus
                          value={tagDraft[p.id] ?? ""}
                          onChange={(e) => setTagDraft((d) => ({ ...d, [p.id]: e.target.value }))}
                          onBlur={() => setTagOpenId(null)}
                          placeholder="Tag name…"
                          className="field px-2.5 py-1 text-xs"
                        />
                      </form>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setTagOpenId(p.id)}
                        className="rounded-full border border-dashed border-line-strong px-2.5 py-1 text-[11px] font-semibold text-faint transition hover:border-accent/50 hover:text-white"
                      >
                        + tag
                      </button>
                    )}
                  </div>

                  <div className="mt-auto flex items-center gap-1 border-t border-line pt-2">
                    {canEvolve ? (
                      <button
                        type="button"
                        onClick={() => setEvolveId(p.id)}
                        className="btn btn-quiet min-h-10 px-3 py-1.5 text-xs text-positive hover:bg-positive/10 hover:text-positive"
                      >
                        Evolve
                      </button>
                    ) : null}
                    {canPower ? (
                      <button
                        type="button"
                        onClick={() => setPowerId(p.id)}
                        className="btn btn-quiet min-h-10 px-3 py-1.5 text-xs text-sky-300 hover:bg-sky-400/10 hover:text-sky-200"
                      >
                        Power
                      </button>
                    ) : null}
                    <button
                      type="button"
                      onClick={() => startEdit(p.id)}
                      className="btn btn-quiet min-h-10 px-3 py-1.5 text-xs"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => setRemoveId(p.id)}
                      className="btn btn-quiet ml-auto min-h-10 px-3 py-1.5 text-xs hover:bg-danger/10 hover:text-danger"
                    >
                      Remove
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        </>
      )}

      <BottomSheet
        open={filtersOpen}
        onClose={() => setFiltersOpen(false)}
        title="Filters"
        subtitle={`${filteredBox.length} of ${pokemon.length} shown`}
      >
        <div className="space-y-5 p-4">
          <section>
            <div className="mb-2 flex items-center justify-between gap-2">
              <span className="label">Types</span>
              {filterTypes.length > 0 ? (
                <button
                  type="button"
                  onClick={() => setFilterTypes([])}
                  className="text-[11px] font-semibold text-faint hover:text-white"
                >
                  Clear {filterTypes.length}
                </button>
              ) : null}
            </div>
            <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-4">
              {GO_TYPES.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => toggleFilterType(t)}
                  data-on={filterTypes.includes(t)}
                  aria-pressed={filterTypes.includes(t)}
                  className="chip justify-start px-2 py-1.5"
                >
                  <TypeIcon type={t} size={18} />
                  <span className="truncate text-xs">{typeLabel(t)}</span>
                </button>
              ))}
            </div>
          </section>

          <section className="space-y-3">
            <div>
              <span className="label mb-1.5">Shadow</span>
              <Segment
                ariaLabel="Shadow filter"
                value={filterShadow}
                onChange={setFilterShadow}
                options={(["all", "shadow", "normal"] as ShadowFilter[]).map((v) => ({
                  value: v,
                  label: SHADOW_LABEL[v],
                }))}
              />
            </div>
            <div>
              <span className="label mb-1.5">IV rank ({leagueShortName(ivLeague)})</span>
              <Segment
                ariaLabel="IV rank filter"
                value={filterIv}
                onChange={setFilterIv}
                options={(["all", "top50", "top200", "top500"] as IvFilter[]).map((v) => ({
                  value: v,
                  label: IV_LABEL[v],
                }))}
              />
            </div>
          </section>

          <section className="grid grid-cols-2 gap-3">
            <div>
              <label className="label" htmlFor="cp-min">
                CP min
              </label>
              <input
                id="cp-min"
                type="number"
                inputMode="numeric"
                value={filterCpMin}
                onChange={(e) => setFilterCpMin(e.target.value)}
                placeholder="0"
                className="field mt-1.5"
              />
            </div>
            <div>
              <label className="label" htmlFor="cp-max">
                CP max
              </label>
              <input
                id="cp-max"
                type="number"
                inputMode="numeric"
                value={filterCpMax}
                onChange={(e) => setFilterCpMax(e.target.value)}
                placeholder="Any"
                className="field mt-1.5"
              />
            </div>
          </section>

          {allTags.length > 0 ? (
            <section>
              <label className="label" htmlFor="tag-filter">
                Tag
              </label>
              <select
                id="tag-filter"
                value={filterTag}
                onChange={(e) => setFilterTag(e.target.value)}
                className="field mt-1.5"
              >
                <option value="all" className="bg-surface-2">
                  All tags
                </option>
                {allTags.map((t) => (
                  <option key={t} value={t} className="bg-surface-2">
                    {t}
                  </option>
                ))}
              </select>
            </section>
          ) : null}
        </div>

        <div className="sticky bottom-0 flex items-center gap-2 border-t border-line bg-surface p-3">
          <button type="button" onClick={clearFilters} className="btn btn-quiet">
            Clear all
          </button>
          <button
            type="button"
            onClick={() => setFiltersOpen(false)}
            className="btn btn-primary ml-auto"
          >
            Show {filteredBox.length}
          </button>
        </div>
      </BottomSheet>

      <EvolveModal
        open={Boolean(evolveId)}
        onClose={() => setEvolveId(null)}
        mon={evolveMon}
        gm={gm}
        currentGm={evolveGm}
        onApply={(patch) => {
          if (evolveId) update(evolveId, patch);
        }}
      />

      <PowerModal
        open={Boolean(powerId)}
        onClose={() => setPowerId(null)}
        mon={powerMon}
        currentGm={powerGm}
      />

      <ScreenshotImport
        open={importOpen}
        onClose={() => setImportOpen(false)}
        gm={gm}
        onSave={(rows) => {
          for (const row of rows) {
            const { file, ...rest } = row;
            const entry = add(rest);
            if (file) attachScreenshot(entry.id, file);
          }
        }}
      />

      <ConfirmDialog
        open={Boolean(removeId)}
        title="Remove from box?"
        body={
          pokemon.find((p) => p.id === removeId)
            ? `Remove ${pokemon.find((p) => p.id === removeId)?.speciesName} from your box.`
            : "Remove this Pokémon from your box."
        }
        confirmLabel="Remove"
        onClose={() => setRemoveId(null)}
        onConfirm={() => {
          if (removeId) remove(removeId);
        }}
      />
    </div>
  );
}

function Num({
  label,
  value,
  set,
  min,
  max,
}: {
  label: string;
  value: number;
  set: (n: number) => void;
  min: number;
  max: number;
}) {
  const id = `num-${label.replace(/\s+/g, "-").toLowerCase()}`;
  return (
    <div>
      <label className="label" htmlFor={id}>
        {label}
      </label>
      <input
        id={id}
        type="number"
        inputMode="numeric"
        min={min}
        max={max}
        value={value}
        onChange={(e) => set(Number(e.target.value))}
        className="field mt-1.5"
      />
    </div>
  );
}

function IconSearch({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className} aria-hidden>
      <circle cx="11" cy="11" r="6.5" />
      <path d="m16 16 4 4" strokeLinecap="round" />
    </svg>
  );
}

function IconSliders({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      className={className}
      aria-hidden
    >
      <path d="M4 7h10M18 7h2M4 17h4M12 17h8" />
      <circle cx="16" cy="7" r="2" />
      <circle cx="10" cy="17" r="2" />
    </svg>
  );
}

function IconPlus({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      className={className}
      aria-hidden
    >
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

function IconX({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      className={className}
      aria-hidden
    >
      <path d="M6 6l12 12M18 6 6 18" />
    </svg>
  );
}

function IconCamera({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <path d="M4 8.5h3l1.5-2h7L17 8.5h3a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1v-8a1 1 0 0 1 1-1Z" />
      <circle cx="12" cy="13.5" r="3.2" />
    </svg>
  );
}
