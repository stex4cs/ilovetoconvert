import { describe, expect, it } from "vitest";
import { PDFDocument, StandardFonts } from "pdf-lib";
import { fitImage, pageFor, parseRanges, RangeError_, baseName, formatBytes } from "../src/lib/pages";
import { deletePages, extractPages, imagesToPdf, mergePdfs, pageCount, rotatePages, splitAll } from "../src/lib/pdf";

/** A PDF whose page n carries the text "page n", so order can be checked. */
async function makePdf(pages: number, label = "doc"): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  for (let i = 1; i <= pages; i++) {
    const p = doc.addPage([200 + i, 300]); // width encodes the page number
    p.drawText(`${label} page ${i}`, { x: 20, y: 150, size: 12, font });
  }
  return doc.save();
}
const widths = async (bytes: Uint8Array) =>
  (await PDFDocument.load(bytes)).getPages().map((p) => Math.round(p.getWidth()) - 200);

describe("parseRanges", () => {
  it("reads single pages, ranges and open ends", () => {
    expect(parseRanges("1-3, 5, 8-", 10)).toEqual([1, 2, 3, 5, 8, 9, 10]);
    expect(parseRanges("-2", 5)).toEqual([1, 2]);
    expect(parseRanges(" 4 ; 2 ", 5)).toEqual([4, 2]);
  });
  it("keeps typed order and drops duplicates", () => {
    expect(parseRanges("3,1,3,1-2", 5)).toEqual([3, 1, 2]);
  });
  it("accepts an en dash", () => {
    expect(parseRanges("2–4", 5)).toEqual([2, 3, 4]);
  });
  it("rejects pages out of range and garbage", () => {
    expect(() => parseRanges("0", 5)).toThrow(RangeError_);
    expect(() => parseRanges("6", 5)).toThrow(RangeError_);
    expect(() => parseRanges("4-2", 5)).toThrow(RangeError_);
    expect(() => parseRanges("a", 5)).toThrow(RangeError_);
    expect(() => parseRanges("", 5)).toThrow(RangeError_);
  });
});

describe("page layout", () => {
  it("turns A4 to landscape for wide images when automatic", () => {
    expect(pageFor(4000, 3000, "a4", "auto")).toEqual([841.89, 595.28]);
    expect(pageFor(3000, 4000, "a4", "auto")).toEqual([595.28, 841.89]);
    expect(pageFor(4000, 3000, "a4", "portrait")).toEqual([595.28, 841.89]);
  });
  it("sizes the page to the image, capped", () => {
    expect(pageFor(800, 600, "fit", "auto")).toEqual([800, 600]);
    const [w, h] = pageFor(6000, 4000, "fit", "auto");
    expect(w).toBeCloseTo(1684);
    expect(h).toBeCloseTo(1684 * (4000 / 6000));
  });
  it("fits and centres inside the margins without distorting", () => {
    const box = fitImage(1000, 500, 600, 800, 50);
    expect(box.width).toBeCloseTo(500);
    expect(box.height).toBeCloseTo(250);
    expect(box.x).toBeCloseTo(50);
    expect(box.y).toBeCloseTo((800 - 250) / 2);
  });
});

describe("PDF operations", () => {
  it("merges in the given order", async () => {
    const merged = await mergePdfs([await makePdf(2, "a"), await makePdf(3, "b")]);
    expect(await widths(merged)).toEqual([1, 2, 1, 2, 3]);
  });

  it("extracts pages in typed order", async () => {
    const out = await extractPages(await makePdf(5), [4, 1, 2]);
    expect(await widths(out)).toEqual([4, 1, 2]);
  });

  it("splits into one PDF per page", async () => {
    const parts = await splitAll(await makePdf(3));
    expect(parts).toHaveLength(3);
    expect(await widths(parts[2]!)).toEqual([3]);
  });

  it("deletes pages", async () => {
    const out = await deletePages(await makePdf(5), [2, 4]);
    expect(await widths(out)).toEqual([1, 3, 5]);
  });

  it("rotates all pages or only chosen ones, adding to existing rotation", async () => {
    const all = await PDFDocument.load(await rotatePages(await makePdf(3), 90));
    expect(all.getPages().map((p) => p.getRotation().angle)).toEqual([90, 90, 90]);
    const some = await rotatePages(await rotatePages(await makePdf(3), 90, [2]), 270, [2]);
    expect((await PDFDocument.load(some)).getPages().map((p) => p.getRotation().angle)).toEqual([0, 0, 0]);
  });

  it("counts pages", async () => {
    expect(await pageCount(await makePdf(7))).toBe(7);
  });

  it("puts each image on its own page", async () => {
    // 1x1 PNG
    const png = Uint8Array.from(
      atob("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg=="),
      (c) => c.charCodeAt(0),
    );
    const img = { bytes: png, kind: "png" as const, width: 1, height: 1 };
    const pdf = await imagesToPdf([img, img], { size: "a4", orientation: "auto", margin: 18 });
    const doc = await PDFDocument.load(pdf);
    expect(doc.getPageCount()).toBe(2);
    expect(Math.round(doc.getPage(0).getWidth())).toBe(595);
  });
});

describe("helpers", () => {
  it("strips the extension", () => {
    expect(baseName("IMG_0001.HEIC")).toBe("IMG_0001");
    expect(baseName("report.final.docx")).toBe("report.final");
  });
  it("formats sizes", () => {
    expect(formatBytes(900)).toBe("900 B");
    expect(formatBytes(2048)).toBe("2 KB");
    expect(formatBytes(5 * 1024 * 1024)).toBe("5.0 MB");
  });
});

describe("ICO", () => {
  it("writes a directory entry per size pointing at its PNG", async () => {
    const { buildIco } = await import("../src/lib/images");
    const pngs = [new Uint8Array([1, 2, 3]), new Uint8Array([4, 5]), new Uint8Array([6])];
    const ico = buildIco([16, 32, 256], pngs);
    const v = new DataView(ico.buffer);
    expect(v.getUint16(2, true)).toBe(1); // icon
    expect(v.getUint16(4, true)).toBe(3); // count
    expect(ico[6]).toBe(16);
    expect(ico[6 + 32]).toBe(0); // 256 is stored as 0
    const firstOffset = v.getUint32(6 + 12, true);
    expect(firstOffset).toBe(6 + 16 * 3);
    expect([...ico.slice(firstOffset, firstOffset + 3)]).toEqual([1, 2, 3]);
    expect(v.getUint32(6 + 32 + 12, true)).toBe(firstOffset + 3 + 2);
    expect(ico.length).toBe(6 + 48 + 6);
  });
});
