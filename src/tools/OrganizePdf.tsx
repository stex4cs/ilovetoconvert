import { useEffect, useRef, useState } from "react";
import { usePages, useT } from "../i18n";
import { baseName } from "../lib/pages";
import { organizePdf, pdfBlob } from "../lib/pdf";
import { loadPdfJs, PDFJS_ASSETS } from "../lib/pdfjs";
import { canvasToBlob } from "../lib/images";
import { Action, DropZone, ErrorNote, Results } from "../components/ui";
import { UserError, useRunner } from "./common";

const isPdf = (f: File) => f.type === "application/pdf" || /\.pdf$/i.test(f.name);
const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

type Card = { id: number; file: number; index: number; rotate: number; thumb?: string; ratio: number };

/**
 * Organize PDF: every page as a thumbnail to drag into order, turn or
 * delete. Several PDFs can be added; their pages are mixed freely.
 */
export default function OrganizePdf() {
  const t = useT();
  const pagesLabel = usePages();
  const [names, setNames] = useState<string[]>([]);
  const [cards, setCards] = useState<Card[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [dragging, setDragging] = useState<number | null>(null);
  const { busy, error, outputs, run, reset } = useRunner();
  const sources = useRef<ArrayBuffer[]>([]);
  const nextId = useRef(0);
  const urls = useRef<string[]>([]);

  useEffect(() => () => urls.current.forEach((u) => URL.revokeObjectURL(u)), []);

  const change = (f: (c: Card[]) => Card[]) => (reset(), setCards(f));

  const add = async (more: File[]) => {
    reset();
    setLoadError(null);
    setLoading(true);
    try {
      const pdfjs = await loadPdfJs();
      for (const f of more.filter(isPdf)) {
        const data = await f.arrayBuffer();
        const task = pdfjs.getDocument({ data: new Uint8Array(data.slice(0)), ...PDFJS_ASSETS });
        let doc;
        try {
          doc = await task.promise;
        } catch {
          setLoadError(t("orgCantRead", { name: f.name }));
          continue;
        }
        const file = sources.current.push(data) - 1;
        setNames((n) => [...n, f.name]);
        const fresh: Card[] = [];
        for (let i = 0; i < doc.numPages; i++) fresh.push({ id: nextId.current++, file, index: i, rotate: 0, ratio: 1 / Math.SQRT2 });
        setCards((c) => [...c, ...fresh]);
        // thumbnails, one by one, so the grid is usable while they arrive
        for (const card of fresh) {
          const page = await doc.getPage(card.index + 1);
          const unscaled = page.getViewport({ scale: 1 });
          const viewport = page.getViewport({ scale: 220 / Math.max(unscaled.width, unscaled.height) });
          const canvas = document.createElement("canvas");
          canvas.width = Math.ceil(viewport.width);
          canvas.height = Math.ceil(viewport.height);
          const ctx = canvas.getContext("2d")!;
          ctx.fillStyle = "#ffffff";
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          await page.render({ canvas, canvasContext: ctx, viewport }).promise;
          page.cleanup();
          const url = URL.createObjectURL(await canvasToBlob(canvas, "image/jpeg", 0.8));
          urls.current.push(url);
          setCards((c) => c.map((x) => (x.id === card.id ? { ...x, thumb: url, ratio: canvas.width / canvas.height } : x)));
        }
        await task.destroy();
      }
    } finally {
      setLoading(false);
    }
  };

  const move = (i: number, d: -1 | 1) =>
    change((c) => {
      const j = i + d;
      if (j < 0 || j >= c.length) return c;
      const next = c.slice();
      [next[i], next[j]] = [next[j]!, next[i]!];
      return next;
    });
  const turn = (id: number, by: number) => change((c) => c.map((x) => (x.id === id ? { ...x, rotate: (x.rotate + by + 360) % 360 } : x)));

  if (!names.length) {
    return (
      <>
        <DropZone accept="application/pdf,.pdf" multiple label="PDF" onFiles={add} />
        <ErrorNote message={loadError} />
      </>
    );
  }

  return (
    <>
      <div className="org-bar">
        <span>
          {pagesLabel(cards.length)}
          {names.length > 1 && ` · ${names.map((n, i) => `${LETTERS[i % 26]} = ${n}`).join(", ")}`}
        </span>
        <span>
          <button className="secondary" onClick={() => change((c) => c.map((x) => ({ ...x, rotate: (x.rotate + 90) % 360 })))}>
            {t("orgRotateAll")}
          </button>
          <button className="secondary" onClick={() => change((c) => c.slice().reverse())}>
            {t("orgReverse")}
          </button>
        </span>
      </div>
      <p className="hint">{t("orgHint")}</p>
      <ol className="org-grid">
        {cards.map((c, i) => (
          <li
            key={c.id}
            className={`org-card${dragging === i ? " dragging" : ""}`}
            draggable
            onDragStart={(e) => (setDragging(i), e.dataTransfer.setData("text/plain", String(c.id)))}
            onDragEnd={() => setDragging(null)}
            onDragOver={(e) => {
              if (dragging === null || dragging === i) return;
              e.preventDefault();
              change((all) => {
                const next = all.slice();
                const [moved] = next.splice(dragging, 1);
                next.splice(i, 0, moved!);
                return next;
              });
              setDragging(i);
            }}
          >
            <div className="org-thumb">
              {c.thumb ? (
                <img src={c.thumb} alt="" style={{ transform: `rotate(${c.rotate}deg)`, aspectRatio: String(c.ratio) }} draggable={false} />
              ) : (
                <span className="org-blank" style={{ aspectRatio: String(c.ratio), transform: `rotate(${c.rotate}deg)` }} />
              )}
            </div>
            <span className="org-label">
              {names.length > 1 ? `${LETTERS[c.file % 26]} · ` : ""}
              {c.index + 1}
            </span>
            <div className="org-tools">
              <button className="icon" title={t("moveLeft")} aria-label={t("moveLeft")} disabled={i === 0} onClick={() => move(i, -1)}>
                ←
              </button>
              <button className="icon" title={t("rotateLeft")} aria-label={t("rotateLeft")} onClick={() => turn(c.id, -90)}>
                ↺
              </button>
              <button className="icon" title={t("rotateRight")} aria-label={t("rotateRight")} onClick={() => turn(c.id, 90)}>
                ↻
              </button>
              <button className="icon" title={t("deletePage")} aria-label={t("deletePage")} onClick={() => change((all) => all.filter((x) => x.id !== c.id))}>
                ×
              </button>
              <button className="icon" title={t("moveRight")} aria-label={t("moveRight")} disabled={i === cards.length - 1} onClick={() => move(i, 1)}>
                →
              </button>
            </div>
          </li>
        ))}
      </ol>
      <DropZone accept="application/pdf,.pdf" multiple label="" onFiles={add} compact />
      <ErrorNote message={loadError} />
      <Action
        label={t("t_organize_action")}
        busy={busy || loading}
        busyLabel={loading ? t("orgLoading") : undefined}
        onClick={() =>
          run(async () => {
            if (!cards.length) throw new UserError(t("orgEmpty"));
            const bytes = await organizePdf(sources.current, cards);
            return [{ name: `${baseName(names[0]!)}-organized.pdf`, blob: pdfBlob(bytes) }];
          }, t("error"))
        }
      />
      <ErrorNote message={error} />
      <Results outputs={outputs} />
    </>
  );
}
