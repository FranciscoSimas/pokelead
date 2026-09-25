/** Accent theme derived from a favorite Pokémon's primary type. */

export type ThemeTokens = {
  /** "default" = original sky look; otherwise a Pokémon type key. */
  type: string;
  accent: string;
  /** "r, g, b" for rgba() helpers */
  accentRgb: string;
  onAccent: string;
  glow: string;
};

/** Site accent source. Default = original PokeLead sky (no type tint). */
export type ThemeMode = "default" | "favorite";

const THEME_MODE_KEY = "pokelead-theme-mode-v1";

/** Tuned for dark UI — readable accents, soft radial glow. */
const BY_TYPE: Record<string, Omit<ThemeTokens, "type">> = {
  bug: { accent: "#A8C030", accentRgb: "168, 192, 48", onAccent: "#0a1204", glow: "rgba(168, 192, 48, 0.14)" },
  dark: { accent: "#8B8798", accentRgb: "139, 135, 152", onAccent: "#0c0c12", glow: "rgba(139, 135, 152, 0.16)" },
  dragon: { accent: "#5B7ED4", accentRgb: "91, 126, 212", onAccent: "#040812", glow: "rgba(91, 126, 212, 0.15)" },
  electric: { accent: "#E8C830", accentRgb: "232, 200, 48", onAccent: "#1a1400", glow: "rgba(232, 200, 48, 0.14)" },
  fairy: { accent: "#E898B8", accentRgb: "232, 152, 184", onAccent: "#1a0810", glow: "rgba(232, 152, 184, 0.14)" },
  fighting: { accent: "#D04038", accentRgb: "208, 64, 56", onAccent: "#140404", glow: "rgba(208, 64, 56, 0.14)" },
  fire: { accent: "#F07838", accentRgb: "240, 120, 56", onAccent: "#140804", glow: "rgba(240, 120, 56, 0.14)" },
  flying: { accent: "#80B0E0", accentRgb: "128, 176, 224", onAccent: "#041018", glow: "rgba(128, 176, 224, 0.14)" },
  ghost: { accent: "#8A78C0", accentRgb: "138, 120, 192", onAccent: "#0c0818", glow: "rgba(138, 120, 192, 0.15)" },
  grass: { accent: "#5DBE4A", accentRgb: "93, 190, 74", onAccent: "#041208", glow: "rgba(93, 190, 74, 0.14)" },
  ground: { accent: "#D09850", accentRgb: "208, 152, 80", onAccent: "#140c04", glow: "rgba(208, 152, 80, 0.14)" },
  ice: { accent: "#70D0C8", accentRgb: "112, 208, 200", onAccent: "#041412", glow: "rgba(112, 208, 200, 0.14)" },
  normal: { accent: "#B0B0B0", accentRgb: "176, 176, 176", onAccent: "#101010", glow: "rgba(176, 176, 176, 0.12)" },
  poison: { accent: "#B060C8", accentRgb: "176, 96, 200", onAccent: "#100818", glow: "rgba(176, 96, 200, 0.14)" },
  psychic: { accent: "#E85890", accentRgb: "232, 88, 144", onAccent: "#14040c", glow: "rgba(232, 88, 144, 0.14)" },
  rock: { accent: "#C8B070", accentRgb: "200, 176, 112", onAccent: "#121008", glow: "rgba(200, 176, 112, 0.13)" },
  steel: { accent: "#78A8B8", accentRgb: "120, 168, 184", onAccent: "#041018", glow: "rgba(120, 168, 184, 0.14)" },
  water: { accent: "#4A9FE8", accentRgb: "74, 159, 232", onAccent: "#04121d", glow: "rgba(74, 159, 232, 0.14)" },
};

/** Original PokeLead sky — used when theme mode is Default. */
export const DEFAULT_THEME: ThemeTokens = {
  type: "default",
  accent: "#3ea8ff",
  accentRgb: "62, 168, 255",
  onAccent: "#04121d",
  glow: "rgba(62, 168, 255, 0.11)",
};

export function themeFromType(type?: string | null): ThemeTokens {
  const key = (type ?? "").toLowerCase().trim();
  if (!key || key === "none" || key === "default") return DEFAULT_THEME;
  const hit = BY_TYPE[key];
  if (!hit) return DEFAULT_THEME;
  return { type: key, ...hit };
}

export function resolveTheme(mode: ThemeMode, favoriteType?: string | null): ThemeTokens {
  if (mode === "default") return DEFAULT_THEME;
  return themeFromType(favoriteType);
}

export function readThemeMode(): ThemeMode {
  if (typeof window === "undefined") return "default";
  try {
    const raw = localStorage.getItem(THEME_MODE_KEY);
    if (raw === "favorite" || raw === "default") return raw;
  } catch {
    /* private mode */
  }
  return "default";
}

export function writeThemeMode(mode: ThemeMode): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(THEME_MODE_KEY, mode);
  } catch {
    /* private mode / quota */
  }
}

export function applyThemeTokens(tokens: ThemeTokens): void {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  root.style.setProperty("--accent", tokens.accent);
  root.style.setProperty("--accent-rgb", tokens.accentRgb);
  root.style.setProperty("--on-accent", tokens.onAccent);
  root.style.setProperty("--accent-glow", tokens.glow);
  root.dataset.themeType = tokens.type;
}

export function clearThemeTokens(): void {
  applyThemeTokens(DEFAULT_THEME);
}

/** First usable type from a GM types array. */
export function primaryTypeFromGmTypes(types?: string[] | null): string | undefined {
  const clean = (types ?? [])
    .map((t) => t.toLowerCase())
    .filter((t) => t && t !== "none");
  return clean[0];
}
