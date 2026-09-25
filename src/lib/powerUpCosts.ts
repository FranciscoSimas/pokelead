/**
 * Pokémon GO power-up candy costs (half-levels).
 * Source: pogoapi.net /api/v1/pokemon_powerup_requirements.json (through L49.5).
 * L50 / L50.5 (Best Buddy → L51): same XL band as L48–49.5 (20 XL, 0 regular).
 * Index i = level 1 + i*0.5 (i=0 → L1, … i=98 → L50, i=99 → L50.5).
 * Cost at index i is candy to go from that level to the next half-level.
 */

const CANDY: number[] = [
  // 1 – 10.5
  1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1,
  // 11 – 20.5
  2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2,
  // 21 – 25.5
  3, 3, 3, 3, 3, 3, 3, 3, 3, 3,
  // 26 – 30.5
  4, 4, 4, 4, 4, 4, 4, 4, 4, 4,
  // 31 – 32.5
  6, 6, 6, 6,
  // 33 – 34.5
  8, 8, 8, 8,
  // 35 – 36.5
  10, 10, 10, 10,
  // 37 – 38.5
  12, 12, 12, 12,
  // 39 – 39.5
  15, 15,
  // 40 – 50.5: regular candy 0 (XL only), including Best Buddy L50→L51
  0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
];

const XL: number[] = [
  // 1 – 39.5
  ...Array(78).fill(0),
  // 40 – 41.5
  10, 10, 10, 10,
  // 42 – 43.5
  12, 12, 12, 12,
  // 44 – 45.5
  15, 15, 15, 15,
  // 46 – 47.5
  17, 17, 17, 17,
  // 48 – 49.5
  20, 20, 20, 20,
  // 50 – 50.5 (Best Buddy)
  20, 20,
];

function levelIndex(level: number): number {
  return Math.round((level - 1) * 2);
}

export type PowerUpCandyCost = {
  candy: number;
  xlCandy: number;
};

/** Candy + XL to power from `fromLevel` up to `toLevel` (exclusive of toLevel end). */
export function powerUpCandyBetween(
  fromLevel: number,
  toLevel: number,
): PowerUpCandyCost {
  const from = Math.round(fromLevel * 2) / 2;
  const to = Math.round(toLevel * 2) / 2;
  if (to <= from + 1e-9) return { candy: 0, xlCandy: 0 };

  let candy = 0;
  let xlCandy = 0;
  for (let lv = from; lv < to - 1e-9; lv += 0.5) {
    const i = levelIndex(lv);
    if (i < 0 || i >= CANDY.length) continue;
    candy += CANDY[i] ?? 0;
    xlCandy += XL[i] ?? 0;
  }
  return { candy, xlCandy };
}
