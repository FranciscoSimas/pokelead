import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: { ignoreDuringBuilds: true },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "raw.githubusercontent.com" },
      { protocol: "https", hostname: "img.pokemondb.net" },
      { protocol: "https", hostname: "tyjevpsqoklvrfaydepm.supabase.co" },
    ],
  },
};

export default nextConfig;
