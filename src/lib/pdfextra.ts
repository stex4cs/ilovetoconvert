/**
 * Page numbers, watermarks and compression, on pdf-lib.
 *
 * Page numbers and watermarks are placed in the page's visual frame: a page
 * with /Rotate 90 is drawn sideways in PDF space, so positions and the text
 * angle are mapped back, and the result reads upright in every viewer.
 */
import { PDFArray, PDFDocument, PDFName, PDFNumber, PDFRawStream, StandardFonts, degrees, rgb, type PDFPage } from "pdf-lib";
import { unzlibSync } from "fflate";

const load = (data: ArrayBuffer | Uint8Array) => PDFDocument.load(data, { ignoreEncryption: true });

/** The page as the reader sees it: its visible box and how to map a visual point into PDF space. */
export function visualFrame(page: PDFPage) {
  const box = page.getCropBox();
  const r = ((page.getRotation().angle % 360) + 360) % 360;
  const W = box.width, H = box.height;
  const vw = r === 90 || r === 270 ? H : W;
  const vh = r === 90 || r === 270 ? W : H;
  /** visual (x, y) from the bottom-left of what the reader sees → PDF user space */
  const at = (vx: number, vy: number) => {
    const [x, y] =
      r === 90 ? [W - vy, vx] :
      r === 180 ? [W - vx, H - vy] :
      r === 270 ? [vy, H - vx] :
      [vx, vy];
    return { x: box.x + x, y: box.y + y };
  };
  return { vw, vh, at, angle: r };
}

export type NumberPosition = "bottom-center" | "bottom-right" | "bottom-left" | "top-center" | "top-right" | "top-left";
export type NumberFormat = "n" | "n-of" | "page-n-of";

export function numberLabel(n: number, total: number, format: NumberFormat): string {
  return format === "n" ? String(n) : format === "n-of" ? `${n} / ${total}` : `Page ${n} of ${total}`;
}

export async function addPageNumbers(
  data: ArrayBuffer | Uint8Array,
  opts: { position: NumberPosition; format: NumberFormat; start: number; skipFirst: boolean; size: number },
): Promise<Uint8Array> {
  const doc = await load(data);
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const pages = doc.getPages();
  const counted = opts.skipFirst ? pages.length - 1 : pages.length;
  pages.forEach((page, i) => {
    if (opts.skipFirst && i === 0) return;
    const n = opts.start + (opts.skipFirst ? i - 1 : i);
    const text = numberLabel(n, opts.start + counted - 1, opts.format);
    const { vw, vh, at, angle } = visualFrame(page);
    const tw = font.widthOfTextAtSize(text, opts.size);
    const margin = Math.max(18, Math.min(vw, vh) * 0.045);
    const [vert, horiz] = opts.position.split("-") as ["top" | "bottom", "center" | "left" | "right"];
    const vx = horiz === "left" ? margin : horiz === "right" ? vw - margin - tw : (vw - tw) / 2;
    const vy = vert === "bottom" ? margin : vh - margin - opts.size;
    const p = at(vx, vy);
    page.drawText(text, { x: p.x, y: p.y, size: opts.size, font, color: rgb(0.2, 0.2, 0.25), rotate: degrees(angle) });
  });
  return doc.save();
}

/**
 * Stamps a PNG (rendered text or a logo) on every page: once in the centre
 * at an angle, or repeated across the page.
 */
export async function addWatermark(
  data: ArrayBuffer | Uint8Array,
  png: Uint8Array,
  opts: { opacity: number; scale: number; angle: number; tile: boolean },
): Promise<Uint8Array> {
  const doc = await load(data);
  const img = await doc.embedPng(png);
  for (const page of doc.getPages()) {
    const { vw, vh, at, angle } = visualFrame(page);
    const w = Math.min(vw, vh) * opts.scale;
    const h = (w * img.height) / img.width;
    const stamp = (cx: number, cy: number) => {
      // rotate about the image centre: start from the bottom-left corner of the rotated box
      const a = (opts.angle * Math.PI) / 180;
      const vx = cx - (w / 2) * Math.cos(a) + (h / 2) * Math.sin(a);
      const vy = cy - (w / 2) * Math.sin(a) - (h / 2) * Math.cos(a);
      const p = at(vx, vy);
      page.drawImage(img, { x: p.x, y: p.y, width: w, height: h, rotate: degrees(opts.angle + angle), opacity: opts.opacity });
    };
    if (!opts.tile) stamp(vw / 2, vh / 2);
    else {
      const stepX = w * 1.35, stepY = Math.max(h * 3.2, w * 0.7);
      for (let y = stepY / 2; y < vh + stepY; y += stepY)
        for (let x = (Math.round(y / stepY) % 2 ? stepX / 2 : 0); x < vw + stepX; x += stepX) stamp(x, y);
    }
  }
  return doc.save();
}

/* ---------- compression ---------- */

export type CompressLevel = "light" | "recommended" | "strong";
const LEVELS: Record<CompressLevel, { maxSide: number; quality: number }> = {
  light: { maxSide: 2800, quality: 0.82 },
  recommended: { maxSide: 2000, quality: 0.7 },
  strong: { maxSide: 1300, quality: 0.5 },
};

type Decoded = { width: number; height: number; rgba: Uint8ClampedArray } | ImageBitmap;

function name(v: unknown): string | null {
  return v instanceof PDFName ? v.asString() : null;
}

/** Decodes an image stream we know how to read: JPEG, or 8-bit RGB/grey Flate without a predictor. */
async function decodeImage(stream: PDFRawStream): Promise<{ img: Decoded; width: number; height: number } | null> {
  const dict = stream.dict;
  const filter = dict.get(PDFName.of("Filter"));
  const filters = filter instanceof PDFArray ? filter.asArray().map(name) : [name(filter)];
  const width = (dict.get(PDFName.of("Width")) as PDFNumber | undefined)?.asNumber() ?? 0;
  const height = (dict.get(PDFName.of("Height")) as PDFNumber | undefined)?.asNumber() ?? 0;
  if (!width || !height) return null;
  if (filters.length === 1 && filters[0] === "/DCTDecode") {
    // CMYK JPEGs (and inverted Decode arrays) don't survive a round trip through the browser; leave them.
    const cs = name(dict.get(PDFName.of("ColorSpace")));
    if (cs === "/DeviceCMYK" || dict.get(PDFName.of("Decode"))) return null;
    try {
      const bmp = await createImageBitmap(new Blob([stream.contents as BlobPart], { type: "image/jpeg" }));
      return { img: bmp, width, height };
    } catch {
      return null;
    }
  }
  if (filters.length === 1 && filters[0] === "/FlateDecode" && !dict.get(PDFName.of("DecodeParms"))) {
    const bpc = (dict.get(PDFName.of("BitsPerComponent")) as PDFNumber | undefined)?.asNumber();
    const cs = name(dict.get(PDFName.of("ColorSpace")));
    const comps = cs === "/DeviceRGB" ? 3 : cs === "/DeviceGray" ? 1 : 0;
    if (bpc !== 8 || !comps || dict.get(PDFName.of("ImageMask")) || dict.get(PDFName.of("Decode"))) return null;
    let raw: Uint8Array;
    try {
      raw = unzlibSync(stream.contents);
    } catch {
      return null;
    }
    if (raw.length < width * height * comps) return null;
    const rgba = new Uint8ClampedArray(width * height * 4);
    for (let i = 0; i < width * height; i++) {
      const s = i * comps;
      rgba[i * 4] = raw[s]!;
      rgba[i * 4 + 1] = raw[comps === 3 ? s + 1 : s]!;
      rgba[i * 4 + 2] = raw[comps === 3 ? s + 2 : s]!;
      rgba[i * 4 + 3] = 255;
    }
    return { img: { width, height, rgba }, width, height };
  }
  return null;
}

export type CompressResult = { bytes: Uint8Array; before: number; after: number; images: number; recompressed: number };

/**
 * Re-encodes the photos inside a PDF at a lower resolution and quality.
 * Text, vector graphics and fonts are not touched, so the text stays text.
 * An image is only replaced when the new one is smaller.
 */
export async function compressPdf(data: ArrayBuffer, level: CompressLevel, onImage?: (i: number, n: number) => void): Promise<CompressResult> {
  const before = data.byteLength;
  const doc = await load(data.slice(0));
  const { maxSide, quality } = LEVELS[level];
  const images = doc.context
    .enumerateIndirectObjects()
    .filter(([, o]) => o instanceof PDFRawStream && name(o.dict.get(PDFName.of("Subtype"))) === "/Image") as [import("pdf-lib").PDFRef, PDFRawStream][];
  let recompressed = 0;
  for (const [i, [ref, stream]] of images.entries()) {
    onImage?.(i + 1, images.length);
    if (stream.contents.length < 20_000) continue; // small images: nothing worth saving
    const decoded = await decodeImage(stream);
    if (!decoded) continue;
    const scale = Math.min(1, maxSide / Math.max(decoded.width, decoded.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(decoded.width * scale));
    canvas.height = Math.max(1, Math.round(decoded.height * scale));
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.imageSmoothingQuality = "high";
    if ("rgba" in decoded.img) {
      const tmp = document.createElement("canvas");
      tmp.width = decoded.width;
      tmp.height = decoded.height;
      tmp.getContext("2d")!.putImageData(new ImageData(decoded.img.rgba as Uint8ClampedArray<ArrayBuffer>, decoded.width, decoded.height), 0, 0);
      ctx.drawImage(tmp, 0, 0, canvas.width, canvas.height);
    } else {
      ctx.drawImage(decoded.img, 0, 0, canvas.width, canvas.height);
      decoded.img.close();
    }
    const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/jpeg", quality));
    if (!blob) continue;
    const jpeg = new Uint8Array(await blob.arrayBuffer());
    if (jpeg.length >= stream.contents.length * 0.95) continue;
    const dict = stream.dict.clone(doc.context);
    dict.set(PDFName.of("Filter"), PDFName.of("DCTDecode"));
    dict.set(PDFName.of("Width"), PDFNumber.of(canvas.width));
    dict.set(PDFName.of("Height"), PDFNumber.of(canvas.height));
    dict.set(PDFName.of("BitsPerComponent"), PDFNumber.of(8));
    dict.set(PDFName.of("ColorSpace"), PDFName.of("DeviceRGB"));
    dict.delete(PDFName.of("DecodeParms"));
    dict.delete(PDFName.of("Length"));
    doc.context.assign(ref, PDFRawStream.of(dict, jpeg));
    recompressed++;
  }
  const bytes = await doc.save({ useObjectStreams: true });
  return { bytes, before, after: bytes.length, images: images.length, recompressed };
}
