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
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { hydrateBoxFromCloud, clearLocalBoxForGuest } from "@/lib/boxHydrate";
import { ensureProfile } from "@/lib/boxSync";
import { getSessionGameMaster } from "@/lib/pvpokeSession";
import type { Tables } from "@/lib/supabase/database.types";

type AuthValue = {
  configured: boolean;
  loading: boolean;
  user: User | null;
  profile: Tables<"profiles"> | null;
  refreshProfile: () => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const configured = isSupabaseConfigured();
  const [loading, setLoading] = useState(configured);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Tables<"profiles"> | null>(null);

  const refreshProfile = useCallback(async () => {
    const next = await ensureProfile();
    setProfile(next);
  }, []);

  useEffect(() => {
    const supabase = createClient();
    if (!supabase) {
      setLoading(false);
      // Still warm PvPoke cache for guests so Teams/Compare open without a cold wait.
      void getSessionGameMaster().catch(() => {});
      return;
    }

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
      if (!session?.user) {
        setProfile(null);
        // Only wipe after an explicit sign-out - not on guest page loads.
        if (event === "SIGNED_OUT") clearLocalBoxForGuest();
        setLoading(false);
        return;
      }
      if (event === "TOKEN_REFRESHED") return;
      void (async () => {
        await hydrateBoxFromCloud();
        const next = await ensureProfile();
        setProfile(next);
        setLoading(false);
      })();
    });

    void getSessionGameMaster().catch(() => {});

    const fallback = window.setTimeout(() => setLoading(false), 4000);

    return () => {
      window.clearTimeout(fallback);
      subscription.unsubscribe();
    };
  }, []);

  const signOut = useCallback(async () => {
    const supabase = createClient();
    await supabase?.auth.signOut();
    setUser(null);
    setProfile(null);
    clearLocalBoxForGuest();
  }, []);

  const value = useMemo<AuthValue>(
    () => ({
      configured,
      loading,
      user,
      profile,
      refreshProfile,
      signOut,
    }),
    [configured, loading, user, profile, refreshProfile, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    return {
      configured: isSupabaseConfigured(),
      loading: false,
      user: null,
      profile: null,
      refreshProfile: async () => {},
      signOut: async () => {},
    };
  }
  return ctx;
}
