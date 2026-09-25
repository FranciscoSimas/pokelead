import type { Metadata, Viewport } from "next";
import { Lilita_One, Outfit } from "next/font/google";
import Link from "next/link";
import "./globals.css";
import { DesktopNav, MobileNav } from "@/components/SiteNav";
import { AuthProvider } from "@/components/AuthProvider";
import { FavoritesProvider } from "@/components/FavoritesProvider";
import { UserMenu } from "@/components/UserMenu";

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
});

const lilita = Lilita_One({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-lilita",
});

export const metadata: Metadata = {
  title: "PokeLead. Your box. Best teams.",
  description:
    "Build your Pokémon GO box and get PvPoke ranks and team suggestions for Great, Ultra, and Master League.",
};

export const viewport: Viewport = {
  themeColor: "#080e16",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${outfit.variable} ${lilita.variable} font-sans antialiased`}>
        <AuthProvider>
          <FavoritesProvider>
          <div className="relative flex min-h-screen flex-col overflow-x-hidden pb-24 sm:pb-0">
            <header className="sticky top-0 z-40 border-b border-line bg-ink/85 backdrop-blur-md">
              <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
                <Link href="/" className="group flex items-center gap-2.5">
                  <span className="grid h-8 w-8 place-items-center rounded-full bg-accent ring-2 ring-white/85 transition group-hover:ring-white">
                    <span className="h-2.5 w-2.5 rounded-full bg-[var(--on-accent,#04121d)]" />
                  </span>
                  <span className="font-[family-name:var(--font-lilita)] text-xl leading-none tracking-wide text-white">
                    PokeLead
                  </span>
                </Link>
                <div className="flex items-center gap-2 sm:gap-3">
                  <UserMenu />
                  <DesktopNav />
                </div>
              </div>
            </header>

            <main className="relative mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:py-8">
              {children}
            </main>

            <footer className="mx-auto max-w-6xl px-4 pb-8 pt-10 text-center text-xs text-faint">
              Rankings powered by{" "}
              <a
                className="underline underline-offset-2 hover:text-muted"
                href="https://pvpoke.com"
                target="_blank"
                rel="noreferrer"
              >
                PvPoke
              </a>
              . Not affiliated with Niantic or The Pokémon Company.
            </footer>

            <MobileNav />
          </div>
          </FavoritesProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
