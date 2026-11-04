import { useState } from "react";
import { useT } from "../i18n";
import { decodeAll, frameForPdf, IMAGE_ACCEPT, IMAGE_LABEL, isImage, mayHaveAlpha } from "../lib/images";
import { imagesToPdf, pdfBlob } from "../lib/pdf";
import { baseName, type Orientation, type PageSize } from "../lib/pages";
import { Action, Choice, DropZone, ErrorNote, FileList, Options, Results } from "../components/ui";
import { useRunner } from "./common";


export default function ImagesToPdf() {
  const t = useT();
  const [files, setFiles] = useState<File[]>([]);
  const [size, setSize] = useState<PageSize>("a4");
  const [orientation, setOrientation] = useState<Orientation>("auto");
  const [margin, setMargin] = useState(18);
  const { busy, error, outputs, run, reset } = useRunner();

  const add = (more: File[]) => {
    reset();
    setFiles((f) => [...f, ...more.filter(isImage)]);
  };

  return (
    <>
      {files.length === 0 ? (
        <DropZone accept={IMAGE_ACCEPT} multiple label={IMAGE_LABEL} onFiles={add} />
      ) : (
        <>
          <FileList files={files} onChange={(f) => (reset(), setFiles(f))} ordered />
          <DropZone accept={IMAGE_ACCEPT} multiple label="" onFiles={add} compact />
          <Options>
            <Choice
              label={t("pageSize")}
              value={size}
              onChange={setSize}
              options={[
                { value: "a4", label: t("sizeA4") },
                { value: "letter", label: t("sizeLetter") },
                { value: "fit", label: t("sizeFit") },
              ]}
            />
            {size !== "fit" && (
              <>
                <Choice
                  label={t("orientation")}
                  value={orientation}
                  onChange={setOrientation}
                  options={[
                    { value: "auto", label: t("orAuto") },
                    { value: "portrait", label: t("orPortrait") },
                    { value: "landscape", label: t("orLandscape") },
                  ]}
                />
                <Choice
                  label={t("margin")}
                  value={margin}
                  onChange={setMargin}
                  options={[
                    { value: 0, label: t("marginNone") },
                    { value: 18, label: t("marginSmall") },
                    { value: 42, label: t("marginBig") },
                  ]}
                />
              </>
            )}
          </Options>
          <Action
            label={t("t_images_action")}
            busy={busy}
            onClick={() =>
              run(async () => {
                // A multi-page TIFF contributes one PDF page per TIFF page.
                const encoded = [];
                for (const f of files) {
                  for (const { bitmap } of await decodeAll(f)) {
                    encoded.push(await frameForPdf(bitmap, mayHaveAlpha(f)));
                    bitmap.close();
                  }
                }
                const bytes = await imagesToPdf(encoded, { size, orientation, margin });
                const name = `${baseName(files[0]!.name)}.pdf`;
                return [{ name, blob: pdfBlob(bytes) }];
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
