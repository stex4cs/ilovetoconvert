import { useState } from "react";
import { useT } from "../i18n";
import { deletePages, extractPages, pdfBlob, splitAll } from "../lib/pdf";
import { baseName, parseRanges, RangeError_ } from "../lib/pages";
import { Action, Choice, ErrorNote, Options, Results } from "../components/ui";
import { UserError, useRunner } from "./common";
import { useSinglePdf } from "./SinglePdf";
import type { Preset } from "../content/pages";

type Mode = "ranges" | "each" | "delete";

export default function SplitPdf({ preset }: { preset?: Preset }) {
  const t = useT();
  const { busy, error, outputs, run, reset } = useRunner();
  const { file, pages, picker, bytes } = useSinglePdf(reset);
  const [mode, setMode] = useState<Mode>(preset?.mode ?? "ranges");
  const [ranges, setRanges] = useState("");

  const chosen = () => {
    try {
      return parseRanges(ranges, pages);
    } catch (e) {
      const part = e instanceof RangeError_ && e.message !== "empty" ? e.message : ranges || "—";
      throw new UserError(t("rangesBad", { x: part }));
    }
  };

  return (
    <>
      {picker}
      {file && (
        <>
          <Options>
            <Choice
              label={t("mode")}
              value={mode}
              onChange={(m) => (reset(), setMode(m))}
              options={[
                { value: "ranges", label: t("modeRanges") },
                { value: "each", label: t("modeEach") },
                { value: "delete", label: t("modeDelete") },
              ]}
            />
            {mode !== "each" && (
              <label className="field">
                <span>
                  {t("ranges")} (1–{pages})
                </span>
                <input
                  value={ranges}
                  placeholder={t("rangesHint")}
                  inputMode="numeric"
                  onChange={(e) => setRanges(e.target.value)}
                />
              </label>
            )}
          </Options>
          <Action
            label={t("t_split_action")}
            busy={busy}
            disabled={mode !== "each" && !ranges.trim()}
            onClick={() =>
              run(async () => {
                const base = baseName(file.name);
                if (mode === "each") {
                  const parts = await splitAll(bytes());
                  const width = String(parts.length).length;
                  return parts.map((p, i) => ({
                    name: `${base}-${String(i + 1).padStart(width, "0")}.pdf`,
                    blob: pdfBlob(p),
                  }));
                }
                const list = chosen();
                if (mode === "delete") {
                  if (list.length >= pages) throw new UserError(t("rangesBad", { x: ranges }));
                  return [{ name: `${base}-edited.pdf`, blob: pdfBlob(await deletePages(bytes(), list)) }];
                }
                return [{ name: `${base}-pages.pdf`, blob: pdfBlob(await extractPages(bytes(), list)) }];
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
