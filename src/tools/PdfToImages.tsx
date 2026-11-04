import { useState } from "react";
import { useT } from "../i18n";
import { baseName } from "../lib/pages";
import { canvasToBlob, extensionFor } from "../lib/images";
import { Action, Choice, ErrorNote, Options, Results } from "../components/ui";
import { useRunner } from "./common";
import { useSinglePdf } from "./SinglePdf";
import { loadPdfJs, PDFJS_ASSETS } from "../lib/pdfjs";
import type { Preset } from "../content/pages";

export default function PdfToImages({ preset }: { preset?: Preset }) {
  const t = useT();
  const { busy, error, outputs, run, reset } = useRunner();
  const { file, pages, picker, bytes } = useSinglePdf(reset);
  const [type, setType] = useState<"image/jpeg" | "image/png">(preset?.type === "image/png" ? "image/png" : "image/jpeg");
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
                const task = pdfjs.getDocument({ data: new Uint8Array(bytes()), ...PDFJS_ASSETS });
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
