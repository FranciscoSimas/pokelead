/** SVG type icons matching the circular PoGO-style sheet the user provided. */

const COLORS: Record<string, string> = {
  bug: "#A8C030",
  grass: "#5DAE3C",
  fairy: "#F0A0C0",
  normal: "#A0A0A0",
  dragon: "#3A5CA8",
  psychic: "#E05080",
  ghost: "#6A5A9A",
  ground: "#D09048",
  steel: "#70A0B0",
  fire: "#F07030",
  flying: "#80B0E0",
  ice: "#70D0C8",
  electric: "#F0D030",
  rock: "#C8B070",
  dark: "#5A5858",
  water: "#4A90D8",
  fighting: "#C03028",
  poison: "#A050B8",
};

function Symbol({ type }: { type: string }) {
  switch (type) {
    case "bug":
      return (
        <g fill="none" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <ellipse cx="12" cy="13" rx="4.2" ry="5" />
          <path d="M8 9.5 L5 6.5 M16 9.5 L19 6.5 M7.5 13 L4.5 13 M16.5 13 L19.5 13 M8.5 16.5 L6 19 M15.5 16.5 L18 19" />
          <path d="M10.5 9.5 L12 7 L13.5 9.5" />
        </g>
      );
    case "grass":
      return (
        <path
          fill="#fff"
          d="M12 5 C12 5 7 9 7 14 C7 17 9.2 19 12 19 C14.8 19 17 17 17 14 C17 9 12 5 12 5 Z M12 11 V18"
        />
      );
    case "fairy":
      return (
        <path
          fill="#fff"
          d="M12 4.5 L13.6 10.2 L19.5 10.2 L14.8 13.6 L16.5 19.5 L12 15.8 L7.5 19.5 L9.2 13.6 L4.5 10.2 L10.4 10.2 Z"
        />
      );
    case "normal":
      return <circle cx="12" cy="12" r="5.5" fill="none" stroke="#fff" strokeWidth="2.4" />;
    case "dragon":
      return (
        <path
          fill="#fff"
          d="M5 16 L8 8 L12 11 L14 6 L19 10 L16 14 L18 18 L12 16 L8 19 Z"
        />
      );
    case "psychic":
      return (
        <path
          fill="none"
          stroke="#fff"
          strokeWidth="2"
          strokeLinecap="round"
          d="M12 6.5 C16 6.5 18.5 9.5 18.5 12.5 C18.5 16 15.5 18 12.5 18 C9.5 18 8 16 8.5 14 C9 12.2 11 12 12.5 12.5 C14 13 14.5 14.2 13.8 15"
        />
      );
    case "ghost":
      return (
        <g fill="#fff">
          <path d="M7 10 C7 6.5 9.2 4.5 12 4.5 C14.8 4.5 17 6.5 17 10 V17.5 C17 17.5 15.5 16 14.2 16 C13 16 12.4 17.2 12 17.2 C11.6 17.2 11 16 9.8 16 C8.5 16 7 17.5 7 17.5 Z" />
          <circle cx="10" cy="11" r="1.1" fill={COLORS.ghost} />
          <circle cx="14" cy="11" r="1.1" fill={COLORS.ghost} />
        </g>
      );
    case "ground":
      return (
        <g fill="#fff">
          <path d="M4.5 15.5 L9 8.5 L13.5 15.5 Z" />
          <path d="M10.5 15.5 L15 9.5 L19.5 15.5 Z" opacity="0.9" />
        </g>
      );
    case "steel":
      return (
        <path
          fill="none"
          stroke="#fff"
          strokeWidth="2"
          strokeLinejoin="round"
          d="M12 5.5 L17.5 8.5 V15.5 L12 18.5 L6.5 15.5 V8.5 Z"
        />
      );
    case "fire":
      return (
        <path
          fill="#fff"
          d="M12 4.5 C12 4.5 8 9 8 13 C8 16.5 10 19 12 19 C14.5 19 16.5 16.8 16.5 13.5 C16.5 11 15 9.5 14 8.5 C14 8.5 15.5 12 13.5 12 C12.2 12 11.5 10.5 12 4.5 Z"
        />
      );
    case "flying":
      return (
        <path
          fill="#fff"
          d="M4.5 14 C8 10 12 8.5 19.5 7 C16 9.5 13.5 12 12 15 C10.8 13 8.5 12.5 4.5 14 Z M7 17 C10 14.5 13 14 17.5 13.5 C14.5 15.5 12 17.5 11 19.5 C10.2 17.8 8.8 17.2 7 17 Z"
        />
      );
    case "ice":
      return (
        <g stroke="#fff" strokeWidth="1.7" strokeLinecap="round" fill="none">
          <path d="M12 5 V19 M7 8.5 L17 15.5 M17 8.5 L7 15.5" />
          <path d="M12 5 L10.5 7 M12 5 L13.5 7 M12 19 L10.5 17 M12 19 L13.5 17" />
        </g>
      );
    case "electric":
      return <path fill="#fff" d="M13.5 4.5 L7.5 13 H12 L10.5 19.5 L17 10.5 H12.5 Z" />;
    case "rock":
      return (
        <path
          fill="#fff"
          d="M8 8 L14 6.5 L18.5 10 L17 16.5 L10.5 18 L5.5 13.5 Z"
        />
      );
    case "dark":
      return <path fill="#fff" d="M14.5 5.5 A7 7 0 1 0 14.5 18.5 A5.5 5.5 0 1 1 14.5 5.5 Z" />;
    case "water":
      return (
        <path
          fill="#fff"
          d="M12 4.5 C12 4.5 7 11 7 14.5 C7 17.5 9.2 19.5 12 19.5 C14.8 19.5 17 17.5 17 14.5 C17 11 12 4.5 12 4.5 Z"
        />
      );
    case "fighting":
      return (
        <g fill="#fff">
          <rect x="7" y="8" width="2.2" height="9" rx="1" />
          <rect x="10.2" y="6.5" width="2.2" height="10.5" rx="1" />
          <rect x="13.4" y="8" width="2.2" height="9" rx="1" />
          <rect x="16.2" y="9.5" width="2" height="6" rx="1" />
        </g>
      );
    case "poison":
      return (
        <g fill="#fff">
          <circle cx="12" cy="11" r="5.2" />
          <circle cx="10" cy="10" r="1" fill={COLORS.poison} />
          <circle cx="14" cy="10" r="1" fill={COLORS.poison} />
          <path d="M10 13.5 Q12 15.2 14 13.5" fill="none" stroke={COLORS.poison} strokeWidth="1.2" />
          <circle cx="8" cy="6.5" r="1.2" />
          <circle cx="16" cy="6.5" r="1.2" />
        </g>
      );
    default:
      return <circle cx="12" cy="12" r="4" fill="#fff" />;
  }
}

export function TypeIcon({
  type,
  size = 20,
  className = "",
}: {
  type?: string;
  size?: number;
  className?: string;
}) {
  const key = (type || "normal").toLowerCase();
  const bg = COLORS[key] ?? COLORS.normal;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      className={`shrink-0 ${className}`}
      aria-hidden
    >
      <circle cx="12" cy="12" r="12" fill={bg} />
      <Symbol type={COLORS[key] ? key : "normal"} />
    </svg>
  );
}

export function typeLabel(type?: string) {
  if (!type) return "";
  return type.charAt(0).toUpperCase() + type.slice(1);
}

export function TypeDots({
  types,
  size = 16,
}: {
  types?: string[];
  size?: number;
}) {
  const clean = (types ?? []).map((t) => t.toLowerCase()).filter((t) => t && t !== "none");
  if (!clean.length) return null;
  return (
    <span className="inline-flex items-center gap-0.5 align-middle">
      {clean.map((t) => (
        <span key={t} title={typeLabel(t)} className="inline-flex">
          <TypeIcon type={t} size={size} />
        </span>
      ))}
    </span>
  );
}
