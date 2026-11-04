// pdf.js loads fonts, CMaps, ICC profiles and WASM decoders (JPEG 2000, JBIG2) on demand
// from these folders. Copied into public/ before every build; not committed.
import fs from "node:fs";
import path from "node:path";
const root = path.resolve(import.meta.dirname, "..");
const src = path.join(root, "node_modules/pdfjs-dist");
const dest = path.join(root, "public/pdfjs");
fs.rmSync(dest, { recursive: true, force: true });
for (const dir of ["standard_fonts", "cmaps", "wasm", "iccs"]) {
  if (fs.existsSync(path.join(src, dir))) fs.cpSync(path.join(src, dir), path.join(dest, dir), { recursive: true });
}
