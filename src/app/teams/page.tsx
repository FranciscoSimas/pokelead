"use client";

import { useCallback, useEffect, useMemo, useState, startTransition } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { useBoxStore } from "@/store/box";
import { type BoxPokemon } from "@/lib/types";
import {
  evaluateCustomTeam,
  filterBoxForFormat,
  minCpForLeague,
  physicalBoxId,
  suggestTeams,
  type RoleScores,
  type SuggestedTeam,
} from "@/lib/teams";
import { recommendSlotReplacements, recommendBoxSlotReplacements, buildLabPokemon, type TeamSlot } from "@/lib/recommend";
import {
  expandBoxWithEvos,
  formatEvoInvestLine,
  investBadgeLabel,
} from "@/lib/evoCandidates";
import { ensureEvolutionCandyLoaded } from "@/lib/evoCandy";
import { useAuth } from "@/components/AuthProvider";
import { saveTeam } from "@/lib/teamsRemote";
import { isEligibleSpecies, openLeagueLabel } from "@/lib/formats";
import { PokemonSprite } from "@/components/PokemonSprite";
import { FormatSelect } from "@/components/FormatSelect";
import { CoveragePanel } from "@/components/CoveragePanel";
import { RecommendModal } from "@/components/RecommendModal";
import { TeamMonPicker } from "@/components/TeamMonPicker";
import { TypeDots } from "@/components/TypeIcon";
import { MoveLine } from "@/components/MoveChip";
import { resolveTypes } from "@/lib/coverage";
import { SavedTeamsPanel } from "@/components/SavedTeamsPanel";
import { RankingsSkeleton } from "@/components/RankingsSkeleton";
import { useFormatRankings } from "@/hooks/useFormatRankings";

export default function TeamsPage() {
  const box = useBoxStore((s) => s.pokemon);
  const { user } = useAuth();
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
    movePools,
    lists,
    rankSource,
    err,
    loadingRanks,
  } = useFormatRankings();
  const [teams, setTeams] = useState<SuggestedTeam[]>([]);
  const [builderOpen, setBuilderOpen] = useState(false);
  const [includeEvos, setIncludeEvos] = useState(false);
  const [includePower, setIncludePower] = useState(false);
  const [evoCandyReady, setEvoCandyReady] = useState(false);
  const [lead, setLead] = useState<BoxPokemon | null>(null);
  const [switchMon, setSwitchMon] = useState<BoxPokemon | null>(null);
  const [closer, setCloser] = useState<BoxPokemon | null>(null);
  const [recSource, setRecSource] = useState<"meta" | "box">("meta");
  const [savedRefresh, setSavedRefresh] = useState(0);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [recTarget, setRecTarget] = useState<{
    slot: TeamSlot;
    slotLabel: string;
    currentName: string;
    team: { lead: BoxPokemon; switchMon: BoxPokemon; closer: BoxPokemon };
    currentScore: number;
  } | null>(null);

  const ranksReady = !loadingRanks && lists.overall.length > 0;

  useEffect(() => {
    if (!includeEvos) {
      setEvoCandyReady(false);
      return;
    }
    let cancelled = false;
    ensureEvolutionCandyLoaded()
      .then(() => {
        if (!cancelled) setEvoCandyReady(true);
      })
      .catch(() => {
        // Still allow Evos without evolve-candy totals.
        if (!cancelled) setEvoCandyReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, [includeEvos]);

  const workingBox = useMemo(() => {
    if (!gm) return box;
    // evoCandyReady re-runs projection once evolve candy costs are available.
    void evoCandyReady;
    return expandBoxWithEvos(box, gm, format, includeEvos, includePower);
  }, [box, gm, format, includeEvos, includePower, evoCandyReady]);

  useEffect(() => {
    if (!ranksReady || !format) {
      setTeams([]);
      return;
    }
    const overall = lists.overall;
    const leads = lists.leads;
    const switches = lists.switches;
    const closers = lists.closers;
    startTransition(() => {
      setTeams(
        suggestTeams(
          workingBox,
          overall,
          leads,
          switches,
          closers,
          20,
          format,
          cups,
          statsMap,
          typeMap,
          moveLookup,
          movePools,
        ),
      );
    });
  }, [
    workingBox,
    ranksReady,
    lists.overall,
    lists.leads,
    lists.switches,
    lists.closers,
    format,
    cups,
    statsMap,
    typeMap,
    moveLookup,
    movePools,
  ]);

  const playable = useMemo(
    () => filterBoxForFormat(workingBox, format, cups, typeMap),
    [workingBox, format, cups, typeMap],
  );

  useEffect(() => {
    if (!gm || !ranksReady) return;
    const pool = expandBoxWithEvos(box, gm, format, includeEvos, includePower);
    const stillInBox = (mon: BoxPokemon) =>
      box.some((b) => b.id === physicalBoxId(mon));
    const refresh = (mon: BoxPokemon | null, slot: string): BoxPokemon | null => {
      if (!mon) return mon;
      if (mon.note === "lab") {
        const rankingId = mon.flags.shadow ? `${mon.speciesId}_shadow` : mon.speciesId;
        const gmm =
          gm.pokemon.find((x) => x.speciesId === rankingId) ??
          gm.pokemon.find((x) => x.speciesId === mon.speciesId);
        if (!gmm) return mon;
        const roleList =
          slot === "lead" ? lists.leads : slot === "switch" ? lists.switches : lists.closers;
        const lab = buildLabPokemon(rankingId, gmm, lists.overall, format, slot, roleList);
        if (lab.cp > format.cp) return null;
        return lab;
      }
      if (mon.evo?.kind === "evolve") {
        if (!includeEvos) return null;
        const next = pool.find((p) => p.id === mon.id);
        if (!next || next.cp > format.cp) return null;
        if (
          next.cp === mon.cp &&
          next.level === mon.level &&
          next.evo?.leagueMaxCp === mon.evo.leagueMaxCp &&
          next.evo?.evolveCp === mon.evo.evolveCp &&
          next.evo?.candyEvolve === mon.evo.candyEvolve
        ) {
          return mon;
        }
        return next;
      }
      if (mon.evo?.kind === "power" && !includePower) {
        const raw = box.find((b) => b.id === physicalBoxId(mon));
        if (!raw) return stillInBox(mon) ? mon : null;
        if (raw.cp > format.cp) return null;
        return raw;
      }
      const next = pool.find((p) => p.id === mon.id);
      if (!next) {
        if (!stillInBox(mon)) return null;
        if (mon.cp > format.cp) return null;
        return mon;
      }
      if (next.cp > format.cp) return null;
      if (
        next.cp === mon.cp &&
        next.level === mon.level &&
        next.evo?.kind === mon.evo?.kind &&
        next.evo?.leagueMaxCp === mon.evo?.leagueMaxCp &&
        next.evo?.evolveCp === mon.evo?.evolveCp &&
        next.evo?.candyPowerUp === mon.evo?.candyPowerUp
      ) {
        return mon;
      }
      return next;
    };
    setLead((m) => refresh(m, "lead"));
    setSwitchMon((m) => refresh(m, "switch"));
    setCloser((m) => refresh(m, "closer"));
  }, [format.id, gm, lists, includeEvos, includePower, evoCandyReady, box, format]);

  const custom = useMemo(() => {
    if (!ranksReady || !format || !lead || !switchMon || !closer) return null;
    return evaluateCustomTeam(
      lead,
      switchMon,
      closer,
      lists.overall,
      lists.leads,
      lists.switches,
      lists.closers,
      format,
      statsMap,
      typeMap,
      moveLookup,
      movePools,
      cups,
    );
  }, [lead, switchMon, closer, lists, format, statsMap, typeMap, moveLookup, movePools, cups, ranksReady]);

  const excludeIds = useMemo(() => {
    const physical = new Set<string>();
    for (const mon of [lead, switchMon, closer]) {
      if (mon) physical.add(physicalBoxId(mon));
    }
    const s = new Set<string>();
    for (const mon of workingBox) {
      if (physical.has(physicalBoxId(mon))) s.add(mon.id);
    }
    for (const id of physical) s.add(id);
    return s;
  }, [lead, switchMon, closer, workingBox]);

  const cupDef = useMemo(() => cups.find((c) => c.name === format.cup), [cups, format.cup]);
  const isEligible = useCallback(
    (speciesId: string, types: string[], tags?: string[]) =>
      isEligibleSpecies(speciesId, types, tags, format, cupDef),
    [format, cupDef],
  );

  const recs = useMemo(() => {
    if (!recTarget || !ranksReady || !gm || !format) return [];
    if (recSource === "box") {
      return recommendBoxSlotReplacements(
        recTarget.team,
        recTarget.slot,
        recTarget.currentScore,
        workingBox,
        lists.overall,
        lists.leads,
        lists.switches,
        lists.closers,
        format,
        gm.pokemon,
        statsMap,
        typeMap,
        moveLookup,
        cups,
        50,
        movePools,
      );
    }
    return recommendSlotReplacements(
      recTarget.team,
      recTarget.slot,
      recTarget.currentScore,
      lists.overall,
      lists.leads,
      lists.switches,
      lists.closers,
      format,
      gm.pokemon,
      statsMap,
      typeMap,
      moveLookup,
      cups,
      50,
      movePools,
    );
  }, [recTarget, recSource, workingBox, lists, gm, format, statsMap, typeMap, moveLookup, cups, movePools]);

  function openRec(
    team: { lead: BoxPokemon; switchMon: BoxPokemon; closer: BoxPokemon },
    slot: TeamSlot,
    slotLabel: string,
    score: number,
  ) {
    const mon = team[slot];
    setRecSource("meta");
    setRecTarget({
      slot,
      slotLabel,
      currentName: `${mon.flags.shadow ? "Shadow " : ""}${mon.speciesName}`,
      team,
      currentScore: score,
    });
  }

  function scrollToBuilder() {
    window.setTimeout(() => {
      document.getElementById("team-builder")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 50);
  }

  async function saveSuggested(t: SuggestedTeam, index: number) {
    if (!user) return;
    const key = `${t.lead.id}-${t.switchMon.id}-${t.closer.id}`;
    setSavingKey(key);
    const saved = await saveTeam({
      name: `${format.label} #${index + 1}`,
      leagueCp: format.cp,
      cup: format.cup,
      lead: t.lead,
      switchMon: t.switchMon,
      closer: t.closer,
    });
    setSavingKey(null);
    if (saved) setSavedRefresh((n) => n + 1);
  }

  return (
    <div className="space-y-6 sm:space-y-8">
      <div id="team-builder" className="scroll-mt-20 space-y-4">
        <div>
          <h1 className="font-[family-name:var(--font-lilita)] text-3xl leading-none tracking-wide text-white sm:text-4xl">
            Teams
          </h1>
          <p className="mt-2 max-w-xl text-sm text-muted">
            Lead, Switch, and Closer scored together for this cup (meta, role fit, IVs, coverage).
            Illegal trios score 0. Compare is a separate 1v1 view.
          </p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:flex-wrap">
          <FormatSelect formats={formats} value={formatId} onChange={setFormatId} />
          <div className="flex flex-wrap items-center gap-2">
            <label className="flex min-h-11 cursor-pointer items-center gap-2 rounded-full border border-line bg-surface-2 px-3.5 py-2 text-sm text-sky-100/90">
              <input
                type="checkbox"
                checked={includeEvos}
                onChange={(e) => setIncludeEvos(e.target.checked)}
                className="h-4 w-4 accent-emerald-400"
              />
              EVOs
            </label>
            <label className="flex min-h-11 cursor-pointer items-center gap-2 rounded-full border border-line bg-surface-2 px-3.5 py-2 text-sm text-sky-100/90">
              <input
                type="checkbox"
                checked={includePower}
                onChange={(e) => setIncludePower(e.target.checked)}
                className="h-4 w-4 accent-sky-400"
              />
              Powered
            </label>
          </div>
          <button
            type="button"
            onClick={() => setBuilderOpen((o) => !o)}
            className="btn btn-primary px-5 py-2.5"
          >
            {builderOpen ? "Hide builder" : "Build my Team"}
            <span className={`inline-block transition ${builderOpen ? "rotate-180" : ""}`}>▾</span>
          </button>
        </div>
      </div>

      {format.rules?.length ? (
        <div className="flex flex-wrap gap-1.5">
          {format.rules.map((r) => (
            <span key={r} className="chip py-1 text-[11px]">
              {r}
            </span>
          ))}
        </div>
      ) : null}
      {rankSource === "open" && format.cup !== "all" ? (
        <p className="rounded-card border border-warn/30 bg-warn/10 px-3 py-2 text-xs text-warn">
          {format.label} is not ranked on PvPoke. Using {openLeagueLabel(format.cp)} ranks
          filtered by the cup rules.
        </p>
      ) : null}
      {err && (
        <p className="rounded-card border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">
          {err}
        </p>
      )}

      <AnimatePresence initial={false}>
        {builderOpen ? (
          <motion.div
            key="builder"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            className="relative z-20 overflow-hidden"
          >
            <section className="card relative z-20 space-y-4 overflow-visible p-4 sm:p-5">
              <div>
                <h2 className="text-lg font-bold text-white">Build my Team</h2>
                <p className="text-sm text-muted">
                  Pick from your box, or any Pokémon with ideal IVs and recommended moves. Test
                  teams without adding them to the box.
                </p>
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                <TeamMonPicker
                  label="Lead"
                  value={lead}
                  onChange={setLead}
                  box={workingBox}
                  gm={gm}
                  overall={lists?.overall ?? []}
                  role={lists?.leads ?? []}
                  format={format}
                  lookup={moveLookup}
                  playableIds={new Set(playable.map((p) => p.id))}
                  excludeIds={excludeIds}
                  isEligible={isEligible}
                />
                <TeamMonPicker
                  label="Switch"
                  value={switchMon}
                  onChange={setSwitchMon}
                  box={workingBox}
                  gm={gm}
                  overall={lists?.overall ?? []}
                  role={lists?.switches ?? []}
                  format={format}
                  lookup={moveLookup}
                  playableIds={new Set(playable.map((p) => p.id))}
                  excludeIds={excludeIds}
                  isEligible={isEligible}
                />
                <TeamMonPicker
                  label="Closer"
                  value={closer}
                  onChange={setCloser}
                  box={workingBox}
                  gm={gm}
                  overall={lists?.overall ?? []}
                  role={lists?.closers ?? []}
                  format={format}
                  lookup={moveLookup}
                  playableIds={new Set(playable.map((p) => p.id))}
                  excludeIds={excludeIds}
                  isEligible={isEligible}
                />
              </div>

              {custom ? (
                <div className="space-y-3 rounded-field border border-line bg-surface-2 p-3 sm:p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-xs font-bold uppercase tracking-widest text-faint sm:text-sm">
                      Your team
                    </p>
                    <ScoreBadge score={custom.score} />
                  </div>
                  <RoleStats roles={custom.roles} coverage={custom.coverage} />
                  <div className="grid grid-cols-3 gap-2 sm:gap-3">
                    <Slot
                      label="Lead"
                      mon={custom.lead}
                      typeMap={typeMap}
                      lookup={moveLookup}
                      onRecommend={
                        ranksReady && gm
                          ? () =>
                              openRec(
                                {
                                  lead: custom.lead,
                                  switchMon: custom.switchMon,
                                  closer: custom.closer,
                                },
                                "lead",
                                "Lead",
                                custom.score,
                              )
                          : undefined
                      }
                    />
                    <Slot
                      label="Switch"
                      mon={custom.switchMon}
                      typeMap={typeMap}
                      lookup={moveLookup}
                      onRecommend={
                        ranksReady && gm
                          ? () =>
                              openRec(
                                {
                                  lead: custom.lead,
                                  switchMon: custom.switchMon,
                                  closer: custom.closer,
                                },
                                "switchMon",
                                "Switch",
                                custom.score,
                              )
                          : undefined
                      }
                    />
                    <Slot
                      label="Closer"
                      mon={custom.closer}
                      typeMap={typeMap}
                      lookup={moveLookup}
                      onRecommend={
                        ranksReady && gm
                          ? () =>
                              openRec(
                                {
                                  lead: custom.lead,
                                  switchMon: custom.switchMon,
                                  closer: custom.closer,
                                },
                                "closer",
                                "Closer",
                                custom.score,
                              )
                          : undefined
                      }
                    />
                  </div>
                  <CoveragePanel coverage={custom.coverage} defaultOpen />
                  {custom.warnings.map((w) => (
                    <p key={w} className="text-sm text-warn">
                      {w}
                    </p>
                  ))}
                </div>
              ) : (
                <p className="rounded-field border border-dashed border-line-strong px-3 py-4 text-center text-sm text-faint">
                  Select 3 different Pokémon to rate your team.
                </p>
              )}
            </section>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <SavedTeamsPanel
        formatLabel={format.label}
        leagueCp={format.cp}
        cup={format.cup}
        lead={lead}
        switchMon={switchMon}
        closer={closer}
        refreshToken={savedRefresh}
        onLoad={(t) => {
          setLead(t.lead);
          setSwitchMon(t.switchMon);
          setCloser(t.closer);
          setBuilderOpen(true);
          scrollToBuilder();
        }}
      />

      <section className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <h2 className="text-lg font-bold text-white sm:text-xl">Top 20 suggested</h2>
            <p className="text-sm text-muted">
              From {playable.length} eligible
              {includeEvos || includePower
                ? ` (box${includeEvos ? " + EVOs" : ""}${includePower ? " + Powered" : ""})`
                : " in box"}
              {workingBox.length > playable.length
                ? ` · ${workingBox.length - playable.length} skipped (CP / cup rules)`
                : ""}
            </p>
          </div>
        </div>

        {!loadingRanks && playable.length < 3 ? (
          <div className="card px-4 py-8 text-center">
            <p className="text-lg font-bold text-white">Not enough eligible Pokémon</p>
            <p className="mx-auto mt-2 max-w-md text-sm text-muted">
              {format.label} needs 3 Pokémon between {minCpForLeague(format.cp)} and {format.cp} CP
              that match the cup rules.
            </p>
            <Link href="/box" className="btn btn-primary mt-5 px-5 py-2.5">
              Open My Box
            </Link>
          </div>
        ) : null}

        {loadingRanks && !err ? <RankingsSkeleton cards={3} /> : null}

        {teams.map((t, i) => (
          <motion.article
            key={`${t.lead.id}-${t.switchMon.id}-${t.closer.id}`}
            initial={{ opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.12 }}
            transition={{
              duration: 0.45,
              ease: [0.22, 1, 0.36, 1],
              delay: Math.min(i, 4) * 0.05,
            }}
            className={`card rounded-card p-3 sm:p-5 ${
              i === 0 ? "ring-1 ring-accent/35" : ""
            }`}
          >
            <div className="mb-3 flex items-center justify-between gap-3">
              <span
                className={`inline-flex items-center rounded-full px-3 py-1 text-[11px] font-black uppercase tracking-widest ${
                  i === 0
                    ? "bg-accent text-[var(--on-accent,#04121d)]"
                    : "border border-line bg-surface-2 text-muted"
                }`}
              >
                {i === 0 ? "Best" : `#${i + 1}`}
              </span>
              <div className="flex items-center gap-2">
                {user ? (
                  <button
                    type="button"
                    disabled={savingKey === `${t.lead.id}-${t.switchMon.id}-${t.closer.id}`}
                    onClick={() => void saveSuggested(t, i)}
                    className="btn btn-ghost px-3 py-1 text-[11px]"
                  >
                    {savingKey === `${t.lead.id}-${t.switchMon.id}-${t.closer.id}`
                      ? "Saving…"
                      : "Save"}
                  </button>
                ) : (
                  <Link href="/login" className="btn btn-ghost px-3 py-1 text-[11px]">
                    Sign in to save
                  </Link>
                )}
                <ScoreBadge score={t.score} />
              </div>
            </div>
            <RoleStats roles={t.roles} coverage={t.coverage} />
            <div className="mt-3 grid grid-cols-3 gap-2 sm:gap-3">
              <Slot
                label="Lead"
                mon={t.lead}
                typeMap={typeMap}
                lookup={moveLookup}
                onRecommend={
                  ranksReady && gm
                    ? () =>
                        openRec(
                          { lead: t.lead, switchMon: t.switchMon, closer: t.closer },
                          "lead",
                          "Lead",
                          t.score,
                        )
                    : undefined
                }
              />
              <Slot
                label="Switch"
                mon={t.switchMon}
                typeMap={typeMap}
                lookup={moveLookup}
                onRecommend={
                  ranksReady && gm
                    ? () =>
                        openRec(
                          { lead: t.lead, switchMon: t.switchMon, closer: t.closer },
                          "switchMon",
                          "Switch",
                          t.score,
                        )
                    : undefined
                }
              />
              <Slot
                label="Closer"
                mon={t.closer}
                typeMap={typeMap}
                lookup={moveLookup}
                onRecommend={
                  ranksReady && gm
                    ? () =>
                        openRec(
                          { lead: t.lead, switchMon: t.switchMon, closer: t.closer },
                          "closer",
                          "Closer",
                          t.score,
                        )
                    : undefined
                }
              />
            </div>
            <CoveragePanel coverage={t.coverage} defaultOpen={i === 0} />
          </motion.article>
        ))}
      </section>

      <RecommendModal
        open={Boolean(recTarget)}
        onClose={() => setRecTarget(null)}
        slotLabel={recTarget?.slotLabel ?? ""}
        currentName={recTarget?.currentName ?? ""}
        picks={recs}
        lookup={moveLookup}
        source={recSource}
        onSourceChange={setRecSource}
        onUse={(pick) => {
          if (!gm || !ranksReady || !recTarget) return;
          let nextMon: BoxPokemon | null = null;
          if (pick.source === "box" && pick.boxPokemon) {
            nextMon = pick.boxPokemon;
          } else {
            const gmm =
              gm.pokemon.find((x) => x.speciesId === pick.speciesId) ??
              gm.pokemon.find((x) => x.speciesId === pick.speciesId.replace(/_shadow$/i, ""));
            if (!gmm) return;
            const roleList =
              recTarget.slot === "lead"
                ? lists.leads
                : recTarget.slot === "switchMon"
                  ? lists.switches
                  : lists.closers;
            nextMon = buildLabPokemon(
              pick.speciesId,
              gmm,
              lists.overall,
              format,
              recTarget.slot,
              roleList,
            );
          }
          const next = { ...recTarget.team, [recTarget.slot]: nextMon };
          setLead(next.lead);
          setSwitchMon(next.switchMon);
          setCloser(next.closer);
          setBuilderOpen(true);
          setRecTarget(null);
          scrollToBuilder();
        }}
      />
    </div>
  );
}

function ScoreBadge({ score }: { score: number }) {
  const tone =
    score >= 85
      ? "border-positive/35 bg-positive/10 text-positive"
      : score >= 70
        ? "border-accent/35 bg-accent/10 text-accent"
        : score >= 55
          ? "border-warn/30 bg-warn/10 text-warn"
          : "border-danger/30 bg-danger/10 text-danger";
  return (
    <span
      title="0-100 for this trio in this cup: PvPoke meta power, lead/switch/closer fit, and coverage. 0 = illegal team."
      className={`inline-flex items-baseline gap-1.5 rounded-full border px-3 py-1 ${tone}`}
    >
      <span className="text-[9px] font-bold uppercase tracking-[0.18em] opacity-70">Score</span>
      <span className="text-base font-black tabular-nums text-white sm:text-lg">{score}</span>
    </span>
  );
}

function RoleStats({
  roles,
  coverage,
}: {
  roles: RoleScores;
  coverage: { grade: string };
}) {
  const items = [
    { label: "Overall", value: roles.overall.toFixed(1) },
    { label: "Lead", value: `#${roles.leadRank}` },
    { label: "Switch", value: `#${roles.switchRank}` },
    { label: "Closer", value: `#${roles.closerRank}` },
    { label: "Avg IV", value: roles.avgIvPct > 0 ? `${roles.avgIvPct}%` : "-" },
    { label: "Coverage", value: coverage.grade },
  ];
  return (
    <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-6 sm:gap-2">
      {items.map((s) => (
        <div
          key={s.label}
          className="rounded-field border border-line bg-surface-2 px-2 py-1.5 text-center sm:px-3 sm:py-2 sm:text-left"
        >
          <p className="truncate text-[10px] uppercase tracking-wider text-faint">{s.label}</p>
          <p className="text-sm font-bold tabular-nums text-white sm:text-base">{s.value}</p>
        </div>
      ))}
    </div>
  );
}

const SLOT_ACCENT: Record<string, string> = {
  Lead: "bg-accent",
  Switch: "bg-[#B56BFF]",
  Closer: "bg-warn",
};

function Slot({
  label,
  mon,
  onRecommend,
  typeMap,
  lookup,
}: {
  label: string;
  mon: BoxPokemon;
  onRecommend?: () => void;
  typeMap?: Record<string, { types: string[]; tags?: string[] }>;
  lookup: (id: string) => { name: string; type: string } | undefined;
}) {
  const sid = mon.flags.shadow ? `${mon.speciesId}_shadow` : mon.speciesId;
  const types = resolveTypes(mon, typeMap);
  const accent = SLOT_ACCENT[label] ?? SLOT_ACCENT.Lead;
  const evo = mon.evo;

  return (
    <div
      className={`group relative overflow-hidden rounded-field border p-2 text-center sm:p-3 ${
        evo?.kind === "power"
          ? "border-sky-400/40 bg-sky-950/25"
          : evo
            ? "border-emerald-400/40 bg-emerald-950/25"
            : "border-line bg-surface-2"
      }`}
    >
      <span aria-hidden className={`absolute inset-x-0 top-0 h-0.5 ${accent}`} />
      <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-faint sm:text-[10px]">
        {label}
      </p>

      <div className="relative mt-1 grid place-items-center">
        <PokemonSprite
          speciesId={sid}
          dex={mon.dex}
          alt={mon.speciesName}
          width={96}
          height={96}
          className="relative h-16 w-16 object-contain drop-shadow-[0_6px_12px_rgba(0,0,0,0.5)] sm:h-24 sm:w-24"
          shadow={mon.flags.shadow}
        />
      </div>

      <p className="mt-0.5 truncate text-xs font-bold text-white sm:text-sm">
        {mon.flags.shadow ? "Shadow " : ""}
        {mon.speciesName}
      </p>

      <div className="mt-1 flex flex-wrap items-center justify-center gap-1">
        <TypeDots types={types} size={14} />
        {evo ? (
          <span
            className={`rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide ${
              evo.kind === "power"
                ? "bg-sky-400/20 text-sky-200"
                : "bg-emerald-400/20 text-emerald-200"
            }`}
          >
            {investBadgeLabel(evo)}
          </span>
        ) : null}
        {mon.note === "lab" ? (
          <span className="rounded-full bg-warn/15 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-warn">
            Test
          </span>
        ) : null}
      </div>

      {evo ? (
        <div className="mt-1 space-y-0.5 px-0.5">
          {evo.kind === "evolve" ? (
            <p className="text-[10px] leading-snug text-emerald-100/75 sm:text-[11px]">
              from {evo.sourceName}
            </p>
          ) : null}
          <p
            className={`text-[10px] leading-snug tabular-nums sm:text-[11px] ${
              evo.kind === "power" ? "text-sky-100/85" : "text-sky-100/80"
            }`}
          >
            {formatEvoInvestLine(evo)}
          </p>
          <p className="text-[10px] tabular-nums text-faint sm:text-xs">
            {mon.cp} CP · {mon.atkIv}/{mon.defIv}/{mon.hpIv}
          </p>
        </div>
      ) : (
        <p className="mt-0.5 text-[10px] tabular-nums text-faint sm:text-xs">
          {mon.cp} · {mon.atkIv}/{mon.defIv}/{mon.hpIv}
        </p>
      )}

      <MoveLine fast={mon.fastMove} charged={mon.chargedMoves} lookup={lookup} />

      {onRecommend ? (
        <button
          type="button"
          onClick={onRecommend}
          aria-label={`Recommended Pokémon for ${label}`}
          className="btn btn-ghost mt-2 min-h-11 w-full px-2 py-2 text-xs uppercase tracking-wide sm:text-[11px]"
        >
          <span className="sm:hidden">Swap</span>
          <span className="hidden sm:inline">Recommended</span>
        </button>
      ) : null}
    </div>
  );
}
