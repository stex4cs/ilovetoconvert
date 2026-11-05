/**
 * OCR with Tesseract compiled to WebAssembly, entirely in the browser.
 *
 * The engine and the language model download once from jsDelivr and are kept
 * in the browser's cache (IndexedDB); the images being read never leave the
 * device. For a searchable PDF, Tesseract writes a text-only PDF page for
 * every image (invisible, correctly placed words in its GlyphLessFont), and
 * that page is laid over the original page as a form XObject, so the page
 * looks exactly as before but its text can be selected, copied and searched.
 */
import { PDFDocument, degrees } from "pdf-lib";
import type { Worker } from "tesseract.js";
import { visualFrame } from "./pdfextra";
import type { EncodedImage } from "./pdf";

/** Languages offered, by Tesseract code. English is always added as a second language. */
export const OCR_LANGS: { code: string; label: string }[] = [
  { code: "eng", label: "English" },
  { code: "srp_latn", label: "Srpski (latinica)" },
  { code: "srp", label: "Српски (ћирилица)" },
  { code: "hrv", label: "Hrvatski" },
  { code: "bos", label: "Bosanski" },
  { code: "slv", label: "Slovenščina" },
  { code: "mkd", label: "Македонски" },
  { code: "bul", label: "Български" },
  { code: "deu", label: "Deutsch" },
  { code: "fra", label: "Français" },
  { code: "spa", label: "Español" },
  { code: "ita", label: "Italiano" },
  { code: "por", label: "Português" },
  { code: "nld", label: "Nederlands" },
  { code: "pol", label: "Polski" },
  { code: "ces", label: "Čeština" },
  { code: "slk", label: "Slovenčina" },
  { code: "hun", label: "Magyar" },
  { code: "ron", label: "Română" },
  { code: "tur", label: "Türkçe" },
  { code: "ell", label: "Ελληνικά" },
  { code: "rus", label: "Русский" },
  { code: "ukr", label: "Українська" },
  { code: "swe", label: "Svenska" },
  { code: "dan", label: "Dansk" },
  { code: "nor", label: "Norsk" },
  { code: "fin", label: "Suomi" },
];

export async function ocrWorker(lang: string, onLoad?: (pct: number) => void): Promise<Worker> {
  const { createWorker } = await import("tesseract.js");
  const langs = lang === "eng" ? ["eng"] : [lang, "eng"];
  return createWorker(langs, 1, {
    logger: (m) => {
      if (m.status !== "recognizing text") onLoad?.(Math.round((m.progress ?? 0) * 100));
    },
  });
}

/**
 * Draws an image at a size Tesseract reads well: small images (screenshots,
 * photos of a receipt) are scaled up, huge ones down.
 */
export function ocrCanvas(bitmap: ImageBitmap): HTMLCanvasElement {
  const longest = Math.max(bitmap.width, bitmap.height);
  const scale = longest < 1600 ? Math.min(2, 3200 / longest) : longest > 5000 ? 5000 / longest : 1;
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#ffffff"; // transparent PNGs: dark text on black reads as nothing
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  return canvas;
}

export type OcrResult = { text: string; layer: Uint8Array; words: number };

export async function recognize(worker: Worker, canvas: HTMLCanvasElement, dpi?: number): Promise<OcrResult> {
  if (dpi) await worker.setParameters({ user_defined_dpi: String(Math.round(dpi)) });
  const { data } = await worker.recognize(canvas, { pdfTextOnly: true }, { text: true, pdf: true });
  const text = data.text.replace(/[ \t]+\n/g, "\n").trim();
  return { text, layer: new Uint8Array(data.pdf ?? []), words: text ? text.split(/\s+/).length : 0 };
}

/** Lays text-only pages over the pages of a PDF; null leaves a page as it is. */
export async function addTextLayers(pdf: ArrayBuffer | Uint8Array, layers: (Uint8Array | null)[]): Promise<Uint8Array> {
  const doc = await PDFDocument.load(pdf, { ignoreEncryption: true });
  const pages = doc.getPages();
  for (const [i, page] of pages.entries()) {
    const layer = layers[i];
    if (!layer?.length) continue;
    const [embedded] = await doc.embedPdf(layer, [0]);
    // The OCR saw the page as the reader does; map that frame back onto a rotated page.
    const { vw, vh, at, angle } = visualFrame(page);
    const o = at(0, 0);
    page.drawPage(embedded!, { x: o.x, y: o.y, width: vw, height: vh, rotate: degrees(angle) });
  }
  return doc.save();
}

/** Scanned images → one PDF, a page per image (about A4-sized), with the text laid over each. */
export async function imagesToSearchablePdf(images: { image: EncodedImage; layer: Uint8Array }[]): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  for (const { image } of images) {
    const embedded = image.kind === "png" ? await doc.embedPng(image.bytes) : await doc.embedJpg(image.bytes);
    const scale = 842 / Math.max(image.width, image.height);
    const page = doc.addPage([image.width * scale, image.height * scale]);
    page.drawImage(embedded, { x: 0, y: 0, width: page.getWidth(), height: page.getHeight() });
  }
  doc.setProducer("ilovetoconvert.com");
  return addTextLayers(await doc.save(), images.map((i) => i.layer));
}

export type PdfOcr = { text: string; layers: (Uint8Array | null)[]; pages: number; skipped: number; words: number };

/**
 * Reads every page of a PDF. Pages that already carry real text are left
 * alone (their text is still part of the result); the rest are rendered at
 * 300 dpi and read.
 */
export async function ocrPdf(worker: Worker, data: ArrayBuffer, onPage?: (n: number, total: number) => void): Promise<PdfOcr> {
  const { loadPdfJs, PDFJS_ASSETS } = await import("./pdfjs");
  const pdfjs = await loadPdfJs();
  const task = pdfjs.getDocument({ data: new Uint8Array(data.slice(0)), ...PDFJS_ASSETS });
  const doc = await task.promise;
  const layers: (Uint8Array | null)[] = [];
  const texts: string[] = [];
  let skipped = 0, words = 0;
  try {
    for (let n = 1; n <= doc.numPages; n++) {
      onPage?.(n, doc.numPages);
      const page = await doc.getPage(n);
      const content = await page.getTextContent();
      const existing = content.items.map((i) => ("str" in i ? i.str + (i.hasEOL ? "\n" : "") : "")).join("");
      if (existing.replace(/\s/g, "").length > 50) {
        skipped++;
        layers.push(null);
        texts.push(existing.trim());
        page.cleanup();
        continue;
      }
      const unscaled = page.getViewport({ scale: 1 });
      const scale = Math.min(300 / 72, 4200 / Math.max(unscaled.width, unscaled.height));
      const viewport = page.getViewport({ scale });
      const canvas = document.createElement("canvas");
      canvas.width = Math.ceil(viewport.width);
      canvas.height = Math.ceil(viewport.height);
      const ctx = canvas.getContext("2d")!;
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      await page.render({ canvas, canvasContext: ctx, viewport }).promise;
      page.cleanup();
      const r = await recognize(worker, canvas, scale * 72);
      canvas.width = canvas.height = 0; // free the bitmap memory right away on mobile
      layers.push(r.layer);
      texts.push(r.text);
      words += r.words;
    }
  } finally {
    await task.destroy();
  }
  return { text: texts.filter(Boolean).join("\n\n"), layers, pages: layers.length, skipped, words };
}
