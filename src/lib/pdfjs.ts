/**
 * pdf.js, loaded on demand. The legacy build on purpose: the modern one calls
 * Map.prototype.getOrInsertComputed, which current browsers don't ship yet.
 */
export async function loadPdfJs() {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const worker = await import("pdfjs-dist/legacy/build/pdf.worker.min.mjs?url");
  pdfjs.GlobalWorkerOptions.workerSrc = worker.default;
  return pdfjs;
}

/** Where pdf.js fetches fonts, CMaps (CJK text), ICC profiles and WASM image decoders. */
export const PDFJS_ASSETS = {
  standardFontDataUrl: "/pdfjs/standard_fonts/",
  cMapUrl: "/pdfjs/cmaps/",
  cMapPacked: true,
  wasmUrl: "/pdfjs/wasm/",
  iccUrl: "/pdfjs/iccs/",
} as const;
