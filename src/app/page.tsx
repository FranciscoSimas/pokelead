"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { PokemonSprite } from "@/components/PokemonSprite";
import { HomeShowcasePicker } from "@/components/HomeShowcasePicker";
import { useFavorites } from "@/components/FavoritesProvider";
import { Segment } from "@/components/Segment";
import { TypeIcon, typeLabel } from "@/components/TypeIcon";
import { getSessionGameMaster, peekSessionGameMaster } from "@/lib/pvpokeSession";
import type { GameMaster } from "@/lib/pvpoke";
import type { ShowcaseTrio } from "@/lib/homeShowcase";

const features = [
  {
    title: "My Box",
    body: "Log each Pokémon with form, IVs, CP, and moves. On this device, or in your account when signed in.",
    href: "/box",
    accent: "from-sky-400 to-cyan-500",
  },
  {
    title: "Compare",
    body: "1v1 ranks, IVs, moves, and coverage. Teams scores a full trio instead.",
    href: "/compare",
    accent: "from-violet-300 to-sky-500",
  },
  {
    title: "Analyze",
    body: "Overall, Leads, Closers, Switches, Chargers, Attackers, and Consistency from PvPoke.",
    href: "/analyze",
    accent: "from-amber-300 to-orange-500",
  },
  {
    title: "Teams",
    body: "Lead, Switch, and Closer from what you own. Coverage, IVs, and recommended replacements.",
    href: "/teams",
    accent: "from-emerald-400 to-green-600",
  },
];

export default function HomePage() {
  const { favorites, theme, themeMode, setThemeMode, setFavorite } = useFavorites();
  const [pickSlot, setPickSlot] = useState<number | null>(null);
  const [gm, setGm] = useState<GameMaster | null>(() =>
    typeof window !== "undefined" ? peekSessionGameMaster() : null,
  );

  useEffect(() => {
    if (pickSlot == null) return;
    void getSessionGameMaster()
      .then(setGm)
      .catch(() => {});
  }, [pickSlot]);

  async function onPick(mon: ShowcaseTrio[number]) {
    if (pickSlot == null) return;
    await setFavorite(pickSlot, mon);
    setPickSlot(null);
  }

  const top = favorites[0];
  const themed = themeMode === "favorite" && theme.type !== "default";

  return (
    <div className="space-y-12">
      <section className="grid items-center gap-8 lg:grid-cols-[1.2fr_0.8fr]">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        >
          <p className="mb-3 inline-flex items-center gap-1.5 rounded-full border border-line-strong bg-surface-2 px-3 py-1 text-xs font-semibold uppercase tracking-widest">
            <span className="text-[#3B9EFF]">Great</span>
            <span className="text-faint" aria-hidden>
              ·
            </span>
            <span className="text-[#F5C518]">Ultra</span>
            <span className="text-faint" aria-hidden>
              ·
            </span>
            <span className="text-[#B56BFF]">Master</span>
          </p>
          <h1 className="font-[family-name:var(--font-lilita)] text-4xl leading-tight text-white sm:text-6xl">
            Your box.
            <br />
            <span
              className={`bg-gradient-to-r bg-clip-text text-transparent ${
                themed
                  ? "from-[var(--accent)] via-white to-[var(--accent)]"
                  : "from-[var(--accent)] via-white to-amber-200"
              }`}
            >
              Best leads.
            </span>
          </h1>
          <p className="mt-4 max-w-xl text-base text-muted sm:text-lg">
            PokeLead turns the Pokémon you already have into clear PvP picks: ranks by role, move
            gaps, and team cores. Not Overall rank alone.
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-faint">
            <span>Accent</span>
            <Segment
              ariaLabel="Site accent theme"
              value={themeMode}
              onChange={setThemeMode}
              options={[
                { value: "default", label: "Default", title: "Original sky look" },
                {
                  value: "favorite",
                  label: "Favorite #1",
                  title: "Tint from favorite #1 type",
                },
              ]}
            />
            {themed ? (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-accent/30 bg-accent/10 px-2.5 py-0.5 font-semibold text-fg">
                {top.primaryType || theme.type ? (
                  <TypeIcon type={top.primaryType || theme.type} size={14} />
                ) : null}
                {typeLabel(top.primaryType || theme.type)}
              </span>
            ) : null}
          </div>
          <div className="mt-7 flex flex-wrap gap-3 sm:mt-8">
            <Link href="/box" className="btn btn-primary px-6 py-3">
              Open My Box
            </Link>
            <Link href="/teams" className="btn btn-ghost px-6 py-3">
              Build Teams
            </Link>
          </div>
        </motion.div>

        <motion.div
          className="relative mx-auto grid max-w-md grid-cols-3 gap-3"
          initial={{ opacity: 0, scale: 0.92 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.15, duration: 0.7 }}
        >
          <p className="col-span-3 text-center text-[11px] font-semibold uppercase tracking-widest text-faint">
            Your favorites
          </p>
          {favorites.map((mon, i) => {
            const shadow = mon.speciesId.toLowerCase().includes("_shadow");
            return (
              <motion.button
                key={`${i}-${mon.speciesId}`}
                type="button"
                onClick={() => setPickSlot(i)}
                title={
                  i === 0
                    ? `Favorite #1 · ${mon.speciesName}${themed ? " (sets accent)" : ""}`
                    : `Change ${mon.speciesName}`
                }
                aria-label={`Change favorite ${i + 1}, currently ${mon.speciesName}`}
                className={`card card-hover group relative aspect-square p-2 outline-none focus-visible:ring-2 focus-visible:ring-accent/50 ${
                  i === 0 && themed ? "ring-1 ring-accent/45" : ""
                }`}
                animate={{ y: [0, -8, 0] }}
                transition={{ repeat: Infinity, duration: 3.2 + i * 0.4, ease: "easeInOut" }}
              >
                {i === 0 ? (
                  <span className="absolute left-1.5 top-1.5 rounded-full bg-accent px-1.5 py-0.5 text-[9px] font-bold text-[var(--on-accent)]">
                    #1
                  </span>
                ) : (
                  <span className="absolute left-1.5 top-1.5 text-[10px] font-bold text-faint">
                    #{i + 1}
                  </span>
                )}
                <PokemonSprite
                  speciesId={mon.speciesId}
                  dex={mon.dex}
                  alt={mon.speciesName}
                  width={160}
                  height={160}
                  className="h-full w-full object-contain drop-shadow-xl"
                  shadow={shadow}
                />
                <span className="pointer-events-none absolute inset-x-1 bottom-1.5 rounded-full bg-ink/70 py-0.5 text-center text-[10px] font-semibold text-fg opacity-0 transition group-hover:opacity-100 group-focus-visible:opacity-100">
                  Change
                </span>
              </motion.button>
            );
          })}
        </motion.div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {features.map((f, i) => (
          <motion.div
            key={f.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 + i * 0.08 }}
          >
            <Link href={f.href} className="card card-hover group block h-full p-5">
              {themed ? (
                <div
                  className="mb-4 h-1.5 w-16 rounded-full bg-accent"
                  style={{ opacity: 0.55 + i * 0.12 }}
                />
              ) : (
                <div className={`mb-4 h-1.5 w-16 rounded-full bg-gradient-to-r ${f.accent}`} />
              )}
              <h2 className="text-xl font-bold text-white">{f.title}</h2>
              <p className="mt-2 text-sm leading-relaxed text-muted">{f.body}</p>
              <p className="mt-4 text-sm font-semibold text-accent group-hover:underline">Open →</p>
            </Link>
          </motion.div>
        ))}
      </section>

      <HomeShowcasePicker
        open={pickSlot != null}
        onClose={() => setPickSlot(null)}
        slotIndex={pickSlot ?? 0}
        gm={gm}
        onPick={onPick}
      />
    </div>
  );
}
