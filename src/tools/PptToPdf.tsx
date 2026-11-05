import { useEffect, useRef, useState } from "react";
import { useT } from "../i18n";
import { baseName } from "../lib/pages";
import { printAsPdf } from "../lib/print";
import { Action, DropZone, ErrorNote, FileList } from "../components/ui";

/**
 * PowerPoint (.pptx) → PDF. Every slide is drawn as HTML by our own renderer
 * (src/lib/pptx.ts); the PDF comes from the browser's print engine, one slide
 * per page at the slide's own size, so text stays text.
 */
export default function PptToPdf() {
  const t = useT();
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [deck, setDeck] = useState<{ width: number; height: number; unsupported: string[] } | null>(null);
  const body = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!file || !body.current) return;
    let cancelled = false;
    setDeck(null);
    body.current.innerHTML = "";
    (async () => {
      try {
        const { renderPptx } = await import("../lib/pptx");
        const holder = document.createElement("div");
        const r = await renderPptx(await file.arrayBuffer(), holder);
        if (cancelled || !body.current) return;
        if (!r.slides) throw new Error("no slides");
        body.current.appendChild(holder);
        setDeck(r);
      } catch (e) {
        console.error(e);
        if (!cancelled) setError(t("error"));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [file]); // eslint-disable-line react-hooks/exhaustive-deps

  const choose = (files: File[]) => {
    const f = files[0];
    if (!f) return;
    setError(null);
    if (/\.ppt$/i.test(f.name)) {
      setFile(null);
      setError(t("t_ppt_old"));
      return;
    }
    setFile(f);
  };

  return (
    <>
      {!file ? (
        <DropZone accept=".pptx,.ppt,application/vnd.openxmlformats-officedocument.presentationml.presentation" label="PowerPoint (.pptx)" onFiles={choose} />
      ) : (
        <>
          <FileList files={[file]} onChange={() => (setFile(null), setDeck(null))} />
          <p className="hint">{t("t_word_hint")}</p>
          {deck && deck.unsupported.length > 0 && <p className="hint">{t("pptUnsupported", { what: deck.unsupported.join(", ") })}</p>}
          <Action
            label={t("t_word_action")}
            busy={!deck}
            onClick={() => printAsPdf(baseName(file.name), { margin: "0", size: `${deck!.width}px ${deck!.height}px` })}
          />
        </>
      )}
      <ErrorNote message={error} />
      <section className={`print-area slides${file ? "" : " empty"}`} aria-label={t("t_word_preview")} style={deck ? ({ "--slide-w": `${deck.width}px` } as React.CSSProperties) : undefined}>
        <div ref={body} />
      </section>
    </>
  );
}
