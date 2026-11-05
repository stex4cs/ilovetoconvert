import "@fontsource/great-vibes/400.css";
import "@fontsource/caveat/400.css";
import { useContext, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { LangContext, useT } from "../i18n";
import { baseName } from "../lib/pages";
import { pdfBlob } from "../lib/pdf";
import { loadPdfJs, PDFJS_ASSETS } from "../lib/pdfjs";
import { canvasToBlob, decodeAll, IMAGE_ACCEPT, isImage } from "../lib/images";
import { cropToInk, inkOnly, stampPdf, type Stamp } from "../lib/stamp";
import { Action, Choice, DropZone, ErrorNote, Options, Results } from "../components/ui";
import { UserError, useRunner } from "./common";
import { useSinglePdf } from "./SinglePdf";
import type { Preset } from "../content/pages";

type PdfDoc = Awaited<ReturnType<Awaited<ReturnType<typeof loadPdfJs>>["getDocument"]>["promise"]>;
type Placed = Stamp & { id: number; url?: string };
type Drag = { id: number; mode: "move" | "resize"; sx: number; sy: number; x: number; y: number; w: number; size: number; elW: number; elH: number; boxW: number; boxH: number };

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/**
 * Sign PDF / add text: draw, type or upload a signature, or type text, then
 * drag it into place on the page preview. Text is written with a real font,
 * so it stays selectable.
 */
export default function SignPdf({ preset }: { preset?: Preset }) {
  const t = useT();
  const { lang } = useContext(LangContext);
  const { busy, error, outputs, run, reset } = useRunner();
  const { file, picker, bytes } = useSinglePdf(reset);

  const [ready, setReady] = useState(0);
  const [numPages, setNumPages] = useState(0);
  const [pageNo, setPageNo] = useState(1);
  const [pageSize, setPageSize] = useState({ w: 595, h: 842 });
  const [boxW, setBoxW] = useState(600);
  const [placed, setPlaced] = useState<Placed[]>([]);

  const [adding, setAdding] = useState<"signature" | "text">(preset?.start ?? "signature");
  const [mode, setMode] = useState<"draw" | "type" | "image">("draw");
  const [ink, setInk] = useState("#111111");
  const [name, setName] = useState("");
  const [sigFont, setSigFont] = useState("Great Vibes");
  const [hasInk, setHasInk] = useState(false);
  const [text, setText] = useState(() => new Date().toLocaleDateString(lang === "sr" ? "sr-Latn-RS" : "en-GB"));
  const [textSize, setTextSize] = useState(12);
  const [textColor, setTextColor] = useState("#111111");

  const doc = useRef<PdfDoc | null>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const pad = useRef<HTMLCanvasElement>(null);
  const drawing = useRef<{ x: number; y: number } | null>(null);
  const drag = useRef<Drag | null>(null);
  const ids = useRef(0);
  const urls = useRef<string[]>([]);

  useEffect(() => () => urls.current.forEach((u) => URL.revokeObjectURL(u)), []);

  // open the PDF for the preview
  useEffect(() => {
    if (!file) return;
    let cancelled = false;
    let task: ReturnType<Awaited<ReturnType<typeof loadPdfJs>>["getDocument"]> | null = null;
    (async () => {
      const pdfjs = await loadPdfJs();
      task = pdfjs.getDocument({ data: new Uint8Array(bytes()), ...PDFJS_ASSETS });
      const d = await task.promise;
      if (cancelled) return;
      doc.current = d;
      setNumPages(d.numPages);
      setPageNo(1);
      setReady((r) => r + 1);
    })().catch((e) => console.error(e));
    return () => {
      cancelled = true;
      doc.current = null;
      void task?.destroy();
      setPlaced([]);
      setNumPages(0);
    };
  }, [file]); // eslint-disable-line react-hooks/exhaustive-deps

  // draw the current page
  useEffect(() => {
    const d = doc.current, c = canvas.current;
    if (!d || !c) return;
    let renderTask: { cancel: () => void; promise: Promise<void> } | null = null;
    (async () => {
      const page = await d.getPage(pageNo);
      const unscaled = page.getViewport({ scale: 1 });
      setPageSize({ w: unscaled.width, h: unscaled.height });
      const viewport = page.getViewport({ scale: Math.min(2.5, 1400 / unscaled.width) });
      c.width = Math.ceil(viewport.width);
      c.height = Math.ceil(viewport.height);
      const ctx = c.getContext("2d")!;
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, c.width, c.height);
      renderTask = page.render({ canvas: c, canvasContext: ctx, viewport });
      await renderTask.promise;
    })().catch(() => {});
    return () => renderTask?.cancel();
  }, [pageNo, ready]);

  // the preview's width in CSS pixels, for text size and drag maths
  useEffect(() => {
    const el = stage.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setBoxW(e!.contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, [ready]);

  const update = (id: number, f: (p: Placed) => Placed) => (reset(), setPlaced((all) => all.map((p) => (p.id === id ? f(p) : p))));

  const onMove = (e: PointerEvent) => {
    const g = drag.current;
    if (!g) return;
    const dx = e.clientX - g.sx, dy = e.clientY - g.sy;
    update(g.id, (p) => {
      if (g.mode === "move") return { ...p, x: clamp(g.x + dx / g.boxW, 0, 1 - g.elW / g.boxW), y: clamp(g.y + dy / g.boxH, 0, 1 - g.elH / g.boxH) };
      if (p.kind === "image") return { ...p, w: clamp(g.w + dx / g.boxW, 0.04, 1 - p.x) };
      return { ...p, size: clamp((g.size * (g.elW + dx)) / g.elW, 4, 160) };
    });
  };
  const onUp = () => {
    drag.current = null;
    window.removeEventListener("pointermove", onMove);
  };
  const startDrag = (e: ReactPointerEvent<HTMLElement>, p: Placed, mode: Drag["mode"]) => {
    e.preventDefault();
    e.stopPropagation();
    const box = stage.current!.getBoundingClientRect();
    const el = (mode === "move" ? e.currentTarget : e.currentTarget.parentElement!).getBoundingClientRect();
    drag.current = {
      id: p.id, mode, sx: e.clientX, sy: e.clientY, x: p.x, y: p.y,
      w: p.kind === "image" ? p.w : 0, size: p.kind === "text" ? p.size : 0,
      elW: el.width, elH: el.height, boxW: box.width, boxH: box.height,
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp, { once: true });
  };

  /** Puts a signature (any canvas with ink on a transparent background) on the current page. */
  const placeCanvas = async (source: HTMLCanvasElement) => {
    const c = cropToInk(source);
    if (!c) return;
    const blob = await canvasToBlob(c, "image/png");
    const url = URL.createObjectURL(blob);
    urls.current.push(url);
    const ratio = c.width / c.height;
    const w = Math.min(0.3, (0.12 * pageSize.h * ratio) / pageSize.w); // about a line or two tall
    const h = (w * pageSize.w) / ratio / pageSize.h;
    const png = new Uint8Array(await blob.arrayBuffer());
    reset();
    setPlaced((all) => [...all, { id: ids.current++, kind: "image", page: pageNo - 1, x: clamp(0.6, 0, 1 - w), y: clamp(0.78, 0, 1 - h), w, ratio, png, url }]);
  };

  /* signature pad */
  const padPoint = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    return { x: ((e.clientX - r.left) / r.width) * e.currentTarget.width, y: ((e.clientY - r.top) / r.height) * e.currentTarget.height };
  };
  const padDown = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    drawing.current = padPoint(e);
    const ctx = e.currentTarget.getContext("2d")!;
    ctx.fillStyle = ink;
    ctx.beginPath();
    ctx.arc(drawing.current.x, drawing.current.y, 3.5, 0, Math.PI * 2);
    ctx.fill();
    setHasInk(true);
  };
  const padMove = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    const last = drawing.current;
    if (!last) return;
    const p = padPoint(e);
    const ctx = e.currentTarget.getContext("2d")!;
    ctx.strokeStyle = ink;
    ctx.lineWidth = 7;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(last.x, last.y);
    // a curve through the midpoint keeps fast strokes smooth
    const mid = { x: (last.x + p.x) / 2, y: (last.y + p.y) / 2 };
    ctx.quadraticCurveTo(last.x, last.y, mid.x, mid.y);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    drawing.current = p;
  };
  const padClear = () => {
    const c = pad.current;
    c?.getContext("2d")!.clearRect(0, 0, c.width, c.height);
    setHasInk(false);
  };

  const typedCanvas = async () => {
    const font = `140px "${sigFont}"`;
    await document.fonts.load(font, name);
    const measure = document.createElement("canvas").getContext("2d")!;
    measure.font = font;
    const c = document.createElement("canvas");
    c.width = Math.ceil(measure.measureText(name).width) + 120;
    c.height = 260;
    const ctx = c.getContext("2d")!;
    ctx.font = font;
    ctx.fillStyle = ink;
    ctx.textBaseline = "middle";
    ctx.fillText(name, 60, 130);
    return c;
  };

  const here = placed.filter((p) => p.page === pageNo - 1);
  const elsewhere = placed.length - here.length;

  return (
    <>
      {picker}
      {file && numPages > 0 && (
        <>
          <Options>
            <Choice
              label={t("signAdd")}
              value={adding}
              onChange={setAdding}
              options={[
                { value: "signature", label: t("signSignature") },
                { value: "text", label: t("signText") },
              ]}
            />
            {adding === "signature" ? (
              <>
                <Choice
                  label=""
                  value={mode}
                  onChange={setMode}
                  options={[
                    { value: "draw", label: t("signDraw") },
                    { value: "type", label: t("signType") },
                    { value: "image", label: t("signImage") },
                  ]}
                />
                {mode !== "image" && (
                  <Choice
                    label={t("color")}
                    value={ink}
                    onChange={setInk}
                    options={[
                      { value: "#111111", label: t("black") },
                      { value: "#1d3fae", label: t("blue") },
                    ]}
                  />
                )}
                {mode === "draw" && (
                  <div className="sign-panel">
                    <canvas
                      ref={pad}
                      className="sign-pad"
                      width={1200}
                      height={400}
                      aria-label={t("signPadHint")}
                      onPointerDown={padDown}
                      onPointerMove={padMove}
                      onPointerUp={() => (drawing.current = null)}
                      onPointerCancel={() => (drawing.current = null)}
                    />
                    <div className="sign-row">
                      <small>{t("signPadHint")}</small>
                      <span>
                        <button className="secondary" onClick={padClear}>
                          {t("signClear")}
                        </button>
                        <button className="secondary" disabled={!hasInk} onClick={() => pad.current && placeCanvas(pad.current)}>
                          {t("signPlace")}
                        </button>
                      </span>
                    </div>
                  </div>
                )}
                {mode === "type" && (
                  <div className="sign-panel">
                    <label className="field">
                      <span>{t("signName")}</span>
                      <input value={name} maxLength={60} onChange={(e) => setName(e.target.value)} />
                    </label>
                    <Choice label={t("signStyle")} value={sigFont} onChange={setSigFont} options={[{ value: "Great Vibes", label: "Great Vibes" }, { value: "Caveat", label: "Caveat" }]} />
                    <div className="sign-typed" style={{ fontFamily: `"${sigFont}", cursive`, color: ink }}>
                      {name || " "}
                    </div>
                    <div className="sign-row">
                      <span />
                      <button className="secondary" disabled={!name.trim()} onClick={async () => placeCanvas(await typedCanvas())}>
                        {t("signPlace")}
                      </button>
                    </div>
                  </div>
                )}
                {mode === "image" && (
                  <DropZone
                    accept={IMAGE_ACCEPT}
                    label={t("signUpload")}
                    compact
                    onFiles={async (files) => {
                      const f = files.find(isImage);
                      if (!f) return;
                      const [frame] = await decodeAll(f, 1200);
                      if (!frame) return;
                      await placeCanvas(inkOnly(frame.bitmap));
                      frame.bitmap.close();
                    }}
                  />
                )}
              </>
            ) : (
              <div className="sign-panel">
                <label className="field">
                  <span>{t("textToAdd")}</span>
                  <input value={text} maxLength={200} onChange={(e) => setText(e.target.value)} />
                </label>
                <Choice label={t("textSize")} value={textSize} onChange={setTextSize} options={[10, 12, 16, 24, 36].map((v) => ({ value: v, label: `${v} pt` }))} />
                <Choice
                  label={t("color")}
                  value={textColor}
                  onChange={setTextColor}
                  options={[
                    { value: "#111111", label: t("black") },
                    { value: "#1d3fae", label: t("blue") },
                    { value: "#d93a4a", label: t("red") },
                  ]}
                />
                <div className="sign-row">
                  <span />
                  <button
                    className="secondary"
                    disabled={!text.trim()}
                    onClick={() => {
                      reset();
                      setPlaced((all) => [...all, { id: ids.current++, kind: "text", page: pageNo - 1, x: 0.08, y: 0.08, size: textSize, text: text.trim(), color: textColor }]);
                    }}
                  >
                    {t("signPlaceText")}
                  </button>
                </div>
              </div>
            )}
          </Options>

          <div className="sign-nav">
            <button className="icon" aria-label={t("prevPage")} disabled={pageNo <= 1} onClick={() => setPageNo((n) => n - 1)}>
              ‹
            </button>
            <span>
              {t("pageNofM", { n: String(pageNo), total: String(numPages) })}
              {elsewhere > 0 && ` · ${t("signElsewhere", { n: String(elsewhere) })}`}
            </span>
            <button className="icon" aria-label={t("nextPage")} disabled={pageNo >= numPages} onClick={() => setPageNo((n) => n + 1)}>
              ›
            </button>
          </div>
          <div className="sign-stage" ref={stage}>
            <canvas ref={canvas} />
            {here.map((p) => (
              <div
                key={p.id}
                className="stamp"
                style={{ left: `${p.x * 100}%`, top: `${p.y * 100}%`, width: p.kind === "image" ? `${p.w * 100}%` : undefined }}
                onPointerDown={(e) => startDrag(e, p, "move")}
              >
                {p.kind === "image" ? (
                  <img src={p.url} alt="" draggable={false} />
                ) : (
                  <span className="stamp-text" style={{ fontSize: `${(p.size * boxW) / pageSize.w}px`, color: p.color }}>
                    {p.text}
                  </span>
                )}
                <button
                  className="stamp-x"
                  aria-label={t("remove")}
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={() => (reset(), setPlaced((all) => all.filter((q) => q.id !== p.id)))}
                >
                  ×
                </button>
                <span className="stamp-resize" aria-hidden onPointerDown={(e) => startDrag(e, p, "resize")} />
              </div>
            ))}
          </div>
          <p className="hint">{t("signHint")}</p>
          <Action
            label={t("t_sign_action")}
            busy={busy}
            onClick={() =>
              run(async () => {
                if (!placed.length) throw new UserError(t("signNothing"));
                const stamps: Stamp[] = placed.map(({ id: _id, url: _url, ...s }) => s);
                return [{ name: `${baseName(file.name)}-signed.pdf`, blob: pdfBlob(await stampPdf(bytes(), stamps)) }];
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
