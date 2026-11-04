import { useEffect, useRef, useState } from "react";
import { useT } from "../i18n";
import { baseName } from "../lib/pages";
import { printAsPdf, sanitize } from "../lib/print";
import { Action, Choice, DropZone, ErrorNote, FileList, Options } from "../components/ui";

const ACCEPT = ".xlsx,.xls,.xlsm,.ods,.csv,.tsv";

/**
 * Spreadsheets → PDF: Excel (.xlsx, .xls), OpenDocument (.ods) and CSV.
 * SheetJS reads the file; every sheet becomes a table, then the browser
 * prints it, so numbers stay text you can search and copy.
 */
export default function SheetToPdf() {
  const t = useT();
  const [file, setFile] = useState<File | null>(null);
  const [orientation, setOrientation] = useState<"landscape" | "portrait">("landscape");
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const body = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!file || !body.current) return;
    let cancelled = false;
    setReady(false);
    body.current.innerHTML = "";
    (async () => {
      try {
        const XLSX = await import("xlsx");
        const wb = XLSX.read(await file.arrayBuffer(), { type: "array", cellDates: true, codepage: 65001 });
        if (cancelled) return;
        const article = document.createElement("article");
        article.className = "sheets";
        for (const name of wb.SheetNames) {
          const sheet = wb.Sheets[name];
          if (!sheet || !sheet["!ref"]) continue;
          const section = document.createElement("section");
          if (wb.SheetNames.length > 1) {
            const h = document.createElement("h2");
            h.textContent = name;
            section.appendChild(h);
          }
          const wrap = document.createElement("div");
          wrap.innerHTML = sanitize(XLSX.utils.sheet_to_html(sheet, { header: "", footer: "" }));
          section.appendChild(wrap);
          article.appendChild(section);
        }
        body.current!.appendChild(article);
        setReady(true);
      } catch (e) {
        console.error(e);
        if (!cancelled) setError(t("error"));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [file]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <>
      {!file ? (
        <DropZone
          accept={ACCEPT}
          label="Excel (.xlsx, .xls), OpenDocument (.ods), CSV"
          onFiles={(f) => (setError(null), setFile(f[0] ?? null))}
        />
      ) : (
        <>
          <FileList files={[file]} onChange={() => (setFile(null), setReady(false))} />
          <Options>
            <Choice
              label={t("orientation")}
              value={orientation}
              onChange={setOrientation}
              options={[
                { value: "landscape", label: t("orLandscape") },
                { value: "portrait", label: t("orPortrait") },
              ]}
            />
          </Options>
          <p className="hint">{t("t_word_hint")}</p>
          <Action
            label={t("t_word_action")}
            busy={!ready}
            onClick={() => printAsPdf(baseName(file.name), { margin: "12mm", size: `A4 ${orientation}` })}
          />
        </>
      )}
      <ErrorNote message={error} />
      <section className={`print-area${file ? "" : " empty"}`} aria-label={t("t_word_preview")}>
        <div ref={body} />
      </section>
    </>
  );
}
