"use client";

import Link from "next/link";
import { Press_Start_2P, VT323 } from "next/font/google";
import { motion } from "framer-motion";
import { PokemonSprite } from "@/components/PokemonSprite";

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

const FAVORITES = [
  { speciesId: "charizard", dex: 6, name: "CHARIZARD", type: "FIRE", hue: "#F08030" },
  { speciesId: "blastoise", dex: 9, name: "BLASTOISE", type: "WATER", hue: "#6890F0" },
  { speciesId: "venusaur", dex: 3, name: "VENUSAUR", type: "GRASS", hue: "#78C850" },
] as const;

const BOX = [
  { speciesId: "azumarill", dex: 184, name: "AZUMARILL", cp: 1498, rank: 12 },
  { speciesId: "medicham", dex: 308, name: "MEDICHAM", cp: 1495, rank: 3 },
  { speciesId: "stunfisk_galarian", dex: 618, name: "STUNFISK", cp: 1488, rank: 8 },
  { speciesId: "swampert", dex: 260, name: "SWAMPERT", cp: 1499, rank: 15 },
  { speciesId: "nidoqueen", dex: 31, name: "NIDOQUEEN", cp: 1472, rank: 28 },
  { speciesId: "registeel", dex: 379, name: "REGISTEEL", cp: 1490, rank: 6 },
] as const;

const TEAM = [
  { role: "LEAD", speciesId: "medicham", dex: 308, name: "MEDICHAM", score: 92 },
  { role: "SWITCH", speciesId: "swampert", dex: 260, name: "SWAMPERT", score: 88 },
  { role: "CLOSER", speciesId: "registeel", dex: 379, name: "REGISTEEL", score: 90 },
] as const;

export default function RetroLabPage() {
  return (
    <div
      className={`${pixel.variable} ${vt.variable} fixed inset-0 z-[70] overflow-y-auto overflow-x-hidden`}
      style={{
        fontFamily: "var(--font-vt), monospace",
        backgroundColor: "#1a3a2a",
        backgroundImage: `
          linear-gradient(180deg, rgba(255,255,255,0.04) 1px, transparent 1px),
          linear-gradient(90deg, rgba(0,0,0,0.15) 1px, transparent 1px),
          radial-gradient(ellipse 120% 80% at 50% -10%, #3d7a55 0%, transparent 55%),
          repeating-linear-gradient(
            -45deg,
            #1f4633 0 10px,
            #1a3a2a 10px 20px
          )
        `,
        backgroundSize: "100% 3px, 12px 12px, 100% 100%, 100% 100%",
        color: "#f4f0d8",
        imageRendering: "pixelated",
      }}
    >
      {/* CRT scanline overlay */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 z-[1] opacity-[0.12]"
        style={{
          background:
            "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.35) 2px, rgba(0,0,0,0.35) 3px)",
        }}
      />

      <div className="relative z-[2] mx-auto max-w-5xl px-3 pb-16 pt-4 sm:px-6 sm:pt-6">
        {/* TEMP bar */}
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2 border-4 border-[#1a1208] bg-[#e8d48b] px-3 py-2 text-[#1a1208] shadow-[4px_4px_0_#1a1208]">
          <p
            className="text-[10px] leading-relaxed sm:text-[11px]"
            style={{ fontFamily: "var(--font-pixel), monospace" }}
          >
            TEMP LAB · PIXEL SKIN
          </p>
          <Link
            href="/"
            className="border-2 border-[#1a1208] bg-[#c23b22] px-3 py-1 text-[10px] text-[#fff8e7] transition hover:bg-[#a8321c]"
            style={{ fontFamily: "var(--font-pixel), monospace" }}
          >
            EXIT →
          </Link>
        </div>

        {/* Header */}
        <header className="mb-6 border-4 border-[#1a1208] bg-[#f7f1d0] shadow-[6px_6px_0_#1a1208]">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b-4 border-[#1a1208] bg-[#c23b22] px-3 py-3 sm:px-4">
            <div className="flex items-center gap-3">
              <span
                aria-hidden
                className="relative grid h-10 w-10 place-items-center border-2 border-[#1a1208] bg-white"
              >
                <span className="absolute inset-x-0 top-0 h-1/2 bg-[#c23b22]" />
                <span className="absolute inset-x-0 top-1/2 h-0.5 bg-[#1a1208]" />
                <span className="relative z-[1] h-3 w-3 rounded-full border-2 border-[#1a1208] bg-white" />
              </span>
              <div>
                <h1
                  className="text-sm text-[#fff8e7] sm:text-base"
                  style={{ fontFamily: "var(--font-pixel), monospace" }}
                >
                  POKELEAD
                </h1>
                <p className="text-lg leading-none text-[#ffd89a] sm:text-xl">
                  YOUR BOX · BEST TEAMS
                </p>
              </div>
            </div>
            <nav
              className="flex flex-wrap gap-1 text-[9px] text-[#fff8e7] sm:text-[10px]"
              style={{ fontFamily: "var(--font-pixel), monospace" }}
            >
              {["HOME", "BOX", "TEAMS", "ANALYZE"].map((label, i) => (
                <span
                  key={label}
                  className={`border-2 border-[#1a1208] px-2 py-1 ${
                    i === 0 ? "bg-[#1a1208] text-[#e8d48b]" : "bg-[#8b2e1f]"
                  }`}
                >
                  {label}
                </span>
              ))}
            </nav>
          </div>

          <div className="grid gap-0 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="space-y-3 border-b-4 border-[#1a1208] p-4 lg:border-b-0 lg:border-r-4">
              <p
                className="text-[10px] text-[#c23b22]"
                style={{ fontFamily: "var(--font-pixel), monospace" }}
              >
                ★ PLAYER CARD
              </p>
              <h2
                className="text-xs leading-relaxed text-[#1a1208] sm:text-sm"
                style={{ fontFamily: "var(--font-pixel), monospace" }}
              >
                CATCH.
                <br />
                <span className="text-[#2a6f4e]">RANK.</span>
                <br />
                LEAD.
              </h2>
              <p className="max-w-md text-xl leading-tight text-[#3d4a3a] sm:text-2xl">
                A Game-Boy-era coat of paint on the same PokeLead idea: your real box, loud colors,
                chunky frames, zero clutter.
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
            </div>

            <div className="bg-[#dfe8c8] p-4">
              <p
                className="mb-3 text-[9px] text-[#1a1208]"
                style={{ fontFamily: "var(--font-pixel), monospace" }}
              >
                TOP 3 FAVORITES
              </p>
              <div className="grid grid-cols-3 gap-2">
                {FAVORITES.map((mon, i) => (
                  <motion.div
                    key={mon.speciesId}
                    initial={{ y: 8, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.08 * i, type: "spring", stiffness: 260, damping: 18 }}
                    className="border-4 border-[#1a1208] bg-[#f7f1d0] p-2 text-center shadow-[3px_3px_0_#1a1208]"
                  >
                    <div
                      className="mx-auto mb-1 grid h-16 w-16 place-items-center border-2 border-[#1a1208]"
                      style={{ background: mon.hue }}
                    >
                      <PokemonSprite
                        speciesId={mon.speciesId}
                        dex={mon.dex}
                        alt=""
                        width={56}
                        height={56}
                        className="h-12 w-12 object-contain drop-shadow-[2px_2px_0_rgba(0,0,0,0.35)]"
                      />
                    </div>
                    <p
                      className="text-[7px] leading-tight text-[#1a1208]"
                      style={{ fontFamily: "var(--font-pixel), monospace" }}
                    >
                      #{i + 1}
                    </p>
                    <p className="text-base leading-none text-[#1a1208]">{mon.name}</p>
                    <p className="text-sm" style={{ color: mon.hue }}>
                      {mon.type}
                    </p>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        </header>

        {/* Fake feature strip */}
        <section className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { title: "MY BOX", body: "IVs · CP · moves", color: "#3B9EFF" },
            { title: "COMPARE", body: "1v1 rank duel", color: "#B56BFF" },
            { title: "ANALYZE", body: "roles from PvPoke", color: "#F5C518" },
            { title: "TEAMS", body: "lead · switch · closer", color: "#34d399" },
          ].map((card, i) => (
            <motion.div
              key={card.title}
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.15 + i * 0.05 }}
              className="border-4 border-[#1a1208] bg-[#f7f1d0] p-3 shadow-[4px_4px_0_#1a1208]"
            >
              <div className="mb-2 h-2 w-full" style={{ background: card.color }} />
              <p
                className="text-[10px] text-[#1a1208]"
                style={{ fontFamily: "var(--font-pixel), monospace" }}
              >
                {card.title}
              </p>
              <p className="text-xl text-[#3d4a3a]">{card.body}</p>
            </motion.div>
          ))}
        </section>

        {/* Box mock */}
        <section className="mb-6 border-4 border-[#1a1208] bg-[#f7f1d0] shadow-[6px_6px_0_#1a1208]">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b-4 border-[#1a1208] bg-[#2a6f4e] px-3 py-2">
            <p
              className="text-[10px] text-[#e8f5d8]"
              style={{ fontFamily: "var(--font-pixel), monospace" }}
            >
              ■ PC BOX 01
            </p>
            <p className="text-lg text-[#c8e6b0]">GREAT LEAGUE · 24 STORED</p>
          </div>
          <div className="grid grid-cols-2 gap-2 p-3 sm:grid-cols-3">
            {BOX.map((mon, i) => (
              <motion.article
                key={mon.speciesId}
                animate={{ y: [0, -2, 0] }}
                transition={{
                  duration: 2.4,
                  delay: i * 0.12,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
                className="flex items-center gap-2 border-2 border-[#1a1208] bg-[#fff8e7] p-2"
              >
                <div className="grid h-14 w-14 shrink-0 place-items-center border-2 border-[#1a1208] bg-[#dfe8c8]">
                  <PokemonSprite
                    speciesId={mon.speciesId}
                    dex={mon.dex}
                    alt=""
                    width={48}
                    height={48}
                    className="h-11 w-11 object-contain"
                  />
                </div>
                <div className="min-w-0">
                  <p
                    className="truncate text-[8px] text-[#1a1208]"
                    style={{ fontFamily: "var(--font-pixel), monospace" }}
                  >
                    {mon.name}
                  </p>
                  <p className="text-lg leading-none text-[#3d4a3a]">
                    {mon.cp} CP · #{mon.rank}
                  </p>
                  <div className="mt-1 h-2 w-full border border-[#1a1208] bg-[#1a1208]">
                    <div
                      className="h-full bg-[#c23b22]"
                      style={{ width: `${Math.max(18, 100 - mon.rank * 2)}%` }}
                    />
                  </div>
                </div>
              </motion.article>
            ))}
          </div>
        </section>

        {/* Team mock */}
        <section className="border-4 border-[#1a1208] bg-[#1a1208] shadow-[6px_6px_0_#5a4030]">
          <div className="border-b-4 border-[#e8d48b] bg-[#c23b22] px-3 py-2">
            <p
              className="text-[10px] text-[#fff8e7]"
              style={{ fontFamily: "var(--font-pixel), monospace" }}
            >
              ▲ TEAM BUILDER
            </p>
            <p className="text-xl text-[#ffd89a]">SCORE 90 · META FIT HIGH</p>
          </div>
          <div className="grid gap-0 sm:grid-cols-3">
            {TEAM.map((slot, i) => (
              <div
                key={slot.role}
                className={`bg-[#f7f1d0] p-4 text-center ${
                  i < 2 ? "border-b-4 border-[#1a1208] sm:border-b-0 sm:border-r-4" : ""
                }`}
              >
                <p
                  className="mb-2 text-[9px] text-[#c23b22]"
                  style={{ fontFamily: "var(--font-pixel), monospace" }}
                >
                  {slot.role}
                </p>
                <motion.div
                  animate={{ rotate: [0, -2, 2, 0] }}
                  transition={{ duration: 3, delay: i * 0.2, repeat: Infinity }}
                  className="mx-auto mb-2 grid h-20 w-20 place-items-center border-4 border-[#1a1208] bg-[#dfe8c8]"
                >
                  <PokemonSprite
                    speciesId={slot.speciesId}
                    dex={slot.dex}
                    alt=""
                    width={72}
                    height={72}
                    className="h-16 w-16 object-contain"
                  />
                </motion.div>
                <p
                  className="text-[9px] text-[#1a1208]"
                  style={{ fontFamily: "var(--font-pixel), monospace" }}
                >
                  {slot.name}
                </p>
                <p className="mt-1 inline-block border-2 border-[#1a1208] bg-[#F5C518] px-2 py-0.5 text-lg text-[#1a1208]">
                  {slot.score}
                </p>
              </div>
            ))}
          </div>
        </section>

        <p
          className="mt-6 text-center text-[8px] leading-relaxed text-[#c8e6b0]"
          style={{ fontFamily: "var(--font-pixel), monospace" }}
        >
          MOCK ONLY · NOT WIRED TO BOX / TEAMS
          <br />
          <span className="text-[#8fbc8f]">PRESS EXIT TO RETURN</span>
        </p>
      </div>
    </div>
  );
}
