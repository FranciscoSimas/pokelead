"use client";

import { FormEvent, Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/env";

function GoogleMark() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden>
      <path
        fill="#EA4335"
        d="M12 10.2v3.6h5.1c-.2 1.2-1.4 3.6-5.1 3.6-3.1 0-5.6-2.6-5.6-5.7S8.9 6 12 6c1.8 0 3 .7 3.7 1.4l2.4-2.3C16.7 3.7 14.6 2.8 12 2.8 6.9 2.8 2.8 6.9 2.8 12S6.9 21.2 12 21.2c5.2 0 8.6-3.6 8.6-8.7 0-.6 0-1-.1-1.5H12z"
      />
    </svg>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<p className="text-sky-100/70">Loading…</p>}>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const configured = isSupabaseConfigured();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(
    params.get("error") === "auth" ? "Sign-in failed. Try again." : null,
  );

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const supabase = createClient();
    if (!supabase) return;
    setBusy(true);
    setMessage(null);
    const origin = window.location.origin;
    try {
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${origin}/auth/callback?next=/box`,
            data: name.trim() ? { full_name: name.trim() } : undefined,
          },
        });
        if (error) throw error;
        if (data.session) {
          router.replace("/box");
          router.refresh();
          return;
        }
        setMessage("Check your email to confirm the account, then sign in.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        router.replace("/box");
        router.refresh();
      }
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Auth failed");
    } finally {
      setBusy(false);
    }
  }

  async function onGoogle() {
    const supabase = createClient();
    if (!supabase) return;
    setBusy(true);
    setMessage(null);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=/box`,
      },
    });
    if (error) {
      setBusy(false);
      setMessage(error.message);
    }
  }

  if (!configured) {
    return (
      <div className="glass mx-auto max-w-md rounded-card p-6">
        <h1 className="font-[family-name:var(--font-lilita)] text-3xl text-white">Accounts</h1>
        <p className="mt-2 text-sm text-sky-100/70">
          Supabase is not configured on this deploy. Add the public URL and publishable key,
          then redeploy.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md space-y-5">
      <div>
        <h1 className="font-[family-name:var(--font-lilita)] text-3xl text-white sm:text-4xl">
          {mode === "signin" ? "Sign in" : "Create account"}
        </h1>
        <p className="mt-1.5 text-sm text-sky-100/70">
          Your box syncs to this account. Guest data on this device is imported on first login.
        </p>
      </div>

      <div className="glass space-y-4 rounded-card p-5">
        <button
          type="button"
          onClick={() => void onGoogle()}
          disabled={busy}
          className="flex w-full items-center justify-center gap-2 rounded-2xl border border-white/15 bg-white px-4 py-2.5 text-sm font-bold text-slate-800 transition hover:bg-sky-50 disabled:opacity-60"
        >
          <GoogleMark />
          Continue with Google
        </button>

        <div className="flex items-center gap-3 text-[11px] uppercase tracking-widest text-sky-100/40">
          <span className="h-px flex-1 bg-white/10" />
          Email
          <span className="h-px flex-1 bg-white/10" />
        </div>

        <form onSubmit={onSubmit} className="space-y-3">
          {mode === "signup" ? (
            <label className="block">
              <span className="text-xs font-semibold uppercase tracking-wider text-sky-200/80">
                Display name
              </span>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-1 w-full rounded-2xl border border-white/15 bg-black/25 px-4 py-2.5 text-white outline-none ring-sky-400/40 focus:ring-2"
              />
            </label>
          ) : null}
          <label className="block">
            <span className="text-xs font-semibold uppercase tracking-wider text-sky-200/80">
              Email
            </span>
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded-2xl border border-white/15 bg-black/25 px-4 py-2.5 text-white outline-none ring-sky-400/40 focus:ring-2"
            />
          </label>
          <label className="block">
            <span className="text-xs font-semibold uppercase tracking-wider text-sky-200/80">
              Password
            </span>
            <input
              type="password"
              required
              minLength={6}
              autoComplete={mode === "signup" ? "new-password" : "current-password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full rounded-2xl border border-white/15 bg-black/25 px-4 py-2.5 text-white outline-none ring-sky-400/40 focus:ring-2"
            />
          </label>
          {message ? (
            <p className="rounded-xl border border-amber-300/25 bg-amber-500/10 px-3 py-2 text-sm text-amber-100">
              {message}
            </p>
          ) : null}
          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-2xl bg-gradient-to-r from-red-500 to-rose-600 px-4 py-2.5 text-sm font-bold text-white shadow-lg shadow-rose-600/25 disabled:opacity-60"
          >
            {busy ? "Please wait…" : mode === "signin" ? "Sign in" : "Create account"}
          </button>
        </form>

        <button
          type="button"
          className="w-full text-center text-sm text-sky-100/70 underline-offset-2 hover:underline"
          onClick={() => {
            setMode((m) => (m === "signin" ? "signup" : "signin"));
            setMessage(null);
          }}
        >
          {mode === "signin" ? "Need an account? Sign up" : "Already have an account? Sign in"}
        </button>
      </div>

      <p className="text-center text-xs text-sky-100/45">
        You can keep using PokeLead as a guest.{" "}
        <Link href="/box" className="underline">
          Back to box
        </Link>
      </p>
    </div>
  );
}
