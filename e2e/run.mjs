// End-to-end checks for every tool, in a real browser.
// Usage: node e2e/run.mjs [baseUrl] [suite...]   (no baseUrl: serves dist/ itself)
// Suites: core search word extra qpdf (default: all). Run `node e2e/make-fixtures.mjs` first.
import fs from "node:fs";
import path from "node:path";
import puppeteer from "puppeteer";
import { PDFDocument } from "pdf-lib";
import JSZip from "jszip";
import { serve } from "./serve.mjs";

const HERE = import.meta.dirname;
const FX = path.join(HERE, ".fixtures");
const OUT = path.join(HERE, ".out");
const args = process.argv.slice(2);
let base = args[0]?.startsWith("http") ? args.shift() : null;
const suites = new Set(args.length ? args : ["core", "search", "word", "extra", "qpdf"]);
let server;
if (!base) ({ server, url: base } = await serve(path.join(HERE, "..", "dist")));
fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });
const has = (f) => fs.existsSync(path.join(FX, f));

const browser = await puppeteer.launch({ headless: true });
const results = [];
const errors = [];
const ok = (name, cond, detail = "") => results.push(`${cond ? "PASS" : "FAIL"}  ${name}${detail ? "  — " + detail : ""}`);
const skip = (name) => results.push(`SKIP  ${name}`);
let n = 0;

/** Opens a tool page with downloads going to a fresh folder. */
async function open(slug, { lang = "en" } = {}) {
  const dir = path.join(OUT, `${++n}-${slug}`);
  fs.mkdirSync(dir);
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 900 });
  page.on("pageerror", (e) => errors.push(`${slug}: ${e.message}`));
  page.on("console", (m) => m.type() === "error" && !/Failed to load resource/.test(m.text()) && errors.push(`${slug} console: ${m.text().slice(0, 200)}`));
  page.on("dialog", async (d) => (errors.push(`${slug}: DIALOG ${d.message()}`), d.dismiss()));
  await page.evaluateOnNewDocument((l) => localStorage.setItem("lang", l), lang);
  const cdp = await page.createCDPSession();
  await cdp.send("Browser.setDownloadBehavior", { behavior: "allow", downloadPath: dir });
  await page.goto(`${base}/${slug}`, { waitUntil: "networkidle0" });
  await page.waitForSelector("input[type=file]");
  return { page, dir };
}
const upload = async (page, files) => (await page.$("input[type=file]")).uploadFile(...files.map((f) => path.join(FX, f)));
const button = (page, text) =>
  page.evaluate((t) => {
    const b = [...document.querySelectorAll("button")].find((x) => x.textContent.trim() === t);
    if (!b) throw new Error("no button " + t);
    b.click();
  }, text);
async function go(page) {
  await page.waitForFunction(() => document.querySelector("button.primary") && !document.querySelector("button.primary").disabled, { timeout: 60000 });
  await page.click("button.primary");
  await page.waitForSelector(".results, .error", { timeout: 180000 });
  return page.$eval(".error", (e) => e.textContent).catch(() => null);
}
async function downloads(page, dir, expected) {
  for (const b of await page.$$(".results button.secondary")) await b.click();
  for (let i = 0; i < 160; i++) {
    const files = fs.readdirSync(dir).filter((f) => !f.endsWith(".crdownload"));
    if (files.length >= expected) return files.sort().map((f) => path.join(dir, f));
    await new Promise((r) => setTimeout(r, 250));
  }
  return fs.readdirSync(dir).sort().map((f) => path.join(dir, f));
}
const pdfPages = async (file) => (await PDFDocument.load(fs.readFileSync(file), { ignoreEncryption: true })).getPageCount();
const docxXml = async (file) => (await JSZip.loadAsync(fs.readFileSync(file))).file("word/document.xml").async("string");
const hint = (page) => page.$$eval(".hint", (els) => els.map((e) => e.textContent).join(" | "));

/* ---------------- core tools ---------------- */
if (suites.has("core")) {
  {
    const imgs = ["photo.jpg", "tall.jpg", "iphone.heic", "scan-2pages.tif", "design.psd", "logo.svg", "photo.avif", "old.bmp", "wide.png"].filter(has);
    const { page, dir } = await open("images-to-pdf");
    await upload(page, imgs);
    await page.waitForFunction((k) => document.querySelectorAll(".files li").length === k, {}, imgs.length);
    const err = await go(page);
    const [file] = await downloads(page, dir, 1);
    const doc = file ? await PDFDocument.load(fs.readFileSync(file)) : null;
    const expectPages = imgs.length + (imgs.includes("scan-2pages.tif") ? 1 : 0);
    ok("images → PDF, every format", !err && doc?.getPageCount() === expectPages, `pages=${doc?.getPageCount()} of ${expectPages} (${imgs.length} files)`);
    const o = doc?.getPages().map((p) => (p.getWidth() > p.getHeight() ? "L" : "P")).join("");
    ok("images → PDF orientation", o?.[0] === "L" && o?.[1] === "P", o);
    await page.close();
  }
  {
    const imgs = ["iphone.heic", "scan-2pages.tif", "design.psd", "logo.svg", "photo.avif"].filter(has);
    const { page, dir } = await open("image-converter");
    await upload(page, imgs);
    await page.waitForSelector(".files li");
    const err = await go(page);
    const files = await downloads(page, dir, imgs.length + (imgs.includes("scan-2pages.tif") ? 1 : 0));
    ok("convert images → JPG", !err && files.length === imgs.length + (imgs.includes("scan-2pages.tif") ? 1 : 0) && files.every((f) => f.endsWith(".jpg")), files.map((f) => path.basename(f)).join(", "));
    await page.close();
  }
  {
    const { page, dir } = await open("favicon-generator");
    await upload(page, ["logo.svg"]);
    await page.waitForSelector(".files li");
    await go(page);
    const [file] = await downloads(page, dir, 1);
    const buf = file ? fs.readFileSync(file) : Buffer.alloc(6);
    ok("favicon .ico with 6 sizes", file?.endsWith(".ico") && buf.readUInt16LE(4) === 6);
    await page.close();
  }
  {
    const { page, dir } = await open("merge-pdf");
    await upload(page, ["a.pdf", "b.pdf"]);
    await page.waitForFunction(() => document.querySelectorAll(".files li").length === 2);
    await go(page);
    const [file] = await downloads(page, dir, 1);
    ok("merge 3 + 2 pages", file && (await pdfPages(file)) === 5);
    await page.close();
  }
  for (const [slug, ranges, files, pages] of [["extract-pdf-pages", "3,1", 1, 2], ["split-pdf", "", 3, 1], ["delete-pdf-pages", "2", 1, 2]]) {
    const { page, dir } = await open(slug);
    await upload(page, ["a.pdf"]);
    await page.waitForSelector(".options");
    if (ranges) await page.type(".field input", ranges);
    await go(page);
    const out = await downloads(page, dir, files);
    ok(`${slug}`, out.length === files && out[0] && (await pdfPages(out[0])) === pages, `${out.length} files`);
    await page.close();
  }
  {
    const { page } = await open("extract-pdf-pages");
    await upload(page, ["a.pdf"]);
    await page.waitForSelector(".field input");
    await page.type(".field input", "2-9");
    const err = await go(page);
    ok("bad page range is explained", /2-9/.test(err ?? ""), err);
    await page.close();
  }
  {
    const { page, dir } = await open("rotate-pdf");
    await upload(page, ["a.pdf"]);
    await page.waitForSelector(".options");
    await go(page);
    const [file] = await downloads(page, dir, 1);
    const doc = file && (await PDFDocument.load(fs.readFileSync(file)));
    ok("rotate 90°", doc && doc.getPages().every((p) => p.getRotation().angle === 90));
    await page.close();
  }
  {
    const { page, dir } = await open("pdf-to-jpg");
    await upload(page, ["b.pdf"]);
    await page.waitForSelector(".options");
    const err = await go(page);
    const files = await downloads(page, dir, 2);
    ok("PDF → JPG per page", !err && files.length === 2, err ?? "");
    await page.close();
  }
  for (const [slug, file] of [["word-to-pdf", "offer.docx"], ["markdown-to-pdf", "notes.md"], ["txt-to-pdf", "text.txt"], ["excel-to-pdf", "budget.xlsx"], ["ods-to-pdf", "budget.ods"], ["csv-to-pdf", "list.csv"]]) {
    const { page } = await open(slug);
    await upload(page, [file]);
    await page.waitForFunction(() => !document.querySelector("button.primary")?.disabled, { timeout: 60000 });
    await page.evaluate(() => (window.print = () => {}));
    await page.click("button.primary");
    const title = await page.title();
    const pdf = Buffer.from(await page.pdf({ preferCSSPageSize: true, printBackground: true }));
    fs.writeFileSync(path.join(OUT, file + ".pdf"), pdf);
    const pages = (await PDFDocument.load(pdf)).getPageCount();
    ok(`${file} → PDF (print)`, pages >= 1 && title === file.replace(/\.[^.]+$/, ""), `pages=${pages} title=${title}`);
    await page.close();
  }
  for (const [file, slides, w, h] of [["deck.pptx", 3, 720, 405], ["placeholders.pptx", 4, 720, 540]]) {
    const src = has(file) ? file : `../static/${file}`;
    const { page } = await open("powerpoint-to-pdf");
    await upload(page, [src]);
    await page.waitForFunction(() => !document.querySelector("button.primary")?.disabled || document.querySelector(".error"), { timeout: 60000 });
    await page.evaluate(() => (window.print = () => {}));
    await page.click("button.primary");
    const pdf = Buffer.from(await page.pdf({ preferCSSPageSize: true, printBackground: true }));
    fs.writeFileSync(path.join(OUT, file + ".pdf"), pdf);
    const doc = await PDFDocument.load(pdf);
    const pg = doc.getPage(0);
    ok(`${file} → PDF, one slide per page`, doc.getPageCount() === slides && Math.abs(pg.getWidth() - w) < 2 && Math.abs(pg.getHeight() - h) < 2, `pages=${doc.getPageCount()} size=${Math.round(pg.getWidth())}x${Math.round(pg.getHeight())}`);
    await page.close();
  }
  {
    const { page } = await open("powerpoint-to-pdf");
    await upload(page, ["old.ppt"]);
    const err = await page.waitForSelector(".error").then((e) => e.evaluate((x) => x.textContent));
    ok(".ppt is explained", /pptx/i.test(err));
    await page.close();
  }
  {
    const { page } = await open("word-to-pdf");
    await upload(page, ["old.doc"]);
    const err = await page.waitForSelector(".error").then((e) => e.evaluate((x) => x.textContent));
    ok(".doc is explained", /docx/i.test(err));
    await page.close();
  }
}

/* ---------------- search ---------------- */
if (suites.has("search")) {
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 900 });
  await page.goto(base + "/", { waitUntil: "networkidle0" });
  for (const [q, first] of [["jpeg to pdf", "JPG to PDF"], ["iphone", "HEIC to JPG"], ["combine pdf", "Merge PDF"], ["password", "Protect PDF"], ["pdf word", "PDF to Word"], ["smanji", "Compress images"], ["image 100kb", "Compress image to 100 KB"], ["pdf under 1mb", "Compress PDF to 1 MB"]]) {
    await page.click(".search.hero input", { clickCount: 3 });
    await page.keyboard.press("Backspace");
    await page.type(".search.hero input", q);
    await page.waitForSelector('[role="option"] strong');
    const got = await page.$eval('[role="option"] strong', (e) => e.textContent);
    ok(`search "${q}"`, got === first, got);
  }
  await page.keyboard.press("Enter");
  await page.waitForFunction(() => location.pathname !== "/");
  ok("search Enter navigates", true, await page.evaluate(() => location.pathname));
  const r = await page.goto(base + "/no-such-page");
  ok("404 status with search", r.status() === 404 && !!(await page.$(".search.hero input")));
  await page.close();
}

/* ---------------- PDF → Word / text / images ---------------- */
if (suites.has("word")) {
  {
    const { page, dir } = await open("pdf-to-word");
    await upload(page, ["report.pdf"]);
    const err = await go(page);
    const [file] = await downloads(page, dir, 1);
    const xml = file ? await docxXml(file) : "";
    ok("PDF → Word: heading, table, bullets, image", !err && /Quarterly Report/.test(xml) && (xml.match(/<w:tbl>/g) ?? []).length === 1 && (xml.match(/<w:numPr>/g) ?? []).length === 3 && /<w:drawing>/.test(xml) && /Heading1/.test(xml),
      `tables=${(xml.match(/<w:tbl>/g) ?? []).length} bullets=${(xml.match(/<w:numPr>/g) ?? []).length} image=${/<w:drawing>/.test(xml)}`);
    await page.close();
  }
  {
    const { page, dir } = await open("pdf-to-word");
    await upload(page, ["twocol.pdf"]);
    await go(page);
    const [file] = await downloads(page, dir, 1);
    const text = (await docxXml(file)).replace(/<[^>]+>/g, "");
    ok("PDF → Word: two columns read left then right", text.indexOf("Left more 3") < text.indexOf("Right column text"));
    await page.close();
  }
  {
    const { page, dir } = await open("pdf-to-text");
    await upload(page, ["report.pdf"]);
    await go(page);
    const [file] = await downloads(page, dir, 1);
    const txt = file ? fs.readFileSync(file, "utf8") : "";
    ok("PDF → text", /This report sums up the quarter\. Revenue grew in every region and the team shipped/.test(txt), txt.slice(0, 80).replace(/\n/g, " / "));
    await page.close();
  }
  {
    const { page, dir } = await open("extract-images-from-pdf");
    await upload(page, ["report.pdf"]);
    await go(page);
    const files = await downloads(page, dir, 1);
    ok("extract images", files.length === 1 && files[0].endsWith(".png"));
    await page.close();
  }
}

/* ---------------- compress, page numbers, watermark ---------------- */
if (suites.has("extra")) {
  {
    const { page, dir } = await open("compress-pdf");
    await upload(page, ["photos.pdf"]);
    await page.waitForSelector(".options");
    await go(page);
    const [file] = await downloads(page, dir, 1);
    const before = fs.statSync(path.join(FX, "photos.pdf")).size, after = file ? fs.statSync(file).size : before;
    ok("compress photo PDF", after < before * 0.6 && (await pdfPages(file)) === 3, `${(before / 1e6).toFixed(1)} MB → ${(after / 1e6).toFixed(2)} MB`);
    await page.close();
  }
  {
    const { page } = await open("compress-pdf");
    await upload(page, ["a.pdf"]);
    await page.waitForSelector(".options");
    await go(page);
    ok("compress text-only PDF keeps the original", /already well compressed/.test(await hint(page)));
    await page.close();
  }
  {
    const imgs = ["big.jpg", "iphone.heic"].filter(has);
    const { page, dir } = await open("compress-image-to-100kb");
    await upload(page, imgs);
    await page.waitForSelector(".files li");
    await go(page);
    const files = await downloads(page, dir, imgs.length);
    const sizes = files.map((f) => fs.statSync(f).size);
    ok("image → under 100 KB", files.length === imgs.length && sizes.every((b) => b <= 100 * 1024) && sizes.every((b) => b > 60 * 1024), sizes.map((b) => `${(b / 1024).toFixed(0)} KB`).join(", "));
    await page.close();
  }
  {
    const { page, dir } = await open("compress-image-to-20kb");
    await upload(page, ["big.jpg"]);
    await page.waitForSelector(".files li");
    await go(page);
    const [file] = await downloads(page, dir, 1);
    const b = file ? fs.statSync(file).size : Infinity;
    ok("image → under 20 KB", b <= 20 * 1024, `${(b / 1024).toFixed(1)} KB`);
    await page.close();
  }
  {
    const { page, dir } = await open("compress-png");
    await upload(page, ["shot.png", "wide.png"]);
    await page.waitForSelector(".files li");
    await go(page);
    const files = await downloads(page, dir, 2);
    const shot = files.find((f) => f.includes("shot")), wide = files.find((f) => f.includes("wide"));
    const before = fs.statSync(path.join(FX, "shot.png")).size, after = shot ? fs.statSync(shot).size : before;
    const png = shot ? fs.readFileSync(shot) : Buffer.alloc(32);
    // IHDR: width at 16, colour type 3 (palette) at 25
    ok("PNG → 256 colours, still PNG", png.readUInt32BE(16) === 1400 && png[25] === 3 && after < before * 0.6, `${(before / 1024).toFixed(0)} KB → ${(after / 1024).toFixed(0)} KB`);
    const w = wide ? fs.readFileSync(wide) : Buffer.alloc(32);
    // transparency survives as a tRNS chunk next to the palette
    ok("PNG compression keeps transparency", w[25] === 3 && w.includes(Buffer.from("tRNS")));
    await page.close();
  }
  {
    const { page, dir } = await open("compress-pdf-to-1mb");
    await upload(page, ["photos.pdf"]);
    await page.waitForSelector(".options");
    await go(page);
    const [file] = await downloads(page, dir, 1);
    const b = file ? fs.statSync(file).size : Infinity;
    ok("PDF → under 1 MB", b <= 1024 * 1024 && (await pdfPages(file)) === 3, `${(b / 1024).toFixed(0)} KB`);
    await page.close();
  }
  {
    const { page } = await open("compress-pdf-to-200kb");
    await upload(page, ["a.pdf"]);
    await page.waitForSelector(".options");
    await go(page);
    ok("PDF already under target", /already under 200 KB/.test(await hint(page)));
    await page.close();
  }
  {
    const { page, dir } = await open("add-page-numbers-to-pdf");
    await upload(page, ["rotated.pdf"]);
    await page.waitForSelector(".options");
    await button(page, "Page 1 of 10");
    await go(page);
    const [file] = await downloads(page, dir, 1);
    ok("page numbers on rotated pages", file && (await pdfPages(file)) === 3);
    await page.close();
  }
  {
    const { page, dir } = await open("watermark-pdf");
    await upload(page, ["report.pdf"]);
    await page.waitForSelector(".options");
    await page.click(".field input", { clickCount: 3 });
    await page.keyboard.type("ПОВЕРЉИВО Čćž");
    await button(page, "Across the page");
    await go(page);
    const [file] = await downloads(page, dir, 1);
    ok("watermark, Cyrillic, tiled", file && (await pdfPages(file)) === 1);
    await page.close();
  }
}

/* ---------------- protect, unlock, repair ---------------- */
if (suites.has("qpdf")) {
  let locked;
  {
    const { page, dir } = await open("protect-pdf");
    await upload(page, ["a.pdf"]);
    await page.waitForSelector(".field input");
    const [pw, again] = await page.$$(".field input");
    await pw.type("test1234");
    await again.type("test1234");
    const err = await go(page);
    [locked] = await downloads(page, dir, 1);
    let encrypted = false;
    try {
      await PDFDocument.load(fs.readFileSync(locked));
    } catch (e) {
      encrypted = /encrypt/i.test(String(e));
    }
    ok("protect PDF (AES-256)", !err && encrypted && fs.readFileSync(locked, "latin1").includes("/AESV3"), err ?? "");
    if (locked) fs.copyFileSync(locked, path.join(FX, "locked.pdf"));
    await page.close();
  }
  for (const [pw, expectOk] of [["wrong", false], ["test1234", true]]) {
    const { page, dir } = await open("unlock-pdf");
    await upload(page, ["locked.pdf"]);
    await page.waitForSelector(".field input");
    await (await page.$(".field input")).type(pw);
    const err = await go(page);
    if (expectOk) {
      const [file] = await downloads(page, dir, 1);
      const doc = file && (await PDFDocument.load(fs.readFileSync(file)));
      ok("unlock with the right password", !err && doc?.getPageCount() === 3, err ?? "");
    } else ok("unlock with a wrong password is refused", /wrong password/i.test(err ?? ""), err);
    await page.close();
  }
  {
    const { page } = await open("unlock-pdf");
    await upload(page, ["a.pdf"]);
    await page.waitForSelector("button.primary");
    const err = await go(page);
    ok("unlock an unlocked PDF is explained", /isn't locked/.test(err ?? ""), err);
    await page.close();
  }
  {
    const { page, dir } = await open("repair-pdf");
    await upload(page, ["damaged.pdf"]);
    await page.waitForSelector("button.primary");
    const err = await go(page);
    const [file] = await downloads(page, dir, 1);
    ok("repair a broken xref", !err && file && (await pdfPages(file)) === 3, err ?? "");
    await page.close();
  }
}

await browser.close();
server?.close();
console.log(results.join("\n"));
const failed = results.filter((r) => r.startsWith("FAIL")).length;
console.log(`\n${results.length - failed} passed, ${failed} failed${errors.length ? `\nBROWSER ERRORS:\n${errors.join("\n")}` : ", no browser errors"}`);
process.exit(failed || errors.length ? 1 : 0);
