export type LeagueCp = 500 | 1500 | 2500 | 10000;

export type RankingCategory =
  | "overall"
  | "leads"
  | "closers"
  | "switches"
  | "chargers"
  | "attackers"
  | "consistency";

export type PokemonFlags = {
  shadow: boolean;
  purified: boolean;
  lucky: boolean;
  bestBuddy: boolean;
  xl: boolean;
};

export type BoxPokemon = {
  id: string;
  speciesId: string;
  speciesName: string;
  dex: number;
  formLabel?: string;
  cp: number;
  atkIv: number;
  defIv: number;
  hpIv: number;
  level?: number;
  fastMove?: string;
  chargedMoves: string[];
  flags: PokemonFlags;
  /** User labels e.g. "Great League", "raid", "trade" */
  tags?: string[];
  note?: string;
  /** Storage path in the private screenshots bucket when signed in. */
  screenshotPath?: string;
  /**
   * Set only on virtual Teams candidates (Include Evos / power-up).
   * Never persisted to the box store.
   */
  evo?: {
    kind: "evolve" | "power";
    sourceId: string;
    sourceName: string;
    sourceDex: number;
    evolveCp: number;
    currentLevel: number;
    leagueMaxCp: number;
    leagueMaxLevel: number;
    candyEvolve: number | null;
    candyPowerUp: number;
    xlCandyPowerUp: number;
  };
  createdAt: number;
  updatedAt: number;
};

export type RankEntry = {
  speciesId: string;
  speciesName: string;
  score: number;
  moveset?: string[];
};

export type RoleRanks = Partial<
  Record<RankingCategory, { rank: number; score: number; moveset?: string[] }>
>;

export type FormatOption = {
  cup: string;
  label: string;
  cp: LeagueCp;
};

export const DEFAULT_FLAGS: PokemonFlags = {
  shadow: false,
  purified: false,
  lucky: false,
  bestBuddy: false,
  xl: false,
};

export const FORMATS: FormatOption[] = [
  { cup: "all", label: "Great League", cp: 1500 },
  { cup: "all", label: "Ultra League", cp: 2500 },
  { cup: "all", label: "Master League", cp: 10000 },
];

export const RANK_CATEGORIES: { id: RankingCategory; label: string }[] = [
  { id: "overall", label: "Overall" },
  { id: "leads", label: "Leads" },
  { id: "closers", label: "Closers" },
  { id: "switches", label: "Switches" },
  { id: "chargers", label: "Chargers" },
  { id: "attackers", label: "Attackers" },
  { id: "consistency", label: "Consistency" },
];
