/** What each format is, in one or two plain sentences. Used across the landing pages. */
export type FormatId =
  | "jpg" | "png" | "webp" | "heic" | "avif" | "tiff" | "psd" | "svg" | "bmp" | "gif" | "ico"
  | "pdf" | "docx" | "md" | "txt" | "xlsx" | "csv" | "ods";

export type Format = {
  name: string;
  /** What it is. */
  about: string;
  /** Why people move away from it (for "X to …" pages). */
  leave?: string;
  /** Why people want it (for "… to Y" pages). */
  arrive?: string;
};

export const FORMATS: Record<FormatId, Format> = {
  jpg: {
    name: "JPG",
    about: "JPG (also written JPEG) is the format almost every camera and phone can save, and the one every app, website and printer accepts.",
    leave: "It has no transparency and loses a little detail every time it's re-saved, so graphics and screenshots often look better in another format.",
    arrive: "Pick JPG when the file has to open everywhere: email attachments, upload forms, Windows, old software, print shops.",
  },
  png: {
    name: "PNG",
    about: "PNG is a lossless format with transparency, the usual choice for logos, icons, screenshots and anything with sharp edges or text.",
    leave: "Lossless also means large: a PNG photo can be five to ten times the size of the same photo as a JPG.",
    arrive: "Pick PNG when you need a transparent background or pixel-perfect edges, or when the picture will be edited again.",
  },
  webp: {
    name: "WebP",
    about: "WebP is Google's image format for the web. It is noticeably smaller than JPG or PNG at the same quality and supports transparency.",
    leave: "Images saved from websites are often WebP, and plenty of upload forms, older editors and Windows apps still refuse it.",
    arrive: "Pick WebP for your own website: smaller files mean faster pages and better Core Web Vitals.",
  },
  heic: {
    name: "HEIC",
    about: "HEIC (HEIF) is the format iPhones and iPads have saved photos in since iOS 11. It keeps the same quality as JPG at roughly half the size.",
    leave: "Windows, many websites, government and job portals, and older Android phones can't open HEIC, which is why iPhone photos so often need converting.",
  },
  avif: {
    name: "AVIF",
    about: "AVIF is a newer image format built on the AV1 video codec. It compresses even better than WebP.",
    leave: "Browsers can show it, but most editors, office apps and upload forms still can't, so AVIF files you downloaded are hard to reuse.",
  },
  tiff: {
    name: "TIFF",
    about: "TIFF is the format of scanners, fax software and print shops. One TIFF file can hold many pages, and files are big because they're usually stored without compression.",
    leave: "Most people can't preview a TIFF on their phone, email providers choke on the size, and multi-page TIFFs often show only the first page.",
  },
  psd: {
    name: "PSD",
    about: "PSD is Adobe Photoshop's own file format. It keeps every layer, mask and adjustment so the design can be edited later.",
    leave: "Without Photoshop you can't open it, yet clients and colleagues often just need to see the finished picture.",
  },
  svg: {
    name: "SVG",
    about: "SVG is a vector format: shapes described as code, so a logo stays sharp at any size.",
    leave: "Social networks, Word, PowerPoint, many CMSs and email clients won't accept SVG, so a logo usually needs a PNG or JPG copy.",
  },
  bmp: {
    name: "BMP",
    about: "BMP is the old uncompressed Windows bitmap format. It's simple, and it's huge for what it holds.",
    leave: "A BMP is typically ten times the size of the same image as a JPG, too big for email or uploads.",
  },
  gif: {
    name: "GIF",
    about: "GIF is the oldest web image format, limited to 256 colours and best known for short animations.",
    leave: "For still images it looks banded and dated, and the files are larger than a PNG or JPG of the same picture.",
  },
  ico: {
    name: "ICO",
    about: "ICO is the Windows icon format, and the classic favicon.ico browsers look for. One file holds the same icon at several sizes.",
    arrive: "A favicon.ico with 16, 32 and 48 px covers browser tabs and bookmarks; 64 to 256 px covers Windows shortcuts and high-density screens.",
  },
  pdf: {
    name: "PDF",
    about: "PDF looks the same on every device and printer, which is why forms, invoices, contracts and applications ask for it.",
    arrive: "Pick PDF when the document will be printed, signed, archived or uploaded to a portal that only accepts PDF.",
  },
  docx: {
    name: "Word (DOCX)",
    about: "DOCX is Microsoft Word's file format since 2007, also used by Google Docs, Pages and LibreOffice exports.",
    leave: "A Word file can look different on another computer: missing fonts, shifted tables, different page breaks. A PDF can't.",
  },
  md: {
    name: "Markdown",
    about: "Markdown is plain text with light formatting (# headings, **bold**, lists, tables), used for READMEs, notes and documentation.",
    leave: "It's readable as text, but to share it with someone who doesn't use a Markdown editor you need a formatted document.",
  },
  txt: {
    name: "TXT",
    about: "A TXT file is plain text with no formatting at all.",
    leave: "Printing or submitting plain text usually means turning it into a proper page first.",
  },
  xlsx: {
    name: "Excel (XLSX, XLS)",
    about: "XLSX is Microsoft Excel's spreadsheet format; XLS is the older version of it.",
    leave: "Sending a spreadsheet invites edits, broken formulas and 'I don't have Excel'. A PDF shows the numbers exactly as they are.",
  },
  csv: {
    name: "CSV",
    about: "CSV is a table saved as plain text, one row per line, values separated by commas. Every bank, shop and database can export it.",
    leave: "Opened anywhere but a spreadsheet app, a CSV is an unreadable wall of commas.",
  },
  ods: {
    name: "ODS",
    about: "ODS is the OpenDocument spreadsheet format from LibreOffice and OpenOffice Calc.",
    leave: "Many people and offices don't have software that opens ODS, while everyone can open a PDF.",
  },
};
