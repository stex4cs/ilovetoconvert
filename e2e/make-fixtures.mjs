// Generates every test file the end-to-end suite needs into e2e/.fixtures.
// Synthetic content only (the repo is public). HEIC, TIFF, PSD, AVIF and BMP
// come from macOS `sips`; on other systems those cases are skipped by run.mjs.
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import puppeteer from "puppeteer";
import { PDFDocument, StandardFonts, rgb, degrees } from "pdf-lib";
import * as XLSX from "xlsx";
import { Document, Packer, Paragraph, TextRun, HeadingLevel, Table, TableRow, TableCell, ImageRun, Header, Footer, LevelFormat, AlignmentType, PageBreak } from "docx";

const FX = path.join(import.meta.dirname, ".fixtures");
fs.rmSync(FX, { recursive: true, force: true });
fs.mkdirSync(FX, { recursive: true });
const put = (name, data) => fs.writeFileSync(path.join(FX, name), data);

/* ---------- raster images, drawn in a real browser ---------- */
const browser = await puppeteer.launch({ headless: true });
const page = await browser.newPage();
const draw = (w, h, type, opts = {}) =>
  page.evaluate(
    async (w, h, type, opts) => {
      const c = document.createElement("canvas");
      c.width = w;
      c.height = h;
      const x = c.getContext("2d");
      if (opts.transparent) x.clearRect(0, 0, w, h);
      else {
        const g = x.createLinearGradient(0, 0, w, h);
        g.addColorStop(0, "#1e3a8a");
        g.addColorStop(1, "#f97316");
        x.fillStyle = g;
        x.fillRect(0, 0, w, h);
      }
      x.fillStyle = opts.transparent ? "#6366f1" : "#ffffff";
      if (opts.transparent) x.fillRect(w * 0.25, h * 0.25, w * 0.5, h * 0.5);
      x.font = `bold ${Math.round(h / 8)}px sans-serif`;
      x.fillStyle = "#ffffff";
      x.fillText(opts.label ?? "TEST", w * 0.08, h * 0.55);
      // noise so JPEG has something to compress
      if (opts.noise) for (let i = 0; i < w * h * 0.02; i++) (x.fillStyle = `hsl(${(i * 37) % 360} 60% 60%)`), x.fillRect(Math.random() * w, Math.random() * h, 3, 3);
      const blob = await new Promise((r) => c.toBlob(r, type, 0.95));
      return [...new Uint8Array(await blob.arrayBuffer())];
    },
    w, h, type, opts,
  ).then((a) => Buffer.from(a));

put("photo.jpg", await draw(1600, 1200, "image/jpeg", { label: "PHOTO", noise: true }));
put("tall.jpg", await draw(900, 1600, "image/jpeg", { label: "TALL" }));
put("wide.png", await draw(1600, 900, "image/png", { label: "WIDE", transparent: true }));
put("big.jpg", await draw(3200, 2400, "image/jpeg", { label: "BIG", noise: true }));
put("shot.png", await draw(1400, 900, "image/png", { label: "SHOT", noise: true }));
// text for OCR: printed lines on white, like a screenshot or a scanned page
const textImage = (w, h, lines, type, font = "34px Georgia, serif") =>
  page.evaluate(
    async (w, h, lines, type, font) => {
      const c = document.createElement("canvas");
      c.width = w;
      c.height = h;
      const x = c.getContext("2d");
      x.fillStyle = "#ffffff";
      x.fillRect(0, 0, w, h);
      x.fillStyle = "#111111";
      x.font = font;
      const size = parseInt(font, 10);
      lines.forEach((l, i) => x.fillText(l, size * 1.5, size * 2.5 + i * size * 1.6));
      const blob = await new Promise((r) => c.toBlob(r, type, 0.9));
      return [...new Uint8Array(await blob.arrayBuffer())];
    },
    w, h, lines, type, font,
  ).then((a) => Buffer.from(a));
put("receipt.png", await textImage(1100, 420, ["INVOICE 2047", "Total due: 1250.00 EUR", "Thank you for your business."], "image/png"));
put("cyrillic.png", await textImage(1100, 300, ["Добар дан, ово је тест.", "Београд, новембар"], "image/png", "40px Arial, sans-serif"));
put("scanpage.jpg", await textImage(1240, 1754, ["Quarterly Statement", "", "The warehouse inventory was counted", "on the first Monday of the month.", "All shipments arrived on schedule."], "image/jpeg", "40px Georgia, serif"));
await browser.close();
put("logo.svg", `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 80"><rect width="120" height="80" rx="14" fill="#6366f1"/><path d="M30 32h52l-12-12M90 48H38l12 12" fill="none" stroke="#fff" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/></svg>\n`);

const sips = (args) => {
  try {
    execFileSync("sips", args, { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
};
const f = (n) => path.join(FX, n);
if (process.platform === "darwin") {
  sips(["-s", "format", "heic", f("photo.jpg"), "--out", f("iphone.heic")]);
  sips(["-s", "format", "psd", f("photo.jpg"), "--out", f("design.psd")]);
  sips(["-s", "format", "avif", f("photo.jpg"), "--out", f("photo.avif")]);
  sips(["-s", "format", "bmp", f("tall.jpg"), "--out", f("old.bmp")]);
  sips(["-s", "format", "tiff", f("photo.jpg"), "--out", f("p1.tif")]);
  sips(["-s", "format", "tiff", f("tall.jpg"), "--out", f("p2.tif")]);
  try {
    execFileSync("tiffutil", ["-cat", f("p1.tif"), f("p2.tif"), "-out", f("scan-2pages.tif")], { stdio: "ignore" });
  } catch {}
  fs.rmSync(f("p1.tif"), { force: true });
  fs.rmSync(f("p2.tif"), { force: true });
}

/* ---------- PDFs ---------- */
async function textPdf(name, pages, label) {
  const d = await PDFDocument.create();
  const font = await d.embedFont(StandardFonts.Helvetica);
  for (let i = 1; i <= pages; i++) d.addPage([595, 842]).drawText(`${label} page ${i}`, { x: 60, y: 760, size: 24, font });
  put(name, await d.save());
}
await textPdf("a.pdf", 3, "Alpha");
await textPdf("b.pdf", 2, "Beta");

{ // rotated pages
  const d = await PDFDocument.load(fs.readFileSync(f("a.pdf")));
  d.getPages().forEach((p) => p.setRotation(degrees(90)));
  put("rotated.pdf", await d.save());
}
{ // a document-like PDF: heading, paragraph, table, bullets, image
  const d = await PDFDocument.create();
  const font = await d.embedFont(StandardFonts.Helvetica);
  const bold = await d.embedFont(StandardFonts.HelveticaBold);
  const p = d.addPage([595, 842]);
  p.drawText("Quarterly Report", { x: 72, y: 760, size: 26, font: bold });
  const para = ["This report sums up the quarter. Revenue grew in every region and the", "team shipped two products on time. Details follow in the table below."];
  para.forEach((t, i) => p.drawText(t, { x: 72, y: 720 - i * 15, size: 11, font }));
  p.drawText("Results", { x: 72, y: 670, size: 16, font: bold });
  [["Region", "Revenue", "Growth"], ["North", "1200", "12%"], ["South", "950", "8%"], ["West", "780", "15%"]].forEach((row, r) =>
    row.forEach((cell, c) => p.drawText(cell, { x: 72 + c * 160, y: 640 - r * 15, size: 11, font: r === 0 ? bold : font })),
  );
  ["• Hire two engineers", "• Open the Berlin office", "• Launch the mobile app"].forEach((t, i) => p.drawText(t, { x: 72, y: 560 - i * 15, size: 11, font }));
  const jpg = await d.embedJpg(fs.readFileSync(f("photo.jpg")));
  p.drawImage(jpg, { x: 72, y: 300, width: 240, height: 180 });
  put("report.pdf", await d.save());
}
{ // two columns
  const d = await PDFDocument.create();
  const font = await d.embedFont(StandardFonts.Helvetica);
  const p = d.addPage([595, 842]);
  const left = ["Left column starts here and", "continues on the next line of", "the left column only."];
  const right = ["Right column text begins at", "the top and keeps going down", "the right side of the page."];
  left.forEach((t, i) => p.drawText(t, { x: 50, y: 760 - i * 14, size: 11, font }));
  right.forEach((t, i) => p.drawText(t, { x: 320, y: 760 - i * 14, size: 11, font }));
  for (let i = 0; i < 4; i++) {
    p.drawText(`Left more ${i} words here.`, { x: 50, y: 700 - i * 14, size: 11, font });
    p.drawText(`Right more ${i} words here.`, { x: 320, y: 700 - i * 14, size: 11, font });
  }
  put("twocol.pdf", await d.save());
}
{ // photo-heavy PDF for compression
  const d = await PDFDocument.create();
  const jpg = await d.embedJpg(fs.readFileSync(f("big.jpg")));
  for (let i = 0; i < 3; i++) d.addPage([595, 842]).drawImage(jpg, { x: 20, y: 200, width: 555, height: 416 });
  put("photos.pdf", await d.save());
}
{ // scanned: page 1 is only a picture of text, page 2 has real text
  const d = await PDFDocument.create();
  const jpg = await d.embedJpg(fs.readFileSync(f("scanpage.jpg")));
  d.addPage([595, 842]).drawImage(jpg, { x: 0, y: 0, width: 595, height: 842 });
  const font = await d.embedFont(StandardFonts.Helvetica);
  const p = d.addPage([595, 842]);
  ["This second page was typed, not scanned, so it already", "has a text layer that search and copy can use as it is."].forEach((t, i) =>
    p.drawText(t, { x: 50, y: 760 - i * 16, size: 12, font }),
  );
  put("scan.pdf", await d.save());
}
{ // damaged: the startxref offset points nowhere
  const good = fs.readFileSync(f("a.pdf"), "latin1");
  put("damaged.pdf", Buffer.from(good.replace(/startxref\s+\d+/, "startxref\n999999"), "latin1"));
}

/* ---------- Word ---------- */
{
  const doc = new Document({
    numbering: { config: [{ reference: "b", levels: [{ level: 0, format: LevelFormat.BULLET, text: "", alignment: AlignmentType.LEFT, style: { run: { font: "Symbol" } } }] }] },
    sections: [{
      properties: { page: { size: { width: 11906, height: 16838 }, margin: { top: 1418, bottom: 1418, left: 1418, right: 1418 } } },
      headers: { default: new Header({ children: [new Paragraph("Acme · Offer 14/2026")] }) },
      footers: { default: new Footer({ children: [new Paragraph("hello@example.com · +1 555 0100")] }) },
      children: [
        new Paragraph({ text: "Offer for event filming", heading: HeadingLevel.TITLE }),
        new Paragraph({ children: [new TextRun("Dear client, here is our offer. Unicode check: Ђорђе Љиљана Čačak Đurđevdan Žabljak.")] }),
        new Paragraph({ text: "Items", heading: HeadingLevel.HEADING_1 }),
        new Table({ rows: [["Item", "Qty", "Price"], ["Drone", "1 day", "200 €"], ["Edit", "3 days", "450 €"]].map((r) => new TableRow({ children: r.map((c) => new TableCell({ children: [new Paragraph(c)] })) })) }),
        new Paragraph({ children: [new ImageRun({ type: "jpg", data: fs.readFileSync(f("photo.jpg")), transformation: { width: 240, height: 180 } })] }),
        new Paragraph({ children: [new PageBreak()] }),
        new Paragraph({ text: "Terms", heading: HeadingLevel.HEADING_1 }),
        ...["50% upfront", "Delivery in 7 days", "Two rounds of changes"].map((t) => new Paragraph({ text: t, numbering: { reference: "b", level: 0 } })),
      ],
    }],
  });
  put("offer.docx", await Packer.toBuffer(doc));
}
put("old.doc", "not really a doc");
put("notes.md", "# Meeting notes\n\nAgreed on the **fair** shoot, 2026.\n\n- Filming: 3 days\n- Editing: 5 days\n\n| Item | Price |\n|---|---|\n| Drone | 200 € |\n\n<img src=x onerror=\"alert(1)\">\n");
put("text.txt", "Plain text.\nČćšžđ ЉУБАВ 123.\n");

/* ---------- PowerPoint ---------- */
{
  const { default: PptxGenJS } = await import("pptxgenjs");
  const pptx = new PptxGenJS();
  pptx.layout = "LAYOUT_16x9";
  const s1 = pptx.addSlide();
  s1.background = { color: "1E3A8A" };
  s1.addText("Quarterly Review", { x: 0.6, y: 1.8, w: 8.8, h: 1, fontSize: 40, bold: true, color: "FFFFFF" });
  s1.addText("Prepared for the board · Ђорђе Čačak", { x: 0.6, y: 2.9, w: 8.8, h: 0.6, fontSize: 18, color: "C7D2FE" });
  const s2 = pptx.addSlide();
  s2.addText("Highlights", { x: 0.5, y: 0.3, w: 9, h: 0.8, fontSize: 28, bold: true, color: "111111" });
  s2.addText([{ text: "Revenue up 12%", options: { bullet: true } }, { text: "Two products shipped", options: { bullet: true } }, { text: "Berlin office opened", options: { bullet: true } }], { x: 0.5, y: 1.3, w: 4.5, h: 2.5, fontSize: 18 });
  s2.addImage({ path: path.join(FX, "photo.jpg"), x: 5.4, y: 1.3, w: 4, h: 3 });
  const s3 = pptx.addSlide();
  s3.addText("Results by region", { x: 0.5, y: 0.3, w: 9, h: 0.8, fontSize: 28, bold: true });
  s3.addTable([["Region", "Revenue", "Growth"], ["North", "1200", "12%"], ["South", "950", "8%"]], { x: 0.5, y: 1.3, w: 9, fontSize: 16, border: { type: "solid", pt: 1, color: "999999" } });
  s3.addShape(pptx.ShapeType.rect, { x: 0.5, y: 3.6, w: 2, h: 1, fill: { color: "F97316" } });
  await pptx.writeFile({ fileName: path.join(FX, "deck.pptx") });
  put("old.ppt", "not really a ppt");
}

/* ---------- spreadsheets ---------- */
{
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([["Month", "Income", "Costs"], ["January", 1200, 800], ["February", 1500, 900]]), "Income");
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([["Client", "City"], ["Arena", "Belgrade"], ["Acme", "Novi Sad"]]), "Clients");
  XLSX.writeFile(wb, f("budget.xlsx"));
  XLSX.writeFile(wb, f("budget.ods"), { bookType: "ods" });
  put("list.csv", "Name,City\nŽarko,Čačak\nĐorđe,Niš\n");
}
console.log("fixtures:", fs.readdirSync(FX).join(" "));
