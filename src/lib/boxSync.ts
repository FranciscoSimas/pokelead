import type { BoxPokemon } from "@/lib/types";
import { DEFAULT_FLAGS } from "@/lib/types";
import { createClient } from "@/lib/supabase/client";
import type { Tables, TablesInsert } from "@/lib/supabase/database.types";

export const SCREENSHOTS_BUCKET = "screenshots";
export const AVATARS_BUCKET = "avatars";

type BoxRow = Tables<"box_pokemon">;

function extFromFile(file: File): string {
  const fromName = file.name.split(".").pop()?.toLowerCase();
  if (fromName && fromName.length <= 5) return fromName.replace(/[^a-z0-9]/g, "") || "jpg";
  const mime = file.type.toLowerCase();
  if (mime.includes("png")) return "png";
  if (mime.includes("webp")) return "webp";
  if (mime.includes("gif")) return "gif";
  if (mime.includes("heic")) return "heic";
  if (mime.includes("heif")) return "heif";
  return "jpg";
}

export function fromBoxRow(row: BoxRow): BoxPokemon {
  return {
    id: row.id,
    speciesId: row.species_id,
    speciesName: row.species_name,
    dex: row.dex,
    formLabel: row.form_label ?? undefined,
    cp: row.cp,
    atkIv: row.atk_iv,
    defIv: row.def_iv,
    hpIv: row.hp_iv,
    level: row.level ?? undefined,
    fastMove: row.fast_move ?? undefined,
    chargedMoves: row.charged_moves ?? [],
    flags: {
      ...DEFAULT_FLAGS,
      shadow: row.flag_shadow,
      purified: row.flag_purified,
      lucky: row.flag_lucky,
      bestBuddy: row.flag_best_buddy,
      xl: row.flag_xl,
    },
    tags: row.tags ?? [],
    note: row.note ?? undefined,
    screenshotPath: row.screenshot_path ?? undefined,
    createdAt: new Date(row.created_at).getTime(),
    updatedAt: new Date(row.updated_at).getTime(),
  };
}

export function toBoxInsert(userId: string, p: BoxPokemon): TablesInsert<"box_pokemon"> {
  return {
    id: p.id,
    user_id: userId,
    species_id: p.speciesId,
    species_name: p.speciesName,
    dex: p.dex,
    form_label: p.formLabel ?? null,
    cp: p.cp,
    atk_iv: p.atkIv,
    def_iv: p.defIv,
    hp_iv: p.hpIv,
    level: p.level ?? null,
    fast_move: p.fastMove ?? null,
    charged_moves: p.chargedMoves ?? [],
    flag_shadow: p.flags.shadow,
    flag_purified: p.flags.purified,
    flag_lucky: p.flags.lucky,
    flag_best_buddy: p.flags.bestBuddy,
    flag_xl: p.flags.xl,
    tags: p.tags ?? [],
    note: p.note ?? null,
    screenshot_path: p.screenshotPath ?? null,
    created_at: new Date(p.createdAt).toISOString(),
    updated_at: new Date(p.updatedAt).toISOString(),
  };
}

export async function currentUserId(): Promise<string | null> {
  const supabase = createClient();
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  return data.session?.user.id ?? null;
}

export async function syncUpsertPokemon(p: BoxPokemon): Promise<boolean> {
  const supabase = createClient();
  if (!supabase) return true;
  const userId = await currentUserId();
  if (!userId) return true;
  const { error } = await supabase.from("box_pokemon").upsert(toBoxInsert(userId, p), {
    onConflict: "id",
  });
  if (error) {
    console.warn("box upsert failed", error.message);
    return false;
  }
  return true;
}

export async function syncDeletePokemon(id: string, screenshotPath?: string): Promise<boolean> {
  const supabase = createClient();
  if (!supabase) return true;
  const userId = await currentUserId();
  if (!userId) return true;
  if (screenshotPath) {
    const { error: storageError } = await supabase.storage
      .from(SCREENSHOTS_BUCKET)
      .remove([screenshotPath]);
    if (storageError) console.warn("screenshot delete failed", storageError.message);
  }
  const { error } = await supabase.from("box_pokemon").delete().eq("id", id);
  if (error) {
    console.warn("box delete failed", error.message);
    return false;
  }
  return true;
}

export async function fetchRemoteBox(): Promise<BoxPokemon[] | null> {
  const supabase = createClient();
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("box_pokemon")
    .select(
      "id,user_id,species_id,species_name,dex,form_label,cp,atk_iv,def_iv,hp_iv,level,fast_move,charged_moves,flag_shadow,flag_purified,flag_lucky,flag_best_buddy,flag_xl,tags,note,screenshot_path,created_at,updated_at",
    )
    .order("created_at", { ascending: false })
    .limit(2000);
  if (error) {
    console.warn("box fetch failed", error.message);
    return null;
  }
  return (data ?? []).map(fromBoxRow);
}

export async function syncUpsertMany(pokemon: BoxPokemon[]): Promise<boolean> {
  if (!pokemon.length) return true;
  const supabase = createClient();
  if (!supabase) return true;
  const userId = await currentUserId();
  if (!userId) return true;
  const chunkSize = 100;
  let ok = true;
  for (let i = 0; i < pokemon.length; i += chunkSize) {
    const chunk = pokemon.slice(i, i + chunkSize).map((p) => toBoxInsert(userId, p));
    const { error } = await supabase.from("box_pokemon").upsert(chunk, { onConflict: "id" });
    if (error) {
      console.warn("box batch upsert failed", error.message);
      ok = false;
    }
  }
  return ok;
}

export async function ensureProfile(): Promise<Tables<"profiles"> | null> {
  const supabase = createClient();
  if (!supabase) return null;
  const { data: auth } = await supabase.auth.getUser();
  const user = auth.user;
  if (!user) return null;

  const display =
    (typeof user.user_metadata?.full_name === "string" && user.user_metadata.full_name) ||
    (typeof user.user_metadata?.name === "string" && user.user_metadata.name) ||
    user.email?.split("@")[0] ||
    null;

  const { data: existing } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  if (!existing) {
    const { data: created, error } = await supabase
      .from("profiles")
      .upsert({ id: user.id, display_name: display })
      .select("*")
      .maybeSingle();
    if (error) console.warn("profile create failed", error.message);
    return created ?? null;
  }

  return existing;
}

export async function markBoxMigrated(): Promise<void> {
  const supabase = createClient();
  if (!supabase) return;
  const userId = await currentUserId();
  if (!userId) return;
  const { error } = await supabase
    .from("profiles")
    .update({ migrated_local_box: true })
    .eq("id", userId);
  if (error) console.warn("migrate flag failed", error.message);
}

export async function uploadPokemonScreenshot(id: string, file: File): Promise<string | null> {
  const supabase = createClient();
  if (!supabase) return null;
  const userId = await currentUserId();
  if (!userId) return null;
  const path = `${userId}/${id}.${extFromFile(file)}`;
  const { error } = await supabase.storage.from(SCREENSHOTS_BUCKET).upload(path, file, {
    upsert: true,
    contentType: file.type || undefined,
  });
  if (error) {
    console.warn("screenshot upload failed", error.message);
    return null;
  }
  return path;
}

export async function signedScreenshotUrl(path: string): Promise<string | null> {
  const supabase = createClient();
  if (!supabase || !path) return null;
  const { data, error } = await supabase.storage
    .from(SCREENSHOTS_BUCKET)
    .createSignedUrl(path, 60 * 60);
  if (error) {
    console.warn("signed url failed", error.message);
    return null;
  }
  return data.signedUrl;
}

export function publicAvatarUrl(path: string | null | undefined): string | null {
  const supabase = createClient();
  if (!supabase || !path) return null;
  const { data } = supabase.storage.from(AVATARS_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

export async function uploadAvatar(file: File): Promise<string | null> {
  const supabase = createClient();
  if (!supabase) return null;
  const userId = await currentUserId();
  if (!userId) return null;
  const path = `${userId}/avatar.${extFromFile(file)}`;
  const { error } = await supabase.storage.from(AVATARS_BUCKET).upload(path, file, {
    upsert: true,
    contentType: file.type || undefined,
  });
  if (error) {
    console.warn("avatar upload failed", error.message);
    return null;
  }
  const { error: profileError } = await supabase
    .from("profiles")
    .update({ avatar_path: path })
    .eq("id", userId);
  if (profileError) console.warn("avatar profile update failed", profileError.message);
  return path;
}
