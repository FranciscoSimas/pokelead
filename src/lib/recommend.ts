import type { BoxPokemon, RankEntry } from "./types";
import { DEFAULT_FLAGS } from "./types";
import type { GmPokemon } from "./pvpoke";
import {
  isEligibleSpecies,
  type CupDef,
  type FormatOption,
} from "./formats";
import {
  scoreBoxMon,
  statsFor,
  teamScoreFromRoles,
  isPlayableInLeague,
  physicalBoxId,
  type GmTypeMap,
  type StatsMap,
} from "./teams";
import type { MoveInfo } from "./coverage";
import { rankIvSpread, ivRankParams } from "./ivRank";

export type TeamSlot = "lead" | "switchMon" | "closer";

export type RecommendPick = {
  speciesId: string;
  speciesName: string;
  dex: number;
  shadow: boolean;
  score: number;
  delta: number;
  ivs: [number, number, number];
  moves: string[];
  overallRank: number;
  eliteMoves: string[];
  source: "meta" | "box";
  /** Present when source is "box" - use this mon on swap. */
  boxPokemon?: BoxPokemon;
  cp?: number;
};

function baseSpeciesId(speciesId: string): string {
  return speciesId.replace(/_shadow$/i, "");
}

function isShadowId(speciesId: string): boolean {
  return /_shadow$/i.test(speciesId);
}

function ivKey(cp: number): string {
  if (cp <= 500) return "cp500";
  if (cp <= 1500) return "cp1500";
  if (cp <= 2500) return "cp2500";
  return "cp10000";
}

/** Bulk #1 IVs under the league CP cap (same as IV rank badge). Cached per species. */
const bulkIvCache = new Map<string, [number, number, number]>();

function idealIvs(p: GmPokemon, leagueCp: number): [number, number, number] {
  const { cap, maxLevel } = ivRankParams(leagueCp);
  const cacheKey = `${p.speciesId}:${cap}:${maxLevel}`;
  const hit = bulkIvCache.get(cacheKey);
  if (hit) return hit;

  let ivs: [number, number, number];
  if (p.baseStats) {
    ivs = rankIvSpread(p.baseStats, 0, 15, 15, cap, maxLevel).bestIvs;
  } else {
    const raw = p.defaultIVs?.[ivKey(leagueCp)];
    if (raw && raw.length >= 4) {
      ivs = [raw[1], raw[2], raw[3]];
    } else if (leagueCp >= 10000) {
      ivs = [15, 15, 15];
    } else {
      ivs = [0, 15, 15];
    }
  }
  bulkIvCache.set(cacheKey, ivs);
  return ivs;
}

function playableCp(leagueCp: number): number {
  if (leagueCp <= 500) return 500;
  if (leagueCp <= 1500) return 1499;
  if (leagueCp <= 2500) return 2499;
  return 4000;
}

function movesetOf(list: RankEntry[], overall: RankEntry[], speciesId: string): string[] {
  return (
    list.find((x) => x.speciesId === speciesId)?.moveset ??
    overall.find((x) => x.speciesId === speciesId)?.moveset ??
    []
  );
}

/** Fast + charged from PvPoke ranking moveset, then learnset. */
export function defaultPvpMoves(
  gm: GmPokemon | null | undefined,
  rankingId: string,
  overall: RankEntry[] = [],
): { fastMove: string; charged1: string; charged2: string } {
  if (!gm) return { fastMove: "", charged1: "", charged2: "" };
  const moves = movesetOf(overall, overall, rankingId);
  return {
    fastMove: moves[0] || gm.fastMoves[0] || "",
    charged1: moves[1] || gm.chargedMoves[0] || "",
    charged2: moves[2] || "",
  };
}

function eliteList(p: GmPokemon): string[] {
  const e = p.eliteMoves as string[] | string | undefined;
  if (!e) return [];
  return Array.isArray(e) ? e : [e];
}

/** Ideal-IV lab Pokémon for testing a team without adding it to the box. */
export function buildLabPokemon(
  rankingId: string,
  gm: GmPokemon,
  overall: RankEntry[],
  format: FormatOption,
  slotKey: string,
  role?: RankEntry[],
): BoxPokemon {
  const shadow =
    isShadowId(rankingId) || (gm.tags ?? []).some((t) => t.toLowerCase() === "shadow");
  const ivs = idealIvs(gm, format.cp);
  const moves = movesetOf(role?.length ? role : overall, overall, rankingId);
  const fast = moves[0] || gm.fastMoves[0];
  const charged = (moves.slice(1, 3).length ? moves.slice(1, 3) : gm.chargedMoves.slice(0, 2)).filter(
    Boolean,
  );
  return {
    id: `lab-${slotKey}-${rankingId}`,
    speciesId: baseSpeciesId(rankingId),
    speciesName: gm.speciesName.replace(/\s*\(Shadow\)\s*/i, "").trim() || rankingId,
    dex: gm.dex,
    cp: playableCp(format.cp),
    atkIv: ivs[0],
    defIv: ivs[1],
    hpIv: ivs[2],
    fastMove: fast,
    chargedMoves: charged,
    flags: { ...DEFAULT_FLAGS, shadow },
    note: "lab",
    createdAt: 0,
    updatedAt: 0,
  };
}

function isLegalCandidate(p: GmPokemon, format: FormatOption, cups?: CupDef[]): boolean {
  const cup = cups?.find((c) => c.name === format.cup);
  return isEligibleSpecies(p.speciesId, p.types, p.tags, format, cup);
}

function roleList(
  slot: TeamSlot,
  leads: RankEntry[],
  switches: RankEntry[],
  closers: RankEntry[],
): RankEntry[] {
  if (slot === "lead") return leads;
  if (slot === "switchMon") return switches;
  return closers;
}

/**
 * Meta Pokémon (not from the box) that would raise this team's score the most
 * if they replaced one slot, using PvPoke ideal IVs and recommended moves.
 */
export function recommendSlotReplacements(
  team: { lead: BoxPokemon; switchMon: BoxPokemon; closer: BoxPokemon },
  slot: TeamSlot,
  currentScore: number,
  overall: RankEntry[],
  leads: RankEntry[],
  switches: RankEntry[],
  closers: RankEntry[],
  format: FormatOption,
  gmPokemon: GmPokemon[],
  statsMap?: StatsMap,
  typeMap?: GmTypeMap,
  lookup?: (id: string) => MoveInfo | undefined,
  cups?: CupDef[],
  limit = 50,
  movePools?: Record<string, string[]>,
): RecommendPick[] {
  const occupied = new Set(
    [team.lead, team.switchMon, team.closer].map((m) => baseSpeciesId(m.speciesId).toLowerCase()),
  );
  const gmById = new Map(gmPokemon.map((p) => [p.speciesId, p]));
  const leagueCp = format.cp;
  const cpForIv = format.cp;
  const roleRanks = roleList(slot, leads, switches, closers);
  const { L, S, C } = scoreTeamSlots(team, overall, leads, switches, closers, statsMap, leagueCp);
  const ceiling = overall[0]?.score;

  const picks: RecommendPick[] = [];
  const seen = new Set<string>();
  const poolCap = Math.max(120, limit * 3);

  for (let i = 0; i < overall.length && picks.length < poolCap; i++) {
    const entry = overall[i];
    const rankingId = entry.speciesId;
    const baseId = baseSpeciesId(rankingId);
    const key = rankingId.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    if (occupied.has(baseId.toLowerCase())) continue;

    const gm =
      gmById.get(rankingId) ??
      gmById.get(baseId) ??
      gmById.get(`${baseId}_shadow`);
    if (!gm) continue;
    if (!isLegalCandidate(gm, format, cups)) continue;

    const shadow = isShadowId(rankingId) || (gm.tags ?? []).some((t) => t.toLowerCase() === "shadow");
    const ivs = idealIvs(gm, cpForIv);
    const moves = movesetOf(roleRanks, overall, rankingId);
    if (!moves.length) continue;

    const synthetic: BoxPokemon = {
      id: `rec-${rankingId}`,
      speciesId: baseId,
      speciesName: gm.speciesName.replace(/\s*\(Shadow\)\s*/i, "").trim() || entry.speciesName,
      dex: gm.dex,
      cp: playableCp(format.cp),
      atkIv: ivs[0],
      defIv: ivs[1],
      hpIv: ivs[2],
      fastMove: moves[0],
      chargedMoves: moves.slice(1, 3),
      flags: { ...DEFAULT_FLAGS, shadow },
      createdAt: 0,
      updatedAt: 0,
    };

    const scored = scoreBoxMon(
      synthetic,
      overall,
      leads,
      switches,
      closers,
      gm.baseStats,
      leagueCp,
      true,
    );

    const next =
      slot === "lead"
        ? teamScoreFromRoles(scored, S, C, lookup, typeMap, ceiling, movePools)
        : slot === "switchMon"
          ? teamScoreFromRoles(L, scored, C, lookup, typeMap, ceiling, movePools)
          : teamScoreFromRoles(L, S, scored, lookup, typeMap, ceiling, movePools);

    picks.push({
      speciesId: rankingId,
      speciesName: synthetic.speciesName,
      dex: gm.dex,
      shadow,
      score: next.score,
      delta: next.score - currentScore,
      ivs,
      moves,
      overallRank: i + 1,
      eliteMoves: eliteList(gm),
      source: "meta",
      cp: synthetic.cp,
    });
  }

  picks.sort((a, b) => b.score - a.score || b.delta - a.delta);
  return picks.slice(0, limit);
}

/**
 * Box Pokémon alternatives for a slot - shows score gain/loss with your real IVs.
 */
export function recommendBoxSlotReplacements(
  team: { lead: BoxPokemon; switchMon: BoxPokemon; closer: BoxPokemon },
  slot: TeamSlot,
  currentScore: number,
  box: BoxPokemon[],
  overall: RankEntry[],
  leads: RankEntry[],
  switches: RankEntry[],
  closers: RankEntry[],
  format: FormatOption,
  gmPokemon: GmPokemon[],
  statsMap?: StatsMap,
  typeMap?: GmTypeMap,
  lookup?: (id: string) => MoveInfo | undefined,
  cups?: CupDef[],
  limit = 50,
  movePools?: Record<string, string[]>,
): RecommendPick[] {
  const occupiedIds = new Set([team.lead.id, team.switchMon.id, team.closer.id]);
  const occupiedPhysical = new Set(
    [team.lead, team.switchMon, team.closer].map((m) => physicalBoxId(m)),
  );
  const leagueCp = format.cp;
  const gmById = new Map(gmPokemon.map((p) => [p.speciesId, p]));
  const { L, S, C } = scoreTeamSlots(team, overall, leads, switches, closers, statsMap, leagueCp);
  const ceiling = overall[0]?.score;
  const cup = cups?.find((c) => c.name === format.cup);

  const picks: RecommendPick[] = [];

  for (const mon of box) {
    if (occupiedIds.has(mon.id)) continue;
    if (occupiedPhysical.has(physicalBoxId(mon))) continue;
    if (!isPlayableInLeague(mon, format.cp)) continue;
    const rankingId = mon.flags.shadow ? `${mon.speciesId}_shadow` : mon.speciesId;
    const gm = gmById.get(rankingId) ?? gmById.get(mon.speciesId);
    if (!gm) continue;
    if (!isLegalCandidate(gm, format, cups)) continue;
    const meta = typeMap?.[mon.speciesId] ?? typeMap?.[rankingId];
    const tags = [
      ...(meta?.tags ?? []),
      ...(mon.flags.shadow ? ["shadow"] : []),
      ...(mon.formLabel?.toLowerCase().includes("mega") ? ["mega"] : []),
    ];
    if (!isEligibleSpecies(mon.speciesId, meta?.types ?? gm.types ?? [], tags, format, cup)) {
      continue;
    }

    const scored = scoreBoxMon(
      mon,
      overall,
      leads,
      switches,
      closers,
      statsMap?.[rankingId] ?? statsMap?.[mon.speciesId] ?? gm.baseStats,
      leagueCp,
    );

    const next =
      slot === "lead"
        ? teamScoreFromRoles(scored, S, C, lookup, typeMap, ceiling, movePools)
        : slot === "switchMon"
          ? teamScoreFromRoles(L, scored, C, lookup, typeMap, ceiling, movePools)
          : teamScoreFromRoles(L, S, scored, lookup, typeMap, ceiling, movePools);

    const overallRank =
      overall.findIndex(
        (r) =>
          r.speciesId === rankingId ||
          r.speciesId === mon.speciesId ||
          r.speciesId === `${mon.speciesId}_shadow`,
      ) + 1;

    picks.push({
      speciesId: rankingId,
      speciesName: mon.speciesName,
      dex: mon.dex,
      shadow: mon.flags.shadow,
      score: next.score,
      delta: next.score - currentScore,
      ivs: [mon.atkIv, mon.defIv, mon.hpIv],
      moves: [mon.fastMove ?? "", ...mon.chargedMoves].filter(Boolean),
      overallRank: overallRank || 9999,
      eliteMoves: eliteList(gm),
      source: "box",
      boxPokemon: mon,
      cp: mon.cp,
    });
  }

  picks.sort((a, b) => b.score - a.score || b.delta - a.delta);
  return picks.slice(0, limit);
}

function scoreTeamSlots(
  team: { lead: BoxPokemon; switchMon: BoxPokemon; closer: BoxPokemon },
  overall: RankEntry[],
  leads: RankEntry[],
  switches: RankEntry[],
  closers: RankEntry[],
  statsMap: StatsMap | undefined,
  leagueCp: number,
) {
  const L = scoreBoxMon(
    team.lead,
    overall,
    leads,
    switches,
    closers,
    statsFor(team.lead, statsMap),
    leagueCp,
  );
  const S = scoreBoxMon(
    team.switchMon,
    overall,
    leads,
    switches,
    closers,
    statsFor(team.switchMon, statsMap),
    leagueCp,
  );
  const C = scoreBoxMon(
    team.closer,
    overall,
    leads,
    switches,
    closers,
    statsFor(team.closer, statsMap),
    leagueCp,
  );
  return { L, S, C };
}
