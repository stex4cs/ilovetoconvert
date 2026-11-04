import { useState } from "react";
import { useT } from "../i18n";
import { baseName } from "../lib/pages";
import { canvasToBlob, extensionFor } from "../lib/images";
import { Action, Choice, ErrorNote, Options, Results } from "../components/ui";
import { useRunner } from "./common";
import { useSinglePdf } from "./SinglePdf";

/**
 * pdf.js is large, so it loads only when this tool runs. The legacy build is
 * used on purpose: the modern one calls Map.prototype.getOrInsertComputed,
 * which current browsers don't ship yet, and fails on render.
 */
async function loadPdfJs() {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const worker = await import("pdfjs-dist/legacy/build/pdf.worker.min.mjs?url");
  pdfjs.GlobalWorkerOptions.workerSrc = worker.default;
  return pdfjs;
}

export default function PdfToImages() {
  const t = useT();
  const { busy, error, outputs, run, reset } = useRunner();
  const { file, pages, picker, bytes } = useSinglePdf(reset);
  const [type, setType] = useState<"image/jpeg" | "image/png">("image/jpeg");
  const [dpi, setDpi] = useState(150);

  return (
    <>
      {picker}
      {file && (
        <>
          <Options>
            <Choice
              label={t("format")}
              value={type}
              onChange={setType}
              options={[
                { value: "image/jpeg", label: "JPG" },
                { value: "image/png", label: "PNG" },
              ]}
            />
            <Choice
              label={t("resolution")}
              value={dpi}
              onChange={setDpi}
              options={[
                { value: 72, label: "72 dpi" },
                { value: 150, label: "150 dpi" },
                { value: 300, label: "300 dpi" },
              ]}
            />
          </Options>
          <Action
            label={t("t_pdf2img_action")}
            busy={busy}
            onClick={() =>
              run(async () => {
                const pdfjs = await loadPdfJs();
                const task = pdfjs.getDocument({ data: new Uint8Array(bytes()) });
                const doc = await task.promise;
                const base = baseName(file.name);
                const width = String(pages).length;
                const out = [];
                for (let n = 1; n <= doc.numPages; n++) {
                  const page = await doc.getPage(n);
                  const viewport = page.getViewport({ scale: dpi / 72 });
                  const canvas = document.createElement("canvas");
                  canvas.width = Math.ceil(viewport.width);
                  canvas.height = Math.ceil(viewport.height);
                  const ctx = canvas.getContext("2d")!;
                  ctx.fillStyle = "#ffffff";
                  ctx.fillRect(0, 0, canvas.width, canvas.height);
                  await page.render({ canvas, canvasContext: ctx, viewport }).promise;
                  const blob = await canvasToBlob(canvas, type, 0.92);
                  out.push({ name: `${base}-${String(n).padStart(width, "0")}.${extensionFor(type)}`, blob });
                  page.cleanup();
                }
                await task.destroy();
                return out;
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
