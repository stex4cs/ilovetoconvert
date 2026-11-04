# Konvertuj

Free PDF and image tools that run entirely in the browser. Files are never uploaded: there is no server to upload them to. No sign-up, no watermark, no limits, no tracking.

**Live: [konvertuj.vercel.app](https://konvertuj.vercel.app)** · Serbian and English

![Konvertuj](docs/screenshot.png)

## Tools

| Tool | Input | Output |
| --- | --- | --- |
| Images to PDF | JPG, PNG, WebP, **HEIC** (iPhone), **multi-page TIFF** (scanners), **PSD**, **SVG**, **AVIF**, GIF, BMP, ICO | One PDF, pages in the order you choose; A4, Letter or image size; automatic orientation |
| Word to PDF | .docx, **Markdown**, plain text | PDF with real, selectable text, headers, footers, tables, images |
| Excel to PDF | .xlsx, .xls, **.ods**, **CSV** | PDF, every sheet included, landscape or portrait |
| Merge PDF | PDFs | One PDF |
| Extract or delete pages | PDF + page ranges (`1-3, 5, 8-`) | Chosen pages, one PDF per page, or the PDF without the pages you remove |
| Rotate PDF | PDF | All pages or only the ones you choose |
| PDF to images | PDF | JPG or PNG per page at 72, 150 or 300 dpi |
| Convert and resize images | everything Images to PDF reads | JPG, PNG, WebP, or an **ICO favicon** holding 16 to 256 px |

## How it works

- **PDF editing** with [pdf-lib](https://pdf-lib.js.org): merge, extract, rotate and delete without re-rendering, so text and quality stay exactly as they were.
- **PDF rendering** with [pdf.js](https://mozilla.github.io/pdf.js/) (the legacy build: the modern one relies on a `Map` method browsers don't ship yet).
- **Images** go through a canvas, so phone photos come out upright. HEIC is decoded with libheif ([heic2any](https://github.com/alexcorvi/heic2any)), TIFF with [UTIF](https://github.com/photopea/UTIF.js), PSD with [ag-psd](https://github.com/Agamnentzar/ag-psd) using the flattened image Photoshop stores.
- **Word, Markdown and spreadsheets** are laid out as HTML ([docx-preview](https://github.com/VolodymyrBaydalka/docxjs), [marked](https://marked.js.org), [SheetJS](https://sheetjs.com)) and turned into PDF by the browser's own print engine. That's why the result has real text instead of a picture of text. Word bullets drawn with Symbol/Wingdings characters are replaced with real ones, and each Word page prints at its own size.
- Every heavy library loads only when its tool needs it. The home page is about 75 KB gzipped.

The old binary `.doc` format can't be read in a browser; the tool says so and explains how to save it as `.docx`.

## Run it

```bash
npm install
npm run dev       # http://localhost:5173
npm test          # unit tests (page ranges, layout, PDF operations, ICO)
npm run build     # static site in dist/
```

It's a static site: any host that can serve `index.html` for every path works. `vercel.json` has the rewrite for Vercel.

## Srpski

Besplatni alati za PDF i slike koji rade u pregledaču: slike (i HEIC sa iPhone-a, TIFF skenovi, PSD, SVG) u PDF, Word i Excel u PDF, spajanje, deljenje i rotiranje PDF-a, PDF u slike, konverzija slika i favicon. Fajlovi se nigde ne šalju.

## License

MIT · made by [Stefan Popović](https://popzify.com/links)
