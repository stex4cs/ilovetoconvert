import { useState } from "react";
import { useT } from "../i18n";
import { baseName } from "../lib/pages";
import { pdfBlob } from "../lib/pdf";
import { decrypt, encrypt, isEncrypted } from "../lib/qpdf";
import { repairPdf } from "../lib/pdfextra";
import { Action, ErrorNote, Options, Results } from "../components/ui";
import { UserError, useRunner } from "./common";
import { useSinglePdf } from "./SinglePdf";
import type { Preset } from "../content/pages";

/** Protect (AES-256 password), unlock, or repair a PDF with qpdf. */
export default function QpdfTool({ preset }: { preset?: Preset }) {
  const t = useT();
  const mode = preset?.qpdf ?? "protect";
  const { busy, error, outputs, run, reset } = useRunner();
  const { file, picker, bytes } = useSinglePdf(reset, true);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);

  const label = mode === "protect" ? t("t_protect_action") : mode === "unlock" ? t("t_unlock_action") : t("t_repair_action");
  const mismatch = mode === "protect" && confirm.length > 0 && confirm !== password;

  return (
    <>
      {picker}
      {file && (
        <>
          {mode !== "repair" && (
            <Options>
              <label className="field">
                <span>{t("password")}</span>
                <input
                  type={show ? "text" : "password"}
                  value={password}
                  autoComplete="new-password"
                  onChange={(e) => (reset(), setPassword(e.target.value))}
                />
              </label>
              {mode === "protect" && (
                <label className="field">
                  <span>{t("passwordAgain")}</span>
                  <input type={show ? "text" : "password"} value={confirm} autoComplete="new-password" onChange={(e) => setConfirm(e.target.value)} />
                </label>
              )}
              <label className="check">
                <input type="checkbox" checked={show} onChange={(e) => setShow(e.target.checked)} /> {t("showPassword")}
              </label>
              {mismatch && <p className="error">{t("passwordMismatch")}</p>}
            </Options>
          )}
          {mode === "protect" && <p className="hint">{t("protectHint")}</p>}
          <Action
            label={label}
            busy={busy}
            disabled={mode === "protect" ? password.length < 4 || confirm !== password : false}
            onClick={() =>
              run(async () => {
                const base = baseName(file.name);
                if (mode === "protect") {
                  const r = await encrypt(bytes(), password);
                  if (!r.out) throw new UserError(r.log.includes("password") ? t("alreadyProtected") : t("error"));
                  return [{ name: `${base}-protected.pdf`, blob: pdfBlob(r.out) }];
                }
                if (mode === "unlock") {
                  if (!isEncrypted(bytes())) throw new UserError(t("notEncrypted"));
                  const r = await decrypt(bytes(), password);
                  if (!r.out) throw new UserError(/password/i.test(r.log) ? t("wrongPassword") : t("error"));
                  return [{ name: `${base}-unlocked.pdf`, blob: pdfBlob(r.out) }];
                }
                let repaired: Uint8Array;
                try {
                  repaired = (await repairPdf(bytes())).bytes;
                } catch {
                  throw new UserError(t("cannotRepair"));
                }
                return [{ name: `${base}-repaired.pdf`, blob: pdfBlob(repaired) }];
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
