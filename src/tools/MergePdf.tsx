import { useEffect, useState } from "react";
import { useT } from "../i18n";
import { mergePdfs, pageCount, pdfBlob } from "../lib/pdf";
import { baseName } from "../lib/pages";
import { Action, DropZone, ErrorNote, FileList, Results } from "../components/ui";
import { useRunner } from "./common";

const ACCEPT = "application/pdf,.pdf";
const isPdf = (f: File) => f.type === "application/pdf" || /\.pdf$/i.test(f.name);

export default function MergePdf() {
  const t = useT();
  const [files, setFiles] = useState<File[]>([]);
  const [counts, setCounts] = useState(new Map<File, number>());
  const { busy, error, outputs, run, reset } = useRunner();

  useEffect(() => {
    files.forEach(async (f) => {
      if (counts.has(f)) return;
      try {
        const n = await pageCount(await f.arrayBuffer());
        setCounts((m) => new Map(m).set(f, n));
      } catch {
        setCounts((m) => new Map(m).set(f, -1));
      }
    });
  }, [files, counts]);

  const add = (more: File[]) => {
    reset();
    setFiles((f) => [...f, ...more.filter(isPdf)]);
  };
  const meta = (f: File) => {
    const n = counts.get(f);
    return n === undefined ? undefined : n < 0 ? t("error") : `${n} ${t("pages")}`;
  };

  return (
    <>
      {files.length === 0 ? (
        <DropZone accept={ACCEPT} multiple label="PDF" onFiles={add} />
      ) : (
        <>
          <FileList files={files} onChange={(f) => (reset(), setFiles(f))} ordered meta={meta} />
          <DropZone accept={ACCEPT} multiple label="" onFiles={add} compact />
          <Action
            label={t("t_merge_action")}
            busy={busy}
            disabled={files.length < 2}
            onClick={() =>
              run(async () => {
                const data = await Promise.all(files.map((f) => f.arrayBuffer()));
                const bytes = await mergePdfs(data);
                return [{ name: `${baseName(files[0]!.name)}-merged.pdf`, blob: pdfBlob(bytes) }];
              }, t("error"))
            }
          />
        </>
      )}
      <ErrorNote message={error} />
      <Results outputs={outputs} />
    </>
  );
}
