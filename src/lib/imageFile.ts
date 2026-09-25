/** Mobile gallery picks often have empty MIME type; iPhone camera may send HEIC. */

const IMAGE_EXT = /\.(jpe?g|png|gif|webp|bmp|heic|heif)$/i;

export function isLikelyImageFile(file: File): boolean {
  const type = (file.type || "").toLowerCase().trim();
  if (type.startsWith("image/")) return true;
  // Android / iOS gallery: blank MIME, or generic binary.
  if (!type || type === "application/octet-stream" || type === "application/download") {
    if (IMAGE_EXT.test(file.name)) return true;
    // Some mobile pickers omit the extension entirely but still hand us bytes.
    // Accept non-empty blobs; normalizeImageFile will reject non-images.
    return file.size > 0;
  }
  return false;
}

export function isHeicLike(file: File): boolean {
  const type = (file.type || "").toLowerCase();
  if (type.includes("heic") || type.includes("heif")) return true;
  return /\.(heic|heif)$/i.test(file.name);
}

function loadImageElement(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Could not decode image"));
    img.src = url;
  });
}

async function canvasToJpegBlob(
  source: CanvasImageSource,
  width: number,
  height: number,
  quality = 0.92,
): Promise<Blob> {
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, width);
  canvas.height = Math.max(1, height);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas unavailable");
  ctx.drawImage(source, 0, 0, canvas.width, canvas.height);
  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob((b) => resolve(b), "image/jpeg", quality),
  );
  if (!blob) throw new Error("Could not encode JPEG");
  return blob;
}

/**
 * Ensure the file can be used by createImageBitmap / canvas / AI upload.
 * Re-encodes HEIC / odd mobile types to JPEG when the browser can decode them.
 */
export async function normalizeImageFile(file: File): Promise<File> {
  const type = (file.type || "").toLowerCase();
  if (type === "image/jpeg" || type === "image/png" || type === "image/webp" || type === "image/gif") {
    return file;
  }

  // Try native decode first (works for blank-MIME JPEG/PNG on iOS).
  try {
    const bitmap = await createImageBitmap(file);
    try {
      const blob = await canvasToJpegBlob(bitmap, bitmap.width, bitmap.height);
      return new File([blob], `${(file.name.replace(IMAGE_EXT, "") || "screenshot").replace(/\.$/, "")}.jpg`, {
        type: "image/jpeg",
        lastModified: file.lastModified,
      });
    } finally {
      bitmap.close();
    }
  } catch {
    /* fall through */
  }

  // Safari sometimes decodes via <img> when createImageBitmap fails.
  const url = URL.createObjectURL(file);
  try {
    const img = await loadImageElement(url);
    const blob = await canvasToJpegBlob(img, img.naturalWidth || img.width, img.naturalHeight || img.height);
    return new File([blob], `${(file.name.replace(IMAGE_EXT, "") || "screenshot").replace(/\.$/, "")}.jpg`, {
      type: "image/jpeg",
      lastModified: file.lastModified,
    });
  } catch {
    if (isHeicLike(file)) {
      throw new Error(
        "This phone photo is HEIC, which this browser cannot read. Use a Pokémon GO screenshot (PNG/JPG), or in iPhone Settings → Camera → Formats choose Most Compatible.",
      );
    }
    throw new Error("Could not read this image on mobile. Try a PNG/JPG screenshot.");
  } finally {
    URL.revokeObjectURL(url);
  }
}
