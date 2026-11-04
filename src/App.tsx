import { Suspense, useEffect, useState, type MouseEvent, type ReactNode } from "react";
import { LangContext, savedLang, useT, type Lang } from "./i18n";
import { BRAND, CATEGORY_LABEL, HOME, PAGES, pageBySlug, type Category, type Page } from "./content/pages";
import { TOOL_COMPONENTS, TOOL_STYLE } from "./tools/registry";
import { applyHead, headFor, normalizePath } from "./seo";

const GITHUB = "https://github.com/stex4cs/ilovetoconvert";

/* ---------- routing ---------- */

let navigate: (to: string) => void = () => {};

function useRouter(initial: string) {
  const [path, setPath] = useState(normalizePath(initial));
  useEffect(() => {
    const on = () => setPath(normalizePath(location.pathname));
    addEventListener("popstate", on);
    return () => removeEventListener("popstate", on);
  }, []);
  navigate = (to: string) => {
    if (to === path) return;
    history.pushState(null, "", to);
    setPath(normalizePath(to));
    scrollTo({ top: 0 });
  };
  return path;
}

function Link({ to, className, children }: { to: string; className?: string; children: ReactNode }) {
  const onClick = (e: MouseEvent) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
    e.preventDefault();
    navigate(to);
  };
  return (
    <a href={to} className={className} onClick={onClick}>
      {children}
    </a>
  );
}

/* ---------- pieces ---------- */

function Icon({ page, size = 24 }: { page: Page; size?: number }) {
  const s = TOOL_STYLE[page.tool];
  return (
    <span className="tool-icon" style={{ background: s.color }}>
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d={s.icon} />
      </svg>
    </span>
  );
}

export function Logo() {
  return (
    <svg width="34" height="34" viewBox="0 0 64 64" aria-hidden>
      <rect width="64" height="64" rx="16" fill="#6366f1" />
      <path d="M32 50 14.5 33.2a10.5 10.5 0 0 1 14.8-14.9L32 21l2.7-2.7a10.5 10.5 0 0 1 14.8 14.9Z" fill="#fff" />
      <path d="M24 31h15l-4-4M40 37H25l4 4" fill="none" stroke="#6366f1" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function Header() {
  const t = useT();
  return (
    <header className="top">
      <Link to="/" className="brand">
        <Logo />
        <span>{BRAND}</span>
      </Link>
      <span className="badge">🔒 {t("privacy")}</span>
      <LangContext.Consumer>
        {({ lang, setLang }) => (
          <div className="lang" role="group" aria-label="Interface language">
            {(["en", "sr"] as Lang[]).map((l) => (
              <button key={l} className={l === lang ? "on" : ""} aria-pressed={l === lang} onClick={() => setLang(l)}>
                {l.toUpperCase()}
              </button>
            ))}
          </div>
        )}
      </LangContext.Consumer>
    </header>
  );
}

const FEATURED: Record<Category, string[]> = {
  pdf: ["images-to-pdf", "merge-pdf", "split-pdf", "rotate-pdf", "pdf-to-jpg"],
  document: ["word-to-pdf", "excel-to-pdf", "markdown-to-pdf"],
  image: ["heic-to-jpg", "image-converter", "compress-image", "favicon-generator"],
};
const ORDER: Category[] = ["pdf", "image", "document"];

function Card({ page }: { page: Page }) {
  return (
    <li>
      <Link to={`/${page.slug}`} className="card">
        <Icon page={page} />
        <strong>{page.label}</strong>
        <span>{page.lead}</span>
      </Link>
    </li>
  );
}

function Home() {
  return (
    <main>
      <section className="hero">
        <h1>{HOME.h1}</h1>
        <p>{HOME.lead}</p>
      </section>
      {ORDER.map((cat) => {
        const featured = FEATURED[cat].map((s) => pageBySlug(s)!);
        const more = PAGES.filter((p) => p.category === cat && !FEATURED[cat].includes(p.slug));
        return (
          <section key={cat} className="cat">
            <h2>{CATEGORY_LABEL[cat]}</h2>
            <ul className="grid">
              {featured.map((p) => (
                <Card key={p.slug} page={p} />
              ))}
            </ul>
            {more.length > 0 && (
              <ul className="chips" aria-label={`More ${CATEGORY_LABEL[cat].toLowerCase()}`}>
                {more.map((p) => (
                  <li key={p.slug}>
                    <Link to={`/${p.slug}`}>{p.label}</Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
        );
      })}
      <section className="why">
        <h2>Why it's different</h2>
        <div className="why-grid">
          <div>
            <h3>Nothing is uploaded</h3>
            <p>Every conversion runs in your browser on your own device. There is no server that could keep, read or leak your files.</p>
          </div>
          <div>
            <h3>Free, without the catch</h3>
            <p>No sign-up, no watermark, no daily limit, no ads. With no servers doing the work, there's nothing to charge for.</p>
          </div>
          <div>
            <h3>Formats others refuse</h3>
            <p>iPhone HEIC, multi-page TIFF scans, Photoshop PSD, SVG, AVIF, OpenDocument spreadsheets and Markdown, alongside the usual JPG, PNG, Word and Excel.</p>
          </div>
        </div>
      </section>
    </main>
  );
}

function ToolPage({ page }: { page: Page }) {
  const Tool = TOOL_COMPONENTS[page.tool];
  const t = useT();
  return (
    <main className="tool">
      <nav className="crumbs" aria-label="Breadcrumb">
        <Link to="/">{BRAND}</Link> <span aria-hidden>›</span> <span>{page.label}</span>
      </nav>
      <div className="tool-head">
        <Icon page={page} size={30} />
        <div>
          <h1>{page.h1}</h1>
          <p>{page.lead}</p>
        </div>
      </div>
      <Suspense fallback={<div className="loading">{t("working")}</div>}>
        <Tool key={page.slug} preset={page.preset} />
      </Suspense>

      <article className="content">
        <section>
          <h2>{`How to ${page.h1.charAt(0).toLowerCase()}${page.h1.slice(1)}`}</h2>
          <ol className="steps">
            {page.steps.map((s, i) => (
              <li key={i}>{s}</li>
            ))}
          </ol>
        </section>
        <section>
          <h2>{page.about.heading}</h2>
          {page.about.body.map((p, i) => (
            <p key={i}>{p}</p>
          ))}
        </section>
        <section>
          <h2>Frequently asked questions</h2>
          {page.faq.map((f, i) => (
            <details key={i} className="faq">
              <summary>{f.q}</summary>
              <p>{f.a}</p>
            </details>
          ))}
        </section>
        <section>
          <h2>Related tools</h2>
          <ul className="chips">
            {page.related.map((slug) => {
              const r = pageBySlug(slug);
              return r ? (
                <li key={slug}>
                  <Link to={`/${slug}`}>{r.label}</Link>
                </li>
              ) : null;
            })}
          </ul>
        </section>
      </article>
    </main>
  );
}

function NotFound() {
  return (
    <main className="tool">
      <h1>Page not found</h1>
      <p>
        That address doesn't exist. <Link to="/">See all tools</Link>.
      </p>
    </main>
  );
}

function Footer() {
  return (
    <footer className="site-footer">
      <nav className="footer-links" aria-label="All tools">
        {ORDER.map((cat) => (
          <div key={cat}>
            <p className="footer-h">{CATEGORY_LABEL[cat]}</p>
            <ul>
              {PAGES.filter((p) => p.category === cat).map((p) => (
                <li key={p.slug}>
                  <Link to={`/${p.slug}`}>{p.label}</Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>
      <p>
        {`${BRAND} runs entirely in your browser.`} Free, no ads, no tracking, your files never leave your device.
      </p>
      <p>
        Made by <a href="https://popzify.com/links">Stefan Popović</a> · <a href={GITHUB}>Open source on GitHub</a>
      </p>
    </footer>
  );
}

/* ---------- app ---------- */

export default function App({ path: initialPath }: { path: string }) {
  const path = useRouter(initialPath);
  // English on the server and on first paint (no hydration mismatch); a saved
  // choice is applied right after.
  const [lang, setLangState] = useState<Lang>("en");
  useEffect(() => {
    const s = savedLang();
    if (s) setLangState(s);
  }, []);
  const setLang = (l: Lang) => {
    localStorage.setItem("lang", l);
    setLangState(l);
  };

  useEffect(() => {
    applyHead(headFor(path));
  }, [path]);

  const page = path === "/" ? null : pageBySlug(path.slice(1));

  return (
    <LangContext.Provider value={{ lang, setLang }}>
      <Header />
      {path === "/" ? <Home /> : page ? <ToolPage page={page} /> : <NotFound />}
      <Footer />
    </LangContext.Provider>
  );
}
