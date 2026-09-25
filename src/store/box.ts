import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { BoxPokemon } from "@/lib/types";
import { DEFAULT_FLAGS } from "@/lib/types";
import { syncDeletePokemon, syncUpsertPokemon, uploadPokemonScreenshot } from "@/lib/boxSync";

type PendingDelete = { id: string; screenshotPath?: string };

type BoxState = {
  pokemon: BoxPokemon[];
  pendingDeletes: PendingDelete[];
  dirtyIds: string[];
  add: (
    p: Omit<BoxPokemon, "id" | "createdAt" | "updatedAt" | "flags" | "tags"> & {
      flags?: Partial<BoxPokemon["flags"]>;
      tags?: string[];
      screenshotPath?: string;
      level?: number;
    },
  ) => BoxPokemon;
  update: (id: string, patch: Partial<BoxPokemon>) => void;
  remove: (id: string) => void;
  clear: () => void;
  addTag: (id: string, tag: string) => void;
  removeTag: (id: string, tag: string) => void;
  replaceAll: (pokemon: BoxPokemon[]) => void;
  attachScreenshot: (id: string, file: File) => void;
  ackDelete: (id: string) => void;
  ackDirty: (id: string) => void;
  markDirty: (id: string) => void;
};

function uid() {
  return crypto.randomUUID();
}

function normalizeTag(tag: string): string {
  return tag.trim().replace(/\s+/g, " ");
}

function scheduleFlush() {
  void import("@/lib/boxHydrate").then((m) => m.flushPendingBoxSync());
}

function persistPokemon(p: BoxPokemon) {
  void (async () => {
    const ok = await syncUpsertPokemon(p);
    if (ok) {
      useBoxStore.getState().ackDirty(p.id);
      return;
    }
    useBoxStore.getState().markDirty(p.id);
    scheduleFlush();
  })();
}

export const useBoxStore = create<BoxState>()(
  persist(
    (set, get) => ({
      pokemon: [],
      pendingDeletes: [],
      dirtyIds: [],
      add: (p) => {
        const now = Date.now();
        const entry: BoxPokemon = {
          ...p,
          id: uid(),
          flags: { ...DEFAULT_FLAGS, ...p.flags },
          chargedMoves: p.chargedMoves ?? [],
          tags: (p.tags ?? []).map(normalizeTag).filter(Boolean),
          createdAt: now,
          updatedAt: now,
        };
        set((s) => ({ pokemon: [entry, ...s.pokemon] }));
        persistPokemon(entry);
        return entry;
      },
      update: (id, patch) => {
        set((s) => ({
          pokemon: s.pokemon.map((x) =>
            x.id === id
              ? {
                  ...x,
                  ...patch,
                  tags: patch.tags
                    ? patch.tags.map(normalizeTag).filter(Boolean)
                    : x.tags,
                  updatedAt: Date.now(),
                }
              : x,
          ),
        }));
        const next = get().pokemon.find((x) => x.id === id);
        if (next) persistPokemon(next);
      },
      remove: (id) => {
        const existing = get().pokemon.find((x) => x.id === id);
        set((s) => ({
          pokemon: s.pokemon.filter((x) => x.id !== id),
          pendingDeletes: [
            ...s.pendingDeletes.filter((d) => d.id !== id),
            { id, screenshotPath: existing?.screenshotPath },
          ],
          dirtyIds: s.dirtyIds.filter((x) => x !== id),
        }));
        void (async () => {
          const ok = await syncDeletePokemon(id, existing?.screenshotPath);
          if (ok) get().ackDelete(id);
          else scheduleFlush();
        })();
      },
      clear: () => {
        const prev = get().pokemon;
        set((s) => ({
          pokemon: [],
          pendingDeletes: [
            ...s.pendingDeletes,
            ...prev.map((p) => ({ id: p.id, screenshotPath: p.screenshotPath })),
          ],
          dirtyIds: [],
        }));
        for (const p of prev) {
          void (async () => {
            const ok = await syncDeletePokemon(p.id, p.screenshotPath);
            if (ok) get().ackDelete(p.id);
          })();
        }
      },
      addTag: (id, tag) => {
        const t = normalizeTag(tag);
        if (!t) return;
        set((s) => ({
          pokemon: s.pokemon.map((x) => {
            if (x.id !== id) return x;
            const tags = x.tags ?? [];
            if (tags.some((y) => y.toLowerCase() === t.toLowerCase())) return x;
            return { ...x, tags: [...tags, t], updatedAt: Date.now() };
          }),
        }));
        const next = get().pokemon.find((x) => x.id === id);
        if (next) persistPokemon(next);
      },
      removeTag: (id, tag) => {
        set((s) => ({
          pokemon: s.pokemon.map((x) =>
            x.id === id
              ? {
                  ...x,
                  tags: (x.tags ?? []).filter((y) => y.toLowerCase() !== tag.toLowerCase()),
                  updatedAt: Date.now(),
                }
              : x,
          ),
        }));
        const next = get().pokemon.find((x) => x.id === id);
        if (next) persistPokemon(next);
      },
      replaceAll: (pokemon) => set({ pokemon }),
      attachScreenshot: (id, file) => {
        void (async () => {
          const path = await uploadPokemonScreenshot(id, file);
          if (!path) return;
          set((s) => ({
            pokemon: s.pokemon.map((x) =>
              x.id === id ? { ...x, screenshotPath: path, updatedAt: Date.now() } : x,
            ),
          }));
          const next = get().pokemon.find((x) => x.id === id);
          if (next) persistPokemon(next);
        })();
      },
      ackDelete: (id) =>
        set((s) => ({ pendingDeletes: s.pendingDeletes.filter((d) => d.id !== id) })),
      ackDirty: (id) => set((s) => ({ dirtyIds: s.dirtyIds.filter((x) => x !== id) })),
      markDirty: (id) =>
        set((s) => ({ dirtyIds: s.dirtyIds.includes(id) ? s.dirtyIds : [...s.dirtyIds, id] })),
    }),
    {
      name: "pokelead-box-v1",
      version: 2,
      migrate: (persisted) => {
        const state = persisted as {
          pokemon?: BoxPokemon[];
          pendingDeletes?: PendingDelete[];
          dirtyIds?: string[];
        };
        return {
          pokemon: (state.pokemon ?? []).map((p) => ({
            ...p,
            tags: p.tags ?? [],
          })),
          pendingDeletes: state.pendingDeletes ?? [],
          dirtyIds: state.dirtyIds ?? [],
        };
      },
    },
  ),
);
