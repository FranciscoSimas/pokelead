"use client";

import { useState } from "react";
import Image from "next/image";
import { formSpriteUrl, spriteUrl } from "@/lib/sprites";

type Props = {
  speciesId: string;
  dex: number;
  alt: string;
  width: number;
  height: number;
  className?: string;
  /** @deprecated Visual tint removed — use tile background for Shadow. Kept for call-site compat. */
  shadow?: boolean;
  shiny?: boolean;
};

/** Forms need the resolver; default species can hit GitHub artwork directly. */
function needsFormResolver(speciesId: string): boolean {
  const clean = speciesId.replace(/_shadow$/i, "").replace(/_xs$/i, "");
  return /_/.test(clean);
}

export function PokemonSprite({
  speciesId,
  dex,
  alt,
  width,
  height,
  className = "",
  shadow: _shadow = false,
  shiny = false,
}: Props) {
  void _shadow;
  const [broken, setBroken] = useState(false);
  const src = broken
    ? spriteUrl(dex, shiny)
    : needsFormResolver(speciesId)
      ? formSpriteUrl(speciesId, dex, shiny)
      : spriteUrl(dex, shiny);

  return (
    <Image
      key={`${src}-${shiny ? "s" : "n"}`}
      src={src}
      alt={alt}
      width={width}
      height={height}
      className={className}
      unoptimized
      loading="lazy"
      onError={() => setBroken(true)}
    />
  );
}
