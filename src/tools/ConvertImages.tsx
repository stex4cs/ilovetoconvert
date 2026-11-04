import { useState } from "react";
import { useT } from "../i18n";
import { baseName } from "../lib/pages";
import {
  canvasToBlob,
  decodeAll,
  draw,
  extensionFor,
  IMAGE_ACCEPT,
  IMAGE_LABEL,
  isImage,
  toIco,
  type OutputType,
} from "../lib/images";
import { Action, Choice, DropZone, ErrorNote, FileList, Options, Results } from "../components/ui";
import { useRunner } from "./common";

export default function ConvertImages() {
  const t = useT();
  const [files, setFiles] = useState<File[]>([]);
  const [type, setType] = useState<OutputType>("image/jpeg");
  const [quality, setQuality] = useState(0.85);
  const [maxSide, setMaxSide] = useState(0);
  const { busy, error, outputs, run, reset } = useRunner();

  const add = (more: File[]) => {
    reset();
    setFiles((f) => [...f, ...more.filter(isImage)]);
  };
  const ico = type === "image/x-icon";

  return (
    <>
      {files.length === 0 ? (
        <DropZone accept={IMAGE_ACCEPT} multiple label={IMAGE_LABEL} onFiles={add} />
      ) : (
        <>
          <FileList files={files} onChange={(f) => (reset(), setFiles(f))} />
          <DropZone accept={IMAGE_ACCEPT} multiple label="" onFiles={add} compact />
          <Options>
            <Choice
              label={t("format")}
              value={type}
              onChange={(v) => (reset(), setType(v))}
              options={[
                { value: "image/jpeg", label: "JPG" },
                { value: "image/png", label: "PNG" },
                { value: "image/webp", label: "WebP" },
                { value: "image/x-icon", label: "ICO (favicon)" },
              ]}
            />
            {ico && <p className="hint">{t("icoHint")}</p>}
            {(type === "image/jpeg" || type === "image/webp") && (
              <Choice
                label={t("quality")}
                value={quality}
                onChange={setQuality}
                options={[
                  { value: 0.6, label: "60%" },
                  { value: 0.75, label: "75%" },
                  { value: 0.85, label: "85%" },
                  { value: 0.95, label: "95%" },
                ]}
              />
            )}
            {!ico && (
              <Choice
                label={t("maxSide")}
                value={maxSide}
                onChange={setMaxSide}
                options={[
                  { value: 0, label: t("original") },
                  { value: 3840, label: "3840 px" },
                  { value: 2048, label: "2048 px" },
                  { value: 1280, label: "1280 px" },
                ]}
              />
            )}
          </Options>
          <Action
            label={t("t_convert_action")}
            busy={busy}
            onClick={() =>
              run(async () => {
                const out = [];
                for (const f of files) {
                  // SVG has no pixel size of its own: draw it at the chosen size (or 2048 px).
                  const frames = await decodeAll(f, maxSide || 2048);
                  for (const { bitmap, label } of frames) {
                    const name = `${baseName(f.name)}${label ? `-${label}` : ""}.${extensionFor(type)}`;
                    if (ico) {
                      out.push({ name, blob: await toIco(bitmap) });
                    } else {
                      // JPG has no transparency; paint white behind it instead of black.
                      const canvas = draw(bitmap, maxSide, type === "image/jpeg" ? "#ffffff" : undefined);
                      out.push({ name, blob: await canvasToBlob(canvas, type, quality) });
                    }
                    bitmap.close();
                  }
                }
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
