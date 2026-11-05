import { useContext, useState } from "react";
import { LangContext, useT } from "../i18n";
import { baseName } from "../lib/pages";
import { pdfBlob } from "../lib/pdf";
import { decodeAll, frameForPdf, IMAGE_ACCEPT, isImage } from "../lib/images";
import { addTextLayers, imagesToSearchablePdf, OCR_LANGS, ocrCanvas, ocrPdf, ocrWorker, recognize } from "../lib/ocr";
import type { EncodedImage } from "../lib/pdf";
import type { Output } from "../lib/files";
import { Action, Choice, DropZone, ErrorNote, FileList, Options, Results } from "../components/ui";
import { UserError, useRunner } from "./common";
import type { Preset } from "../content/pages";

const isPdf = (f: File) => f.type === "application/pdf" || /\.pdf$/i.test(f.name);
const txt = (s: string) => new Blob([s + "\n"], { type: "text/plain;charset=utf-8" });

function initialLang(ui: string): string {
  try {
    const saved = localStorage.getItem("ocrLang");
    if (saved && OCR_LANGS.some((l) => l.code === saved)) return saved;
  } catch {
    /* private mode */
  }
  return ui === "sr" ? "srp_latn" : "eng";
}

/** OCR: images and scanned PDFs → text, or → a PDF whose text can be searched and copied. */
export default function OcrTool({ preset }: { preset?: Preset }) {
  const t = useT();
  const { lang: ui } = useContext(LangContext);
  const [files, setFiles] = useState<File[]>([]);
  const [lang, setLang] = useState(() => initialLang(ui));
  const [target, setTarget] = useState<"txt" | "pdf">(preset?.target === "pdf" ? "pdf" : "txt");
  const [progress, setProgress] = useState("");
  const [text, setText] = useState("");
  const [notes, setNotes] = useState<string[]>([]);
  const [copied, setCopied] = useState(false);
  const { busy, error, outputs, run, reset } = useRunner();

  const clear = () => (reset(), setText(""), setNotes([]));
  const add = (more: File[]) => {
    clear();
    setFiles((f) => [...f, ...more.filter((x) => isPdf(x) || isImage(x))]);
  };

  return (
    <>
      {files.length === 0 ? (
        <DropZone accept={`${IMAGE_ACCEPT},application/pdf,.pdf`} multiple label={t("ocrDrop")} onFiles={add} />
      ) : (
        <>
          <FileList files={files} onChange={(f) => (clear(), setFiles(f))} />
          <DropZone accept={`${IMAGE_ACCEPT},application/pdf,.pdf`} multiple label="" onFiles={add} compact />
          <Options>
            <label className="field">
              <span>{t("ocrLang")}</span>
              <select
                value={lang}
                onChange={(e) => {
                  clear();
                  setLang(e.target.value);
                  try {
                    localStorage.setItem("ocrLang", e.target.value);
                  } catch {
                    /* private mode */
                  }
                }}
              >
                {OCR_LANGS.map((l) => (
                  <option key={l.code} value={l.code}>
                    {l.label}
                  </option>
                ))}
              </select>
            </label>
            <Choice
              label={t("ocrOutput")}
              value={target}
              onChange={(v) => (clear(), setTarget(v))}
              options={[
                { value: "txt", label: t("ocrTxt") },
                { value: "pdf", label: t("ocrPdf") },
              ]}
            />
          </Options>
          <p className="hint">{t("ocrHint")}</p>
          <Action
            label={t("t_ocr_action")}
            busy={busy}
            busyLabel={progress}
            onClick={() => {
              clear();
              setCopied(false);
              run(async () => {
                setProgress(t("ocrLoading", { pct: "0" }));
                const worker = await ocrWorker(lang, (pct) => setProgress(t("ocrLoading", { pct: String(pct) })));
                try {
                  const out: Output[] = [];
                  const texts: string[] = [];
                  const notesOut: string[] = [];
                  const scans: { image: EncodedImage; layer: Uint8Array }[] = [];
                  const images = files.filter((f) => !isPdf(f));
                  let words = 0, done = 0;
                  for (const f of files) {
                    const base = baseName(f.name);
                    if (isPdf(f)) {
                      const r = await ocrPdf(worker, await f.arrayBuffer(), (n, total) =>
                        setProgress(`${f.name}: ${t("pageOf", { n: String(n), total: String(total) })}`),
                      );
                      words += r.words;
                      texts.push(r.text);
                      if (r.skipped) notesOut.push(t("ocrSkipped", { name: f.name, n: String(r.skipped), total: String(r.pages) }));
                      if (target === "txt") out.push({ name: `${base}.txt`, blob: txt(r.text) });
                      else if (r.skipped < r.pages) out.push({ name: `${base}-ocr.pdf`, blob: pdfBlob(await addTextLayers(await f.arrayBuffer(), r.layers)) });
                      continue;
                    }
                    const parts: string[] = [];
                    for (const { bitmap } of await decodeAll(f, 2400)) {
                      setProgress(t("imageOf", { n: String(++done), total: String(Math.max(done, images.length)) }));
                      const r = await recognize(worker, ocrCanvas(bitmap));
                      words += r.words;
                      parts.push(r.text);
                      if (target === "pdf") scans.push({ image: await frameForPdf(bitmap, false, 3000), layer: r.layer });
                      bitmap.close();
                    }
                    texts.push(parts.join("\n\n"));
                    if (target === "txt") out.push({ name: `${base}.txt`, blob: txt(parts.join("\n\n")) });
                  }
                  if (scans.length) out.unshift({ name: `${baseName(images[0]!.name)}-ocr.pdf`, blob: pdfBlob(await imagesToSearchablePdf(scans)) });
                  const all = texts.filter(Boolean).join("\n\n");
                  if (!all.trim() && !words) throw new UserError(t("ocrNothing"));
                  if (!out.length) throw new UserError(t("ocrAlready"));
                  setText(all);
                  setNotes(notesOut);
                  return out;
                } finally {
                  setProgress("");
                  await worker.terminate();
                }
              }, t("error"));
            }}
          />
        </>
      )}
      {notes.map((n, i) => (
        <p key={i} className="hint">
          {n}
        </p>
      ))}
      <ErrorNote message={error} />
      <Results outputs={outputs} />
      {text && (
        <div className="ocr-text">
          <textarea readOnly value={text} aria-label={t("ocrResult")} />
          <button
            className="secondary"
            onClick={async () => {
              await navigator.clipboard.writeText(text);
              setCopied(true);
            }}
          >
            {copied ? t("copied") : t("copy")}
          </button>
        </div>
      )}
    </>
  );
}
