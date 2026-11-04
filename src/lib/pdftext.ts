/**
 * Reads the text and images of a PDF back into document structure:
 * paragraphs, headings, list items, bold/italic runs and images, in reading
 * order. Used by PDF → Word, PDF → text and "extract images".
 *
 * A PDF has no paragraphs, only glyphs placed at coordinates. The structure
 * is rebuilt from geometry:
 *   glyph runs on the same baseline        → a line
 *   an empty vertical strip down the page  → two columns, read left then right
 *   lines close together, same size        → a paragraph
 *   clearly larger text                    → a heading
 *   a line starting with •, 1. or a)       → a list item
 */

export type Run = { text: string; bold: boolean; italic: boolean; size: number; family: "sans" | "serif" | "mono" };
export type Para = {
  kind: "para";
  runs: Run[];
  align: "left" | "center" | "right";
  heading?: 1 | 2 | 3;
  bullet?: boolean;
  size: number;
};
export type Img = { kind: "image"; png: Uint8Array; width: number; height: number };
/** rows → cells → paragraphs; `widths` are the column widths in points. */
export type Table = { kind: "table"; rows: Para[][][]; widths: number[] };
export type Block = Para | Img | Table | { kind: "pagebreak" };

export type Extracted = {
  blocks: Block[];
  page: { width: number; height: number; marginLeft: number; marginRight: number };
  pages: number;
  chars: number;
  images: { png: Uint8Array; width: number; height: number; page: number }[];
};

/* ---------- pure geometry (unit-tested) ---------- */

export type Item = { str: string; x: number; y: number; w: number; size: number; bold: boolean; italic: boolean; family: Run["family"] };
export type Line = { items: Item[]; y: number; x0: number; x1: number; size: number };

/** Groups positioned text into lines (top to bottom), items left to right. */
export function toLines(items: Item[]): Line[] {
  const sorted = [...items].sort((a, b) => b.y - a.y || a.x - b.x);
  const lines: Line[] = [];
  for (const it of sorted) {
    const line = lines.find((l) => Math.abs(l.y - it.y) <= Math.max(l.size, it.size) * 0.45);
    if (line) {
      line.items.push(it);
      line.size = Math.max(line.size, it.size);
    } else {
      lines.push({ items: [it], y: it.y, x0: 0, x1: 0, size: it.size });
    }
  }
  for (const l of lines) {
    l.items.sort((a, b) => a.x - b.x);
    l.x0 = l.items[0]!.x;
    l.x1 = Math.max(...l.items.map((i) => i.x + i.w));
  }
  return lines.sort((a, b) => b.y - a.y);
}

/** Splits a line where a gap is too wide to be a space (e.g. a table cell or a second column). */
export function splitSegments(line: Line): Line[] {
  const out: Line[] = [];
  let cur: Item[] = [];
  const flush = () => {
    if (!cur.length) return;
    out.push({ items: cur, y: line.y, x0: cur[0]!.x, x1: Math.max(...cur.map((i) => i.x + i.w)), size: Math.max(...cur.map((i) => i.size)) });
    cur = [];
  };
  // pdf.js fills wide gaps with " " items as wide as the gap; measure between real words.
  for (const it of line.items) {
    if (!it.str.trim()) continue;
    const prev = cur[cur.length - 1];
    if (prev && it.x - (prev.x + prev.w) > Math.max(prev.size, it.size) * 3) flush();
    cur.push(it);
  }
  flush();
  return out;
}

/**
 * Letter-spaced text ("C O N T A C T") arrives from pdf.js with a space
 * between every character. An item made only of single characters
 * separated by single spaces is put back together.
 */
export function collapseTracking(str: string): string {
  return /^(\S )+\S$/u.test(str) ? str.replace(/ /g, "") : str;
}

/**
 * Finds tables: two or more tightly spaced rows, each split into the same
 * number of cells, with the cells lined up (left edges or right edges).
 * Returns the tables and the segments that are not part of one.
 */
export function findTables(segments: Line[]): { tables: { top: number; table: Table }[]; rest: Line[] } {
  const rows: Line[][] = [];
  for (const s of [...segments].sort((a, b) => b.y - a.y || a.x0 - b.x0)) {
    const row = rows[rows.length - 1];
    if (row && Math.abs(row[0]!.y - s.y) <= s.size * 0.45) row.push(s);
    else rows.push([s]);
  }
  const tables: { top: number; table: Table }[] = [];
  const used = new Set<Line>();
  const aligned = (a: Line[], b: Line[]) =>
    a.length === b.length &&
    a.every((cell, i) => {
      const tol = Math.max(6, cell.size * 0.6);
      return Math.abs(cell.x0 - b[i]!.x0) <= tol || Math.abs(cell.x1 - b[i]!.x1) <= tol;
    });
  for (let i = 0; i < rows.length; ) {
    const first = rows[i]!;
    let j = i + 1;
    if (first.length >= 2) {
      while (
        j < rows.length &&
        rows[j]!.length === first.length &&
        aligned(first, rows[j]!) &&
        rows[j - 1]![0]!.y - rows[j]![0]!.y <= Math.max(...rows[j]!.map((c) => c.size)) * 1.9
      ) j++;
    }
    if (first.length >= 2 && j - i >= 2) {
      const block = rows.slice(i, j);
      block.flat().forEach((c) => used.add(c));
      const starts = first.map((_, k) => Math.min(...block.map((r) => r[k]!.x0)));
      const ends = first.map((_, k) => Math.max(...block.map((r) => r[k]!.x1)));
      const widths = starts.map((x, k) => (k < starts.length - 1 ? starts[k + 1]! - x : ends[k]! - x + 12));
      const cellText = block.flat().map((c) => plain(lineRuns(c)).trim());
      const avg = cellText.reduce((n, t) => n + t.length, 0) / cellText.length;
      // A column whose next line carries on in lower case is wrapped prose, not table cells.
      let carries = 0;
      for (let r = 1; r < block.length; r++)
        for (let k = 0; k < first.length; k++) if (/^\p{Ll}/u.test(plain(lineRuns(block[r]![k]!)).trim())) carries++;
      const prose = carries >= Math.max(1, (block.length - 1) * first.length * 0.3) || avg > 28;
      const rowsOut: Para[][][] =
        prose
          ? // Text that wraps inside each column (cards, side-by-side blocks): one row, whole paragraphs per cell.
            [first.map((_, k) => toParagraphs(block.map((r) => r[k]!), starts[k]!, ends[k]!).map(({ y: _y, ...p }) => p))]
          : block.map((r) => r.map((c) => [{ kind: "para", runs: lineRuns(c), align: "left", size: c.size } as Para]));
      tables.push({ top: first[0]!.y, table: { kind: "table", rows: rowsOut, widths } });
      i = j;
    } else i++;
  }
  return { tables, rest: segments.filter((s) => !used.has(s)) };
}

/**
 * Finds a vertical gutter: an x range no text segment crosses, with enough
 * text on both sides to be real columns. Returns its middle, or null.
 */
export function findGutter(segments: Line[], pageWidth: number): number | null {
  if (segments.length < 6) return null;
  const minX = Math.min(...segments.map((s) => s.x0));
  const maxX = Math.max(...segments.map((s) => s.x1));
  const spans = segments.map((s) => [s.x0, s.x1] as const).sort((a, b) => a[0] - b[0]);
  let reach = spans[0]![1];
  let best: [number, number] | null = null;
  for (const [a, b] of spans.slice(1)) {
    if (a > reach) {
      const gap: [number, number] = [reach, a];
      if (!best || gap[1] - gap[0] > best[1] - best[0]) best = gap;
    }
    reach = Math.max(reach, b);
  }
  if (!best || best[1] - best[0] < Math.max(12, pageWidth * 0.02)) return null;
  const mid = (best[0] + best[1]) / 2;
  if (mid <= minX || mid >= maxX) return null;
  const left = segments.filter((s) => s.x1 <= mid).length;
  const right = segments.filter((s) => s.x0 >= mid).length;
  return left >= 3 && right >= 3 ? mid : null;
}

const BULLET = /^\s*([•◦▪●○■□–—*·‣⁃]|-(?=\s))\s*/;
const NUMBERED = /^\s*(\d{1,3}|[a-zA-Z]|[ivxIVX]{1,4})[.)]\s+/;

/** Joins a line's items into style runs, adding spaces where the gap calls for one. */
export function lineRuns(line: Line): Run[] {
  const runs: Run[] = [];
  let prev: Item | null = null;
  for (const it of line.items) {
    let text = it.str;
    if (prev) {
      const gap = it.x - (prev.x + prev.w);
      if (gap > prev.size * 0.18 && !/\s$/.test(prev.str) && !/^\s/.test(text)) text = " " + text;
    }
    const last = runs[runs.length - 1];
    if (last && last.bold === it.bold && last.italic === it.italic && Math.abs(last.size - it.size) < 0.5 && last.family === it.family) last.text += text;
    else runs.push({ text, bold: it.bold, italic: it.italic, size: it.size, family: it.family });
    prev = it;
  }
  return runs;
}

const plain = (runs: Run[]) => runs.map((r) => r.text).join("");

/** Lines of one column → paragraphs, each with the y of its first line (PDF space, bottom-up). */
export function toParagraphs(lines: Line[], colLeft: number, colRight: number): (Para & { y: number })[] {
  const width = Math.max(1, colRight - colLeft);
  const paras: (Para & { y: number; x0: number; lastLine: Line; lastText: string })[] = [];
  for (const line of lines) {
    const runs = lineRuns(line);
    const text = plain(runs);
    if (!text.trim()) continue;
    const mid = (line.x0 + line.x1) / 2;
    const narrow = line.x1 - line.x0 < width * 0.8;
    const align: Para["align"] =
      narrow && Math.abs(mid - (colLeft + colRight) / 2) < width * 0.04 && line.x0 - colLeft > width * 0.08
        ? "center"
        : narrow && colRight - line.x1 < width * 0.03 && line.x0 - colLeft > width * 0.35
          ? "right"
          : "left";
    const bullet = BULLET.test(text);
    const numbered = !bullet && NUMBERED.test(text);
    const p = paras[paras.length - 1];
    const startsNew =
      !p ||
      bullet ||
      numbered ||
      p.lastLine.y - line.y > Math.max(p.lastLine.size, line.size) * 1.65 ||
      Math.abs(p.size - line.size) > p.size * 0.15 ||
      p.align !== align ||
      // previous line ended early with a full stop: the paragraph ended there
      (/[.!?:]["”’)]?$/.test(p.lastText.trim()) && p.lastLine.x1 < colRight - width * 0.15) ||
      // a continuation line sits at the paragraph's left edge (or under a bullet's text)
      (!p.bullet && align === "left" && Math.abs(line.x0 - p.x0) > line.size * 1.5);
    if (startsNew) {
      const clean = bullet ? stripFirst(runs, BULLET) : runs;
      paras.push({ kind: "para", runs: clean, align, bullet, size: line.size, y: line.y, x0: line.x0, lastLine: line, lastText: text });
    } else {
      const lastRun = p.runs[p.runs.length - 1]!;
      // "conver-" + "sion" → "conversion"; otherwise a space between lines
      if (/\p{L}-$/u.test(lastRun.text) && /^\p{Ll}/u.test(text)) lastRun.text = lastRun.text.slice(0, -1);
      else lastRun.text = lastRun.text.replace(/\s*$/, " ");
      const merged = runs[0] && sameStyle(lastRun, runs[0]) ? ((lastRun.text += runs[0].text), runs.slice(1)) : runs;
      p.runs.push(...merged);
      p.lastLine = line;
      p.lastText = text;
    }
  }
  return paras.map(({ x0: _x, lastLine: _l, lastText: _t, ...para }) => para);
}

function sameStyle(a: Run, b: Run) {
  return a.bold === b.bold && a.italic === b.italic && Math.abs(a.size - b.size) < 0.5 && a.family === b.family;
}
function stripFirst(runs: Run[], re: RegExp): Run[] {
  const [first, ...rest] = runs;
  if (!first) return runs;
  const text = first.text.replace(re, "");
  return text ? [{ ...first, text }, ...rest] : rest;
}

/** The size most of the text is set in, weighted by characters. */
export function bodySize(paras: Para[]): number {
  const count = new Map<number, number>();
  for (const p of paras) for (const r of p.runs) {
    const k = Math.round(r.size * 2) / 2;
    count.set(k, (count.get(k) ?? 0) + r.text.length);
  }
  return [...count.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? 11;
}

export function markHeadings(paras: Para[], body: number): void {
  for (const p of paras) {
    const len = plain(p.runs).length;
    if (len > 160 || p.bullet) continue;
    if (p.size >= body * 1.6) p.heading = 1;
    else if (p.size >= body * 1.25) p.heading = 2;
    else if (p.size >= body * 1.08 && p.runs.every((r) => r.bold) && len < 90) p.heading = 3;
  }
}

/* ---------- reading a PDF (browser) ---------- */

type Matrix = [number, number, number, number, number, number];
const mul = (m: Matrix, n: Matrix): Matrix => [
  m[0] * n[0] + m[2] * n[1], m[1] * n[0] + m[3] * n[1],
  m[0] * n[2] + m[2] * n[3], m[1] * n[2] + m[3] * n[3],
  m[0] * n[4] + m[2] * n[5] + m[4], m[1] * n[4] + m[3] * n[5] + m[5],
];

async function loadPdfJs() {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const worker = await import("pdfjs-dist/legacy/build/pdf.worker.min.mjs?url");
  pdfjs.GlobalWorkerOptions.workerSrc = worker.default;
  return pdfjs;
}

type PdfImage = { width: number; height: number; kind?: number; data?: Uint8ClampedArray | Uint8Array; bitmap?: ImageBitmap };

async function imageToPng(img: PdfImage): Promise<Uint8Array | null> {
  const canvas = document.createElement("canvas");
  canvas.width = img.width;
  canvas.height = img.height;
  const ctx = canvas.getContext("2d")!;
  if (img.bitmap) {
    ctx.drawImage(img.bitmap, 0, 0);
  } else if (img.data) {
    const n = img.width * img.height;
    const rgba = new Uint8ClampedArray(n * 4);
    const d = img.data;
    if (img.kind === 3 || d.length === n * 4) rgba.set(d.subarray(0, n * 4));
    else if (img.kind === 2 || d.length === n * 3) for (let i = 0; i < n; i++) (rgba[i * 4] = d[i * 3]!), (rgba[i * 4 + 1] = d[i * 3 + 1]!), (rgba[i * 4 + 2] = d[i * 3 + 2]!), (rgba[i * 4 + 3] = 255);
    else return null; // 1-bit masks and odd layouts: skip
    ctx.putImageData(new ImageData(rgba, img.width, img.height), 0, 0);
  } else return null;
  const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/png"));
  return blob ? new Uint8Array(await blob.arrayBuffer()) : null;
}

export async function extractPdf(
  data: ArrayBuffer,
  opts: { images?: boolean; onPage?: (n: number, total: number) => void } = {},
): Promise<Extracted> {
  const pdfjs = await loadPdfJs();
  const task = pdfjs.getDocument({ data: new Uint8Array(data), fontExtraProperties: true });
  const doc = await task.promise;
  const OPS = pdfjs.OPS;

  const perPage: { paras: { para: Para | Table; top: number; col: number }[]; imgs: { img: Img; top: number; col: number }[] }[] = [];
  const allImages: Extracted["images"] = [];
  let chars = 0;
  let pageW = 595, pageH = 842, minLeft = Infinity, maxRight = 0;

  for (let n = 1; n <= doc.numPages; n++) {
    opts.onPage?.(n, doc.numPages);
    const page = await doc.getPage(n);
    const vp = page.getViewport({ scale: 1 });
    if (n === 1) (pageW = vp.width), (pageH = vp.height);
    const ops = await page.getOperatorList(); // also loads fonts and images
    const content = await page.getTextContent();

    const items: Item[] = [];
    for (const raw of content.items as { str: string; transform: number[]; width: number; fontName: string }[]) {
      if (!raw.str) continue;
      // viewport.transform flips y and applies the page's rotation; work in top-down page space
      const [a, b, c, d, e, f] = pdfjs.Util.transform(vp.transform, raw.transform) as Matrix;
      const size = Math.hypot(c, d) || Math.hypot(a, b) || 10;
      const font = page.commonObjs.has(raw.fontName) ? (page.commonObjs.get(raw.fontName) as Record<string, unknown>) : null;
      const style = content.styles[raw.fontName] as { fontFamily?: string } | undefined;
      const name = String((font as { name?: string } | null)?.name ?? "") + " " + String(font?.loadedName ?? "") + " " + (style?.fontFamily ?? "");
      const fam = /mono|courier|consol/i.test(name) ? "mono" : /serif/i.test(style?.fontFamily ?? "") && !/sans/i.test(style?.fontFamily ?? "") ? "serif" : "sans";
      items.push({
        str: collapseTracking(raw.str),
        x: e,
        y: vp.height - f, // back to bottom-up so "higher y = higher on page" holds for the helpers
        w: raw.width,
        size,
        bold: Boolean(font?.bold || font?.black) || /bold|black|heavy|semibold/i.test(name),
        italic: Boolean(font?.italic) || /italic|oblique/i.test(name),
        family: fam,
      });
      chars += raw.str.trim().length;
    }

    // lines → segments → columns → paragraphs
    const segments = toLines(items).flatMap(splitSegments);
    const gutter = findGutter(segments, vp.width);
    const columns = gutter === null ? [segments] : [segments.filter((s) => s.x0 < gutter), segments.filter((s) => s.x0 >= gutter)];
    const paras: { para: Para | Table; top: number; col: number }[] = [];
    columns.forEach((all, col) => {
      const { tables, rest: segs } = findTables(all);
      for (const t of tables) paras.push({ para: t.table, top: vp.height - t.top, col });
      if (!segs.length) return;
      const left = Math.min(...segs.map((s) => s.x0));
      const right = Math.max(...segs.map((s) => s.x1));
      minLeft = Math.min(minLeft, left);
      maxRight = Math.max(maxRight, right);
      const ordered = [...segs].sort((a, b) => b.y - a.y || a.x0 - b.x0);
      for (const { y, ...para } of toParagraphs(ordered, left, right)) paras.push({ para, top: vp.height - y, col });
    });

    // images with their position, from the drawing operations
    const imgs: { img: Img; top: number; col: number }[] = [];
    if (opts.images !== false) {
      let ctm: Matrix = [1, 0, 0, 1, 0, 0];
      const stack: Matrix[] = [];
      for (let i = 0; i < ops.fnArray.length; i++) {
        const fn = ops.fnArray[i];
        const args = ops.argsArray[i] as unknown[];
        if (fn === OPS.save) stack.push(ctm);
        else if (fn === OPS.restore) ctm = stack.pop() ?? ctm;
        else if (fn === OPS.transform) ctm = mul(ctm, args as Matrix);
        else if (fn === OPS.paintImageXObject || fn === OPS.paintInlineImageXObject) {
          const w = Math.hypot(ctm[0], ctm[1]);
          const h = Math.hypot(ctm[2], ctm[3]);
          if (w < 24 || h < 24) continue; // bullets, rules, tracking pixels
          let obj: PdfImage | null = null;
          if (fn === OPS.paintInlineImageXObject) obj = args[0] as PdfImage;
          else {
            const id = args[0] as string;
            const store = id.startsWith("g_") ? page.commonObjs : page.objs;
            obj = await new Promise<PdfImage | null>((res) => {
              try {
                store.get(id, (o: unknown) => res(o as PdfImage));
              } catch {
                res(null);
              }
              setTimeout(() => res(null), 3000);
            });
          }
          if (!obj || obj.width < 16 || obj.height < 16) continue;
          const png = await imageToPng(obj);
          if (!png) continue;
          const yTop = Math.max(ctm[5], ctm[5] + ctm[3]); // PDF space, bottom-up
          const top = vp.height - yTop;
          const xMid = ctm[4] + w / 2;
          const img: Img = { kind: "image", png, width: w, height: h };
          imgs.push({ img, top, col: gutter !== null && xMid >= gutter ? 1 : 0 });
          allImages.push({ png, width: obj.width, height: obj.height, page: n });
        }
      }
    }
    perPage.push({ paras, imgs });
    page.cleanup();
  }

  const isPara = (b: Para | Table): b is Para => b.kind === "para";
  const body = bodySize(perPage.flatMap((p) => p.paras.map((q) => q.para).filter(isPara)));
  const blocks: Block[] = [];
  perPage.forEach((p, i) => {
    markHeadings(p.paras.map((q) => q.para).filter(isPara), body);
    const merged = [...p.paras.map((q) => ({ ...q, block: q.para as Block })), ...p.imgs.map((q) => ({ ...q, block: q.img as Block }))];
    merged.sort((a, b) => a.col - b.col || a.top - b.top);
    blocks.push(...merged.map((m) => m.block));
    if (i < perPage.length - 1) blocks.push({ kind: "pagebreak" });
  });

  const pages = doc.numPages;
  await task.destroy();
  return {
    blocks,
    page: {
      width: pageW,
      height: pageH,
      marginLeft: Number.isFinite(minLeft) ? Math.min(Math.max(minLeft, 18), 90) : 72,
      marginRight: maxRight ? Math.min(Math.max(pageW - maxRight, 18), 90) : 72,
    },
    pages,
    chars,
    images: allImages,
  };
}

/** Plain text of the extracted document: paragraphs separated by blank lines. */
export function toText(blocks: Block[]): string {
  const out: string[] = [];
  for (const b of blocks) {
    if (b.kind === "para") out.push((b.bullet ? "• " : "") + plain(b.runs).trim());
    else if (b.kind === "table")
      out.push(b.rows.map((r) => r.map((c) => c.map((p) => plain(p.runs).trim()).join(" ")).join("\t")).join("\n"));
    else if (b.kind === "pagebreak") out.push("");
  }
  return out.join("\n\n").replace(/\n{4,}/g, "\n\n\n") + "\n";
}
