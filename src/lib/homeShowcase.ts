import { createClient } from "@/lib/supabase/client";

export type ShowcaseMon = {
  speciesId: string;
  dex: number;
  speciesName: string;
  /** Primary type — drives site accent when this mon is favorite #1. */
  primaryType?: string;
};

export type ShowcaseTrio = [ShowcaseMon, ShowcaseMon, ShowcaseMon];

const STORAGE_KEY = "pokelead-home-showcase-v1";

export const DEFAULT_SHOWCASE: ShowcaseTrio = [
  { speciesId: "mew", dex: 151, speciesName: "Mew", primaryType: "psychic" },
  { speciesId: "gyarados", dex: 130, speciesName: "Gyarados", primaryType: "water" },
  { speciesId: "tyranitar", dex: 248, speciesName: "Tyranitar", primaryType: "rock" },
];

function isShowcaseMon(v: unknown): v is ShowcaseMon {
  if (!v || typeof v !== "object") return false;
  const o = v as Record<string, unknown>;
  if (
    typeof o.speciesId !== "string" ||
    typeof o.dex !== "number" ||
    typeof o.speciesName !== "string"
  ) {
    return false;
  }
  if (o.primaryType != null && typeof o.primaryType !== "string") return false;
  return true;
}

export function parseShowcase(raw: unknown): ShowcaseTrio | null {
  if (!Array.isArray(raw) || raw.length !== 3) return null;
  if (!raw.every(isShowcaseMon)) return null;
  return [raw[0], raw[1], raw[2]];
}

export function readLocalShowcase(): ShowcaseTrio {
  if (typeof window === "undefined") return DEFAULT_SHOWCASE;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_SHOWCASE;
    return parseShowcase(JSON.parse(raw)) ?? DEFAULT_SHOWCASE;
  } catch {
    return DEFAULT_SHOWCASE;
  }
}

export function writeLocalShowcase(trio: ShowcaseTrio): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trio));
  } catch {
    /* private mode / quota */
  }
}

export async function saveShowcaseToCloud(trio: ShowcaseTrio): Promise<boolean> {
  const supabase = createClient();
  if (!supabase) return false;
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return false;
  const { error } = await supabase
    .from("profiles")
    .update({ home_showcase: trio })
    .eq("id", auth.user.id);
  if (error) {
    console.warn("home_showcase save failed", error.message);
    return false;
  }
  return true;
}

/** Prefer cloud when signed in; otherwise local. Uploads local if cloud is empty. */
export async function hydrateShowcase(signedIn: boolean): Promise<ShowcaseTrio> {
  const local = readLocalShowcase();
  if (!signedIn) return local;

  const supabase = createClient();
  if (!supabase) return local;
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return local;

  const { data } = await supabase
    .from("profiles")
    .select("home_showcase")
    .eq("id", auth.user.id)
    .maybeSingle();

  const cloud = parseShowcase(data?.home_showcase);
  if (cloud) {
    writeLocalShowcase(cloud);
    return cloud;
  }

  // Cloud empty: keep local (or defaults) and push so other devices match.
  void saveShowcaseToCloud(local);
  return local;
}

export async function persistShowcase(trio: ShowcaseTrio, signedIn: boolean): Promise<void> {
  writeLocalShowcase(trio);
  if (signedIn) await saveShowcaseToCloud(trio);
}
