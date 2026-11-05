# ilovetoconvert

Free PDF, image and document converter that runs entirely in your browser. Files are never uploaded, because there's no server to upload them to. No sign-up, no watermark, no limits, no tracking.

**Live: [ilovetoconvert.com](https://ilovetoconvert.com)**

![ilovetoconvert home page](docs/screenshot.png)

## What it does

| Tool | Reads | Writes |
| --- | --- | --- |
| [Images to PDF](https://ilovetoconvert.com/images-to-pdf) | JPG, PNG, WebP, **HEIC** (iPhone), **multi-page TIFF**, **PSD**, **SVG**, **AVIF**, GIF, BMP, ICO | One PDF in the order you choose; A4, Letter or image-sized pages; automatic orientation |
| [Word to PDF](https://ilovetoconvert.com/word-to-pdf) | .docx, **Markdown**, plain text | PDF with real, selectable text, headers, footers, tables and images |
| [PowerPoint to PDF](https://ilovetoconvert.com/powerpoint-to-pdf) | .pptx | One slide per page at the slide's size; our own renderer: theme colours/fonts, layout and master placeholders, bullets and levels, shapes, pictures, tables, groups, backgrounds |
| [Excel to PDF](https://ilovetoconvert.com/excel-to-pdf) | .xlsx, .xls, **.ods**, **CSV** | PDF with every sheet, landscape or portrait |
| [Merge PDF](https://ilovetoconvert.com/merge-pdf) | PDFs | One PDF |
| [Split PDF](https://ilovetoconvert.com/split-pdf) | PDF + ranges like `1-3, 5, 8-` | One PDF per page, chosen pages, or the PDF minus pages you delete |
| [Rotate PDF](https://ilovetoconvert.com/rotate-pdf) | PDF | All pages or only the ones you pick |
| [Organize PDF](https://ilovetoconvert.com/organize-pdf) | one or more PDFs | Every page as a thumbnail: drag to reorder, rotate, delete, mix pages from several PDFs; pages copied as they are |
| [Sign PDF](https://ilovetoconvert.com/sign-pdf) | PDF + signature | Draw, type (handwriting fonts) or upload a signature (paper removed automatically), drag and resize it on any page; [add text](https://ilovetoconvert.com/add-text-to-pdf) as real, selectable text in any script; rotated pages handled |
| [PDF to JPG / PNG](https://ilovetoconvert.com/pdf-to-jpg) | PDF | One image per page at 72, 150 or 300 dpi |
| [PDF to Word](https://ilovetoconvert.com/pdf-to-word) | PDF | Editable .docx: paragraphs, headings, lists, bold/italic, tables, images; also [PDF to text](https://ilovetoconvert.com/pdf-to-text) and [extract images](https://ilovetoconvert.com/extract-images-from-pdf) |
| [Compress PDF](https://ilovetoconvert.com/compress-pdf) | PDF | Smaller PDF: photos re-encoded, text and vectors untouched; or a **target size** ([under 200 KB](https://ilovetoconvert.com/compress-pdf-to-200kb), 500 KB, [1 MB](https://ilovetoconvert.com/compress-pdf-to-1mb)) reached step by step |
| [OCR](https://ilovetoconvert.com/image-to-text) | images, scanned PDFs | Text recognition with Tesseract (WebAssembly) in 27 languages incl. Serbian Cyrillic: copyable text / .txt, or a [searchable PDF](https://ilovetoconvert.com/ocr-pdf) with an invisible text layer laid exactly over each scanned page |
| [Page numbers](https://ilovetoconvert.com/add-page-numbers-to-pdf) | PDF | Numbers in any corner, 1 / 1 of N / Page 1 of N, skip the cover |
| [Watermark PDF](https://ilovetoconvert.com/watermark-pdf) | PDF + text or logo | Diagonal or tiled stamp, any script, chosen opacity |
| [Protect / unlock PDF](https://ilovetoconvert.com/protect-pdf) | PDF + password | AES-256 encryption with qpdf (WebAssembly); unlock with the password; [repair](https://ilovetoconvert.com/repair-pdf) broken cross-reference tables |
| [Image converter](https://ilovetoconvert.com/image-converter) | everything above | JPG, PNG, WebP, or an **ICO favicon** with 16 to 256 px inside |
| [Compress images](https://ilovetoconvert.com/compress-image) | JPG, PNG, WebP, HEIC… | A **target size** ([under 20 KB](https://ilovetoconvert.com/compress-image-to-20kb), 50, 100, 200 KB, 1 MB): the best quality that fits, found by binary search; [PNG](https://ilovetoconvert.com/compress-png) reduced to 256 or 64 colours, transparency kept |

Those tools sit behind 69 landing pages, one per conversion people search for: [HEIC to JPG](https://ilovetoconvert.com/heic-to-jpg), [PSD to PNG](https://ilovetoconvert.com/psd-to-png), [TIFF to PDF](https://ilovetoconvert.com/tiff-to-pdf), [favicon generator](https://ilovetoconvert.com/favicon-generator) and so on. Each page opens its tool with the right preset.

A search box on every page finds the right tool from the words people actually type: "jpeg to pdf", "iphone photo", "photoshop", "combine pdfs", "shrink image", and a few Serbian ones. Press `/` or `Ctrl/⌘ K` to jump to it.

![HEIC to JPG page](docs/tool.png)

## How it works

- **PDF editing** with [pdf-lib](https://pdf-lib.js.org): pages are copied, rotated and removed without re-rendering, so text, links and quality stay exactly as they were.
- **PDF rendering** with [pdf.js](https://mozilla.github.io/pdf.js/), the legacy build on purpose: the modern one calls `Map.prototype.getOrInsertComputed`, which browsers don't ship yet.
- **Images** go through a canvas, so phone photos come out upright. HEIC is decoded with libheif ([heic2any](https://github.com/alexcorvi/heic2any)), TIFF with [UTIF](https://github.com/photopea/UTIF.js) (every page, previews skipped), PSD with [ag-psd](https://github.com/Agamnentzar/ag-psd) using the flattened image Photoshop stores. ICO files are written by hand: a directory plus one PNG per size.
- **Word, Markdown and spreadsheets** are laid out as HTML ([docx-preview](https://github.com/VolodymyrBaydalka/docxjs), [marked](https://marked.js.org), [SheetJS](https://sheetjs.com)) and saved by the browser's own print engine, which is why the PDF has real text instead of a picture of text. Word bullets drawn with Symbol/Wingdings characters are swapped for real ones, and each Word page prints at its own paper size.
- Heavy libraries load only when their tool runs. A landing page is about 12 KB of HTML plus about 85 KB of gzipped JavaScript.

## SEO

Every route is prerendered at build time (`react-dom/static`), so crawlers get complete HTML: title, meta description, canonical URL, Open Graph and Twitter cards, and JSON-LD (`WebApplication`, `BreadcrumbList`, `FAQPage`, `HowTo`, plus `WebSite` and an `ItemList` of tools on the home page). The build also writes `sitemap.xml`, `robots.txt` and a real `404.html`. Unknown paths return a 404 status, not the home page.

Canonical URLs, Open Graph and the sitemap use `https://ilovetoconvert.com`; set `VITE_SITE_URL` to build a copy for another origin.

## Run it

```bash
npm install
npm run dev       # http://localhost:5173 (client-rendered)
npm test          # unit tests: page ranges, layout, PDF reconstruction, search, ICO
npm run e2e       # every tool in headless Chrome against generated fixtures (macOS for HEIC/TIFF/PSD)
npm run build     # type-check, client + SSR build, prerender into dist/
```

`dist/` is a static site. `vercel.json` turns on clean URLs (`/heic-to-jpg` serves `heic-to-jpg.html`).

The old binary `.doc` format can't be read in a browser; the Word tool says so and explains how to save it as `.docx`.

## License

MIT · made by [Stefan Popović](https://popzify.com/links)
