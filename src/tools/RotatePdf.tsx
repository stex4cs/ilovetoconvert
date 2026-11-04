import { useState } from "react";
import { useT } from "../i18n";
import { pdfBlob, rotatePages } from "../lib/pdf";
import { baseName, parseRanges } from "../lib/pages";
import { Action, Choice, ErrorNote, Options, Results } from "../components/ui";
import { UserError, useRunner } from "./common";
import { useSinglePdf } from "./SinglePdf";

export default function RotatePdf() {
  const t = useT();
  const { busy, error, outputs, run, reset } = useRunner();
  const { file, pages, picker, bytes } = useSinglePdf(reset);
  const [angle, setAngle] = useState<90 | 180 | 270>(90);
  const [which, setWhich] = useState<"all" | "some">("all");
  const [ranges, setRanges] = useState("");

  return (
    <>
      {picker}
      {file && (
        <>
          <Options>
            <Choice
              label={t("angle")}
              value={angle}
              onChange={setAngle}
              options={[
                { value: 90, label: "90° ↻" },
                { value: 180, label: "180°" },
                { value: 270, label: "90° ↺" },
              ]}
            />
            <Choice
              label={t("which")}
              value={which}
              onChange={setWhich}
              options={[
                { value: "all", label: t("allPages") },
                { value: "some", label: t("selectedPages") },
              ]}
            />
            {which === "some" && (
              <label className="field">
                <span>
                  {t("ranges")} (1–{pages})
                </span>
                <input value={ranges} placeholder={t("rangesHint")} onChange={(e) => setRanges(e.target.value)} />
              </label>
            )}
          </Options>
          <Action
            label={t("t_rotate_action")}
            busy={busy}
            disabled={which === "some" && !ranges.trim()}
            onClick={() =>
              run(async () => {
                let list: number[] = [];
                if (which === "some") {
                  try {
                    list = parseRanges(ranges, pages);
                  } catch {
                    throw new UserError(t("rangesBad", { x: ranges }));
                  }
                }
                const out = await rotatePages(bytes(), angle, list);
                return [{ name: `${baseName(file.name)}-rotated.pdf`, blob: pdfBlob(out) }];
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
