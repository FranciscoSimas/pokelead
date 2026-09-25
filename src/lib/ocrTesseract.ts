"use client";

let workerPromise: Promise<import("tesseract.js").Worker> | null = null;

async function getWorker() {
  if (!workerPromise) {
    workerPromise = (async () => {
      const Tesseract = await import("tesseract.js");
      const worker = await Tesseract.createWorker("eng");
      return worker;
    })();
  }
  return workerPromise;
}

function loadImage(blob: Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Failed to decode image"));
    };
    img.src = url;
  });
}

/** Orange fill (partial IV) - coral / amber. Looser for phone JPEG compression. */
function isBarOrange(r: number, g: number, b: number): boolean {
  return r > 155 && g > 40 && g < 190 && b < 140 && r > g + 25 && r > b + 35;
}

/**
 * Full IV bar turns bright red (#E64545-ish). Critical - orange-only miss full bars.
 * Hundo Hunter uses red as confirmed 15.
 */
function isBarRed(r: number, g: number, b: number): boolean {
  return r > 165 && g < 140 && b < 140 && r > g + 35 && r > b + 35;
}

function isBarFill(r: number, g: number, b: number): boolean {
  return isBarOrange(r, g, b) || isBarRed(r, g, b);
}

function isGrayTrack(r: number, g: number, b: number): boolean {
  const avg = (r + g + b) / 3;
  return avg > 140 && avg < 245 && Math.abs(r - g) < 35 && Math.abs(g - b) < 35;
}

function isPurpleAura(r: number, g: number, b: number): boolean {
  return (
    ((b > 95 && r > 75 && g < 115 && b > g + 18 && r > g + 8) ||
      (r > 110 && b > 130 && g < 105)) &&
    !(r > 200 && g > 170 && b < 130)
  );
}

async function canvasFromBlob(
  blob: Blob,
  width: number,
): Promise<{ canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D; w: number; h: number } | null> {
  const img = await loadImage(blob);
  const w = width;
  const h = Math.round((img.height / img.width) * w);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return null;
  ctx.drawImage(img, 0, 0, w, h);
  return { canvas, ctx, w, h };
}

async function preprocessForOcr(blob: Blob): Promise<Blob> {
  try {
    const img = await loadImage(blob);
    const scale = Math.min(2.2, Math.max(1.2, 1400 / Math.max(img.width, 1)));
    const w = Math.round(img.width * scale);
    const h = Math.round(img.height * scale);
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return blob;
    ctx.drawImage(img, 0, 0, w, h);
    const imageData = ctx.getImageData(0, 0, w, h);
    const d = imageData.data;
    for (let i = 0; i < d.length; i += 4) {
      const g = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
      const v = Math.max(0, Math.min(255, (g - 128) * 1.45 + 128));
      d[i] = d[i + 1] = d[i + 2] = v;
    }
    ctx.putImageData(imageData, 0, 0);
    const out = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob((b) => resolve(b), "image/png"),
    );
    return out ?? blob;
  } catch {
    return blob;
  }
}

/** Crop top strip (CP / PC) as a high-contrast blob for a second OCR pass. */
async function cropTopCpRegion(blob: Blob): Promise<Blob | null> {
  try {
    const img = await loadImage(blob);
    const w = 800;
    const fullH = Math.round((img.height / img.width) * w);
    const canvas = document.createElement("canvas");
    const cropH = Math.floor(fullH * 0.14);
    canvas.width = w;
    canvas.height = cropH;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.drawImage(img, 0, 0, img.width, img.height * 0.14, 0, 0, w, cropH);
    // Boost contrast for white CP text
    const imageData = ctx.getImageData(0, 0, w, cropH);
    const d = imageData.data;
    for (let i = 0; i < d.length; i += 4) {
      const g = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
      const v = g > 160 ? 255 : g < 80 ? 0 : g;
      d[i] = d[i + 1] = d[i + 2] = v;
    }
    ctx.putImageData(imageData, 0, 0);
    return await new Promise((resolve) => canvas.toBlob((b) => resolve(b), "image/png"));
  } catch {
    return null;
  }
}

export async function detectShadowFromPixels(blob: Blob): Promise<boolean> {
  try {
    const frame = await canvasFromBlob(blob, 180);
    if (!frame) return false;
    const { ctx, w, h } = frame;
    const { data } = ctx.getImageData(0, 0, w, h);
    let purple = 0;
    let sampled = 0;
    const y0 = Math.floor(h * 0.2);
    const y1 = Math.floor(h * 0.55);
    const x0 = Math.floor(w * 0.2);
    const x1 = Math.floor(w * 0.8);
    for (let y = y0; y < y1; y++) {
      for (let x = x0; x < x1; x++) {
        const i = (y * w + x) * 4;
        sampled++;
        if (isPurpleAura(data[i], data[i + 1], data[i + 2])) purple++;
      }
    }
    return sampled > 80 && purple / sampled > 0.025;
  } catch {
    return false;
  }
}

function snapIv(ratio: number, mostlyRed: boolean): number {
  if (mostlyRed || ratio >= 0.965) return 15;
  const iv = Math.round(ratio * 15);
  return Math.max(0, Math.min(15, iv));
}

/**
 * Track-first appraisal reader.
 * Finds wide gray bar tracks, then measures orange/red fill from the left.
 * Avoids Candela clothing / star badge false positives (too short or not track-aligned).
 */
export async function readAppraisalIvBars(
  blob: Blob,
): Promise<{ atk: number; def: number; hp: number } | null> {
  try {
    const frame = await canvasFromBlob(blob, 560);
    if (!frame) return null;
    const { ctx, w, h } = frame;
    const { data } = ctx.getImageData(0, 0, w, h);

    const windows = [
      { x0: 0.06, x1: 0.46, y0: 0.54, y1: 0.76 },
      { x0: 0.04, x1: 0.5, y0: 0.5, y1: 0.78 },
      { x0: 0.08, x1: 0.44, y0: 0.56, y1: 0.74 },
    ];

    let best: { atk: number; def: number; hp: number; score: number } | null = null;

    for (const win of windows) {
      const x0 = Math.floor(w * win.x0);
      const x1 = Math.floor(w * win.x1);
      const y0 = Math.floor(h * win.y0);
      const y1 = Math.floor(h * win.y1);
      const minBarW = Math.max(40, Math.floor((x1 - x0) * 0.35));

      type TrackRow = { y: number; left: number; right: number; fill: number; track: number };
      const trackRows: TrackRow[] = [];

      for (let y = y0; y < y1; y++) {
        // Find longest (fill|gray) run on this row
        let bestLen = 0;
        let bestL = 0;
        let bestR = 0;
        let bestFill = 0;
        let bestTrack = 0;
        let runL = -1;
        let runFill = 0;
        let runTrack = 0;
        for (let x = x0; x <= x1; x++) {
          let ok = false;
          let fill = false;
          let track = false;
          if (x < x1) {
            const i = (y * w + x) * 4;
            fill = isBarFill(data[i], data[i + 1], data[i + 2]);
            track = isGrayTrack(data[i], data[i + 1], data[i + 2]);
            ok = fill || track;
          }
          if (ok) {
            if (runL < 0) {
              runL = x;
              runFill = 0;
              runTrack = 0;
            }
            if (fill) runFill++;
            if (track) runTrack++;
          } else if (runL >= 0) {
            const runR = x - 1;
            const len = runR - runL + 1;
            if (len > bestLen && runTrack >= 4) {
              bestLen = len;
              bestL = runL;
              bestR = runR;
              bestFill = runFill;
              bestTrack = runTrack;
            }
            runL = -1;
          }
        }
        if (bestLen >= minBarW && bestFill >= 4) {
          trackRows.push({
            y,
            left: bestL,
            right: bestR,
            fill: bestFill,
            track: bestTrack,
          });
        }
      }

      if (trackRows.length < 6) continue;

      // Cluster consecutive track rows into bar bands
      type Band = {
        yStart: number;
        yEnd: number;
        left: number;
        right: number;
        fill: number;
        track: number;
        rows: number;
      };
      const bands: Band[] = [];
      let cur: Band | null = null;
      for (const row of trackRows) {
        if (!cur || row.y - cur.yEnd > 3) {
          cur = {
            yStart: row.y,
            yEnd: row.y,
            left: row.left,
            right: row.right,
            fill: row.fill,
            track: row.track,
            rows: 1,
          };
          bands.push(cur);
        } else {
          cur.yEnd = row.y;
          cur.left = Math.min(cur.left, row.left);
          cur.right = Math.max(cur.right, row.right);
          cur.fill += row.fill;
          cur.track += row.track;
          cur.rows++;
        }
      }

      // Real bars are a few px tall and evenly spaced - keep solid bands
      const solid = bands.filter((b) => b.rows >= 2 && b.right - b.left >= minBarW);
      if (solid.length < 3) continue;

      // Pick 3 bands with similar left/right and even vertical spacing
      const byFill = [...solid].sort((a, b) => b.fill - a.fill);
      let trio: Band[] | null = null;
      for (let i = 0; i < Math.min(byFill.length, 8); i++) {
        for (let j = i + 1; j < Math.min(byFill.length, 8); j++) {
          for (let k = j + 1; k < Math.min(byFill.length, 8); k++) {
            const cand = [byFill[i], byFill[j], byFill[k]].sort(
              (a, b) => a.yStart - b.yStart,
            );
            const leftSpread =
              Math.max(...cand.map((t) => t.left)) - Math.min(...cand.map((t) => t.left));
            const rightSpread =
              Math.max(...cand.map((t) => t.right)) - Math.min(...cand.map((t) => t.right));
            const gaps = [
              cand[1].yStart - cand[0].yEnd,
              cand[2].yStart - cand[1].yEnd,
            ];
            if (leftSpread > 22 || rightSpread > 28) continue;
            if (gaps[0] < 2 || gaps[1] < 2 || gaps[0] > 40 || gaps[1] > 40) continue;
            if (Math.abs(gaps[0] - gaps[1]) > 16) continue;
            trio = cand;
            break;
          }
          if (trio) break;
        }
        if (trio) break;
      }
      if (!trio) continue;

      const ivs: number[] = [];
      let score = 0;
      for (const band of trio) {
        const mid = Math.floor((band.yStart + band.yEnd) / 2);
        const ys = [
          mid,
          Math.max(band.yStart, mid - 1),
          Math.min(band.yEnd, mid + 1),
        ];
        const barLeft = band.left;
        const barRight = band.right;
        const width = barRight - barLeft;
        if (width < minBarW) {
          ivs.length = 0;
          break;
        }

        let fillRight = barLeft;
        let fillCount = 0;
        let redCount = 0;
        for (const y of ys) {
          // Scan left→right; fill is contiguous from the left of the track
          let seenFill = false;
          let gap = 0;
          for (let x = barLeft; x <= barRight; x++) {
            const i = (y * w + x) * 4;
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];
            if (isBarFill(r, g, b)) {
              seenFill = true;
              gap = 0;
              fillCount++;
              fillRight = Math.max(fillRight, x);
              if (isBarRed(r, g, b)) redCount++;
            } else if (seenFill) {
              gap++;
              // allow tiny AA gaps inside fill
              if (gap > 3) break;
            }
          }
        }

        const geomRatio = Math.min(1, Math.max(0, (fillRight - barLeft + 1) / (width + 1)));
        const mostlyRed = redCount > fillCount * 0.35 && geomRatio >= 0.94;
        ivs.push(snapIv(geomRatio, mostlyRed));
        score += fillCount + band.track;
      }

      if (ivs.length !== 3) continue;
      if (!best || score > best.score) {
        best = { atk: ivs[0], def: ivs[1], hp: ivs[2], score };
      }
    }

    return best ? { atk: best.atk, def: best.def, hp: best.hp } : null;
  } catch {
    return null;
  }
}

function parseCpFromText(text: string): number | null {
  const patterns = [
    /\b(?:CP|PC)\s*[:=\-]?\s*(\d{2,4})\b/i,
    /\b(\d{2,4})\s*(?:CP|PC)\b/i,
    // OCR often reads PC as P C, Pe, PO, etc.
    /\bP[\s.\-]?[CEOeo0]\s*[:=\-]?\s*(\d{2,4})\b/,
    /\b(?:PC|CP|Pe|PO|P0)(\d{3,4})\b/i,
  ];
  for (const re of patterns) {
    const m = text.match(re);
    if (!m) continue;
    const cp = Number(m[1]);
    if (cp >= 10 && cp <= 5000) return cp;
  }
  // Lone 3-4 digit near start (top crop) - only if text is short (top strip)
  if (text.length < 40) {
    const lone = text.match(/(?:^|\s)(\d{3,4})(?:\s|$)/);
    if (lone) {
      const cp = Number(lone[1]);
      if (cp >= 50 && cp <= 5000) return cp;
    }
  }
  return null;
}

/** Full-image OCR + dedicated top-strip OCR for PC/CP. */
export async function ocrImageFile(
  file: Blob,
): Promise<{ text: string; cpHint: number | null }> {
  const worker = await getWorker();
  const prepared = await preprocessForOcr(file);
  const full = await worker.recognize(prepared);
  const text = full.data.text ?? "";

  let cpHint = parseCpFromText(text);
  if (cpHint == null) {
    const top = await cropTopCpRegion(file);
    if (top) {
      const topRes = await worker.recognize(top);
      cpHint = parseCpFromText(topRes.data.text ?? "");
    }
  }

  return { text, cpHint };
}

export async function terminateOcrWorker(): Promise<void> {
  if (!workerPromise) return;
  try {
    const worker = await workerPromise;
    await worker.terminate();
  } catch {
    /* ignore */
  }
  workerPromise = null;
}
