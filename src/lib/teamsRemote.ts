import type { BoxPokemon } from "@/lib/types";
import { createClient } from "@/lib/supabase/client";
import { currentUserId } from "@/lib/boxSync";
import type { Json, Tables } from "@/lib/supabase/database.types";

export type SavedTeam = {
  id: string;
  name: string;
  leagueCp: number;
  cup: string;
  lead: BoxPokemon;
  switchMon: BoxPokemon;
  closer: BoxPokemon;
  createdAt: number;
};

function asMon(value: Json): BoxPokemon | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const v = value as Partial<BoxPokemon>;
  if (!v.id || !v.speciesId || !v.speciesName) return null;
  return v as BoxPokemon;
}

export function fromTeamRow(row: Tables<"saved_teams">): SavedTeam | null {
  const lead = asMon(row.lead);
  const switchMon = asMon(row.switch);
  const closer = asMon(row.closer);
  if (!lead || !switchMon || !closer) return null;
  return {
    id: row.id,
    name: row.name,
    leagueCp: row.league_cp,
    cup: row.cup,
    lead,
    switchMon,
    closer,
    createdAt: new Date(row.created_at).getTime(),
  };
}

export async function listSavedTeams(filter?: {
  leagueCp?: number;
  cup?: string;
  limit?: number;
}): Promise<SavedTeam[]> {
  const supabase = createClient();
  if (!supabase) return [];
  let query = supabase
    .from("saved_teams")
    .select("id,user_id,name,league_cp,cup,lead,switch,closer,created_at,updated_at")
    .order("created_at", { ascending: false })
    .limit(filter?.limit ?? 100);
  if (filter?.leagueCp != null) query = query.eq("league_cp", filter.leagueCp);
  if (filter?.cup) query = query.eq("cup", filter.cup);
  const { data, error } = await query;
  if (error) {
    console.warn("saved teams fetch failed", error.message);
    return [];
  }
  return (data ?? []).map(fromTeamRow).filter((t): t is SavedTeam => Boolean(t));
}

export async function saveTeam(input: {
  name: string;
  leagueCp: number;
  cup: string;
  lead: BoxPokemon;
  switchMon: BoxPokemon;
  closer: BoxPokemon;
}): Promise<SavedTeam | null> {
  const supabase = createClient();
  if (!supabase) return null;
  const userId = await currentUserId();
  if (!userId) return null;
  const { data, error } = await supabase
    .from("saved_teams")
    .insert({
      user_id: userId,
      name: (input.name.trim() || "Team").slice(0, 80),
      league_cp: input.leagueCp,
      cup: input.cup,
      lead: input.lead as unknown as Json,
      switch: input.switchMon as unknown as Json,
      closer: input.closer as unknown as Json,
    })
    .select("id,user_id,name,league_cp,cup,lead,switch,closer,created_at,updated_at")
    .maybeSingle();
  if (error) {
    console.warn("save team failed", error.message);
    return null;
  }
  return data ? fromTeamRow(data) : null;
}

export async function deleteSavedTeam(id: string): Promise<void> {
  const supabase = createClient();
  if (!supabase) return;
  const { error } = await supabase.from("saved_teams").delete().eq("id", id);
  if (error) console.warn("delete team failed", error.message);
}
