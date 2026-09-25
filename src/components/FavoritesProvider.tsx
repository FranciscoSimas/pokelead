"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useAuth } from "@/components/AuthProvider";
import {
  DEFAULT_SHOWCASE,
  hydrateShowcase,
  persistShowcase,
  type ShowcaseMon,
  type ShowcaseTrio,
} from "@/lib/homeShowcase";
import {
  applyThemeTokens,
  primaryTypeFromGmTypes,
  readThemeMode,
  resolveTheme,
  writeThemeMode,
  type ThemeMode,
  type ThemeTokens,
} from "@/lib/favoriteTheme";
import { getSessionGameMaster, peekSessionGameMaster } from "@/lib/pvpokeSession";
import type { GameMaster } from "@/lib/pvpoke";

type FavoritesValue = {
  favorites: ShowcaseTrio;
  theme: ThemeTokens;
  themeMode: ThemeMode;
  loading: boolean;
  setFavorite: (slot: number, mon: ShowcaseMon) => Promise<void>;
  setFavorites: (trio: ShowcaseTrio) => Promise<void>;
  setThemeMode: (mode: ThemeMode) => void;
};

const FavoritesContext = createContext<FavoritesValue | null>(null);

function resolveType(mon: ShowcaseMon, gm: GameMaster | null): string | undefined {
  if (mon.primaryType) return mon.primaryType.toLowerCase();
  if (!gm) return undefined;
  const hit =
    gm.pokemon.find((p) => p.speciesId === mon.speciesId) ??
    gm.pokemon.find((p) => p.speciesId === mon.speciesId.replace(/_shadow$/i, ""));
  return primaryTypeFromGmTypes(hit?.types);
}

export function FavoritesProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [favorites, setFavoritesState] = useState<ShowcaseTrio>(DEFAULT_SHOWCASE);
  const [themeMode, setThemeModeState] = useState<ThemeMode>("default");
  const [loading, setLoading] = useState(true);
  const [gm, setGm] = useState<GameMaster | null>(() =>
    typeof window !== "undefined" ? peekSessionGameMaster() : null,
  );

  useEffect(() => {
    setThemeModeState(readThemeMode());
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    void hydrateShowcase(Boolean(user)).then((trio) => {
      if (!cancelled) {
        setFavoritesState(trio);
        setLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [user]);

  useEffect(() => {
    void getSessionGameMaster()
      .then(setGm)
      .catch(() => {});
  }, []);

  // Backfill primaryType from GM once available (older local/cloud saves).
  useEffect(() => {
    if (!gm || loading) return;
    setFavoritesState((prev) => {
      let changed = false;
      const next = prev.map((mon) => {
        if (mon.primaryType) return mon;
        const t = resolveType(mon, gm);
        if (!t) return mon;
        changed = true;
        return { ...mon, primaryType: t };
      }) as ShowcaseTrio;
      if (!changed) return prev;
      void persistShowcase(next, Boolean(user));
      return next;
    });
  }, [gm, loading, user]);

  const theme = useMemo(() => {
    const t = resolveType(favorites[0], gm);
    return resolveTheme(themeMode, t);
  }, [favorites, gm, themeMode]);

  useEffect(() => {
    applyThemeTokens(theme);
  }, [theme]);

  const setThemeMode = useCallback((mode: ThemeMode) => {
    setThemeModeState(mode);
    writeThemeMode(mode);
  }, []);

  const setFavorites = useCallback(
    async (trio: ShowcaseTrio) => {
      setFavoritesState(trio);
      await persistShowcase(trio, Boolean(user));
    },
    [user],
  );

  const setFavorite = useCallback(
    async (slot: number, mon: ShowcaseMon) => {
      if (slot < 0 || slot > 2) return;
      const next: ShowcaseTrio = [...favorites];
      next[slot] = mon;
      await setFavorites(next);
      // Picking a new #1 implies you want that type accent.
      if (slot === 0) {
        setThemeMode("favorite");
      }
    },
    [favorites, setFavorites, setThemeMode],
  );

  const value = useMemo(
    () => ({
      favorites,
      theme,
      themeMode,
      loading,
      setFavorite,
      setFavorites,
      setThemeMode,
    }),
    [favorites, theme, themeMode, loading, setFavorite, setFavorites, setThemeMode],
  );

  return <FavoritesContext.Provider value={value}>{children}</FavoritesContext.Provider>;
}

export function useFavorites(): FavoritesValue {
  const ctx = useContext(FavoritesContext);
  if (!ctx) {
    throw new Error("useFavorites must be used within FavoritesProvider");
  }
  return ctx;
}
