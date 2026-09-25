import type { ScreenshotAiResult } from "@/app/api/parse-screenshot/route";

export type { ScreenshotAiResult };

const PREFERRED_KEY = "pokelead.geminiModel";

function getPreferredModel(): string | null {
  try {
    return sessionStorage.getItem(PREFERRED_KEY);
  } catch {
    return null;
  }
}

function setPreferredModel(model: string | undefined) {
  if (!model) return;
  try {
    sessionStorage.setItem(PREFERRED_KEY, model);
  } catch {
    /* ignore */
  }
}

async function blobToJpegBase64(
  source: CanvasImageSource,
  sw: number,
  sh: number,
  sx: number,
  sy: number,
  dw: number,
  dh: number,
  quality: number,
): Promise<{ imageBase64: string; mimeType: string }> {
  const canvas = document.createElement("canvas");
  canvas.width = dw;
  canvas.height = dh;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas unavailable");
  ctx.drawImage(source, sx, sy, sw, sh, 0, 0, dw, dh);
  const mimeType = "image/jpeg";
  const dataUrl = canvas.toDataURL(mimeType, quality);
  return { imageBase64: dataUrl.replace(/^data:[^;]+;base64,/, ""), mimeType };
}

/**
 * Keep payloads small for Vercel hobby + Gemini free tier latency.
 * Full shot ~900px + appraisal crop ~560px.
 */
export async function fileToAiPayload(file: Blob): Promise<{
  imageBase64: string;
  mimeType: string;
  appraisalBase64: string;
  appraisalMimeType: string;
}> {
  const bitmap = await createImageBitmap(file);
  const maxEdge = 900;
  const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height));
  const w = Math.max(1, Math.round(bitmap.width * scale));
  const h = Math.max(1, Math.round(bitmap.height * scale));

  const full = await blobToJpegBase64(bitmap, bitmap.width, bitmap.height, 0, 0, w, h, 0.72);

  const sx = Math.floor(bitmap.width * 0.02);
  const sy = Math.floor(bitmap.height * 0.48);
  const sw = Math.floor(bitmap.width * 0.5);
  const sh = Math.floor(bitmap.height * 0.32);
  const cropW = Math.min(560, Math.max(280, sw));
  const cropH = Math.max(1, Math.round((sh / Math.max(sw, 1)) * cropW));
  const appraisal = await blobToJpegBase64(
    bitmap,
    sw,
    sh,
    sx,
    sy,
    cropW,
    cropH,
    0.8,
  );

  bitmap.close();
  return {
    imageBase64: full.imageBase64,
    mimeType: full.mimeType,
    appraisalBase64: appraisal.imageBase64,
    appraisalMimeType: appraisal.mimeType,
  };
}

export async function checkScreenshotAiAvailable(): Promise<boolean> {
  try {
    const res = await fetch("/api/parse-screenshot", { method: "GET" });
    if (!res.ok) return false;
    const data = (await res.json()) as {
      available?: boolean;
      lastWorkingModel?: string | null;
      model?: string;
    };
    if (data.lastWorkingModel) setPreferredModel(data.lastWorkingModel);
    else if (data.model) setPreferredModel(data.model);
    return Boolean(data.available);
  } catch {
    return false;
  }
}

export async function parseScreenshotWithAi(
  file: Blob,
): Promise<ScreenshotAiResult> {
  const payload = await fileToAiPayload(file);
  const preferredModel = getPreferredModel();
  const res = await fetch("/api/parse-screenshot", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...payload, preferredModel }),
  });
  const data = (await res.json().catch(() => ({}))) as ScreenshotAiResult & {
    error?: string;
    detail?: string;
  };
  if (!res.ok) {
    const detail = typeof data.detail === "string" ? data.detail.slice(0, 160) : "";
    throw new Error(
      [typeof data.error === "string" ? data.error : `AI parse failed (${res.status})`, detail]
        .filter(Boolean)
        .join(" - "),
    );
  }
  setPreferredModel(data.model);
  return data;
}
