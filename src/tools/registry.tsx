import { lazy, type ComponentType, type LazyExoticComponent } from "react";
import type { Preset, ToolId } from "../content/pages";

type ToolComponent = LazyExoticComponent<ComponentType<{ preset?: Preset }>>;

/** The eight tools; landing pages point at one of them with a preset. */
export const TOOL_COMPONENTS: Record<ToolId, ToolComponent> = {
  "images-to-pdf": lazy(() => import("./ImagesToPdf")),
  "word-to-pdf": lazy(() => import("./WordToPdf")),
  "excel-to-pdf": lazy(() => import("./SheetToPdf")),
  "merge-pdf": lazy(() => import("./MergePdf")),
  "split-pdf": lazy(() => import("./SplitPdf")),
  "rotate-pdf": lazy(() => import("./RotatePdf")),
  "pdf-to-images": lazy(() => import("./PdfToImages")),
  "convert-images": lazy(() => import("./ConvertImages")),
  "pdf-to-word": lazy(() => import("./PdfToWord")),
  "compress-pdf": lazy(() => import("./CompressPdf")),
  "page-numbers": lazy(() => import("./PageNumbers")),
  "watermark-pdf": lazy(() => import("./WatermarkPdf")),
  qpdf: lazy(() => import("./QpdfTool")),
  "ppt-to-pdf": lazy(() => import("./PptToPdf")),
  ocr: lazy(() => import("./OcrTool")),
  "organize-pdf": lazy(() => import("./OrganizePdf")),
  "sign-pdf": lazy(() => import("./SignPdf")),
};

export const TOOL_STYLE: Record<ToolId, { icon: string; color: string }> = {
  "images-to-pdf": { icon: "M4 5h16v14H4z M4 15l4-4 4 4 3-3 5 5 M15 9h.01", color: "#e5484d" },
  "word-to-pdf": { icon: "M7 3h7l5 5v13H7z M14 3v5h5 M9.5 12l1.2 5 1.3-4 1.3 4 1.2-5", color: "#2f6fde" },
  "excel-to-pdf": { icon: "M4 4h16v16H4z M4 9h16 M4 14h16 M10 4v16", color: "#18794e" },
  "merge-pdf": { icon: "M5 4h8v10H5z M11 10h8v10h-8z", color: "#8e4ec6" },
  "split-pdf": { icon: "M5 4h14v16H5z M12 4v16", color: "#f76b15" },
  "rotate-pdf": { icon: "M20 12a8 8 0 1 1-2.3-5.6 M20 4v4h-4", color: "#12a594" },
  "pdf-to-images": { icon: "M7 3h7l5 5v13H7z M14 3v5h5 M9 18l2.5-3 2 2 1.5-1.5 2 2.5", color: "#d6409f" },
  "convert-images": { icon: "M4 7h11l-3-3 M20 17H9l3 3", color: "#3e63dd" },
  "pdf-to-word": { icon: "M7 3h7l5 5v13H7z M14 3v5h5 M9 13h6 M9 16.5h6 M9 10h2", color: "#2b5797" },
  "compress-pdf": { icon: "M12 3v6m0 0-3-3m3 3 3-3 M12 21v-6m0 0-3 3m3-3 3 3 M4 12h16", color: "#0d9488" },
  "page-numbers": { icon: "M7 3h10v18H7z M10 17h4 M12 7v5 M10.5 8.5 12 7", color: "#a16207" },
  "watermark-pdf": { icon: "M7 3h10v18H7z M9 15l6-6 M9.5 10.5h0 M14.5 14.5h0", color: "#be185d" },
  qpdf: { icon: "M6 11h12v10H6z M8.5 11V8a3.5 3.5 0 0 1 7 0v3 M12 15v2", color: "#475569" },
  "ppt-to-pdf": { icon: "M3 5h18v12H3z M12 17v4 M8 21h8 M8 13l3-3 2 2 3-3", color: "#c2410c" },
  ocr: { icon: "M4 8V5h3 M17 5h3v3 M20 16v3h-3 M7 19H4v-3 M8 10h8 M8 14h5", color: "#0e7490" },
  "organize-pdf": { icon: "M4 4h6v7H4z M14 4h6v7h-6z M4 15h6v5H4z M14 15h6v5h-6z", color: "#7c3aed" },
  "sign-pdf": { icon: "M3 17c3-1 4-9 6-9s0 9 2 9 2-4 4-4 1 3 3 3 M3 21h18", color: "#0f766e" },
};
