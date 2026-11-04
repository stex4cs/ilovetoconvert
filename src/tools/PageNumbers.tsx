import { useState } from "react";
import { useT } from "../i18n";
import { baseName } from "../lib/pages";
import { addPageNumbers, type NumberFormat, type NumberPosition } from "../lib/pdfextra";
import { pdfBlob } from "../lib/pdf";
import { Action, Choice, ErrorNote, Options, Results } from "../components/ui";
import { useRunner } from "./common";
import { useSinglePdf } from "./SinglePdf";

export default function PageNumbers() {
  const t = useT();
  const { busy, error, outputs, run, reset } = useRunner();
  const { file, picker, bytes } = useSinglePdf(reset);
  const [position, setPosition] = useState<NumberPosition>("bottom-center");
  const [format, setFormat] = useState<NumberFormat>("n");
  const [skipFirst, setSkipFirst] = useState(false);
  const [start, setStart] = useState(1);
  const [size, setSize] = useState(11);

  return (
    <>
      {picker}
      {file && (
        <>
          <Options>
            <Choice
              label={t("position")}
              value={position}
              onChange={setPosition}
              options={[
                { value: "bottom-left", label: "↙" },
                { value: "bottom-center", label: "↓" },
                { value: "bottom-right", label: "↘" },
                { value: "top-left", label: "↖" },
                { value: "top-center", label: "↑" },
                { value: "top-right", label: "↗" },
              ]}
            />
            <Choice
              label={t("format")}
              value={format}
              onChange={setFormat}
              options={[
                { value: "n", label: "1" },
                { value: "n-of", label: "1 / 10" },
                { value: "page-n-of", label: "Page 1 of 10" },
              ]}
            />
            <Choice label={t("fontSize")} value={size} onChange={setSize} options={[9, 11, 14].map((v) => ({ value: v, label: `${v} pt` }))} />
            <Choice
              label={t("firstPage")}
              value={skipFirst ? "skip" : "number"}
              onChange={(v) => setSkipFirst(v === "skip")}
              options={[
                { value: "number", label: t("numberIt") },
                { value: "skip", label: t("skipCover") },
              ]}
            />
            <label className="field">
              <span>{t("startAt")}</span>
              <input type="number" min={0} value={start} onChange={(e) => setStart(Math.max(0, Number(e.target.value) || 0))} />
            </label>
          </Options>
          <Action
            label={t("t_numbers_action")}
            busy={busy}
            onClick={() =>
              run(async () => {
                const out = await addPageNumbers(bytes(), { position, format, start, skipFirst, size });
                return [{ name: `${baseName(file.name)}-numbered.pdf`, blob: pdfBlob(out) }];
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
