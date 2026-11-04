/**
 * Pure helpers: page sizes, fitting an image on a page, and reading page
 * ranges the way people type them ("1-3, 5, 8-"). No DOM, so they are tested
 * in Node.
 */

/** PDF points (1/72 inch). */
export const PAGE_SIZES = {
  a4: [595.28, 841.89],
  letter: [612, 792],
} as const;

export type PageSize = keyof typeof PAGE_SIZES | "fit";
export type Orientation = "auto" | "portrait" | "landscape";

export type Box = { x: number; y: number; width: number; height: number };

/**
 * The page an image goes on. "fit" makes the page the size of the image
 * (at 72 dpi-equivalent points, capped so huge photos don't become posters);
 * otherwise a standard sheet, turned to landscape for wide images when
 * orientation is "auto".
 */
export function pageFor(
  imgWidth: number,
  imgHeight: number,
  size: PageSize,
  orientation: Orientation,
): [number, number] {
  if (size === "fit") {
    const longest = Math.max(imgWidth, imgHeight);
    const scale = longest > 1684 ? 1684 / longest : 1; // cap at A2-ish
    return [imgWidth * scale, imgHeight * scale];
  }
  const [w, h] = PAGE_SIZES[size];
  const landscape =
    orientation === "landscape" || (orientation === "auto" && imgWidth > imgHeight);
  return landscape ? [h, w] : [w, h];
}

/** Largest box with the image's aspect ratio that fits inside the page margins, centred. */
export function fitImage(
  imgWidth: number,
  imgHeight: number,
  pageWidth: number,
  pageHeight: number,
  margin: number,
): Box {
  const availW = Math.max(1, pageWidth - margin * 2);
  const availH = Math.max(1, pageHeight - margin * 2);
  const scale = Math.min(availW / imgWidth, availH / imgHeight);
  const width = imgWidth * scale;
  const height = imgHeight * scale;
  return { x: (pageWidth - width) / 2, y: (pageHeight - height) / 2, width, height };
}

export class RangeError_ extends Error {}

/**
 * "1-3, 5, 8-" → [1, 2, 3, 5, 8, 9, 10] for a 10-page document.
 * Pages are 1-based, kept in the order typed, duplicates dropped.
 * Throws RangeError_ with a readable message on bad input.
 */
export function parseRanges(input: string, pageCount: number): number[] {
  const text = input.replace(/\s+/g, "");
  if (!text) throw new RangeError_("empty");
  const out: number[] = [];
  const seen = new Set<number>();
  const push = (n: number) => {
    if (!seen.has(n)) {
      seen.add(n);
      out.push(n);
    }
  };
  for (const part of text.split(/[,;]+/).filter(Boolean)) {
    const m = /^(\d*)[-–](\d*)$/.exec(part);
    if (m) {
      const from = m[1] ? Number(m[1]) : 1;
      const to = m[2] ? Number(m[2]) : pageCount;
      if (from < 1 || to > pageCount || from > to) throw new RangeError_(part);
      for (let n = from; n <= to; n++) push(n);
    } else if (/^\d+$/.test(part)) {
      const n = Number(part);
      if (n < 1 || n > pageCount) throw new RangeError_(part);
      push(n);
    } else {
      throw new RangeError_(part);
    }
  }
  return out;
}

/** "photo.final.HEIC" → "photo.final" */
export const baseName = (name: string) => name.replace(/\.[^.]+$/, "") || name;

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}
