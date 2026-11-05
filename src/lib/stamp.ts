/**
 * Signatures, images and text placed on PDF pages.
 *
 * Positions come from the on-screen preview as fractions of the page as the
 * reader sees it (top-left origin), so they are mapped through the page's
 * visual frame: a signature put on a page with /Rotate 90 still lands where
 * it was dropped and reads upright.
 */
import { PDFDocument, degrees, rgb, type PDFFont, type PDFImage } from "pdf-lib";
import { visualFrame } from "./pdfextra";

export type Stamp =
  | { kind: "image"; page: number; x: number; y: number; w: number; png: Uint8Array; ratio: number }
  | { kind: "text"; page: number; x: number; y: number; size: number; text: string; color: string };

/** Where the baseline sits below the top of a line-height: 1 box in Liberation Sans. */
export const TEXT_BASELINE = 0.85;
export const TEXT_FONT_URL = "/pdfjs/standard_fonts/LiberationSans-Regular.ttf";

const hex = (c: string) => rgb(parseInt(c.slice(1, 3), 16) / 255, parseInt(c.slice(3, 5), 16) / 255, parseInt(c.slice(5, 7), 16) / 255);

export async function stampPdf(data: ArrayBuffer | Uint8Array, stamps: Stamp[]): Promise<Uint8Array> {
  const doc = await PDFDocument.load(data, { ignoreEncryption: true });
  let font: PDFFont | null = null;
  if (stamps.some((s) => s.kind === "text")) {
    // A real font with Latin, Cyrillic and Greek, so the text stays text: selectable and searchable.
    const { default: fontkit } = await import("@pdf-lib/fontkit");
    doc.registerFontkit(fontkit);
    const bytes = new Uint8Array(await (await fetch(TEXT_FONT_URL)).arrayBuffer());
    font = await doc.embedFont(bytes, { subset: true });
  }
  const images = new Map<Uint8Array, PDFImage>();
  for (const s of stamps) {
    const page = doc.getPage(s.page);
    const { vw, vh, at, angle } = visualFrame(page);
    if (s.kind === "image") {
      let img = images.get(s.png);
      if (!img) images.set(s.png, (img = await doc.embedPng(s.png)));
      const width = s.w * vw;
      const height = width / s.ratio;
      const p = at(s.x * vw, vh - s.y * vh - height);
      page.drawImage(img, { x: p.x, y: p.y, width, height, rotate: degrees(angle) });
    } else {
      const p = at(s.x * vw, vh - s.y * vh - s.size * TEXT_BASELINE);
      page.drawText(s.text, { x: p.x, y: p.y, size: s.size, font: font!, color: hex(s.color), rotate: degrees(angle) });
    }
  }
  return doc.save();
}

/** The part of a canvas that has ink on it, with a little room around it. */
export function cropToInk(canvas: HTMLCanvasElement, pad = 6): HTMLCanvasElement | null {
  const ctx = canvas.getContext("2d")!;
  const { data, width, height } = ctx.getImageData(0, 0, canvas.width, canvas.height);
  let x0 = width, y0 = height, x1 = -1, y1 = -1;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (data[(y * width + x) * 4 + 3]! > 16) {
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
        if (y < y0) y0 = y;
        if (y > y1) y1 = y;
      }
    }
  }
  if (x1 < 0) return null;
  x0 = Math.max(0, x0 - pad);
  y0 = Math.max(0, y0 - pad);
  x1 = Math.min(width - 1, x1 + pad);
  y1 = Math.min(height - 1, y1 + pad);
  const out = document.createElement("canvas");
  out.width = x1 - x0 + 1;
  out.height = y1 - y0 + 1;
  out.getContext("2d")!.drawImage(canvas, x0, y0, out.width, out.height, 0, 0, out.width, out.height);
  return out;
}

/** A photo or scan of a signature on paper: the paper becomes transparent, the ink stays. */
export function inkOnly(bitmap: ImageBitmap): HTMLCanvasElement {
  const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const lum = 0.299 * d[i]! + 0.587 * d[i + 1]! + 0.114 * d[i + 2]!;
    // paper (light) fades out smoothly; ink keeps its colour
    const a = Math.max(0, Math.min(255, (215 - lum) * 4));
    d[i + 3] = Math.min(d[i + 3]!, a);
  }
  ctx.putImageData(img, 0, 0);
  return canvas;
}
