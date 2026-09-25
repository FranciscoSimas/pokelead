"use client";

import { TypeIcon, typeLabel } from "./TypeIcon";

export function MoveChip({
  name,
  type,
  kind = "charged",
  elite = false,
}: {
  name: string;
  type?: string;
  kind?: "fast" | "charged";
  elite?: boolean;
}) {
  const display = name.replace(/_/g, " ");

  return (
    <span
      className={`inline-flex max-w-full items-center gap-1.5 rounded-full border py-1 pl-1 pr-2.5 ${
        kind === "fast" ? "border-line-strong bg-surface-3" : "border-line bg-surface-2"
      }`}
      title={
        elite
          ? `${display} · Elite / legacy (not a regular TM)`
          : type
            ? `${display} · ${typeLabel(type)}`
            : display
      }
    >
      <TypeIcon type={type} size={18} />
      <span className="truncate text-[13px] font-semibold text-fg">
        {display}
        {elite ? <span className="ml-0.5 text-warn">*</span> : null}
      </span>
    </span>
  );
}

export function MoveRow({
  moves,
  lookup,
  eliteMoves = [],
}: {
  moves: string[];
  lookup: (id: string) => { name: string; type: string } | undefined;
  eliteMoves?: string[];
}) {
  const elite = new Set(eliteMoves.map((m) => m.toUpperCase()));
  const list = moves.filter(Boolean);
  if (!list.length) return <span className="text-xs text-faint">No moves set</span>;
  return (
    <div className="flex flex-wrap gap-1.5">
      {list.map((id, i) => {
        const m = lookup(id);
        return (
          <MoveChip
            key={`${id}-${i}`}
            name={m?.name ?? id}
            type={m?.type}
            kind={i === 0 ? "fast" : "charged"}
            elite={elite.has(id.toUpperCase())}
          />
        );
      })}
    </div>
  );
}

export function MoveLine({
  fast,
  charged = [],
  lookup,
}: {
  fast?: string;
  charged?: string[];
  lookup: (id: string) => { name: string; type: string } | undefined;
}) {
  const chargedIds = charged.filter(Boolean);
  if (!fast && !chargedIds.length) return null;

  function bit(id: string) {
    const m = lookup(id);
    return (
      <span className="inline-flex items-center gap-0.5">
        <span className="max-w-[4.75rem] truncate sm:max-w-[7rem]">
          {m?.name ?? id.replace(/_/g, " ")}
        </span>
        <TypeIcon type={m?.type} size={13} />
      </span>
    );
  }

  return (
    <p className="mt-1 flex flex-wrap items-center justify-center gap-x-1 gap-y-0.5 text-[10px] font-medium text-muted sm:text-[11px]">
      {fast ? bit(fast) : null}
      {fast && chargedIds.length ? <span className="text-faint">|</span> : null}
      {chargedIds.map((id, i) => (
        <span key={`${id}-${i}`} className="inline-flex items-center gap-1">
          {i > 0 ? <span className="text-faint">/</span> : null}
          {bit(id)}
        </span>
      ))}
    </p>
  );
}
