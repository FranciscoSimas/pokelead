"use client";

import type { IvRankResult } from "@/lib/ivRank";
import { leagueShortName } from "@/lib/ivRank";

function pctTitle(result: IvRankResult) {
  return (
    `Bulk score is ${result.pctOfBest}% of the #1 IV spread for this species in ${leagueShortName(result.league)}. ` +
    `Rank #${result.rank} of 4096 IV combinations (0-15). ` +
    `#1 IVs = ${result.bestIvs.join("/")}.`
  );
}

export function IvRankBadge({
  result,
  compact = false,
}: {
  result: IvRankResult | null;
  compact?: boolean;
}) {
  if (!result) return null;
  const tone =
    result.pctOfBest >= 99
      ? "border-positive/35 bg-positive/10 text-positive"
      : result.pctOfBest >= 97
        ? "border-accent/35 bg-accent/10 text-accent"
        : result.pctOfBest >= 94
          ? "border-warn/30 bg-warn/10 text-warn"
          : "border-line-strong bg-surface-2 text-muted";

  const league = leagueShortName(result.league);
  const ideal = `#1 = ${result.bestIvs.join("/")}`;
  const tip = pctTitle(result);

  if (compact) {
    return (
      <span
        title={tip}
        className={`inline-flex items-baseline gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-semibold ${tone}`}
      >
        <span>
          {league} #{result.rank}
        </span>
        <span className="opacity-70">{result.pctOfBest}%</span>
      </span>
    );
  }

  return (
    <div title={tip} className={`rounded-card border px-3 py-2 ${tone}`}>
      <p className="text-[10px] font-semibold uppercase tracking-wider opacity-70">
        IV rank · {league}
      </p>
      <p className="text-lg font-bold">
        #{result.rank}
        <span className="text-sm font-semibold opacity-70"> / 4096</span>
      </p>
      <p className="text-[11px] opacity-80">
        {result.pctOfBest}% bulk vs #1 · L{result.level} · {result.cp} CP
      </p>
      <p className="mt-0.5 text-[11px] font-semibold opacity-90">
        {ideal}
        {result.league === 10000 ? " (Master League, max IVs)" : ""}
      </p>
      <p className="mt-1 text-[10px] leading-snug opacity-55">
        % = your stat product vs the best IV spread under the CP cap (not “% of players beaten”).
      </p>
    </div>
  );
}
