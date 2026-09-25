"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/components/AuthProvider";
import { useFavorites } from "@/components/FavoritesProvider";
import { HomeShowcasePicker } from "@/components/HomeShowcasePicker";
import { PokemonSprite } from "@/components/PokemonSprite";
import { Segment } from "@/components/Segment";
import { TypeIcon, typeLabel } from "@/components/TypeIcon";
import { createClient } from "@/lib/supabase/client";
import { publicAvatarUrl, uploadAvatar } from "@/lib/boxSync";
import { getSessionGameMaster, peekSessionGameMaster } from "@/lib/pvpokeSession";
import type { GameMaster } from "@/lib/pvpoke";
import type { ShowcaseTrio } from "@/lib/homeShowcase";
import type { ThemeMode } from "@/lib/favoriteTheme";

export default function AccountPage() {
  const { configured, user, profile, loading, signOut, refreshProfile } = useAuth();
  const { favorites, theme, themeMode, setFavorite, setThemeMode } = useFavorites();
  const [displayName, setDisplayName] = useState(profile?.display_name ?? "");
  const [password, setPassword] = useState("");
  const [pickSlot, setPickSlot] = useState<number | null>(null);
  const [gm, setGm] = useState<GameMaster | null>(() =>
    typeof window !== "undefined" ? peekSessionGameMaster() : null,
  );
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    setDisplayName(profile?.display_name ?? "");
  }, [profile]);

  useEffect(() => {
    if (pickSlot == null) return;
    void getSessionGameMaster()
      .then(setGm)
      .catch(() => {});
  }, [pickSlot]);

  const avatar = publicAvatarUrl(profile?.avatar_path);

  async function onPickFavorite(mon: ShowcaseTrio[number]) {
    if (pickSlot == null) return;
    await setFavorite(pickSlot, mon);
    setPickSlot(null);
  }

  async function saveProfile(e: FormEvent) {
    e.preventDefault();
    const supabase = createClient();
    if (!supabase || !user) return;
    setBusy(true);
    setMessage(null);
    const { error } = await supabase
      .from("profiles")
      .update({ display_name: displayName.trim() || null })
      .eq("id", user.id);
    setBusy(false);
    if (error) setMessage(error.message);
    else {
      setMessage("Profile saved.");
      await refreshProfile();
    }
  }

  async function savePassword(e: FormEvent) {
    e.preventDefault();
    const supabase = createClient();
    if (!supabase) return;
    setBusy(true);
    setMessage(null);
    const { error } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (error) setMessage(error.message);
    else {
      setPassword("");
      setMessage("Password updated.");
    }
  }

  async function onAvatar(file: File | undefined) {
    if (!file) return;
    setBusy(true);
    setMessage(null);
    const path = await uploadAvatar(file);
    setBusy(false);
    if (!path) setMessage("Avatar upload failed.");
    else {
      setMessage("Avatar updated.");
      await refreshProfile();
    }
  }

  if (!configured) {
    return (
      <div className="glass mx-auto max-w-lg rounded-card p-6">
        <h1 className="font-[family-name:var(--font-lilita)] text-3xl text-white">Account</h1>
        <p className="mt-2 text-sm text-muted">Supabase is not configured on this deploy.</p>
      </div>
    );
  }

  if (loading) {
    return <p className="text-muted">Loading account…</p>;
  }

  if (!user) {
    return (
      <div className="mx-auto max-w-lg space-y-5">
        <div>
          <h1 className="font-[family-name:var(--font-lilita)] text-3xl text-white sm:text-4xl">
            Account
          </h1>
          <p className="mt-1.5 text-sm text-muted">
            Sign in to sync your box. Favorites and theme still work on this device as a guest.
          </p>
        </div>

        <FavoritesEditor
          favorites={favorites}
          themeType={theme.type}
          themeMode={themeMode}
          onThemeMode={setThemeMode}
          onPickSlot={setPickSlot}
        />

        <Link href="/login" className="btn btn-primary inline-flex px-5 py-2.5">
          Sign in
        </Link>

        <HomeShowcasePicker
          open={pickSlot != null}
          onClose={() => setPickSlot(null)}
          slotIndex={pickSlot ?? 0}
          gm={gm}
          onPick={onPickFavorite}
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg space-y-5">
      <div>
        <h1 className="font-[family-name:var(--font-lilita)] text-3xl text-white sm:text-4xl">
          Account
        </h1>
        <p className="mt-1.5 text-sm text-muted">{user.email}</p>
      </div>

      <FavoritesEditor
        favorites={favorites}
        themeType={theme.type}
        themeMode={themeMode}
        onThemeMode={setThemeMode}
        onPickSlot={setPickSlot}
      />

      <section className="glass space-y-4 rounded-card p-5">
        <div className="flex items-center gap-4">
          {avatar ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={avatar} alt="" className="h-16 w-16 rounded-full object-cover" />
          ) : (
            <span className="grid h-16 w-16 place-items-center rounded-full bg-accent/25 text-lg font-bold">
              {(displayName || user.email || "?").slice(0, 1).toUpperCase()}
            </span>
          )}
          <label className="text-sm font-semibold text-fg">
            <span className="rounded-full border border-line-strong bg-surface-2 px-3 py-1.5">
              {busy ? "Uploading…" : "Change photo"}
            </span>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              className="hidden"
              onChange={(e) => void onAvatar(e.target.files?.[0])}
            />
          </label>
        </div>

        <form onSubmit={saveProfile} className="space-y-3">
          <label className="block">
            <span className="label">Display name</span>
            <input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="field mt-1.5"
            />
          </label>
          <button type="submit" disabled={busy} className="btn btn-ghost">
            Save profile
          </button>
        </form>
      </section>

      <section className="glass space-y-3 rounded-card p-5">
        <h2 className="text-lg font-bold text-white">Password</h2>
        <form onSubmit={savePassword} className="space-y-3">
          <input
            type="password"
            minLength={6}
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="New password"
            className="field"
          />
          <button
            type="submit"
            disabled={busy || password.length < 6}
            className="btn btn-ghost disabled:opacity-50"
          >
            Update password
          </button>
        </form>
      </section>

      {message ? (
        <p className="rounded-card border border-warn/30 bg-warn/10 px-3 py-2 text-sm text-warn">
          {message}
        </p>
      ) : null}

      <button type="button" onClick={() => void signOut()} className="btn btn-quiet text-danger">
        Sign out
      </button>

      <HomeShowcasePicker
        open={pickSlot != null}
        onClose={() => setPickSlot(null)}
        slotIndex={pickSlot ?? 0}
        gm={gm}
        onPick={onPickFavorite}
      />
    </div>
  );
}

function FavoritesEditor({
  favorites,
  themeType,
  themeMode,
  onThemeMode,
  onPickSlot,
}: {
  favorites: ShowcaseTrio;
  themeType: string;
  themeMode: ThemeMode;
  onThemeMode: (mode: ThemeMode) => void;
  onPickSlot: (slot: number) => void;
}) {
  const themed = themeMode === "favorite" && themeType !== "default";

  return (
    <section className="card space-y-3 p-5">
      <div>
        <h2 className="text-lg font-bold text-white">Favorites</h2>
        <p className="mt-1 text-sm text-muted">
          Default keeps the original sky look. Favorite #1 tints buttons and accents from that
          Pokémon&apos;s type. Does not change team scores.
        </p>
      </div>

      <div>
        <span className="label mb-1.5">Accent</span>
        <Segment
          ariaLabel="Site accent theme"
          value={themeMode}
          onChange={onThemeMode}
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
          <p className="mt-1.5 text-xs text-faint">
            Active type:{" "}
            <span className="inline-flex items-center gap-1 align-middle font-semibold text-fg">
              <TypeIcon type={themeType} size={14} />
              {typeLabel(themeType)}
            </span>
          </p>
        ) : null}
      </div>

      <div className="grid grid-cols-3 gap-2">
        {favorites.map((mon, i) => {
          const shadow = mon.speciesId.toLowerCase().includes("_shadow");
          return (
            <button
              key={`${i}-${mon.speciesId}`}
              type="button"
              onClick={() => onPickSlot(i)}
              className={`relative flex flex-col items-center rounded-field border p-2 text-center transition hover:border-accent/50 ${
                i === 0 && themed
                  ? "border-accent/40 bg-accent/10"
                  : "border-line bg-surface-2"
              }`}
            >
              <span
                className={`absolute left-1.5 top-1.5 text-[10px] font-bold ${
                  i === 0 && themed ? "text-accent" : "text-faint"
                }`}
              >
                #{i + 1}
              </span>
              <PokemonSprite
                speciesId={mon.speciesId}
                dex={mon.dex}
                alt=""
                width={64}
                height={64}
                className="mt-3 h-14 w-14 object-contain"
                shadow={shadow}
              />
              <span className="mt-1 line-clamp-1 w-full text-xs font-semibold text-white">
                {mon.speciesName}
              </span>
              {(mon.primaryType || (i === 0 && themed ? themeType : null)) && (
                <span className="mt-0.5 inline-flex items-center gap-1 text-[10px] text-faint">
                  <TypeIcon type={mon.primaryType || themeType} size={12} />
                  {typeLabel(mon.primaryType || themeType)}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </section>
  );
}
