import { useState } from "react";
import { useT } from "../i18n";
import { baseName } from "../lib/pages";
import { addWatermark } from "../lib/pdfextra";
import { pdfBlob } from "../lib/pdf";
import { canvasToBlob, decodeAll, draw, IMAGE_ACCEPT, isImage } from "../lib/images";
import { Action, Choice, DropZone, ErrorNote, FileList, Options, Results } from "../components/ui";
import { UserError, useRunner } from "./common";
import { useSinglePdf } from "./SinglePdf";

/** Text drawn by the browser (any script, any system font) into a crisp transparent PNG. */
async function textPng(text: string, color: string): Promise<Uint8Array> {
  const size = 160;
  const font = `700 ${size}px system-ui, -apple-system, "Segoe UI", Roboto, Arial, sans-serif`;
  const measure = document.createElement("canvas").getContext("2d")!;
  measure.font = font;
  const w = Math.ceil(measure.measureText(text).width) + size * 0.4;
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = Math.ceil(size * 1.4);
  const ctx = canvas.getContext("2d")!;
  ctx.font = font;
  ctx.fillStyle = color;
  ctx.textBaseline = "middle";
  ctx.fillText(text, size * 0.2, canvas.height / 2);
  return new Uint8Array(await (await canvasToBlob(canvas, "image/png")).arrayBuffer());
}

export default function WatermarkPdf() {
  const t = useT();
  const { busy, error, outputs, run, reset } = useRunner();
  const { file, picker, bytes } = useSinglePdf(reset);
  const [kind, setKind] = useState<"text" | "image">("text");
  const [text, setText] = useState("CONFIDENTIAL");
  const [logo, setLogo] = useState<File | null>(null);
  const [color, setColor] = useState("#d93a4a");
  const [opacity, setOpacity] = useState(0.2);
  const [layout, setLayout] = useState<"center" | "tile">("center");

  return (
    <>
      {picker}
      {file && (
        <>
          <Options>
            <Choice
              label={t("wmKind")}
              value={kind}
              onChange={setKind}
              options={[
                { value: "text", label: t("wmText") },
                { value: "image", label: t("wmImage") },
              ]}
            />
            {kind === "text" ? (
              <>
                <label className="field">
                  <span>{t("wmText")}</span>
                  <input value={text} maxLength={60} onChange={(e) => setText(e.target.value)} />
                </label>
                <Choice
                  label={t("color")}
                  value={color}
                  onChange={setColor}
                  options={[
                    { value: "#d93a4a", label: t("red") },
                    { value: "#6b6b7b", label: t("grey") },
                    { value: "#2f6fde", label: t("blue") },
                    { value: "#111111", label: t("black") },
                  ]}
                />
              </>
            ) : logo ? (
              <FileList files={[logo]} onChange={() => setLogo(null)} />
            ) : (
              <DropZone accept={IMAGE_ACCEPT} label="PNG, JPG, SVG…" onFiles={(f) => setLogo(f.find(isImage) ?? null)} compact />
            )}
            <Choice
              label={t("opacity")}
              value={opacity}
              onChange={setOpacity}
              options={[0.1, 0.2, 0.35, 0.5].map((v) => ({ value: v, label: `${Math.round(v * 100)}%` }))}
            />
            <Choice
              label={t("layout")}
              value={layout}
              onChange={setLayout}
              options={[
                { value: "center", label: t("wmCenter") },
                { value: "tile", label: t("wmTile") },
              ]}
            />
          </Options>
          <Action
            label={t("t_watermark_action")}
            busy={busy}
            disabled={kind === "text" ? !text.trim() : !logo}
            onClick={() =>
              run(async () => {
                let png: Uint8Array;
                if (kind === "text") png = await textPng(text.trim(), color);
                else {
                  const [frame] = await decodeAll(logo!, 1200);
                  if (!frame) throw new UserError(t("error"));
                  png = new Uint8Array(await (await canvasToBlob(draw(frame.bitmap, 1600), "image/png")).arrayBuffer());
                  frame.bitmap.close();
                }
                const out = await addWatermark(bytes(), png, {
                  opacity,
                  scale: layout === "tile" ? 0.32 : kind === "text" ? 0.85 : 0.5,
                  angle: kind === "text" ? 35 : 0,
                  tile: layout === "tile",
                });
                return [{ name: `${baseName(file.name)}-watermarked.pdf`, blob: pdfBlob(out) }];
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
