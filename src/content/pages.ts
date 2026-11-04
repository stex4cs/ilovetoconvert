/**
 * Every landing page: one URL per thing people search for ("heic to jpg",
 * "merge pdf"), each with its own title, description, copy and FAQ, all
 * pointing at one of eight tools with the right preset.
 */
import { FORMATS, type FormatId } from "./formats";

export const BRAND = "ilovetoconvert";

export type ToolId =
  | "images-to-pdf" | "word-to-pdf" | "excel-to-pdf" | "merge-pdf"
  | "split-pdf" | "rotate-pdf" | "pdf-to-images" | "convert-images";

export type Preset = {
  type?: "image/jpeg" | "image/png" | "image/webp" | "image/x-icon";
  quality?: number;
  maxSide?: number;
  mode?: "ranges" | "each" | "delete";
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
};
const VERBS = /^(Convert|Merge|Split|Extract|Delete|Rotate|Compress|Resize)\b/;

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
