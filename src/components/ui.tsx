import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useT } from "../i18n";
import { formatBytes } from "../lib/pages";
import { save, zip, type Output } from "../lib/files";

/* ---------- Drop zone ---------- */

export function DropZone(props: {
  accept: string;
  multiple?: boolean;
  label: string;
  onFiles: (files: File[]) => void;
  compact?: boolean;
}) {
  const t = useT();
  const input = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);

  const take = (list: FileList | null) => {
    if (!list?.length) return;
    const files = Array.from(list);
    props.onFiles(props.multiple ? files : files.slice(0, 1));
  };

  return (
    <div
      className={`drop${over ? " over" : ""}${props.compact ? " compact" : ""}`}
      role="button"
      tabIndex={0}
      onClick={() => input.current?.click()}
      onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && input.current?.click()}
      onDragOver={(e) => {
        e.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setOver(false);
        take(e.dataTransfer.files);
      }}
    >
      <input
        ref={input}
        type="file"
        hidden
        accept={props.accept}
        multiple={props.multiple}
        onChange={(e) => {
          take(e.target.files);
          e.target.value = "";
        }}
      />
      {props.compact ? (
        <span>+ {t("add")}</span>
      ) : (
        <>
          <UploadIcon />
          <strong>{props.multiple ? t("drop") : t("dropOne")}</strong>
          <span>{t("orPick")}</span>
          <small>
            {t("accepts")}: {props.label}
          </small>
        </>
      )}
    </div>
  );
}

/* ---------- File list with ordering ---------- */

function Thumb({ file }: { file: File }) {
  // Only formats every browser can show as an <img>; TIFF, PSD and HEIC get a label.
  const url = useMemo(
    () =>
      /^image\/(jpeg|png|webp|gif|avif|bmp|svg\+xml|x-icon|vnd\.microsoft\.icon)$/.test(file.type)
        ? URL.createObjectURL(file)
        : null,
    [file],
  );
  useEffect(() => () => void (url && URL.revokeObjectURL(url)), [url]);
  const ext = file.name.split(".").pop()?.slice(0, 4).toUpperCase() ?? "";
  return url ? <img className="thumb" src={url} alt="" /> : <span className="thumb doc">{ext}</span>;
}

export function FileList(props: {
  files: File[];
  onChange: (files: File[]) => void;
  ordered?: boolean;
  meta?: (file: File) => string | undefined;
}) {
  const t = useT();
  const { files, onChange } = props;
  const move = (i: number, d: -1 | 1) => {
    const j = i + d;
    if (j < 0 || j >= files.length) return;
    const next = files.slice();
    [next[i], next[j]] = [next[j]!, next[i]!];
    onChange(next);
  };
  const [dragging, setDragging] = useState<number | null>(null);

  return (
    <ol className="files">
      {files.map((f, i) => (
        <li
          key={`${f.name}-${f.size}-${f.lastModified}-${i}`}
          draggable={props.ordered}
          className={dragging === i ? "dragging" : ""}
          onDragStart={() => setDragging(i)}
          onDragEnd={() => setDragging(null)}
          onDragOver={(e) => {
            if (dragging === null || dragging === i) return;
            e.preventDefault();
            const next = files.slice();
            const [moved] = next.splice(dragging, 1);
            next.splice(i, 0, moved!);
            setDragging(i);
            onChange(next);
          }}
        >
          {props.ordered && <span className="num">{i + 1}</span>}
          <Thumb file={f} />
          <span className="fname">
            <span>{f.name}</span>
            <small>
              {formatBytes(f.size)}
              {props.meta?.(f) ? ` · ${props.meta(f)}` : ""}
            </small>
          </span>
          {props.ordered && (
            <>
              <button className="icon" aria-label={t("moveUp")} disabled={i === 0} onClick={() => move(i, -1)}>
                ↑
              </button>
              <button
                className="icon"
                aria-label={t("moveDown")}
                disabled={i === files.length - 1}
                onClick={() => move(i, 1)}
              >
                ↓
              </button>
            </>
          )}
          <button className="icon" aria-label={t("remove")} onClick={() => onChange(files.filter((_, k) => k !== i))}>
            ×
          </button>
        </li>
      ))}
    </ol>
  );
}

/* ---------- Segmented choice ---------- */

export function Choice<V extends string | number>(props: {
  label: string;
  value: V;
  options: { value: V; label: string }[];
  onChange: (v: V) => void;
}) {
  return (
    <fieldset className="choice">
      <legend>{props.label}</legend>
      <div>
        {props.options.map((o) => (
          <button
            key={String(o.value)}
            type="button"
            className={o.value === props.value ? "on" : ""}
            aria-pressed={o.value === props.value}
            onClick={() => props.onChange(o.value)}
          >
            {o.label}
          </button>
        ))}
      </div>
    </fieldset>
  );
}

export function Options({ children }: { children: ReactNode }) {
  return <div className="options">{children}</div>;
}

/* ---------- Action + result ---------- */

export function Action(props: { label: string; busy: boolean; busyLabel?: string; disabled?: boolean; onClick: () => void }) {
  const t = useT();
  return (
    <button className="primary" disabled={props.busy || props.disabled} onClick={props.onClick}>
      {props.busy ? props.busyLabel || t("working") : props.label}
    </button>
  );
}

export function Results({ outputs }: { outputs: Output[] }) {
  const t = useT();
  if (!outputs.length) return null;
  return (
    <section className="results" aria-live="polite">
      <h3>✓ {t("done")}</h3>
      <ul>
        {outputs.map((o, i) => (
          <li key={i}>
            <span className="fname">
              <span>{o.name}</span>
              <small>{formatBytes(o.blob.size)}</small>
            </span>
            <button className="secondary" onClick={() => save(o.blob, o.name)}>
              {t("download")}
            </button>
          </li>
        ))}
      </ul>
      {outputs.length > 1 && (
        <button className="primary" onClick={async () => save(await zip(outputs), "konvertuj.zip")}>
          {t("downloadZip")}
        </button>
      )}
    </section>
  );
}

export function ErrorNote({ message }: { message: string | null }) {
  return message ? (
    <p className="error" role="alert">
      {message}
    </p>
  ) : null;
}

/* ---------- Icons ---------- */

export function UploadIcon() {
  return (
    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
      <path d="M12 16V4m0 0-4 4m4-4 4 4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M4 15v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3" strokeLinecap="round" />
    </svg>
  );
}
