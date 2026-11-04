import { useState } from "react";
import { useT } from "../i18n";
import { baseName, formatBytes } from "../lib/pages";
import { compressPdf, type CompressLevel } from "../lib/pdfextra";
import { pdfBlob } from "../lib/pdf";
import { Action, Choice, ErrorNote, Options, Results } from "../components/ui";
import { useRunner } from "./common";
import { useSinglePdf } from "./SinglePdf";

export default function CompressPdf() {
  const t = useT();
  const { busy, error, outputs, run, reset } = useRunner();
  const { file, picker, bytes } = useSinglePdf(reset);
  const [level, setLevel] = useState<CompressLevel>("recommended");
  const [progress, setProgress] = useState("");
  const [summary, setSummary] = useState("");

  return (
    <>
      {picker}
      {file && (
        <>
          <Options>
            <Choice
              label={t("compression")}
              value={level}
              onChange={(v) => (reset(), setSummary(""), setLevel(v))}
              options={[
                { value: "light", label: t("compLight") },
                { value: "recommended", label: t("compRecommended") },
                { value: "strong", label: t("compStrong") },
              ]}
            />
          </Options>
          <Action
            label={t("t_compress_action")}
            busy={busy}
            busyLabel={progress}
            onClick={() => {
              setSummary("");
              run(async () => {
                const r = await compressPdf(bytes(), level, (i, n) => setProgress(t("imageOf", { n: String(i), total: String(n) })));
                setProgress("");
                const saved = r.after < r.before;
                setSummary(
                  saved
                    ? t("compSaved", { before: formatBytes(r.before), after: formatBytes(r.after), pct: String(Math.round((1 - r.after / r.before) * 100)) })
                    : t("compNothing"),
                );
                const out = saved ? r.bytes : new Uint8Array(bytes());
                return [{ name: `${baseName(file.name)}-compressed.pdf`, blob: pdfBlob(out) }];
              }, t("error"));
            }}
          />
        </>
      )}
      {summary && <p className="hint">{summary}</p>}
      <ErrorNote message={error} />
      <Results outputs={outputs} />
    </>
  );
}
