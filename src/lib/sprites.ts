/** Map PvPoke speciesId → PokeAPI pokemon name (for form artwork). */
export function toPokeApiName(speciesId: string): string {
  let s = speciesId.toLowerCase().trim();
  s = s.replace(/_shadow$/i, "").replace(/_xs$/i, "");

  const pairs: [RegExp, string][] = [
    [/_alolan$/, "-alola"],
    [/_galarian_standard$/, "-galar"],
    [/_galarian_zen$/, "-galar-zen"],
    [/_galarian$/, "-galar"],
    [/_hisuian$/, "-hisui"],
    [/_paldean_fire$/, "-paldea-fire"],
    [/_paldean_water$/, "-paldea-water"],
    [/_paldean$/, "-paldea"],
    [/_mega_x$/, "-mega-x"],
    [/_mega_y$/, "-mega-y"],
    [/_mega$/, "-mega"],
    [/_therian$/, "-therian"],
    [/_attack$/, "-attack"],
    [/_defense$/, "-defense"],
    [/_speed$/, "-speed"],
    [/_origin$/, "-origin"],
    [/_altered$/, ""],
    [/_incarnate$/, ""],
    [/_ordinary$/, ""],
    [/_aria$/, "-aria"],
    [/_pirouette$/, "-pirouette"],
    [/_burn$/, "-burn"],
    [/_chill$/, "-chill"],
    [/_douse$/, "-douse"],
    [/_shock$/, "-shock"],
    [/_fan$/, "-fan"],
    [/_frost$/, "-frost"],
    [/_heat$/, "-heat"],
    [/_mow$/, "-mow"],
    [/_wash$/, "-wash"],
    [/_black$/, "-black"],
    [/_white$/, "-white"],
    [/_dawn_wings$/, "-dawn"],
    [/_dusk_mane$/, "-dusk"],
    [/_ultra$/, "-ultra"],
    [/_crowned_sword$/, "-crowned"],
    [/_crowned_shield$/, "-crowned"],
    [/_rapid_strike$/, "-rapid-strike"],
    [/_single_strike$/, "-single-strike"],
    [/_female$/, "-female"],
    [/_male$/, "-male"],
  ];

  for (const [re, rep] of pairs) {
    if (re.test(s)) {
      s = s.replace(re, rep);
      break;
    }
  }

  s = s
    .replace(/^mr_mime/, "mr-mime")
    .replace(/^mime_jr/, "mime-jr")
    .replace(/^ho_oh/, "ho-oh")
    .replace(/^porygon_z/, "porygon-z")
    .replace(/^jangmo_o/, "jangmo-o")
    .replace(/^hakamo_o/, "hakamo-o")
    .replace(/^kommo_o/, "kommo-o")
    .replace(/^type_null/, "type-null")
    .replace(/^tapu_/, "tapu-")
    .replace(/^nidoran_f/, "nidoran-f")
    .replace(/^nidoran_m/, "nidoran-m")
    .replace(/_/g, "-");

  return s;
}

const ART =
  "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork";

/** Dex-only artwork (default form). */
export function spriteUrl(dex: number, shiny = false): string {
  return shiny ? `${ART}/shiny/${dex}.png` : `${ART}/${dex}.png`;
}

export function spriteUrlSmall(dex: number): string {
  return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${dex}.png`;
}

/** Form-aware artwork URL via our resolver (falls back to dex). */
export function formSpriteUrl(speciesId: string, dex: number, shiny = false): string {
  const clean = speciesId.replace(/_shadow$/i, "");
  const base = clean.replace(/_xs$/i, "") || String(dex);
  const q = new URLSearchParams({ dex: String(dex) });
  if (shiny) q.set("shiny", "1");
  return `/api/sprite/${encodeURIComponent(base)}?${q.toString()}`;
}

export function artworkByPokeId(pokeApiId: number, shiny = false): string {
  return shiny ? `${ART}/shiny/${pokeApiId}.png` : `${ART}/${pokeApiId}.png`;
}
