import { describe, expect, it } from "vitest";
import { bodySize, findGutter, markHeadings, splitSegments, toLines, toParagraphs, toText, type Item } from "../src/lib/pdftext";

/** A word at (x, y) in PDF space (y up), roughly 0.5 em per character. */
const w = (str: string, x: number, y: number, size = 10, extra: Partial<Item> = {}): Item => ({
  str, x, y, w: str.length * size * 0.5, size, bold: false, italic: false, family: "sans", ...extra,
});
const text = (p: { runs: { text: string }[] }) => p.runs.map((r) => r.text).join("");

describe("lines", () => {
  it("groups items on one baseline and orders them left to right", () => {
    const lines = toLines([w("world", 60, 700), w("Hello", 20, 700.6), w("Next", 20, 686)]);
    expect(lines).toHaveLength(2);
    expect(lines[0]!.items.map((i) => i.str)).toEqual(["Hello", "world"]);
  });
  it("splits a line at a gap too wide for a space", () => {
    const [line] = toLines([w("Name", 20, 700), w("Price", 300, 700)]);
    expect(splitSegments(line!)).toHaveLength(2);
  });
});

describe("paragraphs", () => {
  const col = (items: Item[]) => toParagraphs(toLines(items).flatMap(splitSegments), 20, 320);

  it("joins wrapped lines into one paragraph and splits on a blank gap", () => {
    const paras = col([
      w("This is the first line of a", 20, 700), w("paragraph that wraps.", 20, 688),
      w("A new paragraph.", 20, 650),
    ]);
    expect(paras.map(text)).toEqual(["This is the first line of a paragraph that wraps.", "A new paragraph."]);
  });
  it("removes a hyphen at a line break", () => {
    const paras = col([w("The conver-", 20, 700), w("sion works.", 20, 688)]);
    expect(text(paras[0]!)).toBe("The conversion works.");
  });
  it("turns bullet lines into list items without the bullet", () => {
    const paras = col([w("• First", 20, 700), w("• Second", 20, 688)]);
    expect(paras.map((p) => [p.bullet, text(p)])).toEqual([[true, "First"], [true, "Second"]]);
  });
  it("keeps bold and plain text as separate runs", () => {
    const paras = col([w("Total:", 20, 700, 10, { bold: true }), w("500", 55, 700)]);
    expect(paras[0]!.runs.map((r) => [r.text, r.bold])).toEqual([["Total:", true], [" 500", false]]);
  });
  it("recognises centred lines", () => {
    const paras = col([w("Title", 157, 700)]);
    expect(paras[0]!.align).toBe("center");
  });
});

describe("headings and columns", () => {
  it("marks larger text as headings relative to the body size", () => {
    const paras = toParagraphs(
      toLines([w("Big title", 20, 760, 22), w("Section", 20, 720, 14), ...Array.from({ length: 6 }, (_, i) => w("Body text line here", 20, 690 - i * 12))]),
      20,
      320,
    );
    const body = bodySize(paras);
    markHeadings(paras, body);
    expect(body).toBe(10);
    expect(paras.slice(0, 2).map((p) => p.heading)).toEqual([1, 2]);
    expect(paras[2]!.heading).toBeUndefined();
  });
  it("finds the gutter between two columns", () => {
    const items = Array.from({ length: 5 }, (_, i) => [w("Left column text", 20, 700 - i * 12), w("Right column text here", 250, 700 - i * 12)]).flat();
    const segs = toLines(items).flatMap(splitSegments);
    const g = findGutter(segs, 595);
    expect(g).not.toBeNull();
    expect(g!).toBeGreaterThan(100);
    expect(g!).toBeLessThan(250);
  });
  it("finds no gutter in single-column text", () => {
    const items = Array.from({ length: 8 }, (_, i) => w("A full width line of ordinary body text in one column", 20, 700 - i * 12));
    expect(findGutter(toLines(items).flatMap(splitSegments), 595)).toBeNull();
  });
});

describe("text output", () => {
  it("separates paragraphs with blank lines and marks bullets", () => {
    const paras = toParagraphs(toLines([w("Intro.", 20, 700), w("• Point", 20, 660)]), 20, 320);
    expect(toText(paras)).toBe("Intro.\n\n• Point\n");
  });
});

import { collapseTracking, findTables } from "../src/lib/pdftext";

describe("letter spacing and tables", () => {
  it("puts letter-spaced words back together", () => {
    expect(collapseTracking("C O N T A C T")).toBe("CONTACT");
    expect(collapseTracking("2 0 2 5")).toBe("2025");
    expect(collapseTracking("Belgrade, Serbia")).toBe("Belgrade, Serbia");
    expect(collapseTracking("a")).toBe("a");
  });
  it("turns aligned, tightly spaced rows into a table and leaves the rest", () => {
    const items = [
      w("Intro paragraph text", 20, 720),
      w("Item", 20, 700), w(" ", 40, 700, 10, { w: 150 }), w("Qty", 200, 700), w("Price", 300, 700),
      w("Drone", 20, 686), w("1", 200, 686), w("200", 300, 686),
      w("Edit", 20, 672), w("3", 200, 672), w("450", 300, 672),
    ];
    const { tables, rest } = findTables(toLines(items).flatMap(splitSegments));
    expect(tables).toHaveLength(1);
    expect(tables[0]!.table.rows.map((r) => r.map((c) => c.map((p) => p.runs.map((x) => x.text).join("")).join("")))).toEqual([
      ["Item", "Qty", "Price"], ["Drone", "1", "200"], ["Edit", "3", "450"],
    ]);
    expect(rest.map((s) => s.items.map((i) => i.str).join(""))).toEqual(["Intro paragraph text"]);
  });
  it("does not make a table out of label/date lines far apart", () => {
    const items = [w("Company", 20, 700), w("2025", 300, 700), w("Role", 20, 670), w("2024", 300, 670)];
    expect(findTables(toLines(items).flatMap(splitSegments)).tables).toHaveLength(0);
  });
});

describe("side-by-side text blocks", () => {
  it("become one row with whole paragraphs per cell", () => {
    const left = ["Native apps for the news", "portal, one account across", "web and phone."];
    const right = ["Playable in the browser: a", "HUD built from design", "tokens and a slot."];
    const items = left.flatMap((t, i) => [w(t, 20, 700 - i * 12), w(right[i]!, 250, 700 - i * 12)]);
    const { tables } = findTables(toLines(items).flatMap(splitSegments));
    expect(tables).toHaveLength(1);
    const row = tables[0]!.table.rows;
    expect(row).toHaveLength(1);
    expect(row[0]!.map((cell) => cell.map((p) => p.runs.map((r) => r.text).join("")).join(" "))).toEqual([
      "Native apps for the news portal, one account across web and phone.",
      "Playable in the browser: a HUD built from design tokens and a slot.",
    ]);
  });
});
