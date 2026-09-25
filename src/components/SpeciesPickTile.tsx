"use client";

import { useState, type ReactNode } from "react";
import { PokemonSprite } from "./PokemonSprite";

type Props = {
  speciesId: string;
  dex: number;
  name: ReactNode;
  subtitle?: ReactNode;
  /** Shadow entry — violet tile background only; sprite colors stay normal. */
  shadow?: boolean;
  selected?: boolean;
  disabled?: boolean;
  onPick: () => void;
  className?: string;
  spriteClassName?: string;
  /** Extra line under subtitle (ranks, CP, …). */
  footer?: ReactNode;
};

/**
 * Species cell for choose-Pokémon modals: optional shiny ★ toggle (top-right).
 * Shiny preview is visual-only and does not change the pick payload.
 */
export function SpeciesPickTile({
  speciesId,
  dex,
  name,
  subtitle,
  shadow = false,
  selected = false,
  disabled = false,
  onPick,
  className = "",
  spriteClassName = "mt-3 h-14 w-14 object-contain",
  footer,
}: Props) {
  const [shiny, setShiny] = useState(false);

  return (
    <div
      className={`relative flex min-h-[7.5rem] flex-col rounded-field border text-center transition sm:min-h-[8rem] ${
        disabled ? "opacity-40" : ""
      } ${
        selected
          ? "border-accent/50 bg-accent/15"
          : shadow
            ? "border-violet-400/35 bg-violet-500/12 hover:border-violet-300/55"
            : "border-line bg-surface-3 hover:border-accent/50"
      } ${className}`}
    >
      <button
        type="button"
        aria-label={shiny ? "Hide shiny preview" : "Show shiny preview"}
        aria-pressed={shiny}
        disabled={disabled}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setShiny((s) => !s);
        }}
        className={`absolute right-1 top-1 z-10 grid h-6 w-6 place-items-center rounded border text-[11px] font-bold leading-none transition ${
          shiny
            ? "border-accent/50 bg-accent/25 text-accent"
            : "border-line-strong bg-ink/55 text-faint hover:border-accent/40 hover:text-fg"
        }`}
      >
        ★
      </button>

      <button
        type="button"
        disabled={disabled}
        onClick={onPick}
        className="flex min-h-0 flex-1 flex-col items-center px-1.5 pb-1.5 pt-1 active:scale-[0.98] disabled:pointer-events-none"
      >
        <span className="absolute left-1.5 top-1.5 text-[10px] font-semibold text-faint">
          #{dex}
        </span>
        <PokemonSprite
          speciesId={speciesId}
          dex={dex}
          alt=""
          width={72}
          height={72}
          className={spriteClassName}
          shiny={shiny}
        />
        <span className="mt-0.5 line-clamp-2 w-full text-[11px] font-bold leading-tight text-white sm:text-xs">
          {name}
        </span>
        {subtitle ? (
          <span
            className={`line-clamp-1 w-full text-[10px] ${
              shadow ? "text-violet-200/90" : "text-faint"
            }`}
          >
            {subtitle}
          </span>
        ) : null}
        {footer}
      </button>
    </div>
  );
}
