"use client";

import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { GameMaster, GmPokemon } from "@/lib/pvpoke";
import { SpeciesPickTile } from "./SpeciesPickTile";
import { BottomSheet } from "./BottomSheet";
import type { ShowcaseMon } from "@/lib/homeShowcase";

function isShadow(p: GmPokemon): boolean {
  return (
    p.speciesId.toLowerCase().includes("_shadow") ||
    (p.tags ?? []).some((t) => t.toLowerCase() === "shadow")
  );
}

function baseName(p: GmPokemon): string {
  return p.speciesName.replace(/\s*\([^)]*\)\s*/g, "").trim();
}

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

export function HomeShowcasePicker({
  open,
  onClose,
  slotIndex,
  gm,
  onPick,
}: {
  open: boolean;
  onClose: () => void;
  slotIndex: number;
  gm: GameMaster | null;
  onPick: (mon: ShowcaseMon) => void;
}) {
  const [q, setQ] = useState("");

  useEffect(() => {
    if (!open) setQ("");
  }, [open]);

  const results = useMemo(() => {
    if (!gm || !q.trim()) return [];
    const qq = q.toLowerCase().trim();
    return gm.pokemon
      .filter((p) => {
        const name = p.speciesName.toLowerCase();
        const id = p.speciesId.toLowerCase();
        const base = baseName(p).toLowerCase();
        return (
          name.includes(qq) ||
          id.includes(qq.replace(/\s+/g, "_")) ||
          base.startsWith(qq) ||
          String(p.dex) === qq
        );
      })
      .sort((a, b) => {
        const aExact = baseName(a).toLowerCase() === qq ? 0 : 1;
        const bExact = baseName(b).toLowerCase() === qq ? 0 : 1;
        if (aExact !== bExact) return aExact - bExact;
        if (a.dex !== b.dex) return a.dex - b.dex;
        return a.speciesName.localeCompare(b.speciesName);
      })
      .slice(0, 48);
  }, [gm, q]);

  function pick(p: GmPokemon) {
    const types = (p.types ?? [])
      .map((t) => t.toLowerCase())
      .filter((t) => t && t !== "none");
    onPick({
      speciesId: p.speciesId,
      dex: p.dex,
      speciesName: baseName(p),
      primaryType: types[0],
    });
    onClose();
  }

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title={slotIndex === 0 ? "Change favorite #1" : `Change favorite #${slotIndex + 1}`}
      subtitle={
        slotIndex === 0
          ? "Favorite #1 can set the site accent from its primary type (when Accent = Favorite #1)."
          : "Saved on this device, or in your account when signed in."
      }
      size="large"
    >
      <div className="space-y-3 p-4">
        <label className="block">
          <span className="label">Search species / form</span>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Type a name… e.g. Azumarill"
            className="field mt-1.5"
            autoFocus
            autoComplete="off"
          />
        </label>

        {!gm ? (
          <p className="text-sm text-muted">Loading Pokédex…</p>
        ) : !q.trim() ? (
          <p className="text-sm text-muted">Start typing to find a Pokémon.</p>
        ) : results.length === 0 ? (
          <p className="text-sm text-muted">No matches.</p>
        ) : (
          <AnimatePresence initial={false}>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6"
            >
              {results.map((p) => (
                <SpeciesPickTile
                  key={p.speciesId}
                  speciesId={p.speciesId}
                  dex={p.dex}
                  shadow={isShadow(p)}
                  onPick={() => pick(p)}
                  name={baseName(p)}
                  subtitle={formBadge(p)}
                />
              ))}
            </motion.div>
          </AnimatePresence>
        )}
      </div>
    </BottomSheet>
  );
}
