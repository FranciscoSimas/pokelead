import type { LeagueCp } from "./types";

/**
 * Pokémon GO CPM table (levels 1–51, half-levels).
 * L1–46 match prior PvPoke-style values; L46.5–51 from Game Master / Silph Road.
 * Index i = level 1 + i*0.5 (i=0 → L1, i=100 → L51).
 */
const CPM: number[] = [
  0.094, 0.135137432, 0.16639787, 0.192650919, 0.21573247, 0.236572661, 0.255720052,
  0.273530381, 0.290249695, 0.306057377, 0.3210876, 0.335445036, 0.34921268, 0.362457751,
  0.37523559, 0.387592406, 0.39956728, 0.411193551, 0.4225, 0.432926409, 0.44310755,
  0.453059958, 0.46279839, 0.472336083, 0.48168495, 0.490855821, 0.49985844, 0.508701765,
  0.51739395, 0.525942511, 0.5343543, 0.542635726, 0.55079269, 0.558830576, 0.5667545,
  0.574569133, 0.58227891, 0.589887907, 0.5974, 0.604818814, 0.6121573, 0.619399365,
  0.6265671, 0.633644533, 0.64065295, 0.647576426, 0.65443563, 0.661214806, 0.667934,
  0.674581896, 0.6811649, 0.687676694, 0.69414365, 0.700559917, 0.7069595, 0.713279193,
  0.719549, 0.725759232, 0.7317, 0.734741038, 0.7377695, 0.740785574, 0.74378943,
  0.746781211, 0.74976104, 0.752729087, 0.7556855, 0.758630368, 0.76156384, 0.764486065,
  0.76739717, 0.770297266, 0.7731865, 0.776064962, 0.77893275, 0.781790055, 0.784637,
  0.787473608, 0.7903, 0.792803968, 0.79530001, 0.797800015, 0.8003, 0.802799861,
  0.8053, 0.8078, 0.810299935, 0.812798629, 0.81529951, 0.817799681, 0.82029999,
  // 46.5 – 51
  0.822803779, 0.825299978, 0.827803751, 0.830299973, 0.832803753,
  0.835300028, 0.837803756, 0.840300024, 0.842803729, 0.845300019,
];

export type BaseStats = { atk: number; def: number; hp: number };

export type IvRankResult = {
  /** 1 = best bulk among 4096 */
  rank: number;
  total: number;
  /** Percentile: how many spreads you beat */
  percentile: number;
  /** Your stat product as % of the #1 spread */
  pctOfBest: number;
  statProduct: number;
  bestStatProduct: number;
  /** Best IVs under the CP cap (Master League → usually 15/15/15) */
  bestIvs: [number, number, number];
  level: number;
  cp: number;
  league: LeagueCp;
};

/** Infer target league from the Pokémon's current CP. */
export function leagueFromCp(cp: number): LeagueCp {
  if (cp <= 500) return 500;
  if (cp <= 1500) return 1500;
  if (cp <= 2500) return 2500;
  return 10000;
}

export function leagueShortName(cp: LeagueCp): string {
  if (cp === 500) return "LC";
  if (cp === 1500) return "GL";
  if (cp === 2500) return "UL";
  return "ML";
}

/** CP cap + default level cap (without Best Buddy) for bulk IV ranking in a format. */
export function ivRankParams(formatCp: number): { cap: LeagueCp; maxLevel: number } {
  if (formatCp <= 500) return { cap: 500, maxLevel: 15 };
  if (formatCp <= 1500) return { cap: 1500, maxLevel: 50 };
  if (formatCp <= 2500) return { cap: 2500, maxLevel: 50 };
  return { cap: 10000, maxLevel: 50 };
}

/**
 * Level cap for a specific box mon in a format.
 * Best Buddy unlocks L51 (except Little Cup, which stays at the format cap).
 */
export function monLevelCap(formatCp: number, bestBuddy = false): number {
  const { maxLevel } = ivRankParams(formatCp);
  if (maxLevel <= 15) return maxLevel;
  return bestBuddy ? 51 : 50;
}

function cpmAt(level: number): number {
  const idx = Math.round((level - 1) * 2);
  return CPM[Math.min(Math.max(idx, 0), CPM.length - 1)];
}

export function calcCp(
  base: BaseStats,
  atkIv: number,
  defIv: number,
  hpIv: number,
  level: number,
): number {
  const cpm = cpmAt(level);
  const atk = (base.atk + atkIv) * cpm;
  const def = (base.def + defIv) * cpm;
  const sta = (base.hp + hpIv) * cpm;
  return Math.max(10, Math.floor((atk * Math.sqrt(def) * Math.sqrt(sta)) / 10));
}

/** In-game HP at a level (floor of stamina × CPM). */
export function calcHp(base: BaseStats, hpIv: number, level: number): number {
  return Math.floor((base.hp + hpIv) * cpmAt(level));
}

/**
 * Apply Shadow CP multipliers when using non-shadow base stats.
 * Prefer a `_shadow` GameMaster entry when available instead.
 */
export function shadowAdjustedBase(base: BaseStats): BaseStats {
  return {
    atk: Math.round(base.atk * 1.2),
    def: Math.round(base.def * (5 / 6)),
    hp: base.hp,
  };
}

/** Best matching level for a given CP (half-levels). Defaults to 1 if none fit. */
export function estimateLevelFromCp(
  base: BaseStats,
  atkIv: number,
  defIv: number,
  hpIv: number,
  cp: number,
  maxLevel = 50,
): number {
  let bestLevel = 1;
  let bestDiff = Infinity;
  const steps = Math.round((maxLevel - 1) * 2) + 1;
  for (let i = 0; i < steps; i++) {
    const level = 1 + i * 0.5;
    const c = calcCp(base, atkIv, defIv, hpIv, level);
    const diff = Math.abs(c - cp);
    if (diff < bestDiff || (diff === bestDiff && level > bestLevel)) {
      bestDiff = diff;
      bestLevel = level;
    }
    if (c > cp && diff > 5) break;
  }
  return bestLevel;
}

/** Prefer a stored level when it still matches CP; otherwise solve from CP + IVs. */
export function resolveMonLevel(
  base: BaseStats,
  atkIv: number,
  defIv: number,
  hpIv: number,
  cp: number,
  storedLevel?: number | null,
  maxLevel = 50,
): number {
  if (storedLevel != null && storedLevel >= 1 && storedLevel <= maxLevel + 1e-9) {
    const expected = calcCp(base, atkIv, defIv, hpIv, storedLevel);
    if (Math.abs(expected - cp) <= 1) return storedLevel;
  }
  return estimateLevelFromCp(base, atkIv, defIv, hpIv, cp, maxLevel);
}

/** Display half-levels as 20.5, whole levels as 20. */
export function formatLevel(level: number): string {
  const rounded = Math.round(level * 2) / 2;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
}

/** PvPoke-style battle stat product at a level. */
function calcStatProduct(
  base: BaseStats,
  atkIv: number,
  defIv: number,
  hpIv: number,
  level: number,
): number {
  const cpm = cpmAt(level);
  const atk = (base.atk + atkIv) * cpm;
  const def = (base.def + defIv) * cpm;
  const hp = Math.floor((base.hp + hpIv) * cpm);
  return Math.round(atk * def * hp);
}

function bestUnderCap(
  base: BaseStats,
  atkIv: number,
  defIv: number,
  hpIv: number,
  cpCap: number,
  maxLevel: number,
): { level: number; cp: number; statProduct: number } {
  // Master League has no CP cap. Always max level. Hundo (15/15/15) is #1.
  if (cpCap >= 10000) {
    return {
      level: maxLevel,
      cp: calcCp(base, atkIv, defIv, hpIv, maxLevel),
      statProduct: calcStatProduct(base, atkIv, defIv, hpIv, maxLevel),
    };
  }
  let best = { level: 1, cp: 10, statProduct: 0 };
  const steps = Math.round((maxLevel - 1) * 2) + 1;
  for (let i = 0; i < steps; i++) {
    const level = 1 + i * 0.5;
    if (level > maxLevel + 1e-9) break;
    const cp = calcCp(base, atkIv, defIv, hpIv, level);
    if (cp <= cpCap) {
      best = {
        level,
        cp,
        statProduct: calcStatProduct(base, atkIv, defIv, hpIv, level),
      };
    } else {
      break;
    }
  }
  return best;
}

/**
 * Rank IV spread among all 4096 by max stat product under the league CP cap.
 * Also reports % of the #1 product (closer to how PvP sites talk about “99% IVs”).
 *
 * Builds one product table per base stats + league (shared across IV spreads of the
 * same species), then caches individual results.
 */
type ProductTable = {
  /** index = atk*256 + def*16 + hp */
  products: Int32Array;
  bestSp: number;
  bestIvs: [number, number, number];
};

const productTables = new Map<string, ProductTable>();
const ivRankCache = new Map<string, IvRankResult>();
const IV_RANK_CACHE_MAX = 8000;

function tableKey(base: BaseStats, cp: LeagueCp, maxLevel: number): string {
  return `${base.atk},${base.def},${base.hp}|${cp}|${maxLevel}`;
}

function getProductTable(base: BaseStats, cp: LeagueCp, maxLevel: number): ProductTable {
  const key = tableKey(base, cp, maxLevel);
  const hit = productTables.get(key);
  if (hit) return hit;

  const products = new Int32Array(4096);
  let bestSp = 0;
  let bestIvs: [number, number, number] = [0, 15, 15];
  for (let a = 0; a <= 15; a++) {
    for (let d = 0; d <= 15; d++) {
      for (let h = 0; h <= 15; h++) {
        const sp = bestUnderCap(base, a, d, h, cp, maxLevel).statProduct;
        products[(a << 8) | (d << 4) | h] = sp;
        if (sp > bestSp) {
          bestSp = sp;
          bestIvs = [a, d, h];
        }
      }
    }
  }
  const table = { products, bestSp, bestIvs };
  productTables.set(key, table);
  return table;
}

export function rankIvSpread(
  base: BaseStats,
  atkIv: number,
  defIv: number,
  hpIv: number,
  cp: LeagueCp,
  maxLevel = 50,
): IvRankResult {
  const a = Math.max(0, Math.min(15, atkIv | 0));
  const d = Math.max(0, Math.min(15, defIv | 0));
  const h = Math.max(0, Math.min(15, hpIv | 0));
  const cacheKey = `${tableKey(base, cp, maxLevel)}|${a}/${d}/${h}`;
  const cached = ivRankCache.get(cacheKey);
  if (cached) return cached;

  const table = getProductTable(base, cp, maxLevel);
  const mineSp = table.products[(a << 8) | (d << 4) | h];
  let better = 0;
  for (let i = 0; i < 4096; i++) {
    if (table.products[i] > mineSp) better++;
  }
  const mine = bestUnderCap(base, a, d, h, cp, maxLevel);
  const rank = better + 1;
  const percentile = Math.round(((4096 - better) / 4096) * 1000) / 10;
  const pctOfBest =
    table.bestSp > 0 ? Math.round((mineSp / table.bestSp) * 1000) / 10 : 0;

  const result: IvRankResult = {
    rank,
    total: 4096,
    percentile,
    pctOfBest,
    statProduct: mineSp,
    bestStatProduct: table.bestSp,
    bestIvs: table.bestIvs,
    level: mine.level,
    cp: mine.cp,
    league: cp,
  };

  if (ivRankCache.size >= IV_RANK_CACHE_MAX) {
    const first = ivRankCache.keys().next().value;
    if (first != null) ivRankCache.delete(first);
  }
  ivRankCache.set(cacheKey, result);
  return result;
}
