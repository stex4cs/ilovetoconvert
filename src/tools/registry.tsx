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
};
