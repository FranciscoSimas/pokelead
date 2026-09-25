import type { NextRequest } from "next/server";

/** Upstream mirrors. pvpoke.com often 403s from Vercel/cloud IPs. */
const SOURCES = [
  (path: string) => `https://cdn.jsdelivr.net/gh/pvpoke/pvpoke@master/src/data/${path}`,
  (path: string) => `https://raw.githubusercontent.com/pvpoke/pvpoke/master/src/data/${path}`,
  (path: string) => `https://pvpoke.com/data/${path}`,
];

function resolveDataPath(joined: string): string | null {
  if (joined === "gamemaster.json") return "gamemaster.json";
  // rankings/{cup}/{category}/rankings-{cp}.json
  if (
    /^rankings\/[a-z0-9_-]+\/[a-z]+\/rankings-(500|1500|2500|10000)\.json$/i.test(joined)
  ) {
    return joined;
  }
  return null;
}

export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ path: string[] }> },
) {
  const { path } = await ctx.params;
  const joined = path.join("/");
  const dataPath = resolveDataPath(joined);
  if (!dataPath) {
    return Response.json({ error: "Not allowed" }, { status: 400 });
  }

  const errors: string[] = [];
  for (const makeUrl of SOURCES) {
    const url = makeUrl(dataPath);
    try {
      const res = await fetch(url, {
        headers: {
          Accept: "application/json",
          "User-Agent": "PokeLead/0.1 (https://pokelead.vercel.app)",
        },
        next: { revalidate: dataPath === "gamemaster.json" ? 86400 : 3600 },
      });
      if (!res.ok) {
        errors.push(`${url} → ${res.status}`);
        continue;
      }
      const data = await res.json();
      const longLived = dataPath === "gamemaster.json";
      return Response.json(data, {
        headers: {
          "Cache-Control": longLived
            ? "public, max-age=86400, s-maxage=86400, stale-while-revalidate=604800"
            : "public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400",
          "X-PokeLead-Source": url,
        },
      });
    } catch (e) {
      errors.push(`${url} → ${e instanceof Error ? e.message : "fail"}`);
    }
  }

  return Response.json(
    { error: "All upstream sources failed", details: errors },
    { status: 502 },
  );
}
