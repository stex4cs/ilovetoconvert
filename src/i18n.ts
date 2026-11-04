import { createContext, useContext } from "react";

export type Lang = "sr" | "en";

const sr = {
  tagline: "Besplatni alati za PDF i slike",
  heroTitle: "PDF i slike, bez instaliranja i bez slanja fajlova",
  heroText:
    "Sve se radi u vašem pregledaču. Fajlovi ne odlaze ni na jedan server, nema registracije, nema vodenog žiga, nema ograničenja.",
  allTools: "Svi alati",
  back: "Svi alati",
  privacy: "Fajlovi ostaju na vašem uređaju",
  drop: "Prevucite fajlove ovde",
  dropOne: "Prevucite fajl ovde",
  orPick: "ili kliknite da izaberete",
  accepts: "Prihvata",
  add: "Dodaj još",
  clear: "Ukloni sve",
  remove: "Ukloni",
  moveUp: "Pomeri gore",
  moveDown: "Pomeri dole",
  working: "Radim…",
  download: "Preuzmi",
  downloadZip: "Preuzmi sve (.zip)",
  done: "Gotovo",
  error: "Nešto nije u redu sa ovim fajlom",
  pages: "strana",
  page: "strana",
  files: "fajlova",
  footerMade: "Napravio",
  footerOpen: "Otvoren kod na GitHub-u",
  footerFree: "Besplatno, bez reklama i bez praćenja.",

  // options
  pageSize: "Veličina strane",
  sizeA4: "A4",
  sizeLetter: "Letter",
  sizeFit: "Kao slika",
  orientation: "Orijentacija",
  orAuto: "Automatski",
  orPortrait: "Uspravno",
  orLandscape: "Položeno",
  margin: "Margina",
  marginNone: "Bez",
  marginSmall: "Mala",
  marginBig: "Velika",
  format: "Format",
  quality: "Kvalitet",
  maxSide: "Najveća dužina stranice",
  original: "Originalna",
  resolution: "Rezolucija",
  ranges: "Strane",
  rangesHint: "npr. 1-3, 5, 8-",
  rangesBad: "Proverite strane: „{x}“",
  mode: "Način",
  modeRanges: "Izdvoji izabrane strane u jedan PDF",
  modeEach: "Svaka strana poseban PDF",
  modeDelete: "Obriši izabrane strane",
  angle: "Ugao",
  which: "Koje strane",
  allPages: "Sve",
  selectedPages: "Izabrane",

  // tools
  t_images_title: "Slike u PDF",
  t_images_desc: "JPG, PNG, HEIC sa iPhone-a, TIFF skenovi sa više strana i druge slike u jedan PDF, redom koji izaberete.",
  t_images_action: "Napravi PDF",
  t_word_title: "Word u PDF",
  t_word_desc: "Dokument .docx u PDF, sa tabelama, slikama, zaglavljima i podnožjima. Može i Markdown (.md) i običan tekst.",
  t_word_action: "Sačuvaj kao PDF",
  t_word_hint:
    "Otvoriće se prozor za štampu. Kao štampač izaberite „Sačuvaj kao PDF“ (Save as PDF). Tekst ostaje pravi tekst, može da se pretražuje i kopira.",
  t_word_doc:
    "Stari format .doc pregledač ne ume da otvori. Otvorite ga u Word-u ili LibreOffice-u i sačuvajte kao .docx, pa ga ubacite ovde.",
  t_word_preview: "Pregled",
  t_merge_title: "Spoji PDF",
  t_merge_desc: "Više PDF fajlova u jedan, redom koji izaberete.",
  t_merge_action: "Spoji",
  t_split_title: "Izdvoji ili obriši strane",
  t_split_desc: "Uzmite samo strane koje vam trebaju, razdvojite PDF na strane ili obrišite višak.",
  t_split_action: "Napravi",
  t_rotate_title: "Rotiraj PDF",
  t_rotate_desc: "Okrenite sve strane ili samo one koje su skenirane naopako.",
  t_rotate_action: "Rotiraj",
  t_pdf2img_title: "PDF u slike",
  t_pdf2img_desc: "Svaka strana PDF-a kao JPG ili PNG slika.",
  t_pdf2img_action: "Pretvori u slike",
  t_convert_title: "Konvertuj i smanji slike",
  t_convert_desc: "HEIC, TIFF, PSD, SVG, AVIF u JPG, PNG ili WebP. Favicon (ICO) u svim veličinama. Smanjite dimenzije i veličinu fajla.",
  t_sheet_title: "Excel u PDF",
  t_sheet_desc: "Tabele iz Excel-a (.xlsx, .xls), OpenOffice/LibreOffice-a (.ods) i CSV fajlova u PDF, svaki list posebno.",
  icoHint: "Jedan .ico fajl sa veličinama 16, 32, 48, 64, 128 i 256 px. Najbolje radi sa kvadratnom slikom ili logom na providnoj pozadini.",
  t_convert_action: "Konvertuj",
};

type Dict = typeof sr;

const en: Dict = {
  tagline: "Free PDF and image tools",
  heroTitle: "PDFs and images, nothing to install and nothing uploaded",
  heroText:
    "Everything runs in your browser. Your files never reach a server: no sign-up, no watermark, no limits.",
  allTools: "All tools",
  back: "All tools",
  privacy: "Your files stay on your device",
  drop: "Drop files here",
  dropOne: "Drop a file here",
  orPick: "or click to choose",
  accepts: "Accepts",
  add: "Add more",
  clear: "Remove all",
  remove: "Remove",
  moveUp: "Move up",
  moveDown: "Move down",
  working: "Working…",
  download: "Download",
  downloadZip: "Download all (.zip)",
  done: "Done",
  error: "Something is wrong with this file",
  pages: "pages",
  page: "page",
  files: "files",
  footerMade: "Made by",
  footerOpen: "Open source on GitHub",
  footerFree: "Free, no ads, no tracking.",

  pageSize: "Page size",
  sizeA4: "A4",
  sizeLetter: "Letter",
  sizeFit: "Same as image",
  orientation: "Orientation",
  orAuto: "Automatic",
  orPortrait: "Portrait",
  orLandscape: "Landscape",
  margin: "Margin",
  marginNone: "None",
  marginSmall: "Small",
  marginBig: "Large",
  format: "Format",
  quality: "Quality",
  maxSide: "Longest side",
  original: "Original",
  resolution: "Resolution",
  ranges: "Pages",
  rangesHint: "e.g. 1-3, 5, 8-",
  rangesBad: "Check the pages: “{x}”",
  mode: "Mode",
  modeRanges: "Extract chosen pages into one PDF",
  modeEach: "Every page as its own PDF",
  modeDelete: "Delete chosen pages",
  angle: "Angle",
  which: "Which pages",
  allPages: "All",
  selectedPages: "Chosen",

  t_images_title: "Images to PDF",
  t_images_desc: "JPG, PNG, iPhone HEIC photos, multi-page TIFF scans and more into one PDF, in the order you choose.",
  t_images_action: "Make PDF",
  t_word_title: "Word to PDF",
  t_word_desc: "A .docx document to PDF, with tables, images, headers and footers. Markdown (.md) and plain text work too.",
  t_word_action: "Save as PDF",
  t_word_hint:
    "A print window will open. Choose “Save as PDF” as the printer. The text stays real text, searchable and copyable.",
  t_word_doc:
    "Browsers can't open the old .doc format. Open it in Word or LibreOffice, save it as .docx and drop it here.",
  t_word_preview: "Preview",
  t_merge_title: "Merge PDF",
  t_merge_desc: "Several PDFs into one, in the order you choose.",
  t_merge_action: "Merge",
  t_split_title: "Extract or delete pages",
  t_split_desc: "Keep only the pages you need, split a PDF into single pages, or delete the extras.",
  t_split_action: "Create",
  t_rotate_title: "Rotate PDF",
  t_rotate_desc: "Turn every page, or just the ones that were scanned upside down.",
  t_rotate_action: "Rotate",
  t_pdf2img_title: "PDF to images",
  t_pdf2img_desc: "Every page of a PDF as a JPG or PNG image.",
  t_pdf2img_action: "Convert to images",
  t_convert_title: "Convert and resize images",
  t_convert_desc: "HEIC, TIFF, PSD, SVG, AVIF to JPG, PNG or WebP. A favicon (ICO) in every size. Shrink dimensions and file size.",
  t_sheet_title: "Excel to PDF",
  t_sheet_desc: "Spreadsheets from Excel (.xlsx, .xls), OpenOffice/LibreOffice (.ods) and CSV files to PDF, every sheet included.",
  icoHint: "One .ico file holding 16, 32, 48, 64, 128 and 256 px. Works best with a square image or a logo on a transparent background.",
  t_convert_action: "Convert",
};

export const dictionaries: Record<Lang, Dict> = { sr, en };
export type Key = keyof Dict;

export function detectLang(): Lang {
  const saved = localStorage.getItem("lang");
  if (saved === "sr" || saved === "en") return saved;
  const nav = navigator.languages?.join(",") ?? navigator.language ?? "";
  return /\b(sr|hr|bs|sh|cnr|me)\b/i.test(nav) ? "sr" : "en";
}

export const LangContext = createContext<{ lang: Lang; setLang: (l: Lang) => void }>({
  lang: "sr",
  setLang: () => {},
});

export function useT() {
  const { lang } = useContext(LangContext);
  const d = dictionaries[lang];
  return (key: Key, vars?: Record<string, string>) =>
    vars ? d[key].replace(/\{(\w+)\}/g, (_, k: string) => vars[k] ?? "") : d[key];
}
