import { useEffect, useRef, useState } from "react";
import { useT } from "../i18n";
import { baseName } from "../lib/pages";
import { printAsPdf, sanitize } from "../lib/print";
import { Action, DropZone, ErrorNote, FileList } from "../components/ui";

type Kind = "docx" | "md" | "txt";

/**
 * Word draws list bullets with private-use characters from the Symbol and
 * Wingdings fonts (U+F0B7 is the round bullet). Browsers don't have those
 * fonts, so the bullets come out as empty boxes; swap in real characters.
 */
const SYMBOLS: Record<string, string> = {
  "\uF0B7": "\u2022", // •
  "\uF0A7": "\u25AA", // ▪
  "\uF0D8": "\u27A2", // ➢
  "\uF0FC": "\u2713", // ✓
  "\uF076": "\u2756", // ❖
  "\uF06E": "\u25A0", // ■
  "\uF0A8": "\u25A1", // □
  "\uF0E0": "\u2192", // →
};
function fixSymbolBullets(css: string): string {
  return css
    .replace(/[\uF000-\uF0FF]/g, (ch) => SYMBOLS[ch] ?? "\u2022")
    .replace(/font-family:\s*"?(Symbol|Wingdings)"?;/gi, "font-family: inherit;");
}

const kindOf = (f: File): Kind | "doc" | null => {
  const e = f.name.split(".").pop()?.toLowerCase();
  if (e === "docx") return "docx";
  if (e === "doc") return "doc";
  if (e === "md" || e === "markdown") return "md";
  if (e === "txt" || f.type === "text/plain") return "txt";
  return null;
};

/**
 * Documents → PDF in the browser.
 *
 * .docx is laid out page by page by docx-preview (page size, margins,
 * headers, footers, tables, images). Markdown and plain text are set as a
 * clean A4 document. The PDF itself comes from the browser's print engine.
 */
export default function WordToPdf() {
  const t = useT();
  const [file, setFile] = useState<File | null>(null);
  const [kind, setKind] = useState<Kind>("docx");
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const body = useRef<HTMLDivElement>(null);
  const styles = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!file || !body.current || !styles.current) return;
    let cancelled = false;
    setReady(false);
    body.current.innerHTML = "";
    styles.current.innerHTML = "";
    (async () => {
      try {
        if (kind === "docx") {
          const { renderAsync } = await import("docx-preview");
          if (cancelled) return;
          await renderAsync(await file.arrayBuffer(), body.current!, styles.current!, {
            className: "docx",
            inWrapper: true,
            breakPages: true,
            renderHeaders: true,
            renderFooters: true,
            renderFootnotes: true,
            renderEndnotes: true,
            useBase64URL: true,
          });
          styles.current!.querySelectorAll("style").forEach((el) => {
            el.textContent = fixSymbolBullets(el.textContent ?? "");
          });
        } else {
          const text = await file.text();
          const article = document.createElement("article");
          article.className = "plain-doc";
          if (kind === "md") {
            const { marked } = await import("marked");
            article.innerHTML = sanitize(await marked.parse(text, { gfm: true, breaks: false }));
          } else {
            const pre = document.createElement("pre");
            pre.textContent = text;
            article.appendChild(pre);
          }
          if (cancelled) return;
          body.current!.appendChild(article);
        }
        if (!cancelled) setReady(true);
      } catch (e) {
        console.error(e);
        if (!cancelled) setError(t("error"));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [file, kind]); // eslint-disable-line react-hooks/exhaustive-deps

  const choose = (files: File[]) => {
    const f = files[0];
    if (!f) return;
    setError(null);
    const k = kindOf(f);
    if (k === "doc") {
      setFile(null);
      setError(t("t_word_doc"));
      return;
    }
    if (!k) {
      setError(t("error"));
      return;
    }
    setKind(k);
    setFile(f);
  };

  return (
    <>
      {!file ? (
        <DropZone accept=".docx,.doc,.md,.markdown,.txt,text/plain" label="DOCX, Markdown (.md), TXT" onFiles={choose} />
      ) : (
        <>
          <FileList files={[file]} onChange={() => (setFile(null), setReady(false))} />
          <p className="hint">{t("t_word_hint")}</p>
          <Action
            label={t("t_word_action")}
            busy={!ready}
            onClick={() => {
              // A Word page knows its own size (A4, Letter…); print on exactly that.
              const section = body.current?.querySelector<HTMLElement>("section.docx");
              const size =
                kind === "docx" && section?.style.width
                  ? `${section.style.width} ${section.style.minHeight || section.style.height || "auto"}`
                  : "A4";
              // Each rendered page is exactly as tall as the paper; rounding then
              // pushes its bottom (the footer) off the printed page. Give it 2pt.
              const pagesEls = [...(body.current?.querySelectorAll<HTMLElement>("section.docx") ?? [])];
              const original = pagesEls.map((el) => el.style.minHeight);
              pagesEls.forEach((el, i) => original[i] && (el.style.minHeight = `calc(${original[i]} - 2pt)`));
              const restore = () => {
                pagesEls.forEach((el, i) => (el.style.minHeight = original[i] ?? ""));
                window.removeEventListener("afterprint", restore);
              };
              window.addEventListener("afterprint", restore);
              printAsPdf(baseName(file.name), { margin: kind === "docx" ? "0" : "18mm", size });
            }}
          />
        </>
      )}
      <ErrorNote message={error} />
      <div ref={styles} />
      <section className={`print-area${file ? "" : " empty"}`} aria-label={t("t_word_preview")}>
        <div ref={body} />
      </section>
    </>
  );
}
