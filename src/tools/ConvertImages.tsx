import { useState } from "react";
import { useT } from "../i18n";
import { baseName, formatBytes } from "../lib/pages";
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
import { fitToSize, quantizedPng } from "../lib/targetsize";
import { Action, Choice, DropZone, ErrorNote, FileList, Options, Results } from "../components/ui";
import { useRunner } from "./common";
import type { Preset } from "../content/pages";

const TARGETS = [0, 20, 50, 100, 200, 500, 1024];

export default function ConvertImages({ preset }: { preset?: Preset }) {
  const t = useT();
  const [files, setFiles] = useState<File[]>([]);
  const [type, setType] = useState<OutputType>(preset?.type ?? "image/jpeg");
  const [quality, setQuality] = useState(preset?.quality ?? 0.85);
  const [maxSide, setMaxSide] = useState(preset?.maxSide ?? 0);
  const [targetKB, setTargetKB] = useState(preset?.targetKB ?? 0);
  const [colors, setColors] = useState(preset?.pngColors ?? 0);
  const [notes, setNotes] = useState<string[]>([]);
  const { busy, error, outputs, run, reset } = useRunner();

  const add = (more: File[]) => {
    reset();
    setNotes([]);
    setFiles((f) => [...f, ...more.filter(isImage)]);
  };
  const ico = type === "image/x-icon";
  const lossy = type === "image/jpeg" || type === "image/webp";
  const targeting = lossy && targetKB > 0;

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
            {lossy && (
              <Choice
                label={t("targetSize")}
                value={targetKB}
                onChange={setTargetKB}
                options={TARGETS.map((kb) => ({ value: kb, label: kb === 0 ? t("noLimit") : kb >= 1024 ? `${kb / 1024} MB` : `${kb} KB` }))}
              />
            )}
            {lossy && !targeting && (
              <Choice
                label={t("quality")}
                value={quality}
                onChange={setQuality}
                options={[0.6, 0.75, 0.85, 0.95].map((v) => ({ value: v, label: `${Math.round(v * 100)}%` }))}
              />
            )}
            {type === "image/png" && (
              <Choice
                label={t("pngColors")}
                value={colors}
                onChange={setColors}
                options={[
                  { value: 0, label: t("pngLossless") },
                  { value: 256, label: t("png256") },
                  { value: 64, label: t("png64") },
                ]}
              />
            )}
            {!ico && !targeting && (
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
            onClick={() => {
              setNotes([]);
              run(async () => {
                const out = [];
                const notesOut: string[] = [];
                for (const f of files) {
                  // SVG has no pixel size of its own: draw it at the chosen size (or 2048 px).
                  const frames = await decodeAll(f, maxSide || 2048);
                  for (const { bitmap, label } of frames) {
                    const name = `${baseName(f.name)}${label ? `-${label}` : ""}.${extensionFor(type)}`;
                    if (ico) {
                      out.push({ name, blob: await toIco(bitmap) });
                    } else if (targeting) {
                      const r = await fitToSize(bitmap, targetKB * 1024, type as "image/jpeg" | "image/webp");
                      out.push({ name, blob: r.blob });
                      if (!r.fits) notesOut.push(t("targetMissed", { name, size: formatBytes(r.blob.size) }));
                    } else {
                      // JPG has no transparency; paint white behind it instead of black.
                      const canvas = draw(bitmap, maxSide, type === "image/jpeg" ? "#ffffff" : undefined);
                      const blob =
                        type === "image/png" && colors
                          ? await quantizedPng(canvas, colors)
                          : await canvasToBlob(canvas, type, quality);
                      out.push({ name, blob });
                    }
                    bitmap.close();
                  }
                }
                setNotes(notesOut);
                return out;
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
    </>
  );
}
