"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { Press_Start_2P, VT323 } from "next/font/google";
import { motion, AnimatePresence } from "framer-motion";
import { PokemonSprite } from "@/components/PokemonSprite";
import { HomeShowcasePicker } from "@/components/HomeShowcasePicker";
import { useFavorites } from "@/components/FavoritesProvider";
import { useBoxStore } from "@/store/box";
import { themeFromType, type ThemeMode } from "@/lib/favoriteTheme";
import { typeLabel } from "@/components/TypeIcon";
import { getSessionGameMaster, peekSessionGameMaster } from "@/lib/pvpokeSession";
import type { GameMaster } from "@/lib/pvpoke";
import type { ShowcaseTrio } from "@/lib/homeShowcase";
import type { BoxPokemon } from "@/lib/types";

const pixel = Press_Start_2P({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-pixel",
});

const vt = VT323({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-vt",
});

type View = "home" | "box" | "teams" | "analyze";

const NAV: { id: View; label: string }[] = [
  { id: "home", label: "HOME" },
  { id: "box", label: "BOX" },
  { id: "teams", label: "TEAMS" },
  { id: "analyze", label: "ANALYZE" },
];

const FEATURES: { view: View; title: string; body: string; color: string }[] = [
  { view: "box", title: "MY BOX", body: "IVs · CP · moves", color: "#3B9EFF" },
  { view: "analyze", title: "ANALYZE", body: "roles & IVs", color: "#F5C518" },
  { view: "teams", title: "TEAMS", body: "lead · switch · closer", color: "#34d399" },
  { view: "home", title: "FAVORITES", body: "theme · top 3", color: "#B56BFF" },
];

const TEAM_ROLES = ["LEAD", "SWITCH", "CLOSER"] as const;
const PIXEL_TEAM_KEY = "pokelead-pixel-team-v1";

type TeamSlots = [string | null, string | null, string | null];

function readTeamSlots(): TeamSlots {
  if (typeof window === "undefined") return [null, null, null];
  try {
    const raw = localStorage.getItem(PIXEL_TEAM_KEY);
    if (!raw) return [null, null, null];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed) || parsed.length !== 3) return [null, null, null];
    return parsed.map((x) => (typeof x === "string" ? x : null)) as TeamSlots;
  } catch {
    return [null, null, null];
  }
}

function writeTeamSlots(slots: TeamSlots) {
  try {
    localStorage.setItem(PIXEL_TEAM_KEY, JSON.stringify(slots));
  } catch {
    /* private mode */
  }
}

function ink() {
  return { fontFamily: "var(--font-pixel), monospace" } as const;
}

function PixelModal({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          className="fixed inset-0 z-[220] flex items-end justify-center bg-black/75 p-0 sm:items-center sm:p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            role="dialog"
            aria-modal
            aria-label={title}
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 24, opacity: 0 }}
            transition={{ type: "spring", stiffness: 320, damping: 28 }}
            className="flex max-h-[88vh] w-full max-w-lg flex-col overflow-hidden border-4 border-[#1a1208] bg-[#f7f1d0] shadow-[8px_8px_0_#1a1208]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-2 border-b-4 border-[#1a1208] bg-[#c23b22] px-3 py-2">
              <p className="text-[9px] text-[#fff8e7] sm:text-[10px]" style={ink()}>
                {title}
              </p>
              <button
                type="button"
                onClick={onClose}
                className="border-2 border-[#1a1208] bg-[#1a1208] px-2 py-1 text-[9px] text-[#e8d48b]"
                style={ink()}
              >
                CLOSE
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-auto p-3">{children}</div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

function BoxPickGrid({
  box,
  excludeIds,
  onPick,
  emptyHint,
}: {
  box: BoxPokemon[];
  excludeIds?: Set<string>;
  onPick: (mon: BoxPokemon) => void;
  emptyHint?: string;
}) {
  if (box.length === 0) {
    return (
      <div className="space-y-3 p-2 text-center">
        <p className="text-xl text-[#3d4a3a]">{emptyHint ?? "Your box is empty."}</p>
        <Link
          href="/box"
          className="inline-block border-2 border-[#1a1208] bg-[#3B9EFF] px-3 py-2 text-[9px] text-white"
          style={ink()}
        >
          OPEN FULL BOX →
        </Link>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
      {box.map((mon) => {
        const taken = excludeIds?.has(mon.id) ?? false;
        const sid = mon.flags.shadow ? `${mon.speciesId}_shadow` : mon.speciesId;
        return (
          <button
            key={mon.id}
            type="button"
            disabled={taken}
            onClick={() => onPick(mon)}
            className={`flex flex-col items-center border-2 border-[#1a1208] bg-[#fff8e7] p-1.5 text-center transition active:translate-x-px active:translate-y-px disabled:opacity-35 ${
              mon.flags.shadow ? "bg-violet-200/80" : ""
            }`}
          >
            <PokemonSprite
              speciesId={sid}
              dex={mon.dex}
              alt=""
              width={56}
              height={56}
              className="h-12 w-12 object-contain"
            />
            <span className="mt-0.5 line-clamp-2 w-full text-[7px] leading-tight text-[#1a1208]" style={ink()}>
              {mon.flags.shadow ? "S " : ""}
              {mon.speciesName.toUpperCase()}
            </span>
            <span className="text-sm leading-none text-[#3d4a3a]">{mon.cp} CP</span>
          </button>
        );
      })}
    </div>
  );
}

export default function RetroLabPage() {
  const { favorites, theme, themeMode, setThemeMode, setFavorite } = useFavorites();
  const box = useBoxStore((s) => s.pokemon);

  const [view, setView] = useState<View>("home");
  const [pickSlot, setPickSlot] = useState<number | null>(null);
  const [gm, setGm] = useState<GameMaster | null>(() =>
    typeof window !== "undefined" ? peekSessionGameMaster() : null,
  );
  const [teamSlots, setTeamSlots] = useState<TeamSlots>([null, null, null]);
  const [teamPickRole, setTeamPickRole] = useState<number | null>(null);
  const [selectedBoxId, setSelectedBoxId] = useState<string | null>(null);
  const [analyzeId, setAnalyzeId] = useState<string | null>(null);
  const [analyzePickOpen, setAnalyzePickOpen] = useState(false);

  const themed = themeMode === "favorite" && theme.type !== "default";
  const accent = themed ? theme.accent : "#c23b22";
  const accentSoft = themed ? theme.accent : "#2a6f4e";

  useEffect(() => {
    setTeamSlots(readTeamSlots());
  }, []);

  useEffect(() => {
    if (pickSlot == null) return;
    void getSessionGameMaster()
      .then(setGm)
      .catch(() => {});
  }, [pickSlot]);

  const teamMons = useMemo(() => {
    return teamSlots.map((id) => (id ? box.find((p) => p.id === id) ?? null : null));
  }, [teamSlots, box]);

  const selectedBox = selectedBoxId ? box.find((p) => p.id === selectedBoxId) ?? null : null;
  const analyzeMon = analyzeId ? box.find((p) => p.id === analyzeId) ?? null : null;

  // Drop stale team refs when mon removed from box
  useEffect(() => {
    setTeamSlots((prev) => {
      const next = prev.map((id) => (id && !box.some((p) => p.id === id) ? null : id)) as TeamSlots;
      if (next.every((v, i) => v === prev[i])) return prev;
      writeTeamSlots(next);
      return next;
    });
  }, [box]);

  async function onPickFavorite(mon: ShowcaseTrio[number]) {
    if (pickSlot == null) return;
    await setFavorite(pickSlot, mon);
    setPickSlot(null);
  }

  function setSlot(i: number, id: string | null) {
    setTeamSlots((prev) => {
      const next: TeamSlots = [...prev];
      next[i] = id;
      writeTeamSlots(next);
      return next;
    });
  }

  const excludeTeam = useMemo(() => {
    const s = new Set<string>();
    teamSlots.forEach((id, idx) => {
      if (id && idx !== teamPickRole) s.add(id);
    });
    return s;
  }, [teamSlots, teamPickRole]);

  return (
    <div
      className={`${pixel.variable} ${vt.variable} fixed inset-0 z-[70] overflow-y-auto overflow-x-hidden`}
      style={{
        fontFamily: "var(--font-vt), monospace",
        backgroundColor: themed ? "#121820" : "#1a3a2a",
        backgroundImage: `
          linear-gradient(180deg, rgba(255,255,255,0.04) 1px, transparent 1px),
          linear-gradient(90deg, rgba(0,0,0,0.15) 1px, transparent 1px),
          radial-gradient(ellipse 120% 80% at 50% -10%, ${themed ? accent : "#3d7a55"}55 0%, transparent 55%),
          repeating-linear-gradient(
            -45deg,
            ${themed ? "#1a2430" : "#1f4633"} 0 10px,
            ${themed ? "#121820" : "#1a3a2a"} 10px 20px
          )
        `,
        backgroundSize: "100% 3px, 12px 12px, 100% 100%, 100% 100%",
        color: "#f4f0d8",
        imageRendering: "pixelated",
      }}
    >
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 z-[1] opacity-[0.12]"
        style={{
          background:
            "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.35) 2px, rgba(0,0,0,0.35) 3px)",
        }}
      />

      <div className="relative z-[2] mx-auto max-w-5xl px-3 pb-20 pt-4 sm:px-6 sm:pt-6">
        {/* TEMP bar */}
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2 border-4 border-[#1a1208] bg-[#e8d48b] px-3 py-2 text-[#1a1208] shadow-[4px_4px_0_#1a1208]">
          <p className="text-[10px] leading-relaxed sm:text-[11px]" style={ink()}>
            PIXEL LAB · LIVE DATA
          </p>
          <Link
            href="/"
            className="border-2 border-[#1a1208] bg-[#c23b22] px-3 py-1 text-[10px] text-[#fff8e7] transition hover:brightness-110"
            style={ink()}
          >
            EXIT →
          </Link>
        </div>

        {/* Header + nav */}
        <header className="mb-4 border-4 border-[#1a1208] bg-[#f7f1d0] shadow-[6px_6px_0_#1a1208]">
          <div
            className="flex flex-wrap items-center justify-between gap-3 border-b-4 border-[#1a1208] px-3 py-3 sm:px-4"
            style={{ background: accent }}
          >
            <div className="flex items-center gap-3">
              <span
                aria-hidden
                className="relative grid h-10 w-10 place-items-center border-2 border-[#1a1208] bg-white"
              >
                <span className="absolute inset-x-0 top-0 h-1/2" style={{ background: accent }} />
                <span className="absolute inset-x-0 top-1/2 h-0.5 bg-[#1a1208]" />
                <span className="relative z-[1] h-3 w-3 rounded-full border-2 border-[#1a1208] bg-white" />
              </span>
              <div>
                <h1 className="text-sm text-[#fff8e7] sm:text-base" style={ink()}>
                  POKELEAD
                </h1>
                <p className="text-lg leading-none text-[#ffd89a] sm:text-xl">
                  YOUR BOX · BEST TEAMS
                </p>
              </div>
            </div>
            <nav className="flex flex-wrap gap-1 text-[9px] text-[#fff8e7] sm:text-[10px]" style={ink()}>
              {NAV.map((item) => {
                const on = view === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setView(item.id)}
                    className={`border-2 border-[#1a1208] px-2 py-1 transition active:translate-y-px ${
                      on ? "bg-[#1a1208] text-[#e8d48b]" : "bg-black/25 hover:bg-black/40"
                    }`}
                  >
                    {item.label}
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Accent mode */}
          <div className="flex flex-wrap items-center gap-2 border-b-4 border-[#1a1208] bg-[#dfe8c8] px-3 py-2">
            <span className="text-[8px] text-[#1a1208]" style={ink()}>
              ACCENT
            </span>
            {(
              [
                { value: "default", label: "DEFAULT" },
                { value: "favorite", label: "FAV #1" },
              ] as const
            ).map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setThemeMode(opt.value as ThemeMode)}
                className={`border-2 border-[#1a1208] px-2 py-1 text-[8px] transition ${
                  themeMode === opt.value
                    ? "bg-[#1a1208] text-[#e8d48b]"
                    : "bg-[#f7f1d0] text-[#1a1208] hover:bg-[#fff8e7]"
                }`}
                style={ink()}
              >
                {opt.label}
              </button>
            ))}
            {themed ? (
              <span className="ml-auto text-lg text-[#1a1208]">
                {typeLabel(theme.type).toUpperCase()} THEME
              </span>
            ) : (
              <span className="ml-auto text-lg text-[#3d4a3a]">CLASSIC GB</span>
            )}
          </div>
        </header>

        <AnimatePresence mode="wait">
          {view === "home" ? (
            <motion.div
              key="home"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              className="space-y-4"
            >
              <section className="border-4 border-[#1a1208] bg-[#f7f1d0] shadow-[6px_6px_0_#1a1208]">
                <div className="grid gap-0 lg:grid-cols-[1.1fr_0.9fr]">
                  <div className="space-y-3 border-b-4 border-[#1a1208] p-4 lg:border-b-0 lg:border-r-4">
                    <p className="text-[10px]" style={{ ...ink(), color: accent }}>
                      ★ PLAYER CARD
                    </p>
                    <h2 className="text-xs leading-relaxed text-[#1a1208] sm:text-sm" style={ink()}>
                      CATCH.
                      <br />
                      <span style={{ color: accentSoft }}>RANK.</span>
                      <br />
                      LEAD.
                    </h2>
                    <p className="max-w-md text-xl leading-tight text-[#3d4a3a] sm:text-2xl">
                      Pixel skin on your real favorites, box, and teams. Tap tiles to change them.
                    </p>
                    <div className="flex flex-wrap gap-2 pt-1">
                      <span className="border-2 border-[#1a1208] bg-[#3B9EFF] px-3 py-1 text-lg font-bold text-white">
                        GREAT
                      </span>
                      <span className="border-2 border-[#1a1208] bg-[#F5C518] px-3 py-1 text-lg font-bold text-[#1a1208]">
                        ULTRA
                      </span>
                      <span className="border-2 border-[#1a1208] bg-[#B56BFF] px-3 py-1 text-lg font-bold text-white">
                        MASTER
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-2 pt-2">
                      <button
                        type="button"
                        onClick={() => setView("box")}
                        className="border-2 border-[#1a1208] bg-[#3B9EFF] px-3 py-2 text-[9px] text-white shadow-[3px_3px_0_#1a1208] active:translate-x-px active:translate-y-px"
                        style={ink()}
                      >
                        OPEN BOX
                      </button>
                      <button
                        type="button"
                        onClick={() => setView("teams")}
                        className="border-2 border-[#1a1208] bg-[#fff8e7] px-3 py-2 text-[9px] text-[#1a1208] shadow-[3px_3px_0_#1a1208] active:translate-x-px active:translate-y-px"
                        style={ink()}
                      >
                        BUILD TEAM
                      </button>
                    </div>
                  </div>

                  <div className="bg-[#dfe8c8] p-4">
                    <p className="mb-3 text-[9px] text-[#1a1208]" style={ink()}>
                      TOP 3 FAVORITES · TAP TO CHANGE
                    </p>
                    <div className="grid grid-cols-3 gap-2">
                      {favorites.map((mon, i) => {
                        const hue = themeFromType(mon.primaryType).accent;
                        const shadow = mon.speciesId.toLowerCase().includes("_shadow");
                        return (
                          <motion.button
                            key={`${i}-${mon.speciesId}`}
                            type="button"
                            initial={{ y: 8, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ delay: 0.05 * i, type: "spring", stiffness: 260, damping: 18 }}
                            onClick={() => setPickSlot(i)}
                            className={`border-4 border-[#1a1208] bg-[#f7f1d0] p-2 text-center shadow-[3px_3px_0_#1a1208] transition hover:brightness-105 active:translate-x-px active:translate-y-px ${
                              i === 0 && themed ? "outline outline-2 outline-offset-2" : ""
                            }`}
                            style={i === 0 && themed ? { outlineColor: accent } : undefined}
                          >
                            <div
                              className="mx-auto mb-1 grid h-16 w-16 place-items-center border-2 border-[#1a1208]"
                              style={{ background: hue }}
                            >
                              <PokemonSprite
                                speciesId={mon.speciesId}
                                dex={mon.dex}
                                alt=""
                                width={56}
                                height={56}
                                className="h-12 w-12 object-contain drop-shadow-[2px_2px_0_rgba(0,0,0,0.35)]"
                                shadow={shadow}
                              />
                            </div>
                            <p className="text-[7px] leading-tight text-[#1a1208]" style={ink()}>
                              #{i + 1}
                              {i === 0 ? " ★" : ""}
                            </p>
                            <p className="text-base leading-none text-[#1a1208]">
                              {mon.speciesName.toUpperCase()}
                            </p>
                            <p className="text-sm" style={{ color: hue }}>
                              {(mon.primaryType || "????").toUpperCase()}
                            </p>
                          </motion.button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </section>

              <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {FEATURES.map((card, i) => (
                  <motion.button
                    key={card.title}
                    type="button"
                    initial={{ opacity: 0, scale: 0.96 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.08 + i * 0.04 }}
                    onClick={() => setView(card.view)}
                    className="border-4 border-[#1a1208] bg-[#f7f1d0] p-3 text-left shadow-[4px_4px_0_#1a1208] transition hover:brightness-105 active:translate-x-px active:translate-y-px"
                  >
                    <div className="mb-2 h-2 w-full" style={{ background: card.color }} />
                    <p className="text-[10px] text-[#1a1208]" style={ink()}>
                      {card.title}
                    </p>
                    <p className="text-xl text-[#3d4a3a]">{card.body}</p>
                  </motion.button>
                ))}
              </section>

              <p className="text-center text-lg text-[#c8e6b0]">
                Box: {box.length} · Theme syncs with the main site
              </p>
            </motion.div>
          ) : null}

          {view === "box" ? (
            <motion.section
              key="box"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              className="border-4 border-[#1a1208] bg-[#f7f1d0] shadow-[6px_6px_0_#1a1208]"
            >
              <div
                className="flex flex-wrap items-center justify-between gap-2 border-b-4 border-[#1a1208] px-3 py-2"
                style={{ background: accentSoft }}
              >
                <p className="text-[10px] text-[#e8f5d8]" style={ink()}>
                  ■ PC BOX
                </p>
                <p className="text-lg text-[#c8e6b0]">{box.length} STORED</p>
                <Link
                  href="/box"
                  className="border-2 border-[#1a1208] bg-[#fff8e7] px-2 py-1 text-[8px] text-[#1a1208]"
                  style={ink()}
                >
                  FULL EDITOR →
                </Link>
              </div>

              {box.length === 0 ? (
                <div className="space-y-3 p-6 text-center">
                  <p className="text-2xl text-[#3d4a3a]">No Pokémon yet.</p>
                  <Link
                    href="/box"
                    className="inline-block border-2 border-[#1a1208] bg-[#3B9EFF] px-4 py-2 text-[9px] text-white shadow-[3px_3px_0_#1a1208]"
                    style={ink()}
                  >
                    ADD IN FULL BOX →
                  </Link>
                </div>
              ) : (
                <div className="grid gap-3 p-3 lg:grid-cols-[1.2fr_0.8fr]">
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {box.map((mon) => {
                      const sid = mon.flags.shadow ? `${mon.speciesId}_shadow` : mon.speciesId;
                      const on = selectedBoxId === mon.id;
                      return (
                        <button
                          key={mon.id}
                          type="button"
                          onClick={() => setSelectedBoxId(mon.id)}
                          className={`flex items-center gap-2 border-2 border-[#1a1208] p-2 text-left transition active:translate-y-px ${
                            on ? "bg-[#e8d48b] shadow-[3px_3px_0_#1a1208]" : "bg-[#fff8e7] hover:bg-[#fffdf5]"
                          }`}
                        >
                          <div className="grid h-14 w-14 shrink-0 place-items-center border-2 border-[#1a1208] bg-[#dfe8c8]">
                            <PokemonSprite
                              speciesId={sid}
                              dex={mon.dex}
                              alt=""
                              width={48}
                              height={48}
                              className="h-11 w-11 object-contain"
                            />
                          </div>
                          <div className="min-w-0">
                            <p className="truncate text-[8px] text-[#1a1208]" style={ink()}>
                              {mon.speciesName.toUpperCase()}
                            </p>
                            <p className="text-lg leading-none text-[#3d4a3a]">{mon.cp} CP</p>
                            <p className="text-sm text-[#5a6a58]">
                              {mon.atkIv}/{mon.defIv}/{mon.hpIv}
                            </p>
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  <div className="border-4 border-[#1a1208] bg-[#fff8e7] p-3">
                    {selectedBox ? (
                      <>
                        <p className="text-[9px] text-[#1a1208]" style={ink()}>
                          SELECTED
                        </p>
                        <div className="mt-2 flex items-center gap-3">
                          <PokemonSprite
                            speciesId={
                              selectedBox.flags.shadow
                                ? `${selectedBox.speciesId}_shadow`
                                : selectedBox.speciesId
                            }
                            dex={selectedBox.dex}
                            alt=""
                            width={72}
                            height={72}
                            className="h-16 w-16 object-contain"
                          />
                          <div>
                            <p className="text-[10px] text-[#1a1208]" style={ink()}>
                              {selectedBox.speciesName.toUpperCase()}
                            </p>
                            <p className="text-2xl text-[#3d4a3a]">{selectedBox.cp} CP</p>
                          </div>
                        </div>
                        <ul className="mt-3 space-y-1 text-xl text-[#3d4a3a]">
                          <li>
                            IVs {selectedBox.atkIv}/{selectedBox.defIv}/{selectedBox.hpIv}
                          </li>
                          {selectedBox.formLabel ? <li>Form: {selectedBox.formLabel}</li> : null}
                          <li>
                            Flags:{" "}
                            {[
                              selectedBox.flags.shadow && "Shadow",
                              selectedBox.flags.lucky && "Lucky",
                              selectedBox.flags.xl && "XL",
                              selectedBox.flags.bestBuddy && "Buddy",
                            ]
                              .filter(Boolean)
                              .join(", ") || "—"}
                          </li>
                        </ul>
                        <div className="mt-3 flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setAnalyzeId(selectedBox.id);
                              setView("analyze");
                            }}
                            className="border-2 border-[#1a1208] bg-[#F5C518] px-3 py-1.5 text-[8px] text-[#1a1208]"
                            style={ink()}
                          >
                            ANALYZE
                          </button>
                          <Link
                            href="/box"
                            className="border-2 border-[#1a1208] bg-[#3B9EFF] px-3 py-1.5 text-[8px] text-white"
                            style={ink()}
                          >
                            EDIT IN BOX
                          </Link>
                        </div>
                      </>
                    ) : (
                      <p className="py-8 text-center text-xl text-[#3d4a3a]">Tap a Pokémon</p>
                    )}
                  </div>
                </div>
              )}
            </motion.section>
          ) : null}

          {view === "teams" ? (
            <motion.section
              key="teams"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              className="border-4 border-[#1a1208] bg-[#1a1208] shadow-[6px_6px_0_#5a4030]"
            >
              <div className="border-b-4 border-[#e8d48b] px-3 py-2" style={{ background: accent }}>
                <p className="text-[10px] text-[#fff8e7]" style={ink()}>
                  ▲ TEAM BUILDER
                </p>
                <p className="text-xl text-[#ffd89a]">
                  {teamMons.filter(Boolean).length}/3 FILLED · TAP SLOT TO PICK
                </p>
              </div>
              <div className="grid gap-0 sm:grid-cols-3">
                {TEAM_ROLES.map((role, i) => {
                  const mon = teamMons[i];
                  return (
                    <div
                      key={role}
                      className={`bg-[#f7f1d0] p-4 text-center ${
                        i < 2 ? "border-b-4 border-[#1a1208] sm:border-b-0 sm:border-r-4" : ""
                      }`}
                    >
                      <p className="mb-2 text-[9px]" style={{ ...ink(), color: accent }}>
                        {role}
                      </p>
                      <button
                        type="button"
                        onClick={() => setTeamPickRole(i)}
                        className="mx-auto mb-2 grid h-24 w-24 place-items-center border-4 border-[#1a1208] bg-[#dfe8c8] transition hover:brightness-105 active:translate-y-px"
                      >
                        {mon ? (
                          <PokemonSprite
                            speciesId={
                              mon.flags.shadow ? `${mon.speciesId}_shadow` : mon.speciesId
                            }
                            dex={mon.dex}
                            alt=""
                            width={80}
                            height={80}
                            className="h-[4.5rem] w-[4.5rem] object-contain"
                          />
                        ) : (
                          <span className="text-[8px] text-[#1a1208]" style={ink()}>
                            + PICK
                          </span>
                        )}
                      </button>
                      <p className="text-[9px] text-[#1a1208]" style={ink()}>
                        {mon ? mon.speciesName.toUpperCase() : "EMPTY"}
                      </p>
                      {mon ? (
                        <p className="mt-1 text-lg text-[#3d4a3a]">{mon.cp} CP</p>
                      ) : null}
                      {mon ? (
                        <button
                          type="button"
                          onClick={() => setSlot(i, null)}
                          className="mt-2 border-2 border-[#1a1208] bg-[#fff8e7] px-2 py-0.5 text-[8px] text-[#c23b22]"
                          style={ink()}
                        >
                          CLEAR
                        </button>
                      ) : null}
                    </div>
                  );
                })}
              </div>
              <div className="border-t-4 border-[#e8d48b] bg-[#2a2010] px-3 py-2 text-center">
                <Link
                  href="/teams"
                  className="text-[9px] text-[#e8d48b] underline underline-offset-2"
                  style={ink()}
                >
                  OPEN FULL TEAMS PAGE →
                </Link>
              </div>
            </motion.section>
          ) : null}

          {view === "analyze" ? (
            <motion.section
              key="analyze"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              className="border-4 border-[#1a1208] bg-[#f7f1d0] shadow-[6px_6px_0_#1a1208]"
            >
              <div className="flex flex-wrap items-center justify-between gap-2 border-b-4 border-[#1a1208] bg-[#F5C518] px-3 py-2">
                <p className="text-[10px] text-[#1a1208]" style={ink()}>
                  ◆ ANALYZE
                </p>
                <button
                  type="button"
                  onClick={() => setAnalyzePickOpen(true)}
                  className="border-2 border-[#1a1208] bg-[#1a1208] px-2 py-1 text-[8px] text-[#e8d48b]"
                  style={ink()}
                >
                  {analyzeMon ? "CHANGE" : "PICK MON"}
                </button>
              </div>
              <div className="p-4">
                {analyzeMon ? (
                  <div className="space-y-4">
                    <div className="flex flex-wrap items-center gap-4">
                      <div className="grid h-24 w-24 place-items-center border-4 border-[#1a1208] bg-[#dfe8c8]">
                        <PokemonSprite
                          speciesId={
                            analyzeMon.flags.shadow
                              ? `${analyzeMon.speciesId}_shadow`
                              : analyzeMon.speciesId
                          }
                          dex={analyzeMon.dex}
                          alt=""
                          width={88}
                          height={88}
                          className="h-20 w-20 object-contain"
                        />
                      </div>
                      <div>
                        <p className="text-[11px] text-[#1a1208]" style={ink()}>
                          {analyzeMon.speciesName.toUpperCase()}
                        </p>
                        <p className="text-3xl text-[#3d4a3a]">{analyzeMon.cp} CP</p>
                        <p className="text-xl text-[#5a6a58]">
                          IVs {analyzeMon.atkIv}/{analyzeMon.defIv}/{analyzeMon.hpIv}
                        </p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                      {[
                        ["ATK IV", analyzeMon.atkIv],
                        ["DEF IV", analyzeMon.defIv],
                        ["HP IV", analyzeMon.hpIv],
                        ["FAST", analyzeMon.fastMove?.replace(/_/g, " ") || "—"],
                        [
                          "CHARGE",
                          analyzeMon.chargedMoves.map((m) => m.replace(/_/g, " ")).join(", ") ||
                            "—",
                        ],
                        [
                          "FLAGS",
                          [
                            analyzeMon.flags.shadow && "Shadow",
                            analyzeMon.flags.xl && "XL",
                            analyzeMon.flags.lucky && "Lucky",
                          ]
                            .filter(Boolean)
                            .join(" ") || "—",
                        ],
                      ].map(([label, value]) => (
                        <div
                          key={String(label)}
                          className="border-2 border-[#1a1208] bg-[#fff8e7] p-2"
                        >
                          <p className="text-[8px] text-[#c23b22]" style={ink()}>
                            {label}
                          </p>
                          <p className="text-lg leading-tight text-[#1a1208]">{value}</p>
                        </div>
                      ))}
                    </div>
                    <Link
                      href="/analyze"
                      className="inline-block border-2 border-[#1a1208] bg-[#3B9EFF] px-4 py-2 text-[9px] text-white shadow-[3px_3px_0_#1a1208]"
                      style={ink()}
                    >
                      FULL ANALYZE PAGE →
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-3 py-10 text-center">
                    <p className="text-2xl text-[#3d4a3a]">Pick a Pokémon from your box.</p>
                    <button
                      type="button"
                      onClick={() => setAnalyzePickOpen(true)}
                      className="border-2 border-[#1a1208] bg-[#F5C518] px-4 py-2 text-[9px] text-[#1a1208] shadow-[3px_3px_0_#1a1208]"
                      style={ink()}
                    >
                      PICK FROM BOX
                    </button>
                  </div>
                )}
              </div>
            </motion.section>
          ) : null}
        </AnimatePresence>

        <p className="mt-6 text-center text-[8px] leading-relaxed text-[#c8e6b0]" style={ink()}>
          WIRED TO YOUR FAVORITES · BOX · THEME
          <br />
          <span className="text-[#8fbc8f]">EXIT RETURNS TO MAIN SITE</span>
        </p>
      </div>

      <HomeShowcasePicker
        open={pickSlot != null}
        onClose={() => setPickSlot(null)}
        slotIndex={pickSlot ?? 0}
        gm={gm}
        onPick={onPickFavorite}
      />

      <PixelModal
        open={teamPickRole != null}
        onClose={() => setTeamPickRole(null)}
        title={
          teamPickRole != null
            ? `PICK ${TEAM_ROLES[teamPickRole]}`
            : "PICK"
        }
      >
        <BoxPickGrid
          box={box}
          excludeIds={excludeTeam}
          emptyHint="Add Pokémon in My Box first."
          onPick={(mon) => {
            if (teamPickRole == null) return;
            setSlot(teamPickRole, mon.id);
            setTeamPickRole(null);
          }}
        />
      </PixelModal>

      <PixelModal
        open={analyzePickOpen}
        onClose={() => setAnalyzePickOpen(false)}
        title="PICK TO ANALYZE"
      >
        <BoxPickGrid
          box={box}
          emptyHint="Add Pokémon in My Box first."
          onPick={(mon) => {
            setAnalyzeId(mon.id);
            setAnalyzePickOpen(false);
          }}
        />
      </PixelModal>
    </div>
  );
}
