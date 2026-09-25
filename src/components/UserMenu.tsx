"use client";

import Link from "next/link";
import { useAuth } from "@/components/AuthProvider";
import { publicAvatarUrl } from "@/lib/boxSync";

export function UserMenu() {
  const { configured, loading, user, profile } = useAuth();
  if (!configured) return null;

  const avatar = publicAvatarUrl(profile?.avatar_path);
  const label = profile?.display_name || user?.email || "Account";

  if (loading && !user) {
    return (
      <span className="h-9 w-9 shrink-0 rounded-full border border-white/10 bg-white/5 sm:w-24" />
    );
  }

  if (!user) {
    return (
      <Link
        href="/login"
        className="rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-bold text-white transition hover:bg-white/20 sm:text-sm"
      >
        Sign in
      </Link>
    );
  }

  return (
    <Link
      href="/account"
      className="flex max-w-[44vw] items-center gap-2 rounded-full border border-white/10 bg-white/5 py-1 pl-1 pr-2.5 text-white transition hover:bg-white/10 sm:max-w-[12rem]"
      title={label}
    >
      {avatar ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={avatar} alt="" className="h-7 w-7 rounded-full object-cover" />
      ) : (
        <span className="grid h-7 w-7 place-items-center rounded-full bg-sky-500/30 text-[11px] font-bold">
          {label.slice(0, 1).toUpperCase()}
        </span>
      )}
      <span className="hidden truncate text-xs font-semibold sm:inline">{label}</span>
    </Link>
  );
}
