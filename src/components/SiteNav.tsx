"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import type { ComponentType, ReactNode } from "react";

type IconProps = { className?: string };

function Stroke({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      {children}
    </svg>
  );
}

function HomeIcon({ className }: IconProps) {
  return (
    <Stroke className={className}>
      <path d="M4 10.6 12 4l8 6.6" />
      <path d="M6.2 9.6V19a1 1 0 0 0 1 1h3.3v-4.4h3V20h3.3a1 1 0 0 0 1-1V9.6" />
    </Stroke>
  );
}

function BoxIcon({ className }: IconProps) {
  return (
    <Stroke className={className}>
      <path d="M3.5 8.5 12 4.2l8.5 4.3v7L12 19.8 3.5 15.5Z" />
      <path d="M3.5 8.5 12 12.8l8.5-4.3M12 12.8v7" />
    </Stroke>
  );
}

function TeamIcon({ className }: IconProps) {
  return (
    <Stroke className={className}>
      <circle cx="7" cy="9" r="2.6" />
      <circle cx="17" cy="9" r="2.6" />
      <path d="M3 19c0-2.4 1.8-4 4-4s4 1.6 4 4M13 19c0-2.4 1.8-4 4-4s4 1.6 4 4" />
    </Stroke>
  );
}

function ChartIcon({ className }: IconProps) {
  return (
    <Stroke className={className}>
      <path d="M4 19.5V5" />
      <path d="M4 19.5h16" />
      <path d="M8 16.5v-4M12.5 16.5V8M17 16.5v-6" />
    </Stroke>
  );
}

function CompareIcon({ className }: IconProps) {
  return (
    <Stroke className={className}>
      <path d="M7 7h5v10H7z" />
      <path d="M12 7h5v10h-5z" />
      <path d="M12 5v14" />
    </Stroke>
  );
}

function PixelIcon({ className }: IconProps) {
  return (
    <Stroke className={className}>
      <path d="M5 5h6v6H5zM13 5h6v6h-6zM5 13h6v6H5zM13 13h6v6h-6z" />
    </Stroke>
  );
}

const NAV: {
  href: string;
  label: string;
  short: string;
  Icon: ComponentType<IconProps>;
  temp?: boolean;
}[] = [
  { href: "/", label: "Home", short: "Home", Icon: HomeIcon },
  { href: "/box", label: "My Box", short: "Box", Icon: BoxIcon },
  { href: "/teams", label: "Teams", short: "Teams", Icon: TeamIcon },
  { href: "/compare", label: "Compare", short: "Compare", Icon: CompareIcon },
  { href: "/analyze", label: "Analyze", short: "Analyze", Icon: ChartIcon },
  { href: "/retro", label: "Pixel ★", short: "Pixel", Icon: PixelIcon, temp: true },
];

const MOBILE_NAV = NAV.filter((item) => item.href !== "/" && !item.temp);

function useIsActive() {
  const pathname = usePathname() ?? "/";
  return (href: string) =>
    href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}

export function DesktopNav() {
  const isActive = useIsActive();
  return (
    <nav className="hidden items-center gap-0.5 sm:flex">
      {NAV.map((item) => {
        const active = isActive(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={`relative rounded-full px-3.5 py-1.5 text-sm font-semibold transition ${
              item.temp
                ? active
                  ? "bg-amber-400/25 text-amber-100"
                  : "text-amber-200/80 hover:bg-amber-400/15 hover:text-amber-100"
                : active
                  ? "text-white"
                  : "text-muted hover:text-white"
            }`}
          >
            {active && !item.temp ? (
              <motion.span
                layoutId="nav-pill"
                className="absolute inset-0 rounded-full bg-surface-3"
                transition={{ type: "spring", stiffness: 380, damping: 32 }}
              />
            ) : null}
            <span className="relative">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

export function MobileNav() {
  const isActive = useIsActive();
  return (
    <nav className="pb-safe fixed inset-x-0 bottom-0 z-50 border-t border-line bg-ink/92 backdrop-blur-md sm:hidden">
      <div className="mx-auto grid max-w-lg grid-cols-4 gap-0.5 px-1.5 pt-1">
        {MOBILE_NAV.map((item) => {
          const active = isActive(item.href);
          const { Icon } = item;
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={`relative flex min-h-11 flex-col items-center justify-center gap-0.5 rounded-xl px-1 py-1.5 active:scale-95 ${
                active ? "bg-surface-2" : ""
              }`}
            >
              <Icon className={`h-5 w-5 ${active ? "text-accent" : "text-faint"}`} />
              <span
                className={`text-[11px] font-semibold leading-tight ${active ? "text-white" : "text-faint"}`}
              >
                {item.short}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
