import type { NextRequest } from "next/server";
import { artworkByPokeId, spriteUrl, toPokeApiName } from "@/lib/sprites";

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  const dex = Number(req.nextUrl.searchParams.get("dex") || "0");
  const shiny = req.nextUrl.searchParams.get("shiny") === "1";
  const name = toPokeApiName(decodeURIComponent(id));

  let pokeId: number | null = null;
  try {
    const res = await fetch(`https://pokeapi.co/api/v2/pokemon/${name}`, {
      next: { revalidate: 86400 * 30 },
      headers: { Accept: "application/json" },
    });
    if (res.ok) {
      const data = (await res.json()) as { id: number };
      pokeId = data.id;
    }
  } catch {
    /* fall through */
  }

  const target =
    pokeId != null && pokeId > 0
      ? artworkByPokeId(pokeId, shiny)
      : dex > 0
        ? spriteUrl(dex, shiny)
        : artworkByPokeId(1, shiny);

  try {
    const img = await fetch(target, { next: { revalidate: 86400 * 30 } });
    if (!img.ok) throw new Error(String(img.status));
    const buf = await img.arrayBuffer();
    return new Response(buf, {
      headers: {
        "Content-Type": img.headers.get("Content-Type") || "image/png",
        "Cache-Control":
          "public, max-age=604800, s-maxage=2592000, stale-while-revalidate=86400",
        "X-PokeLead-Sprite": target,
      },
    });
  } catch {
    if (dex > 0) {
      const fallback = await fetch(spriteUrl(dex, shiny), { next: { revalidate: 86400 } });
      return new Response(await fallback.arrayBuffer(), {
        headers: {
          "Content-Type": "image/png",
          "Cache-Control": "public, max-age=86400, s-maxage=86400",
        },
      });
    }
    return new Response("Not found", { status: 404 });
  }
}
