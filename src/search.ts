/**
 * Tool search. Small enough to run on every keystroke: 42 pages, each turned
 * into a set of canonical words once, then matched by prefix.
 *
 * People don't type our labels, they type what they have and what they want:
 * "jpeg to pdf", "iphone photo", "photoshop", "combine pdfs", "shrink image".
 * SYNONYMS maps those words (and some Serbian ones) onto the words the pages use.
 */
import { PAGES, type Page } from "./content/pages";

const SYNONYMS: Record<string, string> = {
  // formats
  jpeg: "jpg", jpe: "jpg", jfif: "jpg",
  heif: "heic", iphone: "heic", ios: "heic", apple: "heic",
  tif: "tiff", scan: "tiff", scanner: "tiff", scanned: "tiff",
  photoshop: "psd", adobe: "psd",
  vector: "svg",
  docx: "word", doc: "word", msword: "word", document: "word", dokument: "word",
  xls: "excel", xlsx: "excel", spreadsheet: "excel", sheet: "excel", sheets: "excel", tabela: "excel",
  libreoffice: "ods", openoffice: "ods", calc: "ods",
  ppt: "powerpoint", pptx: "powerpoint", slides: "powerpoint", presentation: "powerpoint", prezentacija: "powerpoint", keynote: "powerpoint",
  md: "markdown", readme: "markdown",
  text: "txt", tekst: "txt",
  icon: "ico", favicon: "ico", ikonica: "ico",
  // images in general
  image: "images", img: "images", picture: "images", pictures: "images", photo: "images", photos: "images",
  slika: "images", slike: "images", sliku: "images", slikama: "images", fotografija: "images", fotografije: "images", fotke: "images", fotku: "images",
  // actions
  combine: "merge", join: "merge", spoji: "merge", spajanje: "merge",
  separate: "split", cut: "split", podeli: "split", razdvoji: "split",
  izdvoji: "extract", pull: "extract", keep: "extract",
  remove: "delete", obrisi: "delete", erase: "delete",
  turn: "rotate", flip: "rotate", rotiraj: "rotate", okreni: "rotate",
  shrink: "compress", reduce: "compress", smaller: "compress", optimize: "compress", smanji: "compress", kompresuj: "compress",
  numbers: "numbers", numbering: "numbers", number: "numbers", paginate: "numbers", numerisi: "numbers", brojevi: "numbers",
  lock: "protect", password: "protect", encrypt: "protect", secure: "protect", zakljucaj: "protect", lozinka: "protect", sifra: "protect",
  decrypt: "unlock", otkljucaj: "unlock", unprotect: "unlock",
  fix: "repair", corrupted: "repair", damaged: "repair", broken: "repair", popravi: "repair",
  stamp: "watermark", confidential: "watermark", draft: "watermark", logo: "watermark", zig: "watermark",
  resize: "resize", scale: "resize", dimenzije: "resize",
  convert: "converter", konvertuj: "converter", pretvori: "converter",
};

const STOP = new Set(["to", "in", "into", "u", "from", "a", "the", "and", "i", "file", "files", "online", "free"]);

/** Lowercase, no diacritics, split into words, synonyms applied, stop words dropped. */
export function words(text: string): string[] {
  return text
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/g, "dj")
    .split(/[^a-z0-9]+/)
    .filter(Boolean)
    .map((w) => SYNONYMS[w] ?? w)
    .filter((w) => !STOP.has(w));
}

type Entry = { page: Page; words: Set<string>; label: string; order: number };

/** What people convert most, so a broad query ("iphone", "pdf") starts with these. */
const POPULAR = ["heic-to-jpg", "pdf-to-word", "jpg-to-pdf", "merge-pdf", "word-to-pdf", "pdf-to-jpg", "compress-image", "images-to-pdf", "png-to-jpg", "webp-to-jpg", "split-pdf"];

const INDEX: Entry[] = PAGES.map((page, order) => {
  const extra: string[] = [];
  if (page.tool === "convert-images") extra.push("images", "converter");
  if (page.tool === "images-to-pdf") extra.push("images", "pdf");
  if (page.slug.startsWith("pdf-to-")) extra.push("images");
  if (page.slug.includes("pages")) extra.push("split");
  if (page.slug === "compress-image") extra.push("size", "kb", "mb");
  return {
    page,
    words: new Set(words([page.label, page.h1, page.slug, ...extra].join(" "))),
    label: page.label.toLowerCase(),
    order,
  };
});

/**
 * Pages matching every word of the query, best first: a label that starts
 * with the query, then an exact "x to y" pair in order, then the rest in the
 * site's own order (which puts the main tools first).
 */
export function search(query: string, limit = 8): Page[] {
  const q = words(query);
  if (!q.length) return [];
  const raw = query.trim().toLowerCase();
  const hits: { e: Entry; score: number }[] = [];
  for (const e of INDEX) {
    const all = q.every((w) => [...e.words].some((x) => x.startsWith(w)));
    if (!all) continue;
    const pop = POPULAR.indexOf(e.page.slug);
    let score = e.order + (pop >= 0 ? pop - 100 : 0);
    if (e.label.startsWith(raw)) score -= 1000;
    // "jpg pdf" or "jpg to pdf" should put jpg-to-pdf above pdf-to-jpg
    const pair = e.page.slug.split("-to-");
    if (pair.length === 2 && q.length >= 2 && words(pair[0]!)[0] === q[0] && words(pair[1]!)[0] === q[q.length - 1]) score -= 500;
    hits.push({ e, score });
  }
  return hits.sort((a, b) => a.score - b.score).slice(0, limit).map((h) => h.e.page);
}
