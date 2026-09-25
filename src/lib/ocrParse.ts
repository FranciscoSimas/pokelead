/**
 * Parse Pokémon GO screenshot OCR text + match to GameMaster.
 * Supports English + Portuguese UI (CP/PC, HP/PS, Attack/Ataque).
 * IVs on appraisal screens are bars - read separately via pixels.
 */

import type { GameMaster, GmPokemon } from "./pvpoke";

export type OcrParseResult = {
  rawText: string;
  speciesQuery: string | null;
  shadow: boolean;
  lucky: boolean;
  formHints: string[];
  cp: number | null;
  atkIv: number | null;
  defIv: number | null;
  hpIv: number | null;
  notes: string[];
};

function clampIv(n: number): number | null {
  if (!Number.isFinite(n) || n < 0 || n > 15) return null;
  return Math.round(n);
}

function cleanOcrNoise(text: string): string {
  return text
    .replace(/\u0000/g, " ")
    .replace(/[|]/g, "I")
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeSpeciesGuess(s: string): string {
  return s
    .replace(/\b5hadow\b/gi, "Shadow")
    .replace(/\bshad0w\b/gi, "Shadow")
    .replace(/\bshdow\b/gi, "Shadow")
    .replace(/\bmr\.?\s*mime\b/gi, "Mr Mime")
    .replace(/\bho[\-\s]?oh\b/gi, "Ho-Oh")
    .replace(/\bporygon[\-\s]?z\b/gi, "Porygon-Z")
    .replace(/[^a-zA-Z0-9'\-\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function detectShadow(text: string): boolean {
  return (
    /\bshadow\b/i.test(text) ||
    /\bsombra\b/i.test(text) ||
    /\b5hadow\b/i.test(text) ||
    /\bshad0w\b/i.test(text) ||
    /\bfrustration\b/i.test(text) ||
    /\bfrustra[cç][aã]o\b/i.test(text)
  );
}

function detectLucky(text: string): boolean {
  return (
    /\blucky\b/i.test(text) ||
    /\bsortudo\b/i.test(text) ||
    /\bpok[eé]mon\s+sortudo\b/i.test(text)
  );
}

function extractCp(text: string): number | null {
  // EN: CP 1174 · PT: PC 1174 · OCR often mangles PC → Pe / PO / P0
  const patterns = [
    /\b(?:CP|PC)\s*[:=\-]?\s*(\d{2,4})\b/i,
    /\b(\d{2,4})\s*(?:CP|PC)\b/i,
    /\bP[\s.\-]?[CEOeo0]\s*[:=\-]?\s*(\d{2,4})\b/,
    /\b(?:PC|CP|Pe|PO|P0)(\d{3,4})\b/i,
  ];
  for (const re of patterns) {
    const m = text.match(re);
    if (!m) continue;
    const cp = Number(m[1]);
    if (cp >= 10 && cp <= 5000) return cp;
  }
  return null;
}

function extractIvsFromText(text: string): {
  atk: number | null;
  def: number | null;
  hp: number | null;
} {
  // EN + PT labeled triples
  const labeled = text.match(
    /\b(?:attack|atk|ataque)\b[^\d]{0,12}(\d{1,2})\D{0,48}\b(?:defense|defence|def|defesa)\b[^\d]{0,12}(\d{1,2})\D{0,48}\b(?:hp|sta|stamina|ps)\b[^\d]{0,12}(\d{1,2})\b/i,
  );
  if (labeled) {
    const atk = clampIv(Number(labeled[1]));
    const def = clampIv(Number(labeled[2]));
    const hp = clampIv(Number(labeled[3]));
    if (atk != null && def != null && hp != null) return { atk, def, hp };
  }

  const slash = text.match(/\b(\d{1,2})\s*[\/|]\s*(\d{1,2})\s*[\/|]\s*(\d{1,2})\b/);
  if (slash) {
    const a = Number(slash[1]);
    const d = Number(slash[2]);
    const h = Number(slash[3]);
    if (a <= 15 && d <= 15 && h <= 15) {
      return { atk: clampIv(a), def: clampIv(d), hp: clampIv(h) };
    }
  }

  const ivHeader = text.match(
    /\bivs?\b\s*[:=\-]?\s*(\d{1,2})\s*[,\/\s|]+\s*(\d{1,2})\s*[,\/\s|]+\s*(\d{1,2})\b/i,
  );
  if (ivHeader) {
    const a = Number(ivHeader[1]);
    const d = Number(ivHeader[2]);
    const h = Number(ivHeader[3]);
    if (a <= 15 && d <= 15 && h <= 15) {
      return { atk: clampIv(a), def: clampIv(d), hp: clampIv(h) };
    }
  }

  return { atk: null, def: null, hp: null };
}

export function extractFormHints(text: string): string[] {
  const formHints: string[] = [];
  if (/\balolan\b/i.test(text) || /\balola\b/i.test(text)) formHints.push("alolan");
  if (/\bgalarian\b/i.test(text) || /\bgalar\b/i.test(text)) formHints.push("galarian");
  if (/\bhisuian\b/i.test(text) || /\bhisui\b/i.test(text)) formHints.push("hisuian");
  if (/\bpaldean\b/i.test(text) || /\bpaldea\b/i.test(text)) formHints.push("paldean");
  if (/\bmega\b/i.test(text)) formHints.push("mega");
  if (/\borigin\b/i.test(text)) formHints.push("origin");
  if (/\baltered\b/i.test(text)) formHints.push("altered");
  if (/\btherian\b/i.test(text)) formHints.push("therian");
  return formHints;
}

const UI_SKIP =
  /^(cp|pc|hp|ps|power\s*up|transfer|appraise|evolve|favorite|type|weight|height|candy|stardust|catch|camera|ar\b|nearby|weather|boosted|strong|best|gym|raid|battle|trade|size|xl|xs|normal|fire|water|electric|grass|ice|fighting|poison|ground|flying|psychic|bug|rock|ghost|dragon|dark|steel|fairy|fogo|agua|água|planta|el[eé]trico| Lutador|venenoso|terra|voador|ps[ií]quico|inseto|pedra|fantasma|drag[aã]o|sombrio|a[cç]o|fada|ataque|defesa|peso|altura|fast\s*attack|charged|legacy|elite|buddy|lucky|sortudo|purified|shadow|sombra|frustration|frustra)/i;

function candidateNameLines(raw: string): string[] {
  const lines = raw
    .split(/\r?\n/)
    .map((l) => normalizeSpeciesGuess(l.replace(/[^\w\s'\-.]/g, " ")))
    .map((l) => l.replace(/\bshadow\b/gi, "").replace(/\bsombra\b/gi, "").trim())
    .filter((l) => l.length >= 3 && l.length <= 32);

  const out: string[] = [];
  for (const line of lines) {
    if (UI_SKIP.test(line)) continue;
    if (/^\d/.test(line)) continue;
    if (/^(cp|pc)\s*\d+/i.test(line)) continue;
    if (!/[a-zA-Z]{3,}/.test(line)) continue;
    if (/\d+\s*(kg|m|km|%)/i.test(line)) continue;
    out.push(line);
  }

  // PT/EN catch line: "O Pokémon Croconaw foi peego" / "was caught"
  const catchName = raw.match(
    /\bPok[eé]mon\s+([A-Za-z][A-Za-z'\-]{2,})\b/i,
  );
  if (catchName?.[1]) out.unshift(catchName[1]);

  return out;
}

/**
 * Scan OCR blob for exact Pokédex name substrings (most reliable for clean names).
 */
export function findSpeciesNamesInText(gm: GameMaster, raw: string): string[] {
  const lower = raw.toLowerCase();
  const hits: { name: string; len: number }[] = [];
  const seen = new Set<string>();
  for (const p of gm.pokemon) {
    const base = p.speciesName.replace(/\s*\([^)]*\)\s*/g, "").trim();
    if (base.length < 4) continue;
    const key = base.toLowerCase();
    if (seen.has(key)) continue;
    if (lower.includes(key)) {
      seen.add(key);
      hits.push({ name: base, len: base.length });
    }
  }
  return hits.sort((a, b) => b.len - a.len).map((h) => h.name);
}

export function parsePokemonScreenshotText(raw: string): OcrParseResult {
  const text = cleanOcrNoise(raw);
  const notes: string[] = [];
  const shadow = detectShadow(text);
  const lucky = detectLucky(text);
  const formHints = extractFormHints(text);
  const cp = extractCp(text);
  const ivs = extractIvsFromText(text);

  if (cp == null) notes.push("CP/PC not found - set it in review");
  if (shadow) notes.push("Shadow detected from text");
  if (lucky) notes.push("Lucky detected");

  const lines = candidateNameLines(raw);
  const speciesQuery = lines[0] ?? null;
  if (!speciesQuery) notes.push("Species unclear - pick manually in review");

  if (ivs.atk == null) {
    notes.push("IVs from text not found - reading appraisal bars if present");
  }

  return {
    rawText: text,
    speciesQuery,
    shadow,
    lucky,
    formHints,
    cp,
    atkIv: ivs.atk,
    defIv: ivs.def,
    hpIv: ivs.hp,
    notes,
  };
}

function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  const row = new Array<number>(n + 1);
  for (let j = 0; j <= n; j++) row[j] = j;
  for (let i = 1; i <= m; i++) {
    let prev = row[0];
    row[0] = i;
    for (let j = 1; j <= n; j++) {
      const tmp = row[j];
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      row[j] = Math.min(row[j] + 1, row[j - 1] + 1, prev + cost);
      prev = tmp;
    }
  }
  return row[n];
}

function normalizeName(s: string): string {
  return s
    .toLowerCase()
    .replace(/\s*\([^)]*\)\s*/g, " ")
    .replace(/[^a-z0-9]/g, "")
    .trim();
}

function scoreSpeciesMatch(
  p: GmPokemon,
  query: string,
  formHints: string[],
  wantShadow: boolean,
): number {
  const qRaw = query.toLowerCase().trim();
  const q = normalizeName(query);
  if (q.length < 2) return 0;

  const name = p.speciesName.toLowerCase();
  const base = p.speciesName.replace(/\s*\([^)]*\)\s*/g, "").trim().toLowerCase();
  const id = p.speciesId.toLowerCase();
  const baseNorm = normalizeName(base);
  const isShadow =
    id.includes("_shadow") || (p.tags ?? []).some((t) => t.toLowerCase() === "shadow");

  let score = 0;
  if (baseNorm === q) score = 130;
  else if (baseNorm.startsWith(q) || q.startsWith(baseNorm)) score = 95;
  else if (baseNorm.includes(q) || q.includes(baseNorm)) score = 60;
  else {
    const dist = levenshtein(q, baseNorm);
    const maxLen = Math.max(q.length, baseNorm.length);
    const sim = 1 - dist / maxLen;
    if (sim >= 0.72) score = Math.round(45 + sim * 50);
    else if (dist <= 2 && maxLen >= 5) score = 48;
    else return 0;
  }

  score -= Math.abs(baseNorm.length - q.length) * 0.5;

  if (wantShadow === isShadow) score += 30;
  else if (wantShadow && !isShadow) score -= 8;
  else if (!wantShadow && isShadow) score -= 40;

  for (const hint of formHints) {
    if (
      id.includes(hint) ||
      name.includes(hint) ||
      (p.tags ?? []).some((t) => t.toLowerCase().includes(hint))
    ) {
      score += 22;
    }
  }

  if (qRaw.includes("shadow") && isShadow) score += 15;
  if ((p as { released?: boolean }).released === false) score -= 40;

  return score;
}

export type MatchedSpecies = {
  gm: GmPokemon;
  score: number;
};

export function matchSpeciesFromOcr(
  gm: GameMaster,
  query: string | null,
  formHints: string[],
  wantShadow: boolean,
  rawText?: string,
  limit = 10,
): MatchedSpecies[] {
  const queries = new Set<string>();
  if (query?.trim()) queries.add(normalizeSpeciesGuess(query));
  if (rawText) {
    for (const line of candidateNameLines(rawText)) queries.add(line);
    for (const name of findSpeciesNamesInText(gm, rawText)) queries.add(name);
  }
  if (queries.size === 0) return [];

  const bestById = new Map<string, MatchedSpecies>();

  for (const q of queries) {
    // Exact substring hits get a synthetic high-weight query
    const exactBoost = rawText && rawText.toLowerCase().includes(q.toLowerCase()) ? 20 : 0;
    for (const p of gm.pokemon) {
      let score = scoreSpeciesMatch(p, q, formHints, wantShadow);
      if (score <= 0) continue;
      score += exactBoost;
      const prev = bestById.get(p.speciesId);
      if (!prev || score > prev.score) bestById.set(p.speciesId, { gm: p, score });
    }
  }

  return [...bestById.values()]
    .sort((a, b) => b.score - a.score || a.gm.dex - b.gm.dex)
    .slice(0, limit);
}
