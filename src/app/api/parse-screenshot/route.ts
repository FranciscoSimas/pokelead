import { NextResponse } from "next/server";
import { ivFromFillRatio } from "@/lib/ivFromScreenshot";

export const runtime = "nodejs";
export const maxDuration = 60;

export type ScreenshotAiResult = {
  speciesName: string | null;
  cp: number | null;
  hp: number | null;
  atkIv: number | null;
  defIv: number | null;
  hpIv: number | null;
  shadow: boolean;
  lucky: boolean;
  stars: number | null;
  notes: string;
  /** Model that produced this result - client can reuse for next image. */
  model?: string;
};

/** OpenAPI-style schema (Gemini rejects many nullable+required combos). */
const SCHEMA = {
  type: "object",
  properties: {
    speciesName: { type: "string" },
    cp: { type: "integer" },
    hp: { type: "integer" },
    atkFillRatio: { type: "number" },
    defFillRatio: { type: "number" },
    hpFillRatio: { type: "number" },
    atkFullRed: { type: "boolean" },
    defFullRed: { type: "boolean" },
    hpFullRed: { type: "boolean" },
    atkIv: { type: "integer" },
    defIv: { type: "integer" },
    hpIv: { type: "integer" },
    shadow: { type: "boolean" },
    lucky: { type: "boolean" },
    stars: { type: "integer" },
    notes: { type: "string" },
  },
  required: [
    "speciesName",
    "cp",
    "hp",
    "atkFillRatio",
    "defFillRatio",
    "hpFillRatio",
    "atkFullRed",
    "defFullRed",
    "hpFullRed",
    "atkIv",
    "defIv",
    "hpIv",
    "shadow",
    "lucky",
    "stars",
    "notes",
  ],
};

const PROMPT = `Pokémon GO screenshot reader. UI may be Portuguese (PC=CP, PS=HP, Ataque, Defesa, Sombra, Sortudo).

Return JSON fields:
- speciesName: nameplate only (e.g. Croconaw). Empty string if unknown.
- cp: top CP/PC number. Use 0 if unknown. Never candy/HP.
- hp: current HP from green bar left number. 0 if unknown.
- atkFillRatio/defFillRatio/hpFillRatio: 0..1 fill of Attack, Defense, HP bars (top→bottom). 0 if no bars.
- *FullRed: true ONLY if that bar is fully filled AND bright red (not orange).
- atkIv/defIv/hpIv: 0..15 from bars; use -1 if bars missing.
  Rules: IV≈round(fill×15). Full red=15. Orange almost-full with gray tip left = 13 or 14, NEVER 15.
- shadow: purple aura / red eyes / Sombra
- lucky: golden sparkles / Sortudo / Lucky
- stars: 0..3 appraisal stars, or -1 if unknown
- notes: short English confidence note

If image 2 (crop) is present, measure bars from image 2.`;

function clampIv(n: unknown): number | null {
  if (typeof n !== "number" || !Number.isFinite(n)) return null;
  const v = Math.round(n);
  if (v < 0 || v > 15) return null;
  return v;
}

function clampCp(n: unknown): number | null {
  if (typeof n !== "number" || !Number.isFinite(n)) return null;
  const v = Math.round(n);
  if (v < 10 || v > 5000) return null;
  return v;
}

function clampHp(n: unknown): number | null {
  if (typeof n !== "number" || !Number.isFinite(n)) return null;
  const v = Math.round(n);
  if (v < 1 || v > 500) return null;
  return v;
}

function clampRatio(n: unknown): number | null {
  if (typeof n !== "number" || !Number.isFinite(n)) return null;
  if (n <= 0) return null;
  return Math.min(1, Math.max(0, n));
}

const DEAD_MODELS = new Set([
  "gemini-2.0-flash",
  "gemini-2.0-flash-001",
  "gemini-2.0-flash-lite",
  "gemini-2.0-flash-exp",
  "gemini-1.5-flash",
  "gemini-1.5-pro",
  // Blocked for many new AI Studio keys ("no longer available to new users")
  "gemini-2.5-flash",
  "gemini-2.5-flash-lite",
  "gemini-2.5-pro",
]);

/** Sticky model that last succeeded on this server instance (avoids re-trying dead 2.x). */
let lastWorkingModel: string | null = null;

/** Prefer Gemini 3.x - works for new free-tier keys. */
function buildModelCandidates(hint?: string | null): string[] {
  const preferred = hint?.trim() || process.env.GEMINI_MODEL?.trim() || lastWorkingModel;
  const list = [
    preferred && !DEAD_MODELS.has(preferred) ? preferred : null,
    "gemini-3.5-flash",
    "gemini-3.5-flash-lite",
    "gemini-3.6-flash",
    "gemini-flash-latest",
    "gemini-3.8-flash",
  ].filter((m, i, arr): m is string => Boolean(m) && arr.indexOf(m) === i);
  return list;
}

export async function GET() {
  const key = process.env.GEMINI_API_KEY?.trim();
  const models = buildModelCandidates();
  return NextResponse.json({
    available: Boolean(key),
    model: models[0] ?? "gemini-3.5-flash",
    models,
    lastWorkingModel,
  });
}

async function callGemini(
  key: string,
  model: string,
  parts: Array<{ text: string } | { inlineData: { mimeType: string; data: string } }>,
): Promise<{ ok: true; text: string } | { ok: false; status: number; detail: string }> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(key)}`;
  const geminiRes = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ role: "user", parts }],
      generationConfig: {
        temperature: 0.05,
        responseMimeType: "application/json",
        responseSchema: SCHEMA,
      },
    }),
  });
  const errText = await geminiRes.text().catch(() => "");
  if (!geminiRes.ok) {
    return { ok: false, status: geminiRes.status, detail: errText.slice(0, 400) };
  }
  let geminiJson: { candidates?: { content?: { parts?: { text?: string }[] } }[] };
  try {
    geminiJson = JSON.parse(errText) as typeof geminiJson;
  } catch {
    return { ok: false, status: 502, detail: "Invalid Gemini JSON envelope" };
  }
  const text = geminiJson.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
  if (!text) return { ok: false, status: 502, detail: "Empty Gemini candidates" };
  return { ok: true, text };
}

export async function POST(req: Request) {
  const key = process.env.GEMINI_API_KEY?.trim();
  if (!key) {
    return NextResponse.json(
      { error: "GEMINI_API_KEY not set on Vercel" },
      { status: 503 },
    );
  }

  let body: {
    imageBase64?: string;
    mimeType?: string;
    appraisalBase64?: string;
    appraisalMimeType?: string;
    preferredModel?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const imageBase64 = body.imageBase64?.replace(/^data:[^;]+;base64,/, "");
  if (!imageBase64 || imageBase64.length < 80) {
    return NextResponse.json({ error: "Missing imageBase64" }, { status: 400 });
  }
  // Keep well under Vercel hobby body limits
  if (imageBase64.length > 2_500_000) {
    return NextResponse.json(
      { error: "Image too large - compress and retry" },
      { status: 413 },
    );
  }

  const mimeType =
    body.mimeType === "image/png" || body.mimeType === "image/webp"
      ? body.mimeType
      : "image/jpeg";

  const appraisalBase64 = body.appraisalBase64?.replace(/^data:[^;]+;base64,/, "");
  const appraisalMime =
    body.appraisalMimeType === "image/png" || body.appraisalMimeType === "image/webp"
      ? body.appraisalMimeType
      : "image/jpeg";

  const parts: Array<{ text: string } | { inlineData: { mimeType: string; data: string } }> = [
    { text: PROMPT },
    { text: "Image 1 - full screenshot:" },
    { inlineData: { mimeType, data: imageBase64 } },
  ];
  if (appraisalBase64 && appraisalBase64.length > 80 && appraisalBase64.length < 1_500_000) {
    parts.push({ text: "Image 2 - appraisal bars crop:" });
    parts.push({ inlineData: { mimeType: appraisalMime, data: appraisalBase64 } });
  }

  const MODEL_CANDIDATES = buildModelCandidates(body.preferredModel);
  const failures: string[] = [];
  let text = "";
  let usedModel = MODEL_CANDIDATES[0] ?? "gemini-3.5-flash";

  for (const model of MODEL_CANDIDATES) {
    if (DEAD_MODELS.has(model)) continue;
    const result = await callGemini(key, model, parts);
    if (result.ok) {
      text = result.text;
      usedModel = model;
      lastWorkingModel = model;
      break;
    }
    failures.push(`${model}: ${result.status} ${result.detail}`);
    // Skip permanently-unavailable models; keep going on 404.
    // On 429 try next model (different quota buckets) before giving up.
    if (result.status === 403) break;
  }

  if (!text) {
    console.error("Gemini failed", failures.join(" | "));
    return NextResponse.json(
      {
        error: "Gemini request failed",
        detail: failures.join(" · ").slice(0, 500) || "unknown",
        tried: MODEL_CANDIDATES,
      },
      { status: 502 },
    );
  }

  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(text) as Record<string, unknown>;
  } catch {
    return NextResponse.json(
      { error: "Gemini returned non-JSON", raw: text.slice(0, 400) },
      { status: 502 },
    );
  }

  const fromRatioAtk = ivFromFillRatio(
    clampRatio(parsed.atkFillRatio),
    Boolean(parsed.atkFullRed),
  );
  const fromRatioDef = ivFromFillRatio(
    clampRatio(parsed.defFillRatio),
    Boolean(parsed.defFullRed),
  );
  const fromRatioHp = ivFromFillRatio(
    clampRatio(parsed.hpFillRatio),
    Boolean(parsed.hpFullRed),
  );

  const speciesRaw =
    typeof parsed.speciesName === "string" ? parsed.speciesName.trim() : "";

  const result: ScreenshotAiResult = {
    speciesName: speciesRaw || null,
    cp: clampCp(parsed.cp),
    hp: clampHp(parsed.hp),
    atkIv: fromRatioAtk ?? clampIv(parsed.atkIv),
    defIv: fromRatioDef ?? clampIv(parsed.defIv),
    hpIv: fromRatioHp ?? clampIv(parsed.hpIv),
    shadow: Boolean(parsed.shadow),
    lucky: Boolean(parsed.lucky),
    stars:
      typeof parsed.stars === "number" && parsed.stars >= 0 && parsed.stars <= 3
        ? Math.round(parsed.stars)
        : null,
    notes:
      typeof parsed.notes === "string"
        ? `${parsed.notes} [${usedModel}]`
        : `AI vision [${usedModel}]`,
    model: usedModel,
  };

  return NextResponse.json(result);
}
