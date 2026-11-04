import { lazy, type ComponentType, type LazyExoticComponent } from "react";
import type { Key } from "../i18n";

export type Tool = {
  slug: string;
  title: Key;
  desc: Key;
  icon: string;
  color: string;
  Component: LazyExoticComponent<ComponentType>;
};

export const TOOLS: Tool[] = [
  {
    slug: "slike-u-pdf",
    title: "t_images_title",
    desc: "t_images_desc",
    icon: "M4 5h16v14H4z M4 15l4-4 4 4 3-3 5 5 M15 9h.01",
    color: "#e5484d",
    Component: lazy(() => import("./ImagesToPdf")),
  },
  {
    slug: "word-u-pdf",
    title: "t_word_title",
    desc: "t_word_desc",
    icon: "M7 3h7l5 5v13H7z M14 3v5h5 M9.5 12l1.2 5 1.3-4 1.3 4 1.2-5",
    color: "#2f6fde",
    Component: lazy(() => import("./WordToPdf")),
  },
  {
    slug: "excel-u-pdf",
    title: "t_sheet_title",
    desc: "t_sheet_desc",
    icon: "M4 4h16v16H4z M4 9h16 M4 14h16 M10 4v16",
    color: "#18794e",
    Component: lazy(() => import("./SheetToPdf")),
  },
  {
    slug: "spoji-pdf",
    title: "t_merge_title",
    desc: "t_merge_desc",
    icon: "M5 4h8v10H5z M11 10h8v10h-8z",
    color: "#8e4ec6",
    Component: lazy(() => import("./MergePdf")),
  },
  {
    slug: "izdvoji-strane",
    title: "t_split_title",
    desc: "t_split_desc",
    icon: "M5 4h14v16H5z M12 4v16 M8.5 9h0 M15.5 15h0",
    color: "#f76b15",
    Component: lazy(() => import("./SplitPdf")),
  },
  {
    slug: "rotiraj-pdf",
    title: "t_rotate_title",
    desc: "t_rotate_desc",
    icon: "M20 12a8 8 0 1 1-2.3-5.6 M20 4v4h-4",
    color: "#12a594",
    Component: lazy(() => import("./RotatePdf")),
  },
  {
    slug: "pdf-u-slike",
    title: "t_pdf2img_title",
    desc: "t_pdf2img_desc",
    icon: "M7 3h7l5 5v13H7z M14 3v5h5 M9 18l2.5-3 2 2 1.5-1.5 2 2.5",
    color: "#d6409f",
    Component: lazy(() => import("./PdfToImages")),
  },
  {
    slug: "konvertuj-slike",
    title: "t_convert_title",
    desc: "t_convert_desc",
    icon: "M4 7h11l-3-3 M20 17H9l3 3",
    color: "#3e63dd",
    Component: lazy(() => import("./ConvertImages")),
  },
];

export const toolBySlug = (slug: string) => TOOLS.find((t) => t.slug === slug);
