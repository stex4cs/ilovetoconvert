import { useState } from "react";
import { useT } from "../i18n";
import { pageCount } from "../lib/pdf";
import { DropZone, ErrorNote, FileList } from "../components/ui";

const isPdf = (f: File) => f.type === "application/pdf" || /\.pdf$/i.test(f.name);

/** One PDF, read once; renders the drop zone until a file is chosen. */
export function useSinglePdf(onChange?: () => void) {
  const t = useT();
  const [file, setFile] = useState<File | null>(null);
  const [data, setData] = useState<ArrayBuffer | null>(null);
  const [pages, setPages] = useState(0);
  const [loadError, setLoadError] = useState<string | null>(null);

  const choose = async (files: File[]) => {
    const f = files.find(isPdf);
    onChange?.();
    if (!f) return;
    setLoadError(null);
    try {
      const buf = await f.arrayBuffer();
      setPages(await pageCount(buf.slice(0)));
      setData(buf);
      setFile(f);
    } catch {
      setLoadError(t("error"));
    }
  };

  const clear = () => {
    onChange?.();
    setFile(null);
    setData(null);
    setPages(0);
  };

  const picker = file ? (
    <FileList files={[file]} onChange={clear} meta={() => `${pages} ${t("pages")}`} />
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
