import { useState } from "react";
import { useT } from "../i18n";
import { baseName } from "../lib/pages";
import { extractPdf, toText } from "../lib/pdftext";
import { Action, ErrorNote, Results } from "../components/ui";
import { UserError, useRunner } from "./common";
import { useSinglePdf } from "./SinglePdf";
import type { Preset } from "../content/pages";

/** PDF → Word (.docx), plain text (.txt), or every embedded image. */
export default function PdfToWord({ preset }: { preset?: Preset }) {
  const t = useT();
  const target = preset?.target ?? "docx";
  const { busy, error, outputs, run, reset } = useRunner();
  const { file, picker, bytes } = useSinglePdf(reset);
  const [progress, setProgress] = useState("");
  const [notice, setNotice] = useState("");

  const label = target === "docx" ? t("t_pdf2word_action") : target === "txt" ? t("t_pdf2txt_action") : t("t_pdfimg_action");

  return (
    <>
      {picker}
      {file && (
        <>
          <p className="hint">{target === "docx" ? t("pdf2wordHint") : target === "txt" ? t("pdf2txtHint") : t("pdfimgHint")}</p>
          <Action
            label={label}
            busy={busy}
            busyLabel={progress}
            onClick={() => {
              setNotice("");
              run(async () => {
                const x = await extractPdf(bytes(), {
                  images: target !== "txt",
                  onPage: (n, total) => setProgress(t("pageOf", { n: String(n), total: String(total) })),
                });
                setProgress("");
                const base = baseName(file.name);
                if (target === "images") {
                  if (!x.images.length) throw new UserError(t("noImages"));
                  const width = String(x.images.length).length;
                  return x.images.map((im, i) => ({
                    name: `${base}-image-${String(i + 1).padStart(width, "0")}.png`,
                    blob: new Blob([im.png as BlobPart], { type: "image/png" }),
                  }));
                }
                // A scan: hardly any text, and pictures carrying the pages instead.
                const scanned = x.chars < 20 * x.pages && x.images.length >= x.pages;
                if (target === "txt") {
                  if (scanned) throw new UserError(t("scannedPdf"));
                  return [{ name: `${base}.txt`, blob: new Blob([toText(x.blocks)], { type: "text/plain;charset=utf-8" }) }];
                }
                const { toDocx } = await import("../lib/docx");
                // A scan has no text layer: the Word file still gets every page as an image.
                if (scanned) setNotice(t("scannedNotice"));
                return [{ name: `${base}.docx`, blob: await toDocx(x) }];
              }, t("error"));
            }}
          />
        </>
      )}
      {notice && <p className="hint">{notice}</p>}
      <ErrorNote message={error} />
      <Results outputs={outputs} />
    </>
  );
}
