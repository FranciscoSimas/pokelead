"use client";

import { useMemo, useState } from "react";
import { FormatSelect } from "@/components/FormatSelect";
import { RankingsSkeleton } from "@/components/RankingsSkeleton";
import { useFormatRankings } from "@/hooks/useFormatRankings";
import {
  IV_PRESETS,
  buildSearch,
  unionTopDex,
  type IvPreset,
} from "@/lib/pogoSearch";

const TOP_N = 50;

function CopyButton({
  text,
  label = "Copy",
  disabled,
}: {
  text: string;
  label?: string;
  disabled?: boolean;
}) {
  const [copied, setCopied] = useState(false);

  async function onCopy() {
    if (!text || disabled) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      /* private mode / denied */
    }
  }

  return (
    <button
      type="button"
      disabled={disabled || !text}
      onClick={onCopy}
      className="shrink-0 rounded-full bg-accent px-3.5 py-2 text-xs font-bold text-ink transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
    >
      {copied ? "Copied" : label}
    </button>
  );
}

function SearchBlock({
  title,
  subtitle,
  value,
  loading,
}: {
  title: string;
  subtitle?: string;
  value: string;
  loading?: boolean;
}) {
  return (
    <div className="rounded-field border border-line bg-surface-2 p-3 sm:p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-bold text-white">{title}</p>
          {subtitle ? <p className="mt-0.5 text-[11px] text-muted">{subtitle}</p> : null}
        </div>
        <CopyButton text={value} disabled={loading || !value} />
      </div>
      <pre className="mt-3 max-h-28 overflow-auto whitespace-pre-wrap break-all rounded-xl border border-line bg-ink/50 px-3 py-2 font-mono text-[11px] leading-relaxed text-fg sm:text-xs">
        {loading ? "Loading…" : value || "—"}
      </pre>
      {value ? (
        <p className="mt-1.5 text-[10px] tabular-nums text-faint">{value.length} characters</p>
      ) : null}
    </div>
  );
}

function IvRow({
  preset,
  speciesQuery,
  loading,
}: {
  preset: IvPreset;
  speciesQuery: string;
  loading: boolean;
}) {
  const combined = buildSearch(speciesQuery, preset.query);
  return (
    <li className="rounded-field border border-line bg-surface-2 p-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-white">{preset.label}</p>
          <p className="mt-0.5 text-[11px] text-muted">{preset.hint}</p>
          <p className="mt-1 font-mono text-[10px] text-faint">{preset.query}</p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          <CopyButton text={preset.query} label="IV only" disabled={loading} />
          <CopyButton
            text={combined}
            label="Species + IV"
            disabled={loading || !speciesQuery}
          />
        </div>
      </div>
    </li>
  );
}

export default function SearchPage() {
  const {
    formats,
    formatId,
    setFormatId,
    format,
    gm,
    lists,
    rankSource,
    err,
    loadingGm,
    loadingRanks,
  } = useFormatRankings();

  const loading = loadingGm || loadingRanks || !gm;

  const union = useMemo(() => {
    if (!gm || loadingRanks) return null;
    return unionTopDex(lists, gm, TOP_N);
  }, [gm, lists, loadingRanks]);

  const speciesQuery = union?.speciesQuery ?? "";

  return (
    <div className="space-y-5 sm:space-y-6">
      <div>
        <h1 className="font-[family-name:var(--font-lilita)] text-3xl leading-none tracking-wide text-white sm:text-4xl">
          Find in GO
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-muted">
          Copy Pokémon GO search strings for this league&apos;s top meta, then paste them in{" "}
          <span className="text-fg">Pokémon → search</span> in the game.
        </p>
      </div>

      <div className="relative z-30 flex flex-col gap-3 sm:flex-row sm:items-end sm:gap-4">
        <div className="relative z-10 shrink-0">
          <FormatSelect formats={formats} value={formatId} onChange={setFormatId} />
        </div>
        {rankSource === "open" && format.cup !== "all" ? (
          <p className="text-xs text-warn">
            Cup rankings missing — using open league ranks filtered to cup rules.
          </p>
        ) : null}
      </div>

      {err ? (
        <p className="rounded-field border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger">
          {err}
        </p>
      ) : null}

      {loading && !union ? (
        <RankingsSkeleton />
      ) : (
        <>
          <section className="space-y-3">
            <div>
              <h2 className="text-lg font-bold text-white">Species (top {TOP_N} roles)</h2>
              <p className="mt-1 text-xs text-muted">
                Unique Pokédex numbers from top {TOP_N} Overall + Lead + Switch + Closer
                {union
                  ? ` · ${union.dexNumbers.length} species (${union.sourceCount} rank slots)`
                  : ""}
                .
              </p>
            </div>
            <SearchBlock
              title={`${format.label} — dex list`}
              subtitle="Paste alone to see those families in your GO box. Dex matches all forms of that number."
              value={speciesQuery}
              loading={loading}
            />
          </section>

          <section className="space-y-3">
            <div>
              <h2 className="text-lg font-bold text-white">IV band presets</h2>
              <p className="mt-1 text-xs text-muted">
                PoGo bands: 0 = 0 · 1 = 1–5 · 2 = 6–10 · 3 = 11–14 · 4 = 15. Use{" "}
                <span className="text-fg">Species + IV</span> to AND with the list above.
              </p>
            </div>
            <ul className="space-y-2">
              {IV_PRESETS.map((preset) => (
                <IvRow
                  key={preset.id}
                  preset={preset}
                  speciesQuery={speciesQuery}
                  loading={loading}
                />
              ))}
            </ul>
          </section>

          <aside className="rounded-field border border-line bg-surface-2/60 px-3 py-3 text-[11px] leading-relaxed text-muted sm:px-4">
            <p className="font-semibold text-fg">Notes</p>
            <ul className="mt-1.5 list-disc space-y-1 pl-4">
              <li>
                Dex search includes all forms of that number (regionals, etc.). Shadows share the
                same dex — add <code className="text-fg">&amp;shadow</code> or{" "}
                <code className="text-fg">!shadow</code> if you need to narrow.
              </li>
              <li>
                IV bands are approximate; some strong PvP spreads sit outside a single preset.
              </li>
              <li>
                In GO: open your Pokémon storage → tap the search icon → paste → optional save as
                favorite search.
              </li>
            </ul>
          </aside>
        </>
      )}
    </div>
  );
}
