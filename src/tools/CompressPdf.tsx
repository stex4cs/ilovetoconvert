import { useState } from "react";
import { useT } from "../i18n";
import { baseName, formatBytes } from "../lib/pages";
import { compressPdf, compressPdfToTarget, type CompressLevel } from "../lib/pdfextra";
import { pdfBlob } from "../lib/pdf";
import { Action, Choice, ErrorNote, Options, Results } from "../components/ui";
import { useRunner } from "./common";
import { useSinglePdf } from "./SinglePdf";
import type { Preset } from "../content/pages";

const TARGETS = [0, 200, 500, 1024, 2048];

export default function CompressPdf({ preset }: { preset?: Preset }) {
  const t = useT();
  const { busy, error, outputs, run, reset } = useRunner();
  const { file, picker, bytes } = useSinglePdf(reset);
  const [level, setLevel] = useState<CompressLevel>("recommended");
  const [targetKB, setTargetKB] = useState(preset?.targetKB ?? 0);
  const [progress, setProgress] = useState("");
  const [summary, setSummary] = useState("");

  return (
    <>
      {picker}
      {file && (
        <>
          <Options>
            <Choice
              label={t("targetSize")}
              value={targetKB}
              onChange={(v) => (reset(), setSummary(""), setTargetKB(v))}
              options={TARGETS.map((kb) => ({ value: kb, label: kb === 0 ? t("noLimit") : kb >= 1024 ? `${kb / 1024} MB` : `${kb} KB` }))}
            />
            {targetKB === 0 && (
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
            )}
          </Options>
          <Action
            label={t("t_compress_action")}
            busy={busy}
            busyLabel={progress}
            onClick={() => {
              setSummary("");
              run(async () => {
                const r = targetKB
                  ? await compressPdfToTarget(bytes(), targetKB * 1024, (i, n) => setProgress(t("tryOf", { n: String(i), total: String(n) })))
                  : { ...(await compressPdf(bytes(), level, (i, n) => setProgress(t("imageOf", { n: String(i), total: String(n) })))), fits: true };
                setProgress("");
                const saved = r.after < r.before;
                const under = targetKB > 0 && r.before <= targetKB * 1024;
                const lines = [
                  under
                    ? t("alreadyUnder", { size: formatBytes(targetKB * 1024) })
                    : saved
                    ? t("compSaved", { before: formatBytes(r.before), after: formatBytes(r.after), pct: String(Math.round((1 - r.after / r.before) * 100)) })
                    : t("compNothing"),
                ];
                if (targetKB && !r.fits) lines.push(t("pdfTargetMissed", { size: formatBytes(Math.min(r.after, r.before)) }));
                setSummary(lines.join(" "));
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
