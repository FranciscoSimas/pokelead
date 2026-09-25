import { calcCp, calcHp, estimateLevelFromCp, type BaseStats } from "./ivRank";

export type IvTriple = { atk: number; def: number; hp: number };

export type IvHint = {
  atk: number | null;
  def: number | null;
  hp: number | null;
};

/**
 * Find IV spreads that produce exact CP (+ optional HP) at some level.
 * Calcy-style constraint solver - used to snap noisy bar/AI guesses.
 */
export function findIvCombosForCpHp(
  base: BaseStats,
  cp: number,
  hp: number | null,
  maxLevel = 50,
): Array<IvTriple & { level: number }> {
  const out: Array<IvTriple & { level: number }> = [];
  const steps = Math.round((maxLevel - 1) * 2) + 1;
  for (let i = 0; i < steps; i++) {
    const level = 1 + i * 0.5;
    const staOptions: number[] = [];
    if (hp != null) {
      for (let sta = 0; sta <= 15; sta++) {
        if (calcHp(base, sta, level) === hp) staOptions.push(sta);
      }
      if (!staOptions.length) continue;
    } else {
      for (let sta = 0; sta <= 15; sta++) staOptions.push(sta);
    }
    for (const sta of staOptions) {
      for (let atk = 0; atk <= 15; atk++) {
        for (let def = 0; def <= 15; def++) {
          if (calcCp(base, atk, def, sta, level) === cp) {
            out.push({ atk, def, hp: sta, level });
          }
        }
      }
    }
  }
  return out;
}

function l1(a: IvTriple, b: IvTriple): number {
  return Math.abs(a.atk - b.atk) + Math.abs(a.def - b.def) + Math.abs(a.hp - b.hp);
}

function completeTriple(h: IvHint | null | undefined): IvTriple | null {
  if (h?.atk == null || h.def == null || h.hp == null) return null;
  return { atk: h.atk, def: h.def, hp: h.hp };
}

/** Max per-stat |diff| when both sides have a value; null if no overlap. */
function maxStatDisagree(a: IvHint, b: IvHint): number | null {
  let max: number | null = null;
  for (const k of ["atk", "def", "hp"] as const) {
    const av = a[k];
    const bv = b[k];
    if (av == null || bv == null) continue;
    const d = Math.abs(av - bv);
    max = max == null ? d : Math.max(max, d);
  }
  return max;
}

/**
 * Reconcile AI + pixel bar IVs, optionally snapping to CP/HP-legal spreads.
 *
 * Conservative policy (wrong IVs are worse than asking for review):
 * - Unique CP/HP combo → trust
 * - Bars vs AI disagree by >1 on any overlapping stat → suggestion only (uncertain)
 * - AI-only (no bars) → suggestion only unless unique CP/HP
 * - CP snap only when soft is trusted and L1 ≤ 1 (was ≤ 3)
 */
export function reconcileScreenshotIvs(opts: {
  ai: IvHint;
  bars: IvHint | null;
  base: BaseStats | null;
  cp: number | null;
  hp: number | null;
  /** Appraisal star count 0-3, if known */
  stars?: number | null;
}): {
  ivs: IvTriple | null;
  source: string;
  candidates: number;
  level?: number;
  /** True when values are a guess the user should confirm */
  uncertain: boolean;
} {
  const bars = opts.bars;
  const ai = opts.ai;
  const barsTriple = completeTriple(bars);
  const aiTriple = completeTriple(ai);

  const disagree = bars && ai ? maxStatDisagree(bars, ai) : null;
  const sourcesClash = disagree != null && disagree > 1;

  // Prefer appraisal bars when present; never silently average with AI.
  const soft: IvTriple | null = barsTriple ?? aiTriple;
  const softTrusted = Boolean(barsTriple) && !sourcesClash;
  const softIsAiOnly = !barsTriple && Boolean(aiTriple);

  const starsOk = (t: IvTriple) => {
    if (opts.stars == null) return true;
    const sum = t.atk + t.def + t.hp;
    const s = sum >= 37 ? 3 : sum >= 30 ? 2 : sum >= 23 ? 1 : 0;
    return s === opts.stars;
  };

  const withLevel = (ivs: IvTriple) =>
    opts.base && opts.cp != null && opts.cp >= 10
      ? estimateLevelFromCp(opts.base, ivs.atk, ivs.def, ivs.hp, opts.cp)
      : undefined;

  if (opts.base && opts.cp != null && opts.cp >= 10) {
    let combos = findIvCombosForCpHp(opts.base, opts.cp, opts.hp);
    const starred = combos.filter(starsOk);
    if (starred.length) combos = starred;

    // Exact unique math match always wins (even over bad AI).
    if (combos.length === 1) {
      return {
        ivs: { atk: combos[0].atk, def: combos[0].def, hp: combos[0].hp },
        source: "CP/HP unique match",
        candidates: 1,
        level: combos[0].level,
        uncertain: false,
      };
    }

    // Only snap when visual sources agree (or bars alone). Never snap from clashing AI+bars.
    if (combos.length > 1 && soft && softTrusted) {
      let best = combos[0];
      let bestDist = l1(soft, best);
      for (const c of combos.slice(1)) {
        const d = l1(soft, c);
        if (d < bestDist) {
          bestDist = d;
          best = c;
        }
      }
      // Tight snap only (was ≤3 — too loose; false positives like 10/14/14 → 12/15/15).
      if (bestDist <= 1) {
        return {
          ivs: { atk: best.atk, def: best.def, hp: best.hp },
          source: `CP/HP snap (${combos.length} candidates, Δ${bestDist})`,
          candidates: combos.length,
          level: best.level,
          uncertain: false,
        };
      }
      const near = combos.filter(
        (c) =>
          Math.abs(c.atk - soft.atk) <= 1 &&
          Math.abs(c.def - soft.def) <= 1 &&
          Math.abs(c.hp - soft.hp) <= 1,
      );
      if (near.length === 1) {
        return {
          ivs: { atk: near[0].atk, def: near[0].def, hp: near[0].hp },
          source: "CP/HP near appraisal bars",
          candidates: combos.length,
          level: near[0].level,
          uncertain: false,
        };
      }
    }
  }

  if (soft) {
    if (sourcesClash) {
      return {
        ivs: soft,
        source: "bars (AI disagrees)",
        candidates: 0,
        level: withLevel(soft),
        uncertain: true,
      };
    }
    if (softIsAiOnly) {
      return {
        ivs: soft,
        source: "AI vision",
        candidates: 0,
        level: withLevel(soft),
        uncertain: true,
      };
    }
    return {
      ivs: soft,
      source: aiTriple ? "appraisal bars (+ AI agrees)" : "appraisal bars",
      candidates: 0,
      level: withLevel(soft),
      uncertain: false,
    };
  }

  return { ivs: null, source: "none", candidates: 0, uncertain: true };
}

/** Map fill ratio (0-1) to IV with red-full override. */
export function ivFromFillRatio(ratio: number | null, isFullRed: boolean): number | null {
  if (isFullRed) return 15;
  if (ratio == null || !Number.isFinite(ratio)) return null;
  const r = Math.min(1, Math.max(0, ratio));
  if (r >= 0.97) return 15;
  return Math.max(0, Math.min(15, Math.round(r * 15)));
}
