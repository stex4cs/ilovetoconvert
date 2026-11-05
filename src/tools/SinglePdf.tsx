import { useState } from "react";
import { usePages, useT } from "../i18n";
import { pageCount } from "../lib/pdf";
import { DropZone, ErrorNote, FileList } from "../components/ui";

const isPdf = (f: File) => f.type === "application/pdf" || /\.pdf$/i.test(f.name);

/** One PDF, read once; renders the drop zone until a file is chosen. */
/** `lenient`: accept files pdf-lib can't read (encrypted, damaged) instead of rejecting them. */
export function useSinglePdf(onChange?: () => void, lenient = false) {
  const t = useT();
  const pagesLabel = usePages();
  const [file, setFile] = useState<File | null>(null);
  const [data, setData] = useState<ArrayBuffer | null>(null);
  const [pages, setPages] = useState(0);
  const [loadError, setLoadError] = useState<string | null>(null);

  const choose = async (files: File[]) => {
    const f = files.find(isPdf);
    onChange?.();
    if (!f) return;
    setLoadError(null);
    const buf = await f.arrayBuffer();
    try {
      setPages(await pageCount(buf.slice(0)));
    } catch {
      if (!lenient) {
        setLoadError(t("error"));
        return;
      }
      setPages(0);
    }
    setData(buf);
    setFile(f);
  };

  const clear = () => {
    onChange?.();
    setFile(null);
    setData(null);
    setPages(0);
  };

  const picker = file ? (
    <FileList files={[file]} onChange={clear} meta={() => (pages ? pagesLabel(pages) : undefined)} />
  ) : (
    <>
      <DropZone accept="application/pdf,.pdf" label="PDF" onFiles={choose} />
      <ErrorNote message={loadError} />
    </>
  );

  // pdf-lib detaches nothing, but pdf.js transfers the buffer to its worker,
  // so every consumer gets its own copy.
  const bytes = () => (data ? data.slice(0) : new ArrayBuffer(0));

  return { file, pages, picker, bytes };
}
