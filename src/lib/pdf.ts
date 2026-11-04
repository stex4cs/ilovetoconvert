/**
 * PDF operations on pdf-lib. Everything runs in the page: the files are read
 * into memory, changed and handed back as a Blob. Nothing is uploaded.
 */
import { PDFDocument, degrees } from "pdf-lib";
import { fitImage, pageFor, type Orientation, type PageSize } from "./pages";

export type EncodedImage = { bytes: Uint8Array; kind: "jpg" | "png"; width: number; height: number };

const toBlob = (bytes: Uint8Array) => new Blob([bytes as BlobPart], { type: "application/pdf" });

async function load(data: ArrayBuffer | Uint8Array) {
  // Many real-world PDFs carry an owner password that only blocks editing.
  // ignoreEncryption lets us still copy and rotate their pages.
  return PDFDocument.load(data, { ignoreEncryption: true });
}

export async function pageCount(data: ArrayBuffer | Uint8Array): Promise<number> {
  return (await load(data)).getPageCount();
}

export async function imagesToPdf(
  images: EncodedImage[],
  opts: { size: PageSize; orientation: Orientation; margin: number },
): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  for (const img of images) {
    const embedded = img.kind === "png" ? await doc.embedPng(img.bytes) : await doc.embedJpg(img.bytes);
    const [pw, ph] = pageFor(img.width, img.height, opts.size, opts.orientation);
    const margin = opts.size === "fit" ? 0 : opts.margin;
    const page = doc.addPage([pw, ph]);
    // PDF coordinates start bottom-left; fitImage centres, so y needs no flip.
    page.drawImage(embedded, fitImage(img.width, img.height, pw, ph, margin));
  }
  doc.setProducer("Konvertuj");
  doc.setCreator("Konvertuj");
  return doc.save();
}

export async function mergePdfs(files: (ArrayBuffer | Uint8Array)[]): Promise<Uint8Array> {
  const out = await PDFDocument.create();
  for (const data of files) {
    const src = await load(data);
    const pages = await out.copyPages(src, src.getPageIndices());
    pages.forEach((p) => out.addPage(p));
  }
  return out.save();
}

/** New PDF with the given 1-based pages, in that order. */
export async function extractPages(data: ArrayBuffer | Uint8Array, pages: number[]): Promise<Uint8Array> {
  const src = await load(data);
  const out = await PDFDocument.create();
  const copied = await out.copyPages(src, pages.map((n) => n - 1));
  copied.forEach((p) => out.addPage(p));
  return out.save();
}

/** One PDF per page. */
export async function splitAll(data: ArrayBuffer | Uint8Array): Promise<Uint8Array[]> {
  const src = await load(data);
  const parts: Uint8Array[] = [];
  for (const i of src.getPageIndices()) {
    const out = await PDFDocument.create();
    const [p] = await out.copyPages(src, [i]);
    out.addPage(p!);
    parts.push(await out.save());
  }
  return parts;
}

/** Rotates the given 1-based pages (all when empty) by a multiple of 90°. */
export async function rotatePages(
  data: ArrayBuffer | Uint8Array,
  angle: 90 | 180 | 270,
  pages: number[] = [],
): Promise<Uint8Array> {
  const doc = await load(data);
  const targets = pages.length ? pages.map((n) => n - 1) : doc.getPageIndices();
  for (const i of targets) {
    const page = doc.getPage(i);
    page.setRotation(degrees((page.getRotation().angle + angle) % 360));
  }
  return doc.save();
}

/** New PDF without the given 1-based pages. */
export async function deletePages(data: ArrayBuffer | Uint8Array, pages: number[]): Promise<Uint8Array> {
  const doc = await load(data);
  [...pages].sort((a, b) => b - a).forEach((n) => doc.removePage(n - 1));
  return doc.save();
}

export { toBlob as pdfBlob };
