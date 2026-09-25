"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { GameMaster, GmPokemon } from "@/lib/pvpoke";
import { matchSpeciesFromOcr, parsePokemonScreenshotText, extractFormHints } from "@/lib/ocrParse";
import {
  detectShadowFromPixels,
  ocrImageFile,
  readAppraisalIvBars,
  terminateOcrWorker,
} from "@/lib/ocrTesseract";
import {
  checkScreenshotAiAvailable,
  parseScreenshotWithAi,
} from "@/lib/screenshotAi";
import { reconcileScreenshotIvs } from "@/lib/ivFromScreenshot";
import { shadowAdjustedBase, type BaseStats } from "@/lib/ivRank";
import { defaultPvpMoves } from "@/lib/recommend";
import { fetchRankingsClient } from "@/lib/fetchPvpokeClient";
import type { RankEntry } from "@/lib/types";
import { isLikelyImageFile, normalizeImageFile } from "@/lib/imageFile";
import { PokemonSprite } from "./PokemonSprite";
import { MovePicker } from "./MovePicker";

export type ScreenshotDraft = {
  id: string;
  file: File;
  fileName: string;
  previewUrl: string;
  status: "queued" | "reading" | "ready" | "error";
  error?: string;
  rawText?: string;
  /** Short user-facing hints only */
  notes: string[];
  speciesId: string;
  speciesName: string;
  dex: number;
  formLabel: string;
  shadow: boolean;
  lucky: boolean;
  cp: number;
  atkIv: number | null;
  defIv: number | null;
  hpIv: number | null;
  ivsFound: boolean;
  level?: number;
  fastMove: string;
  charged1: string;
  charged2: string;
  candidates: { speciesId: string; speciesName: string; dex: number; shadow: boolean }[];
  selected: boolean;
};

function formBadge(p: GmPokemon): string {
  const id = p.speciesId.toLowerCase();
  const tags = (p.tags ?? []).map((t) => t.toLowerCase());
  const parts: string[] = [];
  if (id.includes("_shadow") || tags.includes("shadow")) parts.push("Shadow");
  if (id.includes("alolan") || tags.includes("alolan")) parts.push("Alolan");
  if (id.includes("galarian") || tags.includes("galarian")) parts.push("Galarian");
  if (id.includes("hisuian") || tags.includes("hisuian")) parts.push("Hisuian");
  if (id.includes("paldean") || tags.includes("paldean")) parts.push("Paldean");
  if (id.includes("_mega") || tags.includes("mega")) parts.push("Mega");
  if (parts.length) return parts.join(" · ");
  const paren = p.speciesName.match(/\((.+)\)/);
  if (paren) return paren[1];
  return "Standard";
}

function baseName(p: GmPokemon): string {
  return p.speciesName.replace(/\s*\([^)]*\)\s*/g, "").trim();
}

function isShadowGm(p: GmPokemon): boolean {
  return (
    p.speciesId.toLowerCase().includes("_shadow") ||
    (p.tags ?? []).some((t) => t.toLowerCase() === "shadow")
  );
}

function eliteList(mon: GmPokemon | null | undefined): string[] {
  const e = mon?.eliteMoves as string[] | string | undefined;
  if (!e) return [];
  return Array.isArray(e) ? e : [e];
}

/** Fast + charged from PvPoke ranking moveset, then learnset. */
function rankingListForCp(
  cp: number,
  ranks: { lc: RankEntry[]; gl: RankEntry[]; ul: RankEntry[]; ml: RankEntry[] },
): RankEntry[] {
  if (cp <= 500) return ranks.lc.length ? ranks.lc : ranks.gl;
  if (cp <= 1500) return ranks.gl;
  if (cp <= 2500) return ranks.ul;
  return ranks.ml;
}

function pvpMovesFor(
  p: GmPokemon | null | undefined,
  cp: number,
  ranks: { lc: RankEntry[]; gl: RankEntry[]; ul: RankEntry[]; ml: RankEntry[] },
): { fastMove: string; charged1: string; charged2: string } {
  if (!p) return { fastMove: "", charged1: "", charged2: "" };
  return defaultPvpMoves(p, p.speciesId, rankingListForCp(cp, ranks));
}

function uid() {
  return crypto.randomUUID();
}

export function ScreenshotImport({
  open,
  onClose,
  gm,
  onSave,
}: {
  open: boolean;
  onClose: () => void;
  gm: GameMaster | null;
  onSave: (
    rows: {
      speciesId: string;
      speciesName: string;
      dex: number;
      formLabel: string;
      cp: number;
      atkIv: number;
      defIv: number;
      hpIv: number;
      level?: number;
      flags: {
        shadow: boolean;
        purified: boolean;
        lucky: boolean;
        bestBuddy: boolean;
        xl: boolean;
      };
      chargedMoves: string[];
      fastMove?: string;
      file?: File;
    }[],
  ) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [drafts, setDrafts] = useState<ScreenshotDraft[]>([]);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState("");
  const [aiAvailable, setAiAvailable] = useState<boolean | null>(null);
  const [rankLists, setRankLists] = useState<{
    lc: RankEntry[];
    gl: RankEntry[];
    ul: RankEntry[];
    ml: RankEntry[];
  }>({ lc: [], gl: [], ul: [], ml: [] });

  useEffect(() => {
    if (!open) return;
    void checkScreenshotAiAvailable().then(setAiAvailable);
    void Promise.all([
      fetchRankingsClient("all", "overall", 500).catch(() => [] as RankEntry[]),
      fetchRankingsClient("all", "overall", 1500).catch(() => [] as RankEntry[]),
      fetchRankingsClient("all", "overall", 2500).catch(() => [] as RankEntry[]),
      fetchRankingsClient("all", "overall", 10000).catch(() => [] as RankEntry[]),
    ]).then(([lc, gl, ul, ml]) => setRankLists({ lc, gl, ul, ml }));
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && !busy) onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener("keydown", onKey);
    };
  }, [open, onClose, busy]);

  useEffect(() => {
    return () => {
      for (const d of drafts) URL.revokeObjectURL(d.previewUrl);
      void terminateOcrWorker();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selectedCount = useMemo(
    () =>
      drafts.filter(
        (d) =>
          d.selected &&
          d.status === "ready" &&
          d.speciesId &&
          d.cp >= 10 &&
          d.atkIv != null &&
          d.defIv != null &&
          d.hpIv != null,
      ).length,
    [drafts],
  );

  const moveLookup = useMemo(() => {
    const map = new Map<string, { name: string; type: string }>();
    if (!gm) return (id: string) => map.get(id);
    for (const m of gm.moves) map.set(m.moveId, { name: m.name, type: m.type });
    return (id: string) => map.get(id);
  }, [gm]);

  function patch(id: string, partial: Partial<ScreenshotDraft>) {
    setDrafts((rows) => rows.map((r) => (r.id === id ? { ...r, ...partial } : r)));
  }

  function resolveGmMon(d: ScreenshotDraft): GmPokemon | null {
    if (!gm || !d.speciesId) return null;
    const sid = d.shadow ? `${d.speciesId}_shadow` : d.speciesId;
    return (
      gm.pokemon.find((p) => p.speciesId === sid) ??
      gm.pokemon.find((p) => p.speciesId === d.speciesId) ??
      null
    );
  }

  function applySpecies(draftId: string, p: GmPokemon) {
    const shadow = isShadowGm(p);
    const draft = drafts.find((d) => d.id === draftId);
    patch(draftId, {
      speciesId: p.speciesId.replace(/_shadow$/i, ""),
      speciesName: baseName(p),
      dex: p.dex,
      formLabel: formBadge(p),
      shadow,
      ...pvpMovesFor(p, draft?.cp ?? 1500, rankLists),
    });
  }

  async function ensureRanks() {
    if (rankLists.gl.length || rankLists.ul.length || rankLists.ml.length) return rankLists;
    const [lc, gl, ul, ml] = await Promise.all([
      fetchRankingsClient("all", "overall", 500).catch(() => [] as RankEntry[]),
      fetchRankingsClient("all", "overall", 1500).catch(() => [] as RankEntry[]),
      fetchRankingsClient("all", "overall", 2500).catch(() => [] as RankEntry[]),
      fetchRankingsClient("all", "overall", 10000).catch(() => [] as RankEntry[]),
    ]);
    const next = { lc, gl, ul, ml };
    setRankLists(next);
    return next;
  }

  async function processFiles(files: FileList | File[]) {
    // Copy immediately. Clearing the <input> (or awaiting) can empty a live FileList on mobile.
    const picked = Array.from(files);
    if (!gm) {
      setProgress("Still loading game data, try again in a moment.");
      return;
    }
    const ranks = await ensureRanks();
    const list = picked.filter(isLikelyImageFile);
    if (!list.length) {
      setProgress(
        picked.length
          ? `Could not use ${picked.length} file${picked.length === 1 ? "" : "s"} as images (${picked
              .slice(0, 2)
              .map((f) => f.name || f.type || "unnamed")
              .join(", ")}). Try a PNG/JPG Pokémon GO screenshot.`
          : "No files selected.",
      );
      return;
    }

    const useAi =
      aiAvailable === true ||
      (aiAvailable == null && (await checkScreenshotAiAvailable()));
    if (aiAvailable == null) setAiAvailable(useAi);

    // Normalize mobile blank-MIME / HEIC before creating drafts.
    const normalized: File[] = [];
    const normErrors: string[] = [];
    setBusy(true);
    for (const file of list) {
      try {
        setProgress(`Preparing ${file.name || "image"}…`);
        normalized.push(await normalizeImageFile(file));
      } catch (e) {
        normErrors.push(e instanceof Error ? e.message : "Could not read image");
      }
    }
    if (!normalized.length) {
      setBusy(false);
      setProgress(normErrors[0] ?? "Could not read the selected images.");
      return;
    }

    const created: ScreenshotDraft[] = normalized.map((file) => ({
      id: uid(),
      file,
      fileName: file.name,
      previewUrl: URL.createObjectURL(file),
      status: "queued",
      notes: [],
      speciesId: "",
      speciesName: "",
      dex: 0,
      formLabel: "Standard",
      shadow: false,
      lucky: false,
      cp: 0,
      atkIv: null,
      defIv: null,
      hpIv: null,
      ivsFound: false,
      fastMove: "",
      charged1: "",
      charged2: "",
      candidates: [],
      selected: true,
    }));

    setDrafts((prev) => [...created, ...prev]);

    for (let i = 0; i < normalized.length; i++) {
      const file = normalized[i];
      const draftId = created[i].id;
      setProgress(`Reading ${i + 1}/${normalized.length}: ${file.name}`);
      patch(draftId, { status: "reading" });
      try {
        // Prefer free Gemini vision when GEMINI_API_KEY is configured
        let usedAi = false;
        if (useAi) {
          try {
            const [aiSettled, purpleShadow, barIvs] = await Promise.all([
              parseScreenshotWithAi(file).then(
                (v) => ({ ok: true as const, v }),
                (e) => ({
                  ok: false as const,
                  err: e instanceof Error ? e.message : "AI failed",
                }),
              ),
              detectShadowFromPixels(file),
              readAppraisalIvBars(file),
            ]);

            if (!aiSettled.ok) {
              throw new Error(aiSettled.err);
            }
            const ai = aiSettled.v;
            usedAi = true;
            const shadow = ai.shadow || purpleShadow;
            const speciesQuery = ai.speciesName;
            const formHints = extractFormHints(ai.speciesName ?? "");
            const matches = matchSpeciesFromOcr(
              gm,
              speciesQuery,
              formHints,
              shadow,
              speciesQuery ?? undefined,
            );
            let best = matches[0]?.gm;
            if (shadow && best && !isShadowGm(best)) {
              const shadowAlt = matches.find((m) => isShadowGm(m.gm));
              if (shadowAlt && shadowAlt.score >= (matches[0]?.score ?? 0) - 25) {
                best = shadowAlt.gm;
              } else {
                const baseId = best.speciesId.replace(/_shadow$/i, "");
                const forced = gm.pokemon.find(
                  (p) =>
                    p.speciesId === `${baseId}_shadow` ||
                    (isShadowGm(p) && p.speciesId.startsWith(baseId)),
                );
                if (forced) best = forced;
              }
            }

            const candidates = matches.map((m) => ({
              speciesId: m.gm.speciesId,
              speciesName: baseName(m.gm),
              dex: m.gm.dex,
              shadow: isShadowGm(m.gm),
            }));

            let base: BaseStats | null = null;
            if (best?.baseStats) {
              base = isShadowGm(best)
                ? best.baseStats
                : shadow
                  ? shadowAdjustedBase(best.baseStats)
                  : best.baseStats;
            }

            const reconciled = reconcileScreenshotIvs({
              ai: { atk: ai.atkIv, def: ai.defIv, hp: ai.hpIv },
              bars: barIvs
                ? { atk: barIvs.atk, def: barIvs.def, hp: barIvs.hp }
                : null,
              base,
              cp: ai.cp,
              hp: ai.hp,
              stars: ai.stars,
            });

            const atkIv = reconciled.ivs?.atk ?? null;
            const defIv = reconciled.ivs?.def ?? null;
            const hpIv = reconciled.ivs?.hp ?? null;
            const hasIvValues = atkIv != null && defIv != null && hpIv != null;
            // Uncertain guesses still fill the fields, but require review before we treat them as found.
            const ivsFound = hasIvValues && !reconciled.uncertain;
            const cp = ai.cp ?? 0;
            const notes: string[] = [];
            if (cp <= 0) notes.push("Set CP before saving");
            if (reconciled.uncertain && hasIvValues) {
              notes.push("IVs need review, confirm before saving");
            } else if (!hasIvValues) {
              notes.push("Enter IVs (0-15) before saving");
            }
            if (!best) notes.push("Pick a species below");

            const moves = pvpMovesFor(best, cp, ranks);
            patch(draftId, {
              status: "ready",
              rawText: JSON.stringify({ ai, barIvs, reconciled }),
              notes,
              speciesId: best ? best.speciesId.replace(/_shadow$/i, "") : "",
              speciesName: best ? baseName(best) : speciesQuery ?? "",
              dex: best?.dex ?? 0,
              formLabel: best ? formBadge(best) : "Standard",
              shadow: best ? isShadowGm(best) || shadow : shadow,
              lucky: ai.lucky,
              cp,
              atkIv,
              defIv,
              hpIv,
              ivsFound,
              level: reconciled.level,
              ...moves,
              candidates,
              selected: Boolean(best),
            });
          } catch (aiErr) {
            console.warn("AI parse failed, falling back to local OCR", aiErr);
            usedAi = false;
          }
        }

        if (!usedAi) {
          const [ocr, purpleShadow, barIvs] = await Promise.all([
            ocrImageFile(file),
            detectShadowFromPixels(file),
            readAppraisalIvBars(file),
          ]);
          const parsed = parsePokemonScreenshotText(ocr.text);
          const cp = parsed.cp ?? ocr.cpHint ?? 0;
          const shadow = parsed.shadow || purpleShadow;
          const matches = matchSpeciesFromOcr(
            gm,
            parsed.speciesQuery,
            parsed.formHints,
            shadow,
            parsed.rawText,
          );
          let best = matches[0]?.gm;
          if (shadow && best && !isShadowGm(best)) {
            const shadowAlt = matches.find((m) => isShadowGm(m.gm));
            if (shadowAlt && shadowAlt.score >= (matches[0]?.score ?? 0) - 25) {
              best = shadowAlt.gm;
            } else {
              const baseId = best.speciesId.replace(/_shadow$/i, "");
              const forced = gm.pokemon.find(
                (p) =>
                  p.speciesId === `${baseId}_shadow` ||
                  (isShadowGm(p) && p.speciesId.startsWith(baseId)),
              );
              if (forced) best = forced;
            }
          }

          const candidates = matches.map((m) => ({
            speciesId: m.gm.speciesId,
            speciesName: baseName(m.gm),
            dex: m.gm.dex,
            shadow: isShadowGm(m.gm),
          }));

          let base: BaseStats | null = null;
          if (best?.baseStats) {
            base = isShadowGm(best)
              ? best.baseStats
              : shadow
                ? shadowAdjustedBase(best.baseStats)
                : best.baseStats;
          }

          const reconciled = reconcileScreenshotIvs({
            ai: { atk: parsed.atkIv, def: parsed.defIv, hp: parsed.hpIv },
            bars: barIvs
              ? { atk: barIvs.atk, def: barIvs.def, hp: barIvs.hp }
              : null,
            base,
            cp: cp > 0 ? cp : null,
            hp: null,
          });

          const atkIv = reconciled.ivs?.atk ?? parsed.atkIv ?? barIvs?.atk ?? null;
          const defIv = reconciled.ivs?.def ?? parsed.defIv ?? barIvs?.def ?? null;
          const hpIv = reconciled.ivs?.hp ?? parsed.hpIv ?? barIvs?.hp ?? null;
          const hasIvValues = atkIv != null && defIv != null && hpIv != null;
          const ivsFound = hasIvValues && !reconciled.uncertain;

          const notes: string[] = [];
          if (cp <= 0) notes.push("Set CP before saving");
          if (reconciled.uncertain && hasIvValues) {
            notes.push("IVs need review, confirm before saving");
          } else if (!hasIvValues) {
            notes.push("Enter IVs (0-15) before saving");
          }
          if (!best) notes.push("Pick a species below");

          const moves = pvpMovesFor(best, cp, ranks);
          patch(draftId, {
            status: "ready",
            rawText: parsed.rawText,
            notes,
            speciesId: best ? best.speciesId.replace(/_shadow$/i, "") : "",
            speciesName: best ? baseName(best) : parsed.speciesQuery ?? "",
            dex: best?.dex ?? 0,
            formLabel: best ? formBadge(best) : "Standard",
            shadow: best ? isShadowGm(best) || shadow : shadow,
            lucky: parsed.lucky,
            cp,
            atkIv,
            defIv,
            hpIv,
            ivsFound,
            level: reconciled.level,
            ...moves,
            candidates,
            selected: Boolean(best),
          });
        }
      } catch (e) {
        patch(draftId, {
          status: "error",
          error: e instanceof Error ? e.message : "OCR failed",
          selected: false,
        });
      }
    }

    setBusy(false);
    setProgress(
      normErrors.length
        ? `${normalized.length} ready · ${normErrors.length} skipped (${normErrors[0]})`
        : "",
    );
  }

  function clearAll() {
    for (const d of drafts) URL.revokeObjectURL(d.previewUrl);
    setDrafts([]);
  }

  function saveSelected() {
    const rows = drafts.filter(
      (d) =>
        d.selected &&
        d.status === "ready" &&
        d.speciesId &&
        d.dex &&
        d.cp >= 10 &&
        d.atkIv != null &&
        d.defIv != null &&
        d.hpIv != null,
    );
    if (!rows.length) return;
    onSave(
      rows.map((d) => ({
        speciesId: d.speciesId,
        speciesName: d.speciesName,
        dex: d.dex,
        formLabel: d.formLabel,
        cp: d.cp,
        atkIv: d.atkIv!,
        defIv: d.defIv!,
        hpIv: d.hpIv!,
        level: d.level,
        flags: {
          shadow: d.shadow,
          purified: false,
          lucky: d.lucky,
          bestBuddy: false,
          xl: false,
        },
        fastMove: d.fastMove || undefined,
        chargedMoves: [d.charged1, d.charged2].filter(Boolean),
        file: d.file,
      })),
    );
    clearAll();
    onClose();
  }

  if (!open) return null;

  return (
    <AnimatePresence>
      <motion.div
        key="ocr-backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[110] flex items-end justify-center bg-black/70 backdrop-blur-sm sm:items-center sm:p-4"
        onClick={() => {
          if (!busy) onClose();
        }}
        role="presentation"
      >
        <motion.div
          initial={{ y: 40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 24, opacity: 0 }}
          transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="ocr-title"
          className="glass flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-t-3xl sm:max-h-[88vh] sm:rounded-card"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="mx-auto mt-2 h-1 w-10 shrink-0 rounded-full bg-white/25 sm:hidden" />

          <div className="flex shrink-0 items-start justify-between gap-3 border-b border-white/10 px-4 py-3">
            <div>
              <p id="ocr-title" className="text-base font-bold text-white sm:text-lg">
                Import from screenshots
              </p>
              <p className="mt-1 text-xs text-sky-100/65">
                Portuguese UI supported (PC / PS / Ataque). Review CP, IVs, and moves before saving.
              </p>
            </div>
            <button
              type="button"
              disabled={busy}
              onClick={onClose}
              className="shrink-0 rounded-full border border-white/10 px-3 py-1 text-sm text-sky-100 transition hover:bg-white/10 disabled:opacity-40"
            >
              Close
            </button>
          </div>

          <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-white/10 px-4 py-3">
            <input
              ref={inputRef}
              type="file"
              accept="image/*,image/jpeg,image/png,image/webp,.heic,.heif"
              multiple
              className="hidden"
              onChange={(e) => {
                const files = e.target.files ? Array.from(e.target.files) : [];
                // Reset after copy so the same photo can be re-picked; never clear before copy.
                e.target.value = "";
                if (files.length) void processFiles(files);
              }}
            />
            <button
              type="button"
              disabled={busy || !gm}
              onClick={() => inputRef.current?.click()}
              className="rounded-full bg-sky-500/35 px-4 py-2 text-xs font-bold text-white transition hover:bg-sky-500/50 disabled:opacity-40"
            >
              {busy ? "Reading…" : "Add screenshots"}
            </button>
            {drafts.length > 0 ? (
              <button
                type="button"
                disabled={busy}
                onClick={clearAll}
                className="rounded-full border border-white/15 px-3 py-2 text-xs text-sky-100/70 hover:bg-white/10 disabled:opacity-40"
              >
                Clear list
              </button>
            ) : null}
            {progress ? (
              <p className="basis-full text-xs text-amber-200/90">{progress}</p>
            ) : (
              <p className="basis-full text-[11px] text-sky-100/45">
                Best: Pokémon detail screenshot (name + CP). On iPhone prefer Screenshots (PNG), not
                Camera HEIC photos.
              </p>
            )}
          </div>

          <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-3 sm:p-4">
            {!gm ? (
              <p className="py-8 text-center text-sm text-sky-100/60">Loading game data…</p>
            ) : drafts.length === 0 ? (
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                className="flex w-full flex-col items-center justify-center gap-2 rounded-card border border-dashed border-white/20 bg-black/20 px-4 py-16 text-center transition hover:border-sky-300/40 hover:bg-black/30"
              >
                <p className="text-sm font-bold text-white">Choose screenshots</p>
                <p className="text-xs text-sky-100/55">You can select many images at once</p>
              </button>
            ) : (
              drafts.map((d) => (
                <article
                  key={d.id}
                  className={`overflow-visible rounded-2xl border p-3 ${
                    d.selected && d.status === "ready"
                      ? "border-emerald-400/30 bg-emerald-950/20"
                      : "border-white/10 bg-black/25"
                  }`}
                >
                  <div className="flex gap-3">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={d.previewUrl}
                      alt=""
                      className="h-24 w-16 shrink-0 rounded-xl object-cover object-top sm:h-28 sm:w-20"
                    />
                    <div className="min-w-0 flex-1 space-y-2">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="truncate text-xs text-sky-100/50">{d.fileName}</p>
                          <p className="text-sm font-bold text-white">
                            {d.status === "reading"
                              ? "Reading…"
                              : d.status === "queued"
                                ? "Queued…"
                                : d.status === "error"
                                  ? d.error ?? "Failed"
                                  : `${d.shadow ? "Shadow " : ""}${d.speciesName || "Unknown"}`}
                          </p>
                        </div>
                        {d.status === "ready" ? (
                          <label className="flex items-center gap-1.5 text-xs text-sky-100/70">
                            <input
                              type="checkbox"
                              checked={d.selected}
                              onChange={(e) => patch(d.id, { selected: e.target.checked })}
                            />
                            Save
                          </label>
                        ) : null}
                      </div>

                      {d.status === "ready" ? (
                        <>
                          <div className="flex items-center gap-2">
                            {d.dex > 0 ? (
                              <PokemonSprite
                                speciesId={
                                  d.shadow ? `${d.speciesId}_shadow` : d.speciesId
                                }
                                dex={d.dex}
                                alt=""
                                width={40}
                                height={40}
                                className="h-10 w-10 object-contain"
                                shadow={d.shadow}
                              />
                            ) : null}
                            <select
                              value={
                                d.candidates.find(
                                  (c) =>
                                    c.speciesId.replace(/_shadow$/i, "") === d.speciesId &&
                                    c.shadow === d.shadow,
                                )?.speciesId ??
                                d.candidates[0]?.speciesId ??
                                ""
                              }
                              onChange={(e) => {
                                const mon = gm.pokemon.find((p) => p.speciesId === e.target.value);
                                if (mon) applySpecies(d.id, mon);
                              }}
                              className="min-w-0 flex-1 rounded-xl border border-white/15 bg-black/30 px-2 py-1.5 text-xs text-white outline-none"
                            >
                              {d.candidates.length === 0 ? (
                                <option value="">No match, pick below</option>
                              ) : null}
                              {d.candidates.map((c) => (
                                <option key={c.speciesId} value={c.speciesId} className="bg-[#102a3d]">
                                  {c.shadow ? "Shadow " : ""}
                                  {c.speciesName} (#{c.dex})
                                </option>
                              ))}
                            </select>
                          </div>

                          {d.candidates.length === 0 ? (
                            <SpeciesSearch
                              gm={gm}
                              onPick={(p) => applySpecies(d.id, p)}
                            />
                          ) : null}

                          <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
                            <Num
                              label="CP"
                              value={d.cp || null}
                              set={(n) => patch(d.id, { cp: n ?? 0 })}
                              min={10}
                              max={5000}
                            />
                            <Num
                              label="Atk"
                              value={d.atkIv}
                              set={(n) =>
                                patch(d.id, {
                                  atkIv: n,
                                  ivsFound: n != null && d.defIv != null && d.hpIv != null,
                                  notes: d.notes.filter((x) => !x.startsWith("IVs need review")),
                                })
                              }
                              min={0}
                              max={15}
                            />
                            <Num
                              label="Def"
                              value={d.defIv}
                              set={(n) =>
                                patch(d.id, {
                                  defIv: n,
                                  ivsFound: d.atkIv != null && n != null && d.hpIv != null,
                                  notes: d.notes.filter((x) => !x.startsWith("IVs need review")),
                                })
                              }
                              min={0}
                              max={15}
                            />
                            <Num
                              label="HP"
                              value={d.hpIv}
                              set={(n) =>
                                patch(d.id, {
                                  hpIv: n,
                                  ivsFound: d.atkIv != null && d.defIv != null && n != null,
                                  notes: d.notes.filter((x) => !x.startsWith("IVs need review")),
                                })
                              }
                              min={0}
                              max={15}
                            />
                            <label className="flex items-end gap-2 pb-2 text-xs text-sky-100/70">
                              <input
                                type="checkbox"
                                checked={d.shadow}
                                onChange={(e) => {
                                  const shadow = e.target.checked;
                                  const sid = shadow
                                    ? `${d.speciesId}_shadow`
                                    : d.speciesId;
                                  const mon =
                                    gm.pokemon.find((p) => p.speciesId === sid) ??
                                    gm.pokemon.find((p) => p.speciesId === d.speciesId);
                                  patch(d.id, {
                                    shadow,
                                    ...(mon ? pvpMovesFor(mon, d.cp, rankLists) : {}),
                                  });
                                }}
                              />
                              Shadow
                            </label>
                          </div>

                          {(() => {
                            const mon = resolveGmMon(d);
                            if (!mon) return null;
                            return (
                              <div className="relative z-40 grid gap-2 overflow-visible sm:grid-cols-3">
                                <MovePicker
                                  label="Fast move"
                                  value={d.fastMove}
                                  set={(v) => patch(d.id, { fastMove: v })}
                                  options={mon.fastMoves}
                                  lookup={moveLookup}
                                  eliteMoves={eliteList(mon)}
                                />
                                <MovePicker
                                  label="Charged 1"
                                  value={d.charged1}
                                  set={(v) => patch(d.id, { charged1: v })}
                                  options={mon.chargedMoves}
                                  lookup={moveLookup}
                                  eliteMoves={eliteList(mon)}
                                />
                                <MovePicker
                                  label="Charged 2"
                                  value={d.charged2}
                                  set={(v) => patch(d.id, { charged2: v })}
                                  options={["", ...mon.chargedMoves]}
                                  lookup={moveLookup}
                                  eliteMoves={eliteList(mon)}
                                />
                              </div>
                            );
                          })()}

                          {d.lucky ? (
                            <p className="text-[11px] font-semibold text-amber-200/90">Lucky Pokémon</p>
                          ) : null}

                          {!d.ivsFound || d.cp < 10 || d.notes.length > 0 ? (
                            <p className="text-[11px] text-amber-200/85">
                              {[
                                !d.ivsFound &&
                                (d.atkIv == null || d.defIv == null || d.hpIv == null)
                                  ? "Enter IVs (0-15) before saving"
                                  : null,
                                d.cp < 10 ? "Set CP before saving" : null,
                                ...d.notes.filter(
                                  (n) =>
                                    !n.startsWith("Enter IVs") &&
                                    !n.startsWith("Set CP"),
                                ),
                              ]
                                .filter(Boolean)
                                .join(" · ")}
                            </p>
                          ) : null}
                        </>
                      ) : null}
                    </div>
                  </div>
                </article>
              ))
            )}
          </div>

          <div className="flex shrink-0 items-center justify-between gap-3 border-t border-white/10 px-4 py-3">
            <p className="text-xs text-sky-100/55">
              {selectedCount} selected
            </p>
            <button
              type="button"
              disabled={busy || selectedCount === 0}
              onClick={saveSelected}
              className="rounded-full bg-gradient-to-r from-emerald-400 via-emerald-500 to-teal-600 px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-emerald-700/20 transition hover:brightness-110 disabled:opacity-40"
            >
              Add {selectedCount || ""} to box
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

function SpeciesSearch({
  gm,
  onPick,
}: {
  gm: GameMaster;
  onPick: (p: GmPokemon) => void;
}) {
  const [q, setQ] = useState("");
  const hits = useMemo(() => {
    const qq = q.trim().toLowerCase();
    if (qq.length < 2) return [];
    return gm.pokemon
      .filter(
        (p) =>
          p.speciesName.toLowerCase().includes(qq) ||
          p.speciesId.toLowerCase().includes(qq.replace(/\s+/g, "_")),
      )
      .slice(0, 12);
  }, [gm, q]);

  return (
    <div>
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search species manually…"
        className="w-full rounded-xl border border-white/15 bg-black/30 px-2 py-1.5 text-xs text-white outline-none"
      />
      {hits.length > 0 ? (
        <div className="mt-1 max-h-28 overflow-auto rounded-xl border border-white/10 bg-[#0c2436]/95">
          {hits.map((p) => (
            <button
              key={p.speciesId}
              type="button"
              onClick={() => onPick(p)}
              className="block w-full truncate px-2 py-1.5 text-left text-xs text-sky-50 hover:bg-white/10"
            >
              {p.speciesName}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function Num({
  label,
  value,
  set,
  min,
  max,
}: {
  label: string;
  value: number | null;
  set: (n: number | null) => void;
  min: number;
  max: number;
}) {
  return (
    <label className="text-[10px] font-bold uppercase tracking-wider text-sky-200/55">
      {label}
      <input
        type="number"
        min={min}
        max={max}
        value={value ?? ""}
        placeholder="-"
        onChange={(e) => {
          const raw = e.target.value;
          if (raw === "") {
            set(null);
            return;
          }
          set(Number(raw));
        }}
        className="mt-1 w-full rounded-xl border border-white/15 bg-black/30 px-2 py-1.5 text-sm font-normal normal-case tracking-normal text-white outline-none placeholder:text-sky-100/30"
      />
    </label>
  );
}
