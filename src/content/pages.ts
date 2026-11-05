/**
 * Every landing page: one URL per thing people search for ("heic to jpg",
 * "merge pdf"), each with its own title, description, copy and FAQ, all
 * pointing at one of eight tools with the right preset.
 */
import { FORMATS, type FormatId } from "./formats";

export const BRAND = "ilovetoconvert";

export type ToolId =
  | "images-to-pdf" | "word-to-pdf" | "excel-to-pdf" | "merge-pdf"
  | "split-pdf" | "rotate-pdf" | "pdf-to-images" | "convert-images" | "pdf-to-word"
  | "compress-pdf" | "page-numbers" | "watermark-pdf" | "qpdf" | "ppt-to-pdf"
  | "ocr" | "organize-pdf" | "sign-pdf";

export type Preset = {
  type?: "image/jpeg" | "image/png" | "image/webp" | "image/x-icon";
  quality?: number;
  maxSide?: number;
  mode?: "ranges" | "each" | "delete";
  target?: "docx" | "txt" | "images" | "pdf";
  qpdf?: "protect" | "unlock" | "repair";
  /** Image: aim for this size in KB. PDF: aim for this size in KB. */
  targetKB?: number;
  /** PNG: reduce to this many colours (0 = lossless). */
  pngColors?: number;
  /** Sign PDF: which panel is open first. */
  start?: "signature" | "text";
};

export type Category = "pdf" | "image" | "document";

export type Page = {
  slug: string;
  tool: ToolId;
  preset?: Preset;
  category: Category;
  /** Short anchor text: "HEIC to JPG". */
  label: string;
  title: string;
  description: string;
  h1: string;
  lead: string;
  about: { heading: string; body: string[] };
  steps: string[];
  faq: { q: string; a: string }[];
  related: string[];
};

const F = FORMATS;

const PRIVACY_FAQ = {
  q: "Are my files uploaded anywhere?",
  a: "No. The conversion runs inside your browser on your own device. The files are never sent to a server, so nobody else can see them, and they're gone when you close the tab.",
};
const FREE_FAQ = {
  q: "Is it really free?",
  a: "Yes: no sign-up, no watermark, no daily limit and no ads. Because the work happens on your device, there are no server costs to pass on.",
};
const MOBILE_FAQ = {
  q: "Does it work on a phone?",
  a: "Yes, in Safari on iPhone and iPad and in Chrome on Android, as well as on any desktop browser. Very large files are faster on a computer.",
};

/* ---------------- image → image ---------------- */

const OUT: Record<string, Preset["type"]> = { jpg: "image/jpeg", png: "image/png", webp: "image/webp", ico: "image/x-icon" };

function imageConvert(from: FormatId, to: "jpg" | "png" | "webp", extra: { faq?: Page["faq"]; related?: string[] } = {}): Page {
  const a = F[from], b = F[to];
  const label = `${a.name} to ${b.name}`;
  return {
    slug: `${from}-to-${to}`,
    tool: "convert-images",
    preset: { type: OUT[to] },
    category: "image",
    label,
    title: `${label} Converter: Free, No Upload | ${BRAND}`,
    description: `Convert ${a.name} to ${b.name} free in your browser. Batch convert, keep quality, resize if you need to. Your files never leave your device.`,
    h1: `Convert ${a.name} to ${b.name}`,
    lead: `Turn ${a.name} images into ${b.name} in seconds, as many at once as you like. Everything runs in your browser, so your photos are never uploaded.`,
    about: {
      heading: `Why convert ${a.name} to ${b.name}?`,
      body: [a.about, a.leave, b.arrive].filter(Boolean) as string[],
    },
    steps: [
      `Drop your ${a.name} files into the box above, or click it to choose them.`,
      `${b.name} is already selected. Set the quality and maximum size if you want smaller files.`,
      `Click Convert and download each image, or all of them as one ZIP.`,
    ],
    faq: [
      ...(extra.faq ?? []),
      { q: `Can I convert several ${a.name} files at once?`, a: `Yes. Add as many as you like; each one becomes its own ${b.name}, and you can download them all as a ZIP.` },
      PRIVACY_FAQ,
      FREE_FAQ,
    ],
    related: extra.related ?? [],
  };
}

/* ---------------- images → PDF ---------------- */

function imagesToPdf(from: FormatId | "images", extra: { faq?: Page["faq"]; lead?: string } = {}): Page {
  const name = from === "images" ? "Images" : F[from].name;
  const label = `${name} to PDF`;
  return {
    slug: from === "images" ? "images-to-pdf" : `${from}-to-pdf`,
    tool: "images-to-pdf",
    category: "pdf",
    label,
    title: `${label}: Combine Into One PDF, Free | ${BRAND}`,
    description: `Convert ${from === "images" ? "JPG, PNG, HEIC, TIFF and other images" : name + " images"} to PDF free. Put them in order, choose A4 or Letter, download one PDF. Nothing is uploaded.`,
    h1: `${name} to PDF`,
    lead:
      extra.lead ??
      `Combine ${from === "images" ? "photos and scans" : name + " images"} into a single PDF, in the order you choose, on A4, Letter or pages the size of each image.`,
    about: {
      heading: `When you need ${from === "images" ? "your images" : name} as a PDF`,
      body: [
        ...(from === "images" ? [] : [F[from].about]),
        "Upload portals for applications, visas, insurance claims and university admissions usually take one PDF, not ten photos. Phone pictures of receipts or signed pages are easier to send, print and archive as one document.",
        "Wide images are turned to landscape automatically, phone photos come out the right way up, and transparent images stay sharp.",
      ],
    },
    steps: [
      "Drop your images into the box above. You can add more at any time.",
      "Drag them into the right order and choose page size, orientation and margin.",
      "Click Make PDF and download your document.",
    ],
    faq: [
      ...(extra.faq ?? []),
      { q: "Which image formats can I use?", a: "JPG, PNG, WebP, HEIC from iPhone, TIFF (every page of a multi-page scan), PSD, SVG, AVIF, GIF, BMP and ICO, mixed in one PDF if you like." },
      PRIVACY_FAQ,
      MOBILE_FAQ,
    ],
    related: [],
  };
}

/* ---------------- pages ---------------- */

const PAGES_RAW: Page[] = [
  // Images to PDF
  imagesToPdf("images"),
  imagesToPdf("jpg"),
  imagesToPdf("png"),
  imagesToPdf("heic", {
    lead: "Turn iPhone photos into one PDF without converting them to JPG first. HEIC files go straight in.",
    faq: [{ q: "Do I need to convert HEIC to JPG first?", a: "No. Drop the HEIC photos straight from your iPhone; they're decoded in the browser and placed on the PDF pages." }],
  }),
  imagesToPdf("tiff", {
    lead: "Turn scanned TIFF files into PDF. A multi-page TIFF becomes a multi-page PDF, every page included.",
    faq: [{ q: "What happens to a TIFF with several pages?", a: "Every page of the TIFF becomes its own page in the PDF, in the same order. Small preview images some scanners embed are skipped." }],
  }),
  imagesToPdf("webp"),

  // Image converters
  imageConvert("heic", "jpg", {
    faq: [
      { q: "Will the photo lose quality?", a: "At the default 85% quality the difference is invisible on a phone or computer screen. Choose 95% for printing." },
      { q: "Why won't my iPhone photo open on Windows?", a: "iPhones save photos as HEIC, which Windows can't open without an extra codec. Converting to JPG fixes it everywhere." },
    ],
  }),
  imageConvert("heic", "png"),
  imageConvert("webp", "jpg", {
    faq: [{ q: "Why do images I save from websites end up as WebP?", a: "Most large sites serve WebP because it's smaller. Converting to JPG makes the image usable in any app or upload form." }],
  }),
  imageConvert("webp", "png"),
  imageConvert("png", "jpg", {
    faq: [{ q: "What happens to the transparent background?", a: "JPG has no transparency, so transparent areas become white. Keep PNG (or WebP) if you need transparency." }],
  }),
  imageConvert("jpg", "png"),
  imageConvert("jpg", "webp"),
  imageConvert("png", "webp"),
  imageConvert("avif", "jpg"),
  imageConvert("avif", "png"),
  imageConvert("tiff", "jpg", {
    faq: [{ q: "Does it convert every page of a multi-page TIFF?", a: "Yes. Each page becomes its own JPG, numbered in order." }],
  }),
  imageConvert("tiff", "png"),
  imageConvert("psd", "png", {
    faq: [
      { q: "Do I need Photoshop?", a: "No. The converter reads the flattened image Photoshop stores inside the PSD, exactly what you see with all layers visible." },
      { q: "It says the PSD has no image. Why?", a: "The file was saved with 'Maximize Compatibility' turned off, so Photoshop didn't store a flattened copy. Re-save it with that option on." },
    ],
  }),
  imageConvert("psd", "jpg"),
  imageConvert("svg", "png", {
    faq: [{ q: "How big will the PNG be?", a: "SVG has no fixed pixel size, so it's drawn at 2048 px on the longest side by default. Pick another size under 'Longest side' for smaller files." }],
  }),
  imageConvert("svg", "jpg"),
  imageConvert("bmp", "jpg"),
  imageConvert("gif", "png", {
    faq: [{ q: "What about animated GIFs?", a: "The first frame is converted to a still image." }],
  }),

  {
    slug: "favicon-generator",
    tool: "convert-images",
    preset: { type: "image/x-icon" },
    category: "image",
    label: "Favicon generator (ICO)",
    title: `Favicon Generator: PNG, SVG or JPG to ICO, Free | ${BRAND}`,
    description: "Make a favicon.ico from a PNG, SVG or JPG logo. One file with 16, 32, 48, 64, 128 and 256 px sizes. Free, in your browser.",
    h1: "Favicon generator: PNG, SVG or JPG to ICO",
    lead: "Make a favicon.ico from your logo. One file holds every size browsers and Windows ask for, from 16 to 256 px.",
    about: {
      heading: "What goes into a good favicon.ico",
      body: [
        F.ico.about,
        F.ico.arrive!,
        "Start from a square logo or symbol on a transparent background; text in a favicon is unreadable at 16 px. Non-square images are centred and the rest is left transparent.",
      ],
    },
    steps: [
      "Drop your logo (PNG with transparency or SVG works best) into the box above.",
      "ICO is already selected. Click Convert.",
      "Download favicon.ico, put it in your site's root folder and add <link rel=\"icon\" href=\"/favicon.ico\">.",
    ],
    faq: [
      { q: "Which sizes are inside the file?", a: "16, 32, 48, 64, 128 and 256 px, each stored as a PNG, which every current browser and Windows since Vista reads." },
      { q: "Do I still need a PNG favicon?", a: "Modern sites usually add a 180 px apple-touch-icon PNG for iPhones too. Use the image converter with PNG and a 180 px size for that." },
      PRIVACY_FAQ,
    ],
    related: ["svg-to-png", "png-to-webp", "resize-image"],
  },
  {
    slug: "image-converter",
    tool: "convert-images",
    preset: { type: "image/jpeg" },
    category: "image",
    label: "Image converter",
    title: `Image Converter: HEIC, WebP, PNG, TIFF, PSD to JPG and More | ${BRAND}`,
    description: "Convert images between JPG, PNG, WebP and ICO. Opens HEIC, TIFF, PSD, SVG, AVIF, BMP and GIF. Batch, free, nothing uploaded.",
    h1: "Image converter",
    lead: "Convert any image to JPG, PNG, WebP or ICO, including formats most tools can't open: HEIC, multi-page TIFF, Photoshop PSD, SVG and AVIF.",
    about: {
      heading: "Which format should you choose?",
      body: [F.jpg.arrive!, F.png.arrive!, F.webp.arrive!],
    },
    steps: ["Drop your images into the box above.", "Choose the output format, quality and maximum size.", "Click Convert and download the files or a ZIP."],
    faq: [PRIVACY_FAQ, FREE_FAQ, MOBILE_FAQ],
    related: [],
  },
  {
    slug: "compress-image",
    tool: "convert-images",
    preset: { type: "image/jpeg", quality: 0.75, maxSide: 2048 },
    category: "image",
    label: "Compress images",
    title: `Compress Images: Make JPG, PNG and HEIC Smaller, Free | ${BRAND}`,
    description: "Shrink photo file size for email, upload forms and websites. Lower quality and dimensions in one step. Batch, free, nothing uploaded.",
    h1: "Compress images",
    lead: "Make photos small enough for email, upload limits and fast web pages. A 5 MB phone photo usually ends up between 300 and 600 KB.",
    about: {
      heading: "How to get the smallest file that still looks good",
      body: [
        "Most of a photo's size comes from its dimensions. A phone takes 4000 px wide photos; a screen rarely shows more than 2000 px, so scaling down to 2048 px cuts the file by more than half before quality even matters.",
        "Then quality: 75% is the usual sweet spot for photos. WebP gets another 25 to 35% smaller at the same look, if the place you're uploading to accepts it.",
      ],
    },
    steps: ["Drop your images into the box above.", "75% quality and 2048 px are preset; go lower for even smaller files.", "Click Convert and download."],
    faq: [
      { q: "Can I compress a PNG?", a: "Yes. Convert it to JPG or WebP for the biggest saving; PNG output is lossless, so only a smaller size reduces it." },
      PRIVACY_FAQ,
      FREE_FAQ,
    ],
    related: ["resize-image", "jpg-to-webp", "heic-to-jpg"],
  },
  {
    slug: "resize-image",
    tool: "convert-images",
    preset: { type: "image/jpeg", quality: 0.85, maxSide: 1280 },
    category: "image",
    label: "Resize images",
    title: `Resize Images Online: Batch, Keep Proportions, Free | ${BRAND}`,
    description: "Resize photos to 1280, 2048 or 3840 px on the longest side, many at once, proportions kept. Free, in your browser.",
    h1: "Resize images",
    lead: "Scale photos down to the size you need, many at once. The longest side is limited and the proportions are kept.",
    about: {
      heading: "Which size to choose",
      body: [
        "1280 px is plenty for email, chat and most upload forms. 2048 px suits websites and social media. 3840 px matches a 4K screen.",
        "Images smaller than the chosen size are left as they are; nothing is ever stretched up.",
      ],
    },
    steps: ["Drop your images into the box above.", "Choose the longest side and the output format.", "Click Convert and download."],
    faq: [PRIVACY_FAQ, FREE_FAQ],
    related: ["compress-image", "image-converter"],
  },

  // Documents
  {
    slug: "word-to-pdf",
    tool: "word-to-pdf",
    category: "document",
    label: "Word to PDF",
    title: `Word to PDF: Convert DOCX to PDF Free, No Upload | ${BRAND}`,
    description: "Convert Word documents to PDF with headers, footers, tables and images. The text stays real, searchable text. Free, nothing uploaded.",
    h1: "Word to PDF",
    lead: "Convert a .docx document to PDF with its page size, margins, headers, footers, tables and images. The text stays real text you can search and copy.",
    about: {
      heading: "Why send Word documents as PDF",
      body: [
        F.docx.about,
        F.docx.leave!,
        "This converter lays the document out page by page and saves it through your browser's own PDF engine, so the result is small and the text is selectable, unlike tools that turn each page into a picture.",
      ],
    },
    steps: [
      "Drop your .docx file into the box above and check the preview.",
      "Click Save as PDF. Your browser's print window opens.",
      "Choose 'Save as PDF' as the printer and save.",
    ],
    faq: [
      { q: "Can I convert an old .doc file?", a: "Browsers can't read the old binary .doc format. Open it in Word, Google Docs or LibreOffice, save it as .docx, then convert it here." },
      { q: "Why does it open a print window?", a: "Saving through the browser's print engine is what keeps the text as real text. In the window, pick 'Save as PDF' (Chrome, Edge) or 'PDF > Save as PDF' (Safari)." },
      { q: "Will my fonts look the same?", a: "Common fonts are matched by the browser. If the document uses a font your computer doesn't have, a similar one is used." },
      PRIVACY_FAQ,
    ],
    related: ["markdown-to-pdf", "excel-to-pdf", "merge-pdf"],
  },
  {
    slug: "markdown-to-pdf",
    tool: "word-to-pdf",
    category: "document",
    label: "Markdown to PDF",
    title: `Markdown to PDF: Convert .md Files Free | ${BRAND}`,
    description: "Turn Markdown (.md) into a clean, printable PDF with headings, lists, tables and code blocks. Free, in your browser.",
    h1: "Markdown to PDF",
    lead: "Turn a README, notes or documentation written in Markdown into a clean A4 PDF with headings, tables and code blocks.",
    about: { heading: "Markdown, made shareable", body: [F.md.about, F.md.leave!] },
    steps: ["Drop your .md file into the box above.", "Check the preview.", "Click Save as PDF and choose 'Save as PDF' in the print window."],
    faq: [
      { q: "Is GitHub-flavoured Markdown supported?", a: "Yes: tables, strikethrough, task lists and fenced code blocks." },
      { q: "Are scripts or HTML in the file run?", a: "No. Scripts, frames and event handlers are removed before the document is shown." },
      PRIVACY_FAQ,
    ],
    related: ["txt-to-pdf", "word-to-pdf"],
  },
  {
    slug: "txt-to-pdf",
    tool: "word-to-pdf",
    category: "document",
    label: "TXT to PDF",
    title: `TXT to PDF: Convert Text Files to PDF Free | ${BRAND}`,
    description: "Convert plain text files to a printable A4 PDF. Line breaks and spacing are kept. Free, nothing uploaded.",
    h1: "TXT to PDF",
    lead: "Turn a plain text file into a printable A4 PDF. Line breaks and spacing are kept exactly as they are.",
    about: { heading: "From plain text to a proper page", body: [F.txt.about, F.txt.leave!] },
    steps: ["Drop your .txt file into the box above.", "Check the preview.", "Click Save as PDF and choose 'Save as PDF' in the print window."],
    faq: [PRIVACY_FAQ, FREE_FAQ],
    related: ["markdown-to-pdf", "word-to-pdf"],
  },
  {
    slug: "powerpoint-to-pdf",
    tool: "ppt-to-pdf",
    category: "document",
    label: "PowerPoint to PDF",
    title: `PowerPoint to PDF: Convert PPTX Slides to PDF Free | ${BRAND}`,
    description: "Convert a PowerPoint presentation to PDF, one slide per page at the slide's own size, text kept as text. Free, in your browser, nothing uploaded.",
    h1: "PowerPoint to PDF",
    lead: "Turn a .pptx presentation into a PDF with one slide per page, at the slide's own size, ready to send or print.",
    about: {
      heading: "Why send slides as PDF",
      body: [
        "A presentation opened on another computer can look different: missing fonts, moved text, animations that hide content. A PDF looks the same everywhere and opens on any phone without PowerPoint.",
        "Every slide is drawn in your browser, then saved through its print engine, so titles and body text stay real text you can search and copy.",
      ],
    },
    steps: ["Drop your .pptx file into the box above and check the preview.", "Click Save as PDF. Your browser's print window opens.", "Choose 'Save as PDF' as the printer and save."],
    faq: [
      { q: "Can I convert an old .ppt file?", a: "Browsers can't read the old binary .ppt format. Open it in PowerPoint, Keynote, Google Slides or LibreOffice Impress, save it as .pptx, then convert it here." },
      { q: "What about animations and videos?", a: "A PDF is static: each slide is saved as it looks once all its content is shown. Videos appear as their poster frame, if the slide has one." },
      { q: "Will my fonts look the same?", a: "Common fonts are matched by the browser; a font your computer doesn't have is replaced by a similar one." },
      PRIVACY_FAQ,
    ],
    related: ["word-to-pdf", "excel-to-pdf", "merge-pdf", "compress-pdf"],
  },
  {
    slug: "excel-to-pdf",
    tool: "excel-to-pdf",
    category: "document",
    label: "Excel to PDF",
    title: `Excel to PDF: Convert XLSX and XLS to PDF Free | ${BRAND}`,
    description: "Convert Excel spreadsheets to PDF, every sheet included, in landscape or portrait. Works with XLSX, XLS, ODS and CSV. Free, nothing uploaded.",
    h1: "Excel to PDF",
    lead: "Turn an Excel workbook into a PDF, every sheet on its own pages, in landscape or portrait.",
    about: { heading: "Why share spreadsheets as PDF", body: [F.xlsx.about, F.xlsx.leave!] },
    steps: ["Drop your .xlsx or .xls file into the box above.", "Choose landscape or portrait.", "Click Save as PDF and choose 'Save as PDF' in the print window."],
    faq: [
      { q: "Are formulas kept?", a: "The PDF shows each cell's calculated value, the way it looks in Excel." },
      { q: "What about very wide sheets?", a: "Choose landscape. Columns that still don't fit continue on the next page." },
      PRIVACY_FAQ,
    ],
    related: ["csv-to-pdf", "ods-to-pdf", "word-to-pdf"],
  },
  {
    slug: "csv-to-pdf",
    tool: "excel-to-pdf",
    category: "document",
    label: "CSV to PDF",
    title: `CSV to PDF: Turn CSV Files Into a Readable Table | ${BRAND}`,
    description: "Convert CSV exports from banks, shops and databases into a clean PDF table. Free, in your browser.",
    h1: "CSV to PDF",
    lead: "Turn a CSV export from your bank, shop or database into a clean, readable PDF table.",
    about: { heading: "From commas to a table", body: [F.csv.about, F.csv.leave!] },
    steps: ["Drop your .csv file into the box above.", "Choose landscape or portrait.", "Click Save as PDF and choose 'Save as PDF' in the print window."],
    faq: [
      { q: "Are accented and Cyrillic characters shown correctly?", a: "Yes, as long as the CSV is saved as UTF-8, which almost every program does today." },
      PRIVACY_FAQ,
    ],
    related: ["excel-to-pdf", "ods-to-pdf"],
  },
  {
    slug: "ods-to-pdf",
    tool: "excel-to-pdf",
    category: "document",
    label: "ODS to PDF",
    title: `ODS to PDF: Convert LibreOffice Spreadsheets Free | ${BRAND}`,
    description: "Convert OpenDocument spreadsheets (.ods) from LibreOffice and OpenOffice to PDF. Every sheet included. Free, nothing uploaded.",
    h1: "ODS to PDF",
    lead: "Convert LibreOffice and OpenOffice Calc spreadsheets to PDF, every sheet included.",
    about: { heading: "Share ODS with people who don't use LibreOffice", body: [F.ods.about, F.ods.leave!] },
    steps: ["Drop your .ods file into the box above.", "Choose landscape or portrait.", "Click Save as PDF and choose 'Save as PDF' in the print window."],
    faq: [PRIVACY_FAQ, FREE_FAQ],
    related: ["excel-to-pdf", "csv-to-pdf"],
  },

  // PDF tools
  {
    slug: "merge-pdf",
    tool: "merge-pdf",
    category: "pdf",
    label: "Merge PDF",
    title: `Merge PDF: Combine PDF Files Into One, Free | ${BRAND}`,
    description: "Combine several PDFs into one, in the order you choose. No quality loss, no upload, no limits. Free in your browser.",
    h1: "Merge PDF files",
    lead: "Combine several PDFs into one document, in the order you choose. Pages are copied as they are, with no quality loss.",
    about: {
      heading: "Merging without re-rendering",
      body: [
        "The pages are copied into the new file exactly as they are: text stays text, links and fonts stay intact, and nothing is compressed again.",
        "PDFs that are protected against editing (but open without a password) can be merged too.",
      ],
    },
    steps: ["Drop your PDF files into the box above.", "Drag them into the right order.", "Click Merge and download the combined PDF."],
    faq: [
      { q: "Is there a limit on files or size?", a: "No fixed limit. Your device's memory is the only constraint; a few hundred pages is no problem on a normal computer." },
      PRIVACY_FAQ,
      FREE_FAQ,
    ],
    related: ["split-pdf", "images-to-pdf", "rotate-pdf"],
  },
  {
    slug: "split-pdf",
    tool: "split-pdf",
    preset: { mode: "each" },
    category: "pdf",
    label: "Split PDF",
    title: `Split PDF: Separate Every Page Into Its Own PDF, Free | ${BRAND}`,
    description: "Split a PDF into single pages or extract the pages you need. Download separately or as a ZIP. Free, nothing uploaded.",
    h1: "Split PDF",
    lead: "Split a PDF into one file per page, or pull out just the pages you need.",
    about: {
      heading: "Three ways to split",
      body: [
        "Every page as its own PDF, downloaded one by one or as a ZIP. Or extract chosen pages into one new PDF. Or delete the pages you don't want and keep the rest.",
        "Pages are copied, not re-rendered, so quality and selectable text are untouched.",
      ],
    },
    steps: ["Drop your PDF into the box above.", "Choose how to split it and, if needed, which pages (for example 1-3, 5, 8-).", "Click Create and download."],
    faq: [{ q: "How do I write page ranges?", a: "Separate with commas: 1-3, 5, 8- means pages 1 to 3, page 5, and page 8 to the end. The order you type is the order in the new PDF." }, PRIVACY_FAQ],
    related: ["extract-pdf-pages", "delete-pdf-pages", "merge-pdf"],
  },
  {
    slug: "extract-pdf-pages",
    tool: "split-pdf",
    preset: { mode: "ranges" },
    category: "pdf",
    label: "Extract PDF pages",
    title: `Extract Pages From PDF: Save Selected Pages, Free | ${BRAND}`,
    description: "Save only the pages you need from a PDF into a new file, in any order. Free, in your browser, nothing uploaded.",
    h1: "Extract pages from a PDF",
    lead: "Save just the pages you need into a new PDF, in the order you type them.",
    about: { heading: "Pick pages, reorder them", body: ["Type the pages you want, like 1-3, 5, 8-. They're copied into a new PDF in exactly that order, so you can also use this to reorder a document."] },
    steps: ["Drop your PDF into the box above.", "Type the pages to keep, for example 2, 4-6.", "Click Create and download the new PDF."],
    faq: [PRIVACY_FAQ, FREE_FAQ],
    related: ["split-pdf", "delete-pdf-pages", "merge-pdf"],
  },
  {
    slug: "delete-pdf-pages",
    tool: "split-pdf",
    preset: { mode: "delete" },
    category: "pdf",
    label: "Delete PDF pages",
    title: `Delete Pages From PDF: Remove Pages Free | ${BRAND}`,
    description: "Remove blank, duplicate or unwanted pages from a PDF and keep the rest. Free, in your browser, nothing uploaded.",
    h1: "Delete pages from a PDF",
    lead: "Remove blank, duplicate or private pages from a PDF and keep everything else.",
    about: { heading: "Clean up a PDF", body: ["Scans often come with blank backs, and long reports with pages nobody needs to see. Type the pages to remove; the rest stays exactly as it was."] },
    steps: ["Drop your PDF into the box above.", "Type the pages to delete, for example 2, 7-9.", "Click Create and download the cleaned PDF."],
    faq: [PRIVACY_FAQ, FREE_FAQ],
    related: ["extract-pdf-pages", "split-pdf", "rotate-pdf"],
  },
  {
    slug: "rotate-pdf",
    tool: "rotate-pdf",
    category: "pdf",
    label: "Rotate PDF",
    title: `Rotate PDF: Turn Pages and Save, Free | ${BRAND}`,
    description: "Rotate all pages of a PDF or just the sideways ones by 90° or 180°, and save it permanently. Free, nothing uploaded.",
    h1: "Rotate PDF pages",
    lead: "Turn every page, or only the ones that were scanned sideways or upside down, and save the PDF that way for good.",
    about: { heading: "Fixed for good, not just in the viewer", body: ["Rotating in a PDF viewer usually only changes your view. This saves the rotation into the file, so it opens the right way for everyone."] },
    steps: ["Drop your PDF into the box above.", "Choose the angle and whether to turn all pages or only some (for example 2, 5).", "Click Rotate and download."],
    faq: [PRIVACY_FAQ, FREE_FAQ],
    related: ["delete-pdf-pages", "merge-pdf"],
  },
  {
    slug: "pdf-to-jpg",
    tool: "pdf-to-images",
    preset: { type: "image/jpeg" },
    category: "pdf",
    label: "PDF to JPG",
    title: `PDF to JPG: Convert Every Page to an Image, Free | ${BRAND}`,
    description: "Convert PDF pages to JPG images at 72, 150 or 300 dpi. Download one by one or as a ZIP. Free, nothing uploaded.",
    h1: "PDF to JPG",
    lead: "Turn every page of a PDF into a JPG image at the resolution you need.",
    about: {
      heading: "Which resolution to pick",
      body: ["150 dpi is right for screens, chat and social media. 300 dpi is print quality. 72 dpi gives small previews and thumbnails."],
    },
    steps: ["Drop your PDF into the box above.", "Choose JPG and the resolution.", "Click Convert to images and download the pages or a ZIP."],
    faq: [PRIVACY_FAQ, FREE_FAQ, MOBILE_FAQ],
    related: ["pdf-to-png", "images-to-pdf", "compress-image"],
  },
  {
    slug: "compress-pdf",
    tool: "compress-pdf",
    category: "pdf",
    label: "Compress PDF",
    title: `Compress PDF: Reduce PDF File Size Free, No Upload | ${BRAND}`,
    description: "Make a PDF smaller for email and upload limits. Photos are re-compressed; text stays sharp and selectable. Free, in your browser, nothing uploaded.",
    h1: "Compress PDF",
    lead: "Make a PDF small enough for email and upload limits. The photos inside are re-compressed; text and graphics stay sharp and selectable.",
    about: {
      heading: "What actually makes a PDF big",
      body: [
        "Almost always the pictures: scans, phone photos and images pasted into documents at full camera resolution. Text and vector graphics take very little space.",
        "So this re-encodes the images at a lower resolution and quality and leaves everything else alone. Unlike tools that turn every page into a picture, the text stays real text you can search and copy. An image is only replaced if the new one is actually smaller.",
        "Recommended suits email and most upload forms. Strong is for tight limits; Light keeps photos print-ready.",
      ],
    },
    steps: ["Drop your PDF into the box above.", "Pick a compression level.", "Click Compress PDF and download the smaller file. The size before and after is shown."],
    faq: [
      { q: "How much smaller will it get?", a: "It depends on the images. Scanned documents and photo-heavy PDFs often shrink by 50 to 90%. A PDF that is mostly text is already small and won't change much." },
      { q: "Will the text get blurry?", a: "No. Only embedded photos are re-encoded. Text, fonts and vector graphics are copied as they are." },
      PRIVACY_FAQ,
      FREE_FAQ,
    ],
    related: ["compress-image", "merge-pdf", "pdf-to-jpg"],
  },
  {
    slug: "add-page-numbers-to-pdf",
    tool: "page-numbers",
    category: "pdf",
    label: "Add page numbers",
    title: `Add Page Numbers to PDF: Free, Any Position | ${BRAND}`,
    description: "Number the pages of a PDF: choose position, style (1, 1 / 10, Page 1 of 10), starting number and whether to skip the cover. Free, nothing uploaded.",
    h1: "Add page numbers to a PDF",
    lead: "Number every page in the corner or centre you choose, as 1, 1 / 10 or Page 1 of 10, starting from any number, with or without the cover page.",
    about: {
      heading: "Numbers that land in the right place",
      body: ["Pages scanned sideways or stored rotated are handled too: the number is placed and turned so it reads upright, the way the page is actually viewed."],
    },
    steps: ["Drop your PDF into the box above.", "Choose position, style, size and starting number.", "Click Add page numbers and download."],
    faq: [
      { q: "Can I start numbering after the cover?", a: "Yes. Choose 'Skip (cover)' for the first page and the second page gets the starting number." },
      PRIVACY_FAQ,
      FREE_FAQ,
    ],
    related: ["merge-pdf", "watermark-pdf", "split-pdf"],
  },
  {
    slug: "watermark-pdf",
    tool: "watermark-pdf",
    category: "pdf",
    label: "Watermark PDF",
    title: `Watermark PDF: Add Text or Logo to Every Page, Free | ${BRAND}`,
    description: "Stamp CONFIDENTIAL, DRAFT, your name or your logo on every page of a PDF, once or across the page, with the opacity you choose. Free, nothing uploaded.",
    h1: "Add a watermark to a PDF",
    lead: "Stamp text like CONFIDENTIAL or DRAFT, or your logo, on every page: once across the middle or repeated over the whole page.",
    about: {
      heading: "Text in any language, or your logo",
      body: [
        "The watermark text is drawn by your browser, so accents, Cyrillic and other scripts work without hunting for fonts. A logo works best as a PNG with a transparent background.",
      ],
    },
    steps: ["Drop your PDF into the box above.", "Type the text or add a logo, then choose colour, opacity and layout.", "Click Add watermark and download."],
    faq: [
      { q: "Can the watermark be removed?", a: "It's drawn onto every page as part of the content. Someone with a PDF editor could still delete it, as with any watermark; it deters copying rather than preventing it." },
      PRIVACY_FAQ,
    ],
    related: ["add-page-numbers-to-pdf", "merge-pdf", "compress-pdf"],
  },
  {
    slug: "protect-pdf",
    tool: "qpdf",
    preset: { qpdf: "protect" },
    category: "pdf",
    label: "Protect PDF",
    title: `Protect PDF With a Password: AES-256, Free | ${BRAND}`,
    description: "Lock a PDF with a password using AES-256 encryption, the strongest the PDF format offers. Free, in your browser, the file and password never leave your device.",
    h1: "Protect a PDF with a password",
    lead: "Lock a PDF so it only opens with your password, using AES-256 encryption.",
    about: {
      heading: "Real encryption, done on your device",
      body: [
        "The PDF is encrypted with AES-256, the strongest method the PDF standard defines, by qpdf, the open-source tool many professional PDF programs rely on. It runs here in your browser, so neither the file nor the password is sent anywhere.",
        "Every PDF reader asks for the password before showing anything: Acrobat, Preview, Chrome, Edge and phone viewers.",
      ],
    },
    steps: ["Drop your PDF into the box above.", "Type a password twice.", "Click Protect PDF and download the locked file."],
    faq: [
      { q: "What if I forget the password?", a: "There's no way to recover it, here or anywhere else; that's what makes the encryption worth having. Keep it in a password manager." },
      { q: "How strong should the password be?", a: "Encryption is only as strong as the password. Use at least 10 characters, or a few unrelated words." },
      PRIVACY_FAQ,
    ],
    related: ["unlock-pdf", "watermark-pdf", "compress-pdf"],
  },
  {
    slug: "unlock-pdf",
    tool: "qpdf",
    preset: { qpdf: "unlock" },
    category: "pdf",
    label: "Unlock PDF",
    title: `Unlock PDF: Remove a PDF Password You Know, Free | ${BRAND}`,
    description: "Remove the password and restrictions from a PDF you're allowed to open, so it opens and prints without asking. Free, in your browser, nothing uploaded.",
    h1: "Unlock a PDF",
    lead: "Remove the password from a PDF you can open, so it no longer asks for it, and lift printing and copying restrictions.",
    about: {
      heading: "For your own files",
      body: [
        "Bank statements, payslips and scans from office copiers often come password-protected. If you know the password, this saves an unlocked copy so you don't have to type it every time.",
        "PDFs that open without a password but block printing or copying can be unlocked with the password field left empty. This doesn't crack passwords: without the right password a protected PDF stays locked.",
      ],
    },
    steps: ["Drop the protected PDF into the box above.", "Type its password (leave empty if it opens without one).", "Click Unlock PDF and download the unlocked copy."],
    faq: [
      { q: "Can it open a PDF if I don't know the password?", a: "No. It removes protection you're already able to get past, it doesn't break it." },
      PRIVACY_FAQ,
    ],
    related: ["protect-pdf", "merge-pdf", "compress-pdf"],
  },
  {
    slug: "repair-pdf",
    tool: "qpdf",
    preset: { qpdf: "repair" },
    category: "pdf",
    label: "Repair PDF",
    title: `Repair PDF: Fix Damaged or Corrupted PDF Files, Free | ${BRAND}`,
    description: "Try to fix a PDF that won't open or shows errors, by rebuilding its internal structure. Free, in your browser, nothing uploaded.",
    h1: "Repair a damaged PDF",
    lead: "Rebuild the internal structure of a PDF that won't open or shows errors about a damaged file.",
    about: {
      heading: "What can be fixed",
      body: [
        "Most damaged PDFs have a broken index (the cross-reference table) rather than broken content, usually from a buggy export or a file edited by a tool that got the offsets wrong. The repair reads every object from the start of the file instead of trusting the index, and writes a clean new PDF around them.",
        "A file that was cut off before its end (an interrupted download) usually lost the part that ties the pages together; no tool can bring that back, and the repair will tell you so.",
      ],
    },
    steps: ["Drop the damaged PDF into the box above.", "Click Repair PDF.", "Download the rebuilt file."],
    faq: [PRIVACY_FAQ, FREE_FAQ],
    related: ["compress-pdf", "unlock-pdf", "merge-pdf"],
  },
  {
    slug: "pdf-to-word",
    tool: "pdf-to-word",
    preset: { target: "docx" },
    category: "pdf",
    label: "PDF to Word",
    title: `PDF to Word: Convert PDF to Editable DOCX, Free | ${BRAND}`,
    description: "Convert PDF to an editable Word document with paragraphs, headings, lists, bold and italic text and images. Free, in your browser, nothing uploaded.",
    h1: "PDF to Word",
    lead: "Turn a PDF back into an editable Word document: paragraphs, headings, lists, bold and italic text and images, on the same page size.",
    about: {
      heading: "How the conversion works",
      body: [
        "A PDF doesn't store paragraphs, only letters placed at coordinates. The converter reads every line's position, size and font, joins lines into paragraphs, recognises headings by their size, turns • and 1. lines into lists, keeps bold and italic, reads two-column pages left column first, and places each image where it was.",
        "Simple documents such as letters, contracts, reports and CVs come out ready to edit. Complex layouts with tables, text boxes or magazine-style columns may need some tidying in Word.",
        "Scanned PDFs are pictures of pages with no text in them. Those come out as page images; turning them into text needs OCR.",
      ],
    },
    steps: ["Drop your PDF into the box above.", "Click Convert to Word.", "Download the .docx and open it in Word, Google Docs, Pages or LibreOffice."],
    faq: [
      { q: "Will the Word file look exactly like the PDF?", a: "The content, order, headings, emphasis and images carry over, and the page size is kept. Exact positioning of every element isn't: the point is a document you can edit, not a picture of the PDF." },
      { q: "Can I convert a scanned PDF?", a: "A scan has no text layer, so the Word file will contain the pages as images. Text recognition (OCR) is needed to make it editable." },
      { q: "Does it handle Cyrillic, accents and other alphabets?", a: "Yes. The text is read as Unicode, so Serbian Cyrillic and Latin, accented letters and other scripts come across as they are." },
      PRIVACY_FAQ,
    ],
    related: ["word-to-pdf", "pdf-to-text", "extract-images-from-pdf", "merge-pdf"],
  },
  {
    slug: "pdf-to-text",
    tool: "pdf-to-word",
    preset: { target: "txt" },
    category: "pdf",
    label: "PDF to text",
    title: `PDF to Text: Extract Text From PDF to TXT, Free | ${BRAND}`,
    description: "Extract all the text from a PDF as a clean .txt file, paragraph by paragraph, in reading order. Free, in your browser, nothing uploaded.",
    h1: "PDF to text",
    lead: "Get all the text out of a PDF as a plain .txt file, paragraph by paragraph and in reading order, even from two-column pages.",
    about: {
      heading: "Clean text, not a copy-paste mess",
      body: [
        "Copying from a PDF viewer breaks lines in the middle of sentences and mixes up columns. This joins lines back into paragraphs, removes hyphens at line ends and reads columns in order.",
      ],
    },
    steps: ["Drop your PDF into the box above.", "Click Extract text.", "Download the .txt file."],
    faq: [{ q: "Does it work on scanned PDFs?", a: "A scan contains pictures of text, not text, so use Scanned PDF to text, which reads it with OCR." }, PRIVACY_FAQ, FREE_FAQ],
    related: ["pdf-to-word", "extract-images-from-pdf", "split-pdf"],
  },
  {
    slug: "extract-images-from-pdf",
    tool: "pdf-to-word",
    preset: { target: "images" },
    category: "pdf",
    label: "Extract images from PDF",
    title: `Extract Images From PDF: Save Every Picture, Free | ${BRAND}`,
    description: "Save every photo and graphic embedded in a PDF as a PNG file, at the size it's stored in. Download one by one or as a ZIP. Free, nothing uploaded.",
    h1: "Extract images from a PDF",
    lead: "Save every photo and picture embedded in a PDF as its own PNG file, at the full size it's stored in.",
    about: {
      heading: "The original images, not screenshots",
      body: ["Instead of rendering pages, this pulls out the images the PDF actually contains, so a photo comes out at its stored resolution. Tiny decorative images like bullets and lines are skipped."],
    },
    steps: ["Drop your PDF into the box above.", "Click Extract images.", "Download the images one by one or all as a ZIP."],
    faq: [{ q: "Why are some images missing?", a: "Images smaller than about 24 points on the page (icons, bullets, rules) are skipped on purpose. Vector graphics aren't images and can't be extracted this way; use PDF to PNG to capture whole pages." }, PRIVACY_FAQ],
    related: ["pdf-to-jpg", "pdf-to-word", "compress-image"],
  },
  {
    slug: "pdf-to-png",
    tool: "pdf-to-images",
    preset: { type: "image/png" },
    category: "pdf",
    label: "PDF to PNG",
    title: `PDF to PNG: Convert PDF Pages to PNG, Free | ${BRAND}`,
    description: "Convert PDF pages to lossless PNG images at up to 300 dpi. Free, in your browser, nothing uploaded.",
    h1: "PDF to PNG",
    lead: "Turn PDF pages into lossless PNG images, ideal for slides, diagrams and documents with sharp text.",
    about: { heading: "PNG or JPG?", body: [F.png.about, "For pages that are mostly photos, JPG files are much smaller."] },
    steps: ["Drop your PDF into the box above.", "Choose PNG and the resolution.", "Click Convert to images and download."],
    faq: [PRIVACY_FAQ, FREE_FAQ],
    related: ["pdf-to-jpg", "images-to-pdf"],
  },
];

PAGES_RAW.push(
  {
    slug: "organize-pdf",
    tool: "organize-pdf",
    category: "pdf",
    label: "Organize PDF",
    title: `Organize PDF: Reorder, Rotate and Delete Pages, Free | ${BRAND}`,
    description: "See every page as a thumbnail, drag pages into order, rotate or delete them, and combine pages from several PDFs. Free, in your browser, nothing uploaded.",
    h1: "Organize PDF pages",
    lead: "See every page as a thumbnail and put the PDF in order: drag pages around, turn the sideways ones, delete what you don't need, and mix in pages from other PDFs.",
    about: {
      heading: "Every page in front of you",
      body: [
        "Splitting by page numbers works when you know them. When you don't, it's easier to look: every page appears as a thumbnail, so you can spot the blank scan, the upside-down page and the one in the wrong place at a glance.",
        "Add several PDFs and their pages land in one grid, marked A, B, C, so you can interleave them freely, for example putting signed pages back into a contract. The pages are copied as they are, so text stays text and nothing is re-compressed.",
      ],
    },
    steps: ["Drop one or more PDFs into the box above.", "Drag the thumbnails into order; rotate or delete pages with the buttons under each one.", "Click Save PDF and download the result."],
    faq: [
      { q: "Can I move pages on a phone?", a: "Yes. Dragging works with a mouse; on a touch screen use the arrow buttons under each page." },
      { q: "Does it lower the quality?", a: "No. The pages are copied exactly as they are; only their order and rotation change." },
      PRIVACY_FAQ,
      FREE_FAQ,
    ],
    related: ["merge-pdf", "split-pdf", "rotate-pdf"],
  },
  {
    slug: "reorder-pdf-pages",
    tool: "organize-pdf",
    category: "pdf",
    label: "Reorder PDF pages",
    title: `Reorder PDF Pages: Drag and Drop to Rearrange, Free | ${BRAND}`,
    description: "Rearrange the pages of a PDF by dragging thumbnails into the right order. Rotate or remove pages while you're at it. Free, in your browser, nothing uploaded.",
    h1: "Reorder PDF pages",
    lead: "Put the pages of a PDF in the right order by dragging their thumbnails, the way you would shuffle sheets of paper on a desk.",
    about: {
      heading: "Fix the order a scanner got wrong",
      body: [
        "Double-sided scans often come out as all front pages and then all back pages. Reverse order and drag-and-drop make short work of it, and pages scanned upside down turn with one click.",
      ],
    },
    steps: ["Drop your PDF into the box above.", "Drag the pages into the order you want.", "Click Save PDF and download."],
    faq: [{ q: "Can I combine pages from two PDFs?", a: "Yes. Add the second PDF with Add more and drag its pages wherever they belong." }, PRIVACY_FAQ, FREE_FAQ],
    related: ["organize-pdf", "merge-pdf", "delete-pdf-pages"],
  },
);

PAGES_RAW.push(
  {
    slug: "sign-pdf",
    tool: "sign-pdf",
    preset: { start: "signature" },
    category: "pdf",
    label: "Sign PDF",
    title: `Sign PDF: Add Your Signature to a PDF, Free | ${BRAND}`,
    description: "Draw, type or upload your signature and place it on any page of a PDF. Add a date or your name too. Free, no account, in your browser, nothing uploaded.",
    h1: "Sign a PDF",
    lead: "Put your signature on a PDF without printing it: draw it with a mouse or finger, type it, or use a photo of your signature on paper, then drag it into place.",
    about: {
      heading: "Sign without printing and scanning",
      body: [
        "Draw your signature on the pad, type your name in a handwriting font, or upload a photo of your signature on white paper: the paper is removed automatically and only the ink is kept.",
        "Drag the signature anywhere on any page, resize it from the corner and add as many as you need, plus the date or your printed name as real, selectable text. Your document and signature never leave your device.",
      ],
    },
    steps: ["Drop your PDF into the box above.", "Draw, type or upload your signature and click Place on page.", "Drag it into position, then click Save signed PDF."],
    faq: [
      { q: "Is this a legally binding signature?", a: "It's a simple electronic signature: a picture of your signature on the document, which is what most everyday agreements, forms and HR paperwork ask for. It isn't a certificate-based digital signature (like a qualified e-signature), which some legal and government documents require." },
      { q: "Can I sign on my phone?", a: "Yes. Draw with your finger, then drag the signature into place with your finger too." },
      PRIVACY_FAQ,
      FREE_FAQ,
    ],
    related: ["add-text-to-pdf", "merge-pdf", "protect-pdf"],
  },
  {
    slug: "add-text-to-pdf",
    tool: "sign-pdf",
    preset: { start: "text" },
    category: "pdf",
    label: "Add text to PDF",
    title: `Add Text to PDF: Type on a PDF Free, No Upload | ${BRAND}`,
    description: "Type text anywhere on a PDF: fill in a name, a date, a note or a form field that isn't fillable. Real, selectable text in any language. Free, nothing uploaded.",
    h1: "Add text to a PDF",
    lead: "Type on a PDF: fill in a name, date or answer on a form that isn't fillable, or add a note, then drag the text exactly where it belongs.",
    about: {
      heading: "Real text, in any language",
      body: [
        "The text is written into the PDF with a real font, so it stays sharp at any zoom and can be selected, copied and searched. Serbian, Cyrillic, Greek and accented letters all work.",
        "Pick the size and colour, drag the text into place and resize it from the corner. Need a signature as well? Switch to Signature in the same tool.",
      ],
    },
    steps: ["Drop your PDF into the box above.", "Type your text and click Place text.", "Drag it into position, then click Save signed PDF."],
    faq: [
      { q: "Can I edit the text that's already in the PDF?", a: "No. This adds new text on top of the page; the original content isn't changed." },
      PRIVACY_FAQ,
      FREE_FAQ,
    ],
    related: ["sign-pdf", "watermark-pdf", "add-page-numbers-to-pdf"],
  },
);

/* ---------- OCR ---------- */

const OCR_FAQ = [
  {
    q: "Which languages can it read?",
    a: "English, Serbian (Latin and Cyrillic), Croatian, Bosnian, Slovenian, Macedonian, Bulgarian, German, French, Spanish, Italian, Portuguese, Dutch, Polish, Czech, Slovak, Hungarian, Romanian, Turkish, Greek, Russian, Ukrainian and the Nordic languages. English is always read alongside the language you pick.",
  },
  {
    q: "Are my files uploaded for OCR?",
    a: "No. Text recognition runs in your browser with Tesseract compiled to WebAssembly. Only the engine and the language model are downloaded, once, and then kept in your browser; your images and PDFs never leave your device.",
  },
  {
    q: "How accurate is it?",
    a: "Very good on clear printed text: scans, screenshots, photos of documents taken straight on. Handwriting, very small or blurry text and photos taken at a steep angle come out worse.",
  },
];

PAGES_RAW.push(
  {
    slug: "image-to-text",
    tool: "ocr",
    preset: { target: "txt" },
    category: "image",
    label: "Image to text (OCR)",
    title: `Image to Text: Free OCR, Copy Text From Images | ${BRAND}`,
    description: "Extract text from photos, screenshots and scans with OCR, in 27 languages incl. Serbian Cyrillic. Copy it or save as .txt. Free, runs in your browser, nothing uploaded.",
    h1: "Image to text (OCR)",
    lead: "Copy the text out of a photo, screenshot or scanned page. The text is recognised right in your browser and shown ready to copy, or saved as a .txt file.",
    about: {
      heading: "OCR that stays on your device",
      body: [
        "OCR (optical character recognition) turns a picture of text back into text you can copy, edit and search. Here it runs on Tesseract, the open-source engine behind most OCR tools, compiled to WebAssembly so it works inside the browser.",
        "Works with JPG, PNG, WebP, HEIC photos from an iPhone, multi-page TIFF scans and scanned PDFs. Small screenshots are scaled up before reading, which noticeably improves accuracy.",
      ],
    },
    steps: ["Drop images or a scanned PDF into the box above.", "Pick the language of the text.", "Click Extract text, then copy the text or download it."],
    faq: [...OCR_FAQ, FREE_FAQ],
    related: ["ocr-pdf", "pdf-to-text", "heic-to-jpg"],
  },
  {
    slug: "jpg-to-text",
    tool: "ocr",
    preset: { target: "txt" },
    category: "image",
    label: "JPG to text",
    title: `JPG to Text: Extract Text From a Photo, Free OCR | ${BRAND}`,
    description: "Turn a JPG photo of a document, receipt or sign into text you can copy. OCR in 27 languages, free, in your browser, nothing uploaded.",
    h1: "JPG to text",
    lead: "Turn a photo of a document, receipt, whiteboard or sign into text you can copy and edit.",
    about: {
      heading: "From a phone photo to editable text",
      body: [
        "Take the photo straight on and in good light, and the text comes out close to perfect. The result appears ready to copy, and can be saved as a .txt file.",
        F.jpg.about,
      ],
    },
    steps: ["Drop your JPG photos into the box above.", "Pick the language of the text.", "Click Extract text, then copy or download it."],
    faq: [...OCR_FAQ, PRIVACY_FAQ],
    related: ["image-to-text", "ocr-pdf", "jpg-to-pdf"],
  },
  {
    slug: "ocr-pdf",
    tool: "ocr",
    preset: { target: "pdf" },
    category: "pdf",
    label: "OCR PDF",
    title: `OCR PDF: Make a Scanned PDF Searchable, Free | ${BRAND}`,
    description: "Add a hidden text layer to scanned PDFs so you can search, select and copy their text. The pages look exactly the same. 27 languages, free, nothing uploaded.",
    h1: "OCR PDF: make a scan searchable",
    lead: "Turn a scanned PDF into one you can search with Ctrl+F, select and copy from. The pages look exactly as before; invisible text is laid over each one.",
    about: {
      heading: "A searchable PDF that looks like the original",
      body: [
        "Every page is rendered at 300 dpi and read, and the recognised words are placed invisibly exactly over the words in the scan, the way professional scanners do it. Pages that already contain real text are left untouched.",
        "Scanned photos work too: drop several JPG or HEIC pages and you get one searchable PDF. Want the text itself? Choose Text (.txt) instead.",
      ],
    },
    steps: ["Drop your scanned PDF (or photos of pages) into the box above.", "Pick the language of the text.", "Click Extract text and download the searchable PDF."],
    faq: [...OCR_FAQ, { q: "Will the file look different?", a: "No. The page images are kept as they are and the text layer is invisible; only searching, selecting and copying change." }],
    related: ["scanned-pdf-to-text", "pdf-to-word", "compress-pdf"],
  },
  {
    slug: "scanned-pdf-to-text",
    tool: "ocr",
    preset: { target: "txt" },
    category: "pdf",
    label: "Scanned PDF to text",
    title: `Scanned PDF to Text: OCR a Scan to TXT, Free | ${BRAND}`,
    description: "Get the text out of a scanned PDF with OCR, page by page, as a .txt file or ready to copy. 27 languages, free, in your browser, nothing uploaded.",
    h1: "Scanned PDF to text",
    lead: "Read the text out of a scanned PDF, page by page, and copy it or save it as a .txt file.",
    about: {
      heading: "When copy and paste gives you nothing",
      body: [
        "A scanned PDF holds pictures of pages, so there is no text to copy. OCR reads those pictures and gives the text back. PDFs that already have real text are read directly, without OCR.",
      ],
    },
    steps: ["Drop your scanned PDF into the box above.", "Pick the language of the text.", "Click Extract text, then copy or download it."],
    faq: [...OCR_FAQ, PRIVACY_FAQ],
    related: ["ocr-pdf", "pdf-to-text", "pdf-to-word"],
  },
);

/* ---------- compression family ---------- */

const IMAGE_TARGETS: { kb: number; uses: string }[] = [
  { kb: 20, uses: "signature scans and passport-style photos on government and exam portals, which often cap uploads at 20 KB" },
  { kb: 50, uses: "job applications, university and exam registration forms, and ID photo uploads, where 50 KB is a common limit" },
  { kb: 100, uses: "visa and permit applications, online forms and profile pictures that accept up to 100 KB" },
  { kb: 200, uses: "application portals, marketplaces and CMS fields with a 200 KB limit, while keeping photos sharp" },
  { kb: 1024, uses: "email attachments, chat apps and websites, where 1 MB keeps a photo looking great and loading fast" },
];
const kbLabel = (kb: number) => (kb >= 1024 ? `${kb / 1024} MB` : `${kb} KB`);

for (const { kb, uses } of IMAGE_TARGETS) {
  const size = kbLabel(kb);
  PAGES_RAW.push({
    slug: `compress-image-to-${kb >= 1024 ? `${kb / 1024}mb` : `${kb}kb`}`,
    tool: "convert-images",
    preset: { type: "image/jpeg", targetKB: kb },
    category: "image",
    label: `Compress image to ${size}`,
    title: `Compress Image to ${size}: JPG Under ${size}, Free | ${BRAND}`,
    description: `Make a photo or scan smaller than ${size} for an upload limit. The best quality that fits is found automatically. Free, in your browser, nothing uploaded.`,
    h1: `Compress an image to ${size}`,
    lead: `Get a photo, scan or screenshot under ${size} in one step. The converter finds the highest quality that still fits, and only shrinks the dimensions if it has to.`,
    about: {
      heading: `Where a ${size} limit comes up`,
      body: [
        `Typical places: ${uses}.`,
        "Quality is searched first at full size; the image is only scaled down when no quality setting fits. HEIC photos from an iPhone work too, and come out as JPG.",
      ],
    },
    steps: ["Drop your image into the box above.", `${size} is already selected as the target.`, "Click Convert and download the image."],
    faq: [
      { q: `What if the image can't get under ${size}?`, a: "Very large or very detailed images may need to be scaled down a lot. The tool tells you when the target can't be reached and gives you the smallest version it could make." },
      { q: "Can I compress several images at once?", a: "Yes, each one is fitted to the target separately; download them one by one or as a ZIP." },
      PRIVACY_FAQ,
    ],
    related: [],
  });
}

PAGES_RAW.push(
  {
    slug: "compress-jpeg",
    tool: "convert-images",
    preset: { type: "image/jpeg", quality: 0.75, maxSide: 2048 },
    category: "image",
    label: "Compress JPEG",
    title: `Compress JPEG: Reduce JPG File Size Free, No Upload | ${BRAND}`,
    description: "Shrink JPG photos for email, web and upload limits with no visible loss. Batch, free, in your browser, nothing uploaded.",
    h1: "Compress JPEG images",
    lead: "Make JPG photos a fraction of their size with no visible difference: dimensions brought down to what screens actually show, quality set where artefacts stay invisible.",
    about: { heading: "Smaller JPGs without visible loss", body: [F.jpg.about, "Phone photos are usually 3 to 6 MB. At 2048 px and 75% quality they typically drop to 300 to 600 KB and still look the same on any screen."] },
    steps: ["Drop your JPG files into the box above.", "75% quality and 2048 px are preset; adjust if you like, or pick a target size.", "Click Convert and download."],
    faq: [{ q: "Is this lossless?", a: "No: JPEG compression always drops some detail, which is why the files get so much smaller. For lossless images use PNG." }, PRIVACY_FAQ, FREE_FAQ],
    related: [],
  },
  {
    slug: "compress-png",
    tool: "convert-images",
    preset: { type: "image/png", pngColors: 256 },
    category: "image",
    label: "Compress PNG",
    title: `Compress PNG: Smaller PNG Files, Transparency Kept | ${BRAND}`,
    description: "Shrink PNG screenshots, logos and graphics by reducing them to 256 colours, transparency kept and still a PNG. Free, in your browser, nothing uploaded.",
    h1: "Compress PNG images",
    lead: "Make PNG screenshots, logos and graphics much smaller while keeping them PNG, transparency included, by reducing them to a palette of 256 colours.",
    about: {
      heading: "How PNG compression works",
      body: [
        F.png.about,
        "A normal PNG can store millions of colours. Most screenshots and graphics use far fewer, so reducing them to the best 256 usually cuts the file by 50 to 80% with no difference you can see. Photos saved as PNG shrink more as JPG or WebP.",
      ],
    },
    steps: ["Drop your PNG files into the box above.", "256 colours is preset; choose 64 for the smallest files, or All for lossless.", "Click Convert and download."],
    faq: [{ q: "Is transparency kept?", a: "Yes. The palette includes transparent and semi-transparent colours, so cut-outs and soft edges stay as they were." }, PRIVACY_FAQ, FREE_FAQ],
    related: [],
  },
);

for (const kb of [200, 500, 1024]) {
  const size = kbLabel(kb);
  PAGES_RAW.push({
    slug: `compress-pdf-to-${kb >= 1024 ? `${kb / 1024}mb` : `${kb}kb`}`,
    tool: "compress-pdf",
    preset: { targetKB: kb },
    category: "pdf",
    label: `Compress PDF to ${size}`,
    title: `Compress PDF to ${size}: Get Under the Limit, Free | ${BRAND}`,
    description: `Reduce a PDF to under ${size} for upload portals and email. Images are re-compressed step by step until it fits; text stays sharp. Free, nothing uploaded.`,
    h1: `Compress a PDF to ${size}`,
    lead: `Get a PDF under ${size} for an upload portal or email. Stronger settings are tried one by one until it fits, and the text stays sharp and selectable.`,
    about: {
      heading: "How it gets under the limit",
      body: [
        "The images inside the PDF are re-encoded at lower resolutions and qualities, starting gently and stopping at the first setting that fits, so you get the best quality that meets the limit.",
        "If the PDF is mostly text, fonts or vector drawings, there may be nothing left to shrink; the tool then tells you the smallest size it reached.",
      ],
    },
    steps: ["Drop your PDF into the box above.", `${size} is already selected as the target.`, "Click Compress PDF and download. The size before and after is shown."],
    faq: [
      { q: "Will the text get blurry?", a: "No. Only the photos and scans inside are re-encoded; text and fonts are copied as they are." },
      PRIVACY_FAQ,
      FREE_FAQ,
    ],
    related: ["compress-pdf", "merge-pdf", "split-pdf"],
  });
}

/* Related links for the generated pages: same family first, then popular ones. */
const POPULAR = ["heic-to-jpg", "jpg-to-pdf", "merge-pdf", "word-to-pdf", "pdf-to-jpg", "compress-image"];
for (const p of PAGES_RAW) {
  if (p.related.length) continue;
  const fromPrefix = p.slug.split("-to-")[0];
  const siblings = PAGES_RAW.filter((o) => o !== p && (o.tool === p.tool || o.slug.startsWith(fromPrefix + "-"))).map((o) => o.slug);
  p.related = [...new Set([...siblings.slice(0, 4), ...POPULAR.filter((s) => s !== p.slug)])].slice(0, 6);
}

export const PAGES = PAGES_RAW;

const SPECIAL_HOWTO: Record<string, string> = {
  "favicon-generator": "How to make a favicon.ico",
  "image-converter": "How to convert images",
  "sign-pdf": "How to sign a PDF",
  "add-text-to-pdf": "How to add text to a PDF",
  "organize-pdf": "How to organize the pages of a PDF",
  "reorder-pdf-pages": "How to reorder the pages of a PDF",
  "image-to-text": "How to extract text from an image",
  "jpg-to-text": "How to extract text from a JPG photo",
  "ocr-pdf": "How to make a scanned PDF searchable",
  "scanned-pdf-to-text": "How to get the text out of a scanned PDF",
};
const VERBS = /^(Convert|Merge|Split|Extract|Delete|Rotate|Compress|Resize|Protect|Unlock|Repair|Add|Sign|Organize|Scan|Remove|Crop|Flip|Make)\b/;

/** "How to convert Word to PDF", "How to merge PDF files": the heading and HowTo name. */
export function howToHeading(page: Page): string {
  if (SPECIAL_HOWTO[page.slug]) return SPECIAL_HOWTO[page.slug]!;
  if (VERBS.test(page.h1)) return `How to ${page.h1.charAt(0).toLowerCase()}${page.h1.slice(1)}`;
  // "Images to PDF" → "images"; formats and product names keep their capitals.
  const h1 = page.h1.replace(/^Images\b/, "images");
  return `How to convert ${h1}`;
}
export const pageBySlug = (slug: string) => PAGES.find((p) => p.slug === slug);

export const HOME = {
  title: `${BRAND}: Free File Converter for PDF, Images and Documents, No Upload`,
  description:
    "Free online converter that runs in your browser: HEIC to JPG, images to PDF, Word and Excel to PDF, merge and split PDF, PDF to JPG, favicons. Your files never leave your device.",
  h1: "Convert files for free, without uploading them",
  lead: "PDF, image and document tools that run entirely in your browser. No sign-up, no watermark, no limits, and your files never leave your device.",
};

export const CATEGORY_LABEL: Record<Category, string> = {
  pdf: "PDF tools",
  image: "Image converters",
  document: "Documents to PDF",
};
