/**
 * A small PowerPoint (.pptx) renderer: every slide becomes an absolutely
 * positioned HTML page at the presentation's own size, ready to print to PDF.
 *
 * Covers what most decks are made of: theme colours and fonts, placeholders
 * that take their position and text style from the slide layout and master,
 * text with bullets, levels, alignment and autofit, shapes with fills and
 * outlines, pictures (with cropping), tables, groups, rotation and
 * backgrounds. Charts and SmartArt are counted and reported, not drawn.
 */
import JSZip from "jszip";

const EMU_PER_PX = 9525; // 914400 EMU per inch, 96 px per inch
const px = (emu: number) => emu / EMU_PER_PX;

/* ---------- XML helpers (namespace-agnostic, by local name) ---------- */

type El = Element;
const kids = (el: El | null | undefined, name: string): El[] => (el ? [...el.children].filter((c) => c.localName === name) : []);
const kid = (el: El | null | undefined, name: string): El | null => kids(el, name)[0] ?? null;
const path = (el: El | null | undefined, ...names: string[]): El | null => names.reduce<El | null>((e, n) => kid(e, n), el ?? null);
const num = (v: string | null | undefined, d = 0) => (v == null || v === "" ? d : Number(v));
const parseXml = (s: string) => new DOMParser().parseFromString(s, "application/xml").documentElement;

/* ---------- package ---------- */

type Part = { path: string; xml: El; rels: Map<string, string> };

class Package {
  constructor(private zip: JSZip) {}
  static async open(data: ArrayBuffer) {
    return new Package(await JSZip.loadAsync(data));
  }
  async text(p: string) {
    const f = this.zip.file(p);
    return f ? f.async("text") : null;
  }
  async blobUrl(p: string) {
    const f = this.zip.file(p);
    if (!f) return null;
    const ext = p.split(".").pop()!.toLowerCase();
    const type = { png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg", gif: "image/gif", svg: "image/svg+xml", bmp: "image/bmp", webp: "image/webp" }[ext];
    if (!type) return null; // emf/wmf/tiff: browsers can't draw them
    return URL.createObjectURL(new Blob([await f.async("uint8array") as BlobPart], { type }));
  }
  async part(p: string): Promise<Part | null> {
    const t = await this.text(p);
    if (!t) return null;
    const relPath = p.replace(/([^/]+)$/, "_rels/$1.rels");
    const relXml = await this.text(relPath);
    const rels = new Map<string, string>();
    if (relXml) {
      const dir = p.replace(/[^/]+$/, "");
      for (const r of kids(parseXml(relXml), "Relationship")) {
        const target = r.getAttribute("Target")!;
        rels.set(r.getAttribute("Id")!, r.getAttribute("TargetMode") === "External" ? target : resolve(dir, target));
      }
    }
    return { path: p, xml: parseXml(t), rels };
  }
}
function resolve(dir: string, target: string) {
  if (target.startsWith("/")) return target.slice(1);
  const parts = (dir + target).split("/");
  const out: string[] = [];
  for (const s of parts) s === ".." ? out.pop() : s !== "." && out.push(s);
  return out.join("/");
}

/* ---------- theme ---------- */

type Theme = { colors: Record<string, string>; major: string; minor: string };

function readTheme(xml: El | null): Theme {
  const colors: Record<string, string> = {};
  const scheme = path(xml, "themeElements", "clrScheme");
  for (const c of scheme ? [...scheme.children] : []) {
    const v = kid(c, "srgbClr")?.getAttribute("val") ?? kid(c, "sysClr")?.getAttribute("lastClr");
    if (v) colors[c.localName] = v;
  }
  const fonts = path(xml, "themeElements", "fontScheme");
  return {
    colors,
    major: path(fonts, "majorFont", "latin")?.getAttribute("typeface") ?? "Calibri Light",
    minor: path(fonts, "minorFont", "latin")?.getAttribute("typeface") ?? "Calibri",
  };
}

/* ---------- colours ---------- */

type Ctx = { theme: Theme; clrMap: Record<string, string> };

function hexToHsl(hex: string) {
  const r = parseInt(hex.slice(0, 2), 16) / 255, g = parseInt(hex.slice(2, 4), 16) / 255, b = parseInt(hex.slice(4, 6), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b), l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min, s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  const h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [h / 6, s, l];
}
function hslToHex(h: number, s: number, l: number) {
  const f = (n: number) => {
    const k = (n + h * 12) % 12, a = s * Math.min(l, 1 - l);
    return Math.round(255 * (l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1)))).toString(16).padStart(2, "0");
  };
  return f(0) + f(8) + f(4);
}

/** a:solidFill (or any element holding a colour child) → CSS colour, or null. */
function color(el: El | null, ctx: Ctx): string | null {
  if (!el) return null;
  const c = [...el.children].find((x) => ["srgbClr", "schemeClr", "sysClr", "prstClr", "scrgbClr"].includes(x.localName));
  if (!c) return null;
  let hex: string | null = null;
  if (c.localName === "srgbClr") hex = c.getAttribute("val");
  else if (c.localName === "sysClr") hex = c.getAttribute("lastClr") ?? "000000";
  else if (c.localName === "prstClr") hex = ({ black: "000000", white: "FFFFFF", red: "FF0000", green: "00FF00", blue: "0000FF", yellow: "FFFF00" } as Record<string, string>)[c.getAttribute("val") ?? ""] ?? "000000";
  else if (c.localName === "schemeClr") {
    const v = c.getAttribute("val") ?? "tx1";
    hex = ctx.theme.colors[ctx.clrMap[v] ?? v] ?? null;
  }
  if (!hex) return null;
  let alpha = 1;
  let [h, s, l] = hexToHsl(hex);
  for (const m of [...c.children]) {
    const v = num(m.getAttribute("val")) / 100000;
    if (m.localName === "lumMod") l *= v;
    else if (m.localName === "lumOff") l += v;
    else if (m.localName === "tint") l = l + (1 - l) * (1 - v);
    else if (m.localName === "shade") l *= v;
    else if (m.localName === "alpha") alpha = v;
  }
  hex = hslToHex(h, s, Math.max(0, Math.min(1, l)));
  return alpha < 1 ? `rgba(${parseInt(hex.slice(0, 2), 16)},${parseInt(hex.slice(2, 4), 16)},${parseInt(hex.slice(4, 6), 16)},${alpha})` : `#${hex}`;
}

/** Fill of a spPr / tcPr / bgPr: colour, image URL marker, or none. */
function fill(el: El | null, ctx: Ctx): string | null | undefined {
  if (!el) return undefined;
  if (kid(el, "noFill")) return null;
  const solid = kid(el, "solidFill");
  if (solid) return color(solid, ctx);
  const grad = kid(el, "gradFill");
  if (grad) {
    const stops = kids(path(grad, "gsLst"), "gs").map((g) => `${color(g, ctx)} ${num(g.getAttribute("pos")) / 1000}%`);
    const ang = num(path(grad, "lin")?.getAttribute("ang"), 5400000) / 60000;
    return stops.length ? `linear-gradient(${ang + 90}deg, ${stops.join(", ")})` : undefined;
  }
  return undefined;
}

/* ---------- placeholders and text styles ---------- */

type Ph = { type: string; idx: string | null };
function placeholder(sp: El): Ph | null {
  const ph = path(sp, "nvSpPr", "nvPr", "ph") ?? path(sp, "nvPicPr", "nvPr", "ph") ?? path(sp, "nvGraphicFramePr", "nvPr", "ph");
  return ph ? { type: ph.getAttribute("type") ?? "body", idx: ph.getAttribute("idx") } : null;
}
function findPlaceholder(tree: El | null, ph: Ph, byIdx: boolean): El | null {
  if (!tree) return null;
  const all = [...tree.querySelectorAll("*")].filter((e) => e.localName === "sp" || e.localName === "pic");
  const norm = (t: string) => (t === "ctrTitle" ? "title" : t === "subTitle" || t === "obj" ? "body" : t);
  return (
    (byIdx && ph.idx != null ? all.find((s) => placeholder(s)?.idx === ph.idx) : null) ??
    all.find((s) => placeholder(s)?.type === ph.type) ??
    all.find((s) => { const p = placeholder(s); return p && norm(p.type) === norm(ph.type); }) ??
    null
  );
}

type Levels = { pPr: El[]; rPr: El[] };
/** The paragraph and run property elements that apply at a level, most specific first. */
function levelProps(chain: (El | null)[], lvl: number): Levels {
  const pPr: El[] = [], rPr: El[] = [];
  for (const lst of chain) {
    const l = kid(lst, `lvl${lvl + 1}pPr`);
    if (l) {
      pPr.push(l);
      const d = kid(l, "defRPr");
      if (d) rPr.push(d);
    }
  }
  return { pPr, rPr };
}
const first = (els: (El | null)[], attr: string) => {
  for (const e of els) {
    const v = e?.getAttribute(attr);
    if (v != null) return v;
  }
  return null;
};
const firstKid = (els: (El | null)[], name: string) => {
  for (const e of els) {
    const k = kid(e, name);
    if (k) return k;
  }
  return null;
};

/* ---------- rendering ---------- */

type SlideCtx = Ctx & {
  pkg: Package;
  part: Part;
  layout: Part | null;
  master: Part | null;
  defaults: El | null; // presentation defaultTextStyle
  unsupported: Set<string>;
};

function txStyle(master: Part | null, ph: Ph | null): El | null {
  const styles = path(master?.xml, "txStyles");
  if (!ph) return kid(styles, "otherStyle");
  if (ph.type === "title" || ph.type === "ctrTitle") return kid(styles, "titleStyle");
  if (["body", "subTitle", "obj"].includes(ph.type)) return kid(styles, "bodyStyle");
  return kid(styles, "otherStyle");
}

function fontFamily(face: string | null, ctx: Ctx) {
  if (!face) return null;
  if (face.startsWith("+mj")) face = ctx.theme.major;
  else if (face.startsWith("+mn")) face = ctx.theme.minor;
  return `"${face}", Calibri, Arial, sans-serif`;
}

/** `styleColor`: the shape style's text colour, which beats inherited defaults but not the text's own colour. */
function renderText(txBody: El, ctx: SlideCtx, ph: Ph | null, inherited: { layoutSp: El | null; masterSp: El | null }, box: HTMLElement, styleColor: string | null = null) {
  const bodyPr = [kid(txBody, "bodyPr"), path(inherited.layoutSp, "txBody", "bodyPr"), path(inherited.masterSp, "txBody", "bodyPr")];
  const anchor = first(bodyPr, "anchor") ?? "t";
  const ins = (a: string, d: number) => px(num(first(bodyPr, a), d));
  box.style.padding = `${ins("tIns", 45720)}px ${ins("rIns", 91440)}px ${ins("bIns", 45720)}px ${ins("lIns", 91440)}px`;
  box.style.display = "flex";
  box.style.flexDirection = "column";
  box.style.justifyContent = anchor === "ctr" ? "center" : anchor === "b" ? "flex-end" : "flex-start";
  if (first(bodyPr, "wrap") === "none") box.style.whiteSpace = "nowrap";
  const autofit = firstKid(bodyPr, "normAutofit");
  const scale = autofit ? num(autofit.getAttribute("fontScale"), 100000) / 100000 : 1;
  const lnReduce = autofit ? num(autofit.getAttribute("lnSpcReduction"), 0) / 100000 : 0;

  const lstChain = (lvl: number) =>
    levelProps(
      [
        kid(txBody, "lstStyle"),
        path(inherited.layoutSp, "txBody", "lstStyle"),
        path(inherited.masterSp, "txBody", "lstStyle"),
        // Placeholders follow the master's title/body/other styles; plain shapes and
        // text boxes follow the presentation's default text style.
        ph ? txStyle(ctx.master, ph) : null,
        ctx.defaults,
      ],
      lvl,
    );

  const counters = new Map<number, number>();
  for (const p of kids(txBody, "p")) {
    const pPrOwn = kid(p, "pPr");
    const lvl = num(pPrOwn?.getAttribute("lvl"), 0);
    const L = lstChain(lvl);
    const pPrs = [pPrOwn, ...L.pPr];
    const para = document.createElement("div");
    const algn = first(pPrs, "algn") ?? "l";
    para.style.textAlign = { ctr: "center", r: "right", just: "justify", dist: "justify" }[algn] ?? "left";
    const marL = px(num(first(pPrs, "marL"), 0));
    const indent = px(num(first(pPrs, "indent"), 0));
    para.style.paddingLeft = `${marL}px`;
    para.style.textIndent = `${indent}px`;
    const spc = (name: string) => {
      const s = firstKid(pPrs, name);
      const pts = path(s, "spcPts")?.getAttribute("val");
      return pts ? num(pts) / 100 : null;
    };
    const before = spc("spcBef"), after = spc("spcAft");
    if (before) para.style.marginTop = `${before * (96 / 72)}px`;
    if (after) para.style.marginBottom = `${after * (96 / 72)}px`;
    const lnPct = path(firstKid(pPrs, "lnSpc"), "spcPct")?.getAttribute("val");
    para.style.lineHeight = String(Math.max(0.8, (lnPct ? num(lnPct) / 100000 : 1) - lnReduce) * 1.2);

    const defR = [kid(pPrOwn, "defRPr"), ...L.rPr];
    const runStyle = (rPr: El | null, span: HTMLElement) => {
      const chain = [rPr, ...defR];
      const sz = num(first(chain, "sz"), 1800) / 100;
      span.style.fontSize = `${sz * scale * (96 / 72)}px`;
      if (first(chain, "b") === "1") span.style.fontWeight = "700";
      if (first(chain, "i") === "1") span.style.fontStyle = "italic";
      const u = first(chain, "u");
      const strike = first(chain, "strike");
      span.style.textDecoration = [u && u !== "none" ? "underline" : "", strike && strike !== "noStrike" ? "line-through" : ""].join(" ").trim() || "none";
      // own run/paragraph colour first, then the shape style, then inherited defaults
      const ownLevel = levelProps([kid(txBody, "lstStyle")], lvl).rPr;
      const c =
        color(firstKid([rPr, kid(pPrOwn, "defRPr"), ...ownLevel], "solidFill"), ctx) ??
        styleColor ??
        color(firstKid(chain, "solidFill"), ctx);
      if (c) span.style.color = c;
      const latin = firstKid(chain, "latin")?.getAttribute("typeface") ?? null;
      const fam = fontFamily(latin ?? (ph && (ph.type === "title" || ph.type === "ctrTitle") ? "+mj-lt" : "+mn-lt"), ctx);
      if (fam) span.style.fontFamily = fam;
      const base = num(first(chain, "baseline"), 0);
      if (base) (span.style.verticalAlign = base > 0 ? "super" : "sub"), (span.style.fontSize = `${sz * scale * 0.7 * (96 / 72)}px`);
      return sz;
    };

    // bullet
    let firstSize = 18;
    const buNone = firstKid(pPrs, "buNone");
    const buChar = firstKid(pPrs, "buChar");
    const buAuto = firstKid(pPrs, "buAutoNum");
    const runs = [...p.children].filter((c) => ["r", "br", "fld"].includes(c.localName));
    const hasText = runs.some((r) => r.localName !== "br" && (kid(r, "t")?.textContent ?? "") !== "");
    const firstBullet = [buNone, buChar, buAuto].find((b) => b) ?? null;
    if (hasText && firstBullet && firstBullet !== buNone) {
      const b = document.createElement("span");
      if (firstBullet.localName === "buChar") {
        let ch = firstBullet.getAttribute("char") ?? "•";
        if (/[-]/.test(ch)) ch = "•"; // Symbol/Wingdings private-use bullets
        b.textContent = ch;
      } else {
        const n = (counters.get(lvl) ?? num(firstBullet.getAttribute("startAt"), 1) - 1) + 1;
        counters.set(lvl, n);
        const scheme = firstBullet.getAttribute("type") ?? "arabicPeriod";
        const label = scheme.startsWith("alphaLc") ? String.fromCharCode(96 + n) : scheme.startsWith("alphaUc") ? String.fromCharCode(64 + n) : scheme.startsWith("romanLc") ? toRoman(n).toLowerCase() : scheme.startsWith("romanUc") ? toRoman(n) : String(n);
        b.textContent = label + (scheme.endsWith("ParenR") ? ")" : scheme.endsWith("ParenBoth") ? ")" : ".");
      }
      runStyle(kid(runs.find((r) => r.localName === "r") ?? null, "rPr"), b);
      const buClr = color(firstKid(pPrs, "buClr"), ctx);
      if (buClr) b.style.color = buClr;
      b.style.display = "inline-block";
      b.style.minWidth = `${Math.max(0, -indent)}px`;
      b.style.textIndent = "0";
      para.appendChild(b);
    } else counters.delete(lvl);

    for (const r of runs) {
      if (r.localName === "br") {
        para.appendChild(document.createElement("br"));
        continue;
      }
      const span = document.createElement("span");
      span.textContent = kid(r, "t")?.textContent ?? "";
      firstSize = runStyle(kid(r, "rPr"), span);
      para.appendChild(span);
    }
    if (!runs.length) {
      // empty line keeps the height of its end-of-paragraph size
      const sz = num(first([kid(p, "endParaRPr"), ...defR], "sz"), 1800) / 100;
      para.style.minHeight = `${sz * scale * 1.2 * (96 / 72)}px`;
    }
    void firstSize;
    box.appendChild(para);
  }
}

function toRoman(n: number) {
  const m: [number, string][] = [[1000, "M"], [900, "CM"], [500, "D"], [400, "CD"], [100, "C"], [90, "XC"], [50, "L"], [40, "XL"], [10, "X"], [9, "IX"], [5, "V"], [4, "IV"], [1, "I"]];
  let s = "";
  for (const [v, r] of m) while (n >= v) (s += r), (n -= v);
  return s;
}

type Xfrm = { x: number; y: number; w: number; h: number; rot: number; flipH: boolean; flipV: boolean };
function readXfrm(x: El | null): Xfrm | null {
  if (!x) return null;
  const off = kid(x, "off"), ext = kid(x, "ext");
  if (!off || !ext) return null;
  return {
    x: px(num(off.getAttribute("x"))), y: px(num(off.getAttribute("y"))),
    w: px(num(ext.getAttribute("cx"))), h: px(num(ext.getAttribute("cy"))),
    rot: num(x.getAttribute("rot")) / 60000, flipH: x.getAttribute("flipH") === "1", flipV: x.getAttribute("flipV") === "1",
  };
}
function place(el: HTMLElement, f: Xfrm) {
  Object.assign(el.style, { position: "absolute", left: `${f.x}px`, top: `${f.y}px`, width: `${f.w}px`, height: `${f.h}px`, boxSizing: "border-box" });
  const t = [f.rot ? `rotate(${f.rot}deg)` : "", f.flipH ? "scaleX(-1)" : "", f.flipV ? "scaleY(-1)" : ""].filter(Boolean).join(" ");
  if (t) el.style.transform = t;
}

async function renderShape(sp: El, ctx: SlideCtx, parent: HTMLElement, owner: Part, isTemplate: boolean) {
  const ph = placeholder(sp);
  // Placeholders on a layout/master are prompts ("Click to add title"), never printed.
  if (isTemplate && ph) return;
  const layoutSp = ph ? findPlaceholder(path(ctx.layout?.xml, "cSld", "spTree"), ph, true) : null;
  const masterSp = ph ? findPlaceholder(path(ctx.master?.xml, "cSld", "spTree"), ph, false) : null;
  const spPr = kid(sp, "spPr") ?? kid(sp, "grpSpPr");
  // graphicFrame (tables, charts) keeps its position in its own p:xfrm, not in spPr
  const xf = readXfrm(kid(spPr, "xfrm")) ?? readXfrm(kid(sp, "xfrm")) ?? readXfrm(path(layoutSp, "spPr", "xfrm")) ?? readXfrm(path(masterSp, "spPr", "xfrm"));
  if (!xf) return;

  if (sp.localName === "grpSp") {
    const g = kid(spPr, "xfrm");
    const chOff = kid(g, "chOff"), chExt = kid(g, "chExt");
    const group = document.createElement("div");
    place(group, xf);
    const sx = chExt && num(chExt.getAttribute("cx")) ? xf.w / px(num(chExt.getAttribute("cx"))) : 1;
    const sy = chExt && num(chExt.getAttribute("cy")) ? xf.h / px(num(chExt.getAttribute("cy"))) : 1;
    const inner = document.createElement("div");
    Object.assign(inner.style, {
      position: "absolute", left: "0", top: "0",
      transformOrigin: "0 0",
      transform: `scale(${sx}, ${sy}) translate(${-px(num(chOff?.getAttribute("x")))}px, ${-px(num(chOff?.getAttribute("y")))}px)`,
    });
    group.appendChild(inner);
    parent.appendChild(group);
    await renderTree(sp, ctx, inner, owner, isTemplate);
    return;
  }

  const el = document.createElement("div");
  place(el, xf);
  el.style.overflow = "visible";

  if (sp.localName === "pic") {
    const embed = path(sp, "blipFill", "blip")?.getAttribute("r:embed") ?? path(sp, "blipFill", "blip")?.getAttributeNS("http://schemas.openxmlformats.org/officeDocument/2006/relationships", "embed");
    const target = embed ? owner.rels.get(embed) : null;
    const url = target ? await ctx.pkg.blobUrl(target) : null;
    if (!url) {
      ctx.unsupported.add("image format");
      return;
    }
    el.style.overflow = "hidden";
    const img = document.createElement("img");
    img.src = url;
    const crop = path(sp, "blipFill", "srcRect");
    const l = num(crop?.getAttribute("l")) / 1000, t = num(crop?.getAttribute("t")) / 1000, r = num(crop?.getAttribute("r")) / 1000, b = num(crop?.getAttribute("b")) / 1000;
    const wPct = 100 / Math.max(0.01, 1 - (l + r) / 100), hPct = 100 / Math.max(0.01, 1 - (t + b) / 100);
    Object.assign(img.style, { position: "absolute", width: `${wPct}%`, height: `${hPct}%`, left: `${(-l * wPct) / 100}%`, top: `${(-t * hPct) / 100}%`, maxWidth: "none" });
    el.appendChild(img);
    parent.appendChild(el);
    return;
  }

  if (sp.localName === "graphicFrame") {
    const data = path(sp, "graphic", "graphicData");
    const uri = data?.getAttribute("uri") ?? "";
    const tbl = kid(data, "tbl");
    if (tbl) {
      renderTable(tbl, ctx, el);
      parent.appendChild(el);
    } else ctx.unsupported.add(uri.includes("chart") ? "chart" : uri.includes("diagram") ? "SmartArt" : "embedded object");
    return;
  }

  // sp / cxnSp: geometry, fill, outline, text
  const style = kid(sp, "style");
  let bg = fill(spPr, ctx);
  if (bg === undefined && !ph) {
    const ref = kid(style, "fillRef");
    if (ref && num(ref.getAttribute("idx")) > 0) bg = color(ref, ctx);
  }
  if (bg) el.style.background = bg;
  const ln = kid(spPr, "ln");
  let lineColor = ln && !kid(ln, "noFill") ? color(kid(ln, "solidFill"), ctx) : null;
  if (!ln && !ph) {
    const ref = kid(style, "lnRef");
    if (ref && num(ref.getAttribute("idx")) > 0) lineColor = color(ref, ctx);
  }
  if (lineColor && !(ln && kid(ln, "noFill"))) el.style.border = `${Math.max(1, px(num(ln?.getAttribute("w"), 12700)))}px solid ${lineColor}`;
  const geom = path(spPr, "prstGeom")?.getAttribute("prst") ?? "rect";
  if (geom === "ellipse") el.style.borderRadius = "50%";
  else if (geom.startsWith("roundRect")) el.style.borderRadius = `${Math.min(xf.w, xf.h) * 0.16}px`;
  else if (sp.localName === "cxnSp" || geom === "line") {
    el.style.background = "none";
    el.style.border = "none";
    el.style.borderTop = `${Math.max(1, px(num(ln?.getAttribute("w"), 12700)))}px solid ${lineColor ?? "#000"}`;
    el.style.height = "0";
  }

  const txBody = kid(sp, "txBody");
  if (txBody) {
    // Text colour from the shape style (fontRef), else the theme's main text colour;
    // runs override it with their own fill.
    const fc = color(kid(style, "fontRef"), ctx);
    el.style.color = fc ?? `#${ctx.theme.colors[ctx.clrMap["tx1"] ?? "dk1"] ?? "000000"}`;
    renderText(txBody, ctx, ph, { layoutSp, masterSp }, el, fc);
  }
  parent.appendChild(el);
}

function renderTable(tbl: El, ctx: SlideCtx, box: HTMLElement) {
  const table = document.createElement("table");
  Object.assign(table.style, { borderCollapse: "collapse", width: "100%", tableLayout: "fixed" });
  const cols = kids(path(tbl, "tblGrid"), "gridCol").map((c) => px(num(c.getAttribute("w"))));
  const colgroup = document.createElement("colgroup");
  for (const w of cols) {
    const col = document.createElement("col");
    col.style.width = `${w}px`;
    colgroup.appendChild(col);
  }
  table.appendChild(colgroup);
  const firstRow = path(tbl, "tblPr")?.getAttribute("firstRow") === "1";
  const styled = !!path(tbl, "tblPr", "tableStyleId");
  kids(tbl, "tr").forEach((tr, ri) => {
    const row = document.createElement("tr");
    row.style.height = `${px(num(tr.getAttribute("h")))}px`;
    for (const tc of kids(tr, "tc")) {
      if (tc.getAttribute("hMerge") === "1" || tc.getAttribute("vMerge") === "1") continue;
      const td = document.createElement("td");
      const span = num(tc.getAttribute("gridSpan"), 1);
      if (span > 1) td.colSpan = span;
      const rs = num(tc.getAttribute("rowSpan"), 1);
      if (rs > 1) td.rowSpan = rs;
      const tcPr = kid(tc, "tcPr");
      const bg = fill(tcPr, ctx);
      // Theme table styles aren't parsed; the common default is a coloured header and light rows.
      const accent = `#${ctx.theme.colors["accent1"] ?? "4472C4"}`;
      td.style.background = bg ?? (styled ? (firstRow && ri === 0 ? accent : ri % 2 ? "#e9edf5" : "#d0d8e8") : "transparent");
      const borders: Record<string, string> = { lnL: "borderLeft", lnR: "borderRight", lnT: "borderTop", lnB: "borderBottom" };
      let anyBorder = false;
      for (const [tag, css] of Object.entries(borders)) {
        const ln = kid(tcPr, tag);
        const c = ln && !kid(ln, "noFill") ? color(kid(ln, "solidFill"), ctx) : null;
        if (c) ((td.style as unknown as Record<string, string>)[css] = `${Math.max(1, px(num(ln!.getAttribute("w"), 12700)))}px solid ${c}`), (anyBorder = true);
      }
      if (!anyBorder && styled) td.style.border = "1px solid #fff";
      td.style.verticalAlign = { ctr: "middle", b: "bottom" }[tcPr?.getAttribute("anchor") ?? ""] ?? "top";
      const inner = document.createElement("div");
      inner.style.color = firstRow && ri === 0 && styled && !bg ? "#fff" : "#000";
      if (firstRow && ri === 0 && styled) inner.style.fontWeight = "700";
      const txBody = kid(tc, "txBody");
      const headerText = firstRow && ri === 0 && styled && !bg ? "#ffffff" : null;
      if (txBody) renderText(txBody, ctx, null, { layoutSp: null, masterSp: null }, inner, headerText);
      inner.style.padding = `${px(num(tcPr?.getAttribute("marT"), 45720))}px ${px(num(tcPr?.getAttribute("marR"), 91440))}px ${px(num(tcPr?.getAttribute("marB"), 45720))}px ${px(num(tcPr?.getAttribute("marL"), 91440))}px`;
      td.appendChild(inner);
      row.appendChild(td);
    }
    table.appendChild(row);
  });
  box.appendChild(table);
}

async function renderTree(container: El | null, ctx: SlideCtx, parent: HTMLElement, owner: Part, isTemplate: boolean) {
  for (const child of container ? [...container.children] : []) {
    if (["sp", "pic", "graphicFrame", "grpSp", "cxnSp"].includes(child.localName)) await renderShape(child, ctx, parent, owner, isTemplate);
    else if (child.localName === "AlternateContent") {
      const fallback = kid(child, "Fallback") ?? kid(child, "Choice");
      await renderTree(fallback, ctx, parent, owner, isTemplate);
    }
  }
}

async function background(parts: (Part | null)[], ctx: SlideCtx, slideEl: HTMLElement) {
  for (const p of parts) {
    const bg = path(p?.xml, "cSld", "bg");
    if (!bg) continue;
    const bgPr = kid(bg, "bgPr");
    if (bgPr) {
      const blip = path(bgPr, "blipFill", "blip");
      if (blip) {
        const id = blip.getAttribute("r:embed") ?? blip.getAttributeNS("http://schemas.openxmlformats.org/officeDocument/2006/relationships", "embed");
        const url = id && p!.rels.get(id) ? await ctx.pkg.blobUrl(p!.rels.get(id)!) : null;
        if (url) {
          slideEl.style.background = `url("${url}") center / cover no-repeat`;
          return;
        }
      }
      const f = fill(bgPr, ctx);
      if (f) {
        slideEl.style.background = f;
        return;
      }
    }
    const ref = kid(bg, "bgRef");
    const c = color(ref, ctx);
    if (c) {
      slideEl.style.background = c;
      return;
    }
  }
  slideEl.style.background = "#fff";
}

export type RenderedDeck = { width: number; height: number; slides: number; unsupported: string[] };

/** Renders every slide of a .pptx into `target`, one `.pptx-slide` element per slide. */
export async function renderPptx(data: ArrayBuffer, target: HTMLElement): Promise<RenderedDeck> {
  const pkg = await Package.open(data);
  const pres = await pkg.part("ppt/presentation.xml");
  if (!pres) throw new Error("not a pptx");
  const sz = kid(pres.xml, "sldSz");
  const W = px(num(sz?.getAttribute("cx"), 9144000));
  const H = px(num(sz?.getAttribute("cy"), 6858000));
  const defaults = kid(pres.xml, "defaultTextStyle");
  const unsupported = new Set<string>();
  const ids = kids(kid(pres.xml, "sldIdLst"), "sldId").map((s) => s.getAttribute("r:id") ?? s.getAttributeNS("http://schemas.openxmlformats.org/officeDocument/2006/relationships", "id"));
  let count = 0;
  for (const id of ids) {
    const slidePath = id ? pres.rels.get(id) : null;
    if (!slidePath) continue;
    const slide = await pkg.part(slidePath);
    if (!slide || kid(slide.xml, "cSld") === null) continue;
    if (slide.xml.getAttribute("show") === "0") continue; // hidden slide
    const layoutPath = [...slide.rels.values()].find((p) => /slideLayout\d+\.xml$/.test(p));
    const layout = layoutPath ? await pkg.part(layoutPath) : null;
    const masterPath = layout ? [...layout.rels.values()].find((p) => /slideMaster\d+\.xml$/.test(p)) : null;
    const master = masterPath ? await pkg.part(masterPath) : null;
    const themePath = master ? [...master.rels.values()].find((p) => /theme\d+\.xml$/.test(p)) : null;
    const theme = readTheme(themePath ? parseXml((await pkg.text(themePath)) ?? "<a/>") : null);
    const clrMapEl = kid(master?.xml, "clrMap");
    const clrMap: Record<string, string> = {};
    for (const a of clrMapEl ? [...clrMapEl.attributes] : []) clrMap[a.name] = a.value;
    const ctx: SlideCtx = { pkg, part: slide, layout, master, defaults, theme, clrMap, unsupported };

    const slideEl = document.createElement("div");
    slideEl.className = "pptx-slide";
    Object.assign(slideEl.style, { position: "relative", width: `${W}px`, height: `${H}px`, overflow: "hidden" });
    await background([slide, layout, master], ctx, slideEl);
    const showMaster = (p: Part | null) => p?.xml.getAttribute("showMasterSp") !== "0";
    if (showMaster(slide) && showMaster(layout)) await renderTree(path(master?.xml, "cSld", "spTree"), ctx, slideEl, master!, true);
    if (showMaster(slide)) await renderTree(path(layout?.xml, "cSld", "spTree"), ctx, slideEl, layout!, true);
    await renderTree(path(slide.xml, "cSld", "spTree"), ctx, slideEl, slide, false);
    target.appendChild(slideEl);
    count++;
  }
  return { width: Math.round(W), height: Math.round(H), slides: count, unsupported: [...unsupported] };
}
