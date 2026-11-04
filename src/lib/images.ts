/**
 * Reading and writing images in the browser.
 *
 * Everything goes through a canvas, which does two useful things on the way:
 * phone photos come out upright (the EXIF rotation is applied when decoding),
 * and any format we can open can be saved as JPG, PNG, WebP or ICO.
 *
 * What the browser opens by itself: JPG, PNG, WebP, GIF, BMP, ICO and, in
 * current browsers, AVIF. The rest is decoded here, and each decoder loads
 * only when a file of that kind shows up:
 *   HEIC/HEIF (iPhone)   libheif, via heic2any
 *   TIFF (scanners)      UTIF, every page of a multi-page file
 *   PSD (Photoshop)      ag-psd, the flattened image Photoshop stores
 *   SVG                  drawn by the browser at a chosen size
 */
import type { EncodedImage } from "./pdf";

export type OutputType = "image/jpeg" | "image/png" | "image/webp" | "image/x-icon";

const ext = (file: File) => file.name.split(".").pop()?.toLowerCase() ?? "";

export const isHeic = (f: File) => ["heic", "heif"].includes(ext(f)) || /image\/hei[cf]/.test(f.type);
export const isTiff = (f: File) => ["tif", "tiff"].includes(ext(f)) || f.type === "image/tiff";
export const isPsd = (f: File) => ext(f) === "psd" || f.type === "image/vnd.adobe.photoshop";
export const isSvg = (f: File) => ext(f) === "svg" || f.type === "image/svg+xml";

export const IMAGE_ACCEPT = "image/*,.heic,.heif,.tif,.tiff,.psd,.svg,.avif,.bmp,.ico";
export const IMAGE_LABEL = "JPG, PNG, WebP, HEIC, TIFF, PSD, SVG, AVIF, GIF, BMP, ICO";

export const isImage = (f: File) =>
  f.type.startsWith("image/") || isHeic(f) || isTiff(f) || isPsd(f) || isSvg(f) ||
  ["avif", "bmp", "ico", "jfif", "webp"].includes(ext(f));

/** A single frame: one photo, or one page of a TIFF. */
export type Frame = { bitmap: ImageBitmap; label?: string };

async function fromBlob(blob: Blob): Promise<ImageBitmap> {
  try {
    return await createImageBitmap(blob, { imageOrientation: "from-image" });
  } catch {
    // Safari before 17 rejects the options bag for some formats.
    return createImageBitmap(blob);
  }
}

async function heic(file: File): Promise<Frame[]> {
  const { default: heic2any } = await import("heic2any");
  const out = await heic2any({ blob: file, toType: "image/png" });
  return [{ bitmap: await fromBlob(Array.isArray(out) ? out[0]! : out) }];
}

async function tiff(file: File): Promise<Frame[]> {
  const { default: UTIF } = await import("utif2");
  const buf = await file.arrayBuffer();
  // Skip reduced-resolution previews (NewSubfileType bit 0) that some scanners add.
  const pages = UTIF.decode(buf).filter((ifd) => !((((ifd["t254"] as number[] | undefined)?.[0]) ?? 0) & 1));
  const frames: Frame[] = [];
  for (const ifd of pages) {
    UTIF.decodeImage(buf, ifd);
    if (!ifd.width || !ifd.height) continue;
    const rgba = UTIF.toRGBA8(ifd);
    const data = new ImageData(new Uint8ClampedArray(rgba), ifd.width, ifd.height);
    frames.push({ bitmap: await createImageBitmap(data), label: pages.length > 1 ? `${frames.length + 1}` : undefined });
  }
  if (!frames.length) throw new Error("tiff: no pages");
  return frames;
}

async function psd(file: File): Promise<Frame[]> {
  const { readPsd } = await import("ag-psd");
  const doc = readPsd(await file.arrayBuffer(), { skipLayerImageData: true, skipThumbnail: true });
  // Present when the PSD was saved with "Maximize compatibility" (Photoshop's default).
  if (!doc.canvas) throw new Error("psd: no composite image");
  return [{ bitmap: await createImageBitmap(doc.canvas) }];
}

/** SVG is vector, so it is drawn at the size asked for (longest side). */
async function svg(file: File, longest = 2048): Promise<Frame[]> {
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    const w0 = img.naturalWidth || 1024;
    const h0 = img.naturalHeight || 1024;
    const scale = longest / Math.max(w0, h0);
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(w0 * scale);
    canvas.height = Math.round(h0 * scale);
    canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
    return [{ bitmap: await createImageBitmap(canvas) }];
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** Every frame of an image file, upright. Close the bitmaps when done. */
export async function decodeAll(file: File, svgSize?: number): Promise<Frame[]> {
  if (isHeic(file)) return heic(file);
  if (isTiff(file)) return tiff(file);
  if (isPsd(file)) return psd(file);
  if (isSvg(file)) return svg(file, svgSize);
  return [{ bitmap: await fromBlob(file) }];
}

/** Draws the bitmap, scaled down so neither side exceeds maxSide (0 = no limit). */
export function draw(bitmap: ImageBitmap, maxSide = 0, background?: string): HTMLCanvasElement {
  const scale = maxSide > 0 ? Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height)) : 1;
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  const ctx = canvas.getContext("2d")!;
  if (background) {
    ctx.fillStyle = background;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  return canvas;
}

export function canvasToBlob(canvas: HTMLCanvasElement, type: Exclude<OutputType, "image/x-icon">, quality = 0.9): Promise<Blob> {
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("encode"))), type, quality),
  );
}

export const ICO_SIZES = [16, 32, 48, 64, 128, 256];

/**
 * A Windows/website icon holding every size in ICO_SIZES. Each size is a
 * square PNG (the image centred, transparent around it), which every
 * browser and Windows since Vista reads.
 */
export async function toIco(bitmap: ImageBitmap, sizes = ICO_SIZES): Promise<Blob> {
  const pngs: Uint8Array[] = [];
  for (const size of sizes) {
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = size;
    const ctx = canvas.getContext("2d")!;
    ctx.imageSmoothingQuality = "high";
    const s = size / Math.max(bitmap.width, bitmap.height);
    const w = bitmap.width * s;
    const h = bitmap.height * s;
    ctx.drawImage(bitmap, (size - w) / 2, (size - h) / 2, w, h);
    pngs.push(new Uint8Array(await (await canvasToBlob(canvas, "image/png")).arrayBuffer()));
  }
  return new Blob([buildIco(sizes, pngs) as BlobPart], { type: "image/x-icon" });
}

/** ICONDIR + ICONDIRENTRY[] + PNG data, little-endian. Exported for tests. */
export function buildIco(sizes: number[], pngs: Uint8Array[]): Uint8Array {
  const headerSize = 6 + 16 * sizes.length;
  const total = headerSize + pngs.reduce((n, p) => n + p.length, 0);
  const out = new Uint8Array(total);
  const v = new DataView(out.buffer);
  v.setUint16(0, 0, true); // reserved
  v.setUint16(2, 1, true); // type: icon
  v.setUint16(4, sizes.length, true);
  let offset = headerSize;
  sizes.forEach((size, i) => {
    const e = 6 + i * 16;
    v.setUint8(e, size >= 256 ? 0 : size); // 0 means 256
    v.setUint8(e + 1, size >= 256 ? 0 : size);
    v.setUint8(e + 2, 0); // palette
    v.setUint8(e + 3, 0); // reserved
    v.setUint16(e + 4, 1, true); // colour planes
    v.setUint16(e + 6, 32, true); // bits per pixel
    v.setUint32(e + 8, pngs[i]!.length, true);
    v.setUint32(e + 12, offset, true);
    out.set(pngs[i]!, offset);
    offset += pngs[i]!.length;
  });
  return out;
}

/**
 * Prepares one frame for a PDF page. Images with transparency stay PNG so it
 * survives; everything else becomes a high-quality JPEG, which keeps the PDF small.
 */
export async function frameForPdf(bitmap: ImageBitmap, keepPng: boolean, maxSide = 3000): Promise<EncodedImage> {
  const canvas = draw(bitmap, maxSide, keepPng ? undefined : "#ffffff");
  const blob = await canvasToBlob(canvas, keepPng ? "image/png" : "image/jpeg", 0.92);
  return {
    bytes: new Uint8Array(await blob.arrayBuffer()),
    kind: keepPng ? "png" : "jpg",
    width: canvas.width,
    height: canvas.height,
  };
}

/** Formats that may carry transparency. */
export const mayHaveAlpha = (f: File) =>
  /png|gif|webp|svg|x-icon|vnd.microsoft.icon/.test(f.type) || ["png", "gif", "webp", "svg", "ico", "psd"].includes(ext(f));

export const extensionFor = (type: OutputType) =>
  ({ "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/x-icon": "ico" })[type];
