import { describe, expect, it } from "vitest";
import { search, words } from "../src/search";

const top = (q: string) => search(q)[0]?.slug;

describe("search", () => {
  it("finds conversions however they're typed", () => {
    expect(top("heic to jpg")).toBe("heic-to-jpg");
    expect(top("HEIC JPG")).toBe("heic-to-jpg");
    expect(top("jpeg to pdf")).toBe("jpg-to-pdf");
    expect(top("pdf to jpeg")).toBe("pdf-to-jpg");
    expect(top("photoshop png")).toBe("psd-to-png");
  });
  it("understands everyday words", () => {
    expect(search("iphone").map((p) => p.slug)).toEqual(expect.arrayContaining(["heic-to-jpg", "heic-to-pdf"]));
    expect(top("iphone")).toBe("heic-to-jpg");
    expect(top("combine pdf")).toBe("merge-pdf");
    expect(top("shrink photo")).toBe("compress-image");
    expect(top("favicon")).toBe("favicon-generator");
    expect(top("docx")).toBe("word-to-pdf");
    expect(top("xls")).toBe("excel-to-pdf");
    expect(top("delete pages")).toBe("delete-pdf-pages");
    expect(top("extract pages")).toBe("extract-pdf-pages");
  });
  it("understands a few Serbian words", () => {
    expect(top("spoji pdf")).toBe("merge-pdf");
    expect(top("smanji sliku")).toBe("compress-image");
    expect(top("slike u pdf")).toBe("images-to-pdf");
  });
  it("matches as you type", () => {
    expect(top("mer")).toBe("merge-pdf");
    expect(search("tif").length).toBeGreaterThan(0);
  });
  it("returns nothing for nonsense or an empty query", () => {
    expect(search("qwertyuiop")).toEqual([]);
    expect(search("   ")).toEqual([]);
    expect(search("to")).toEqual([]);
  });
  it("normalises words", () => {
    expect(words("Đoković JPEG to PDF")).toEqual(["djokovic", "jpg", "pdf"]);
  });
});
