import { Suspense, useContext, useEffect, useState } from "react";
import { LangContext, detectLang, useT, type Lang } from "./i18n";
import { TOOLS, toolBySlug, type Tool } from "./tools/registry";

const GITHUB = "https://github.com/stex4cs/konvertuj";

function usePath() {
  const [path, setPath] = useState(location.pathname);
  useEffect(() => {
    const on = () => setPath(location.pathname);
    addEventListener("popstate", on);
    return () => removeEventListener("popstate", on);
  }, []);
  const go = (to: string) => {
    if (to === location.pathname) return;
    history.pushState(null, "", to);
    setPath(to);
    scrollTo({ top: 0 });
  };
  return [path, go] as const;
}

function Icon({ tool, size = 26 }: { tool: Tool; size?: number }) {
  return (
    <span className="tool-icon" style={{ background: tool.color }}>
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d={tool.icon} />
      </svg>
    </span>
  );
}

function Header({ go }: { go: (p: string) => void }) {
  const t = useT();
  return (
    <header className="top">
      <a
        className="brand"
        href="/"
        onClick={(e) => {
          e.preventDefault();
          go("/");
        }}
      >
        <span className="logo" aria-hidden>
          ⇄
        </span>
        Konvertuj
      </a>
      <span className="badge">🔒 {t("privacy")}</span>
      <LangSwitch />
    </header>
  );
}

function LangSwitch() {
  return (
    <LangContext.Consumer>
      {({ lang, setLang }) => (
        <div className="lang" role="group" aria-label="Language">
          {(["sr", "en"] as Lang[]).map((l) => (
            <button key={l} className={l === lang ? "on" : ""} aria-pressed={l === lang} onClick={() => setLang(l)}>
              {l.toUpperCase()}
            </button>
          ))}
        </div>
      )}
    </LangContext.Consumer>
  );
}

function Home({ go }: { go: (p: string) => void }) {
  const t = useT();
  return (
    <main>
      <section className="hero">
        <h1>{t("heroTitle")}</h1>
        <p>{t("heroText")}</p>
      </section>
      <ul className="grid">
        {TOOLS.map((tool) => (
          <li key={tool.slug}>
            <a
              href={`/${tool.slug}`}
              className="card"
              onClick={(e) => {
                e.preventDefault();
                go(`/${tool.slug}`);
              }}
            >
              <Icon tool={tool} />
              <strong>{t(tool.title)}</strong>
              <span>{t(tool.desc)}</span>
            </a>
          </li>
        ))}
      </ul>
    </main>
  );
}

function ToolPage({ tool, go }: { tool: Tool; go: (p: string) => void }) {
  const t = useT();
  const { Component } = tool;
  return (
    <main className="tool">
      <a
        className="back"
        href="/"
        onClick={(e) => {
          e.preventDefault();
          go("/");
        }}
      >
        ← {t("back")}
      </a>
      <div className="tool-head">
        <Icon tool={tool} size={30} />
        <div>
          <h1>{t(tool.title)}</h1>
          <p>{t(tool.desc)}</p>
        </div>
      </div>
      <Suspense fallback={<div className="loading">{t("working")}</div>}>
        <Component key={tool.slug} />
      </Suspense>
    </main>
  );
}

function Footer() {
  const t = useT();
  return (
    <footer>
      <p>{t("footerFree")}</p>
      <p>
        {t("footerMade")} <a href="https://popzify.com/links">Stefan Popović</a> ·{" "}
        <a href={GITHUB}>{t("footerOpen")}</a>
      </p>
    </footer>
  );
}

export default function App() {
  const [lang, setLangState] = useState<Lang>(detectLang);
  const [path, go] = usePath();
  const tool = toolBySlug(path.replace(/^\/+|\/+$/g, ""));

  const setLang = (l: Lang) => {
    localStorage.setItem("lang", l);
    setLangState(l);
  };

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  return (
    <LangContext.Provider value={{ lang, setLang }}>
      <TitleSync tool={tool} />
      <Header go={go} />
      {tool ? <ToolPage tool={tool} go={go} /> : <Home go={go} />}
      <Footer />
    </LangContext.Provider>
  );
}

function TitleSync({ tool }: { tool?: Tool }) {
  const t = useT();
  const { lang } = useContext(LangContext);
  // Only on navigation or language change: printing sets the title to the
  // file name for a moment, and a re-render must not overwrite it.
  useEffect(() => {
    document.title = tool ? `${t(tool.title)} · Konvertuj` : `Konvertuj · ${t("tagline")}`;
    document.querySelector('meta[name="description"]')?.setAttribute("content", tool ? t(tool.desc) : t("heroText"));
  }, [tool, lang]); // eslint-disable-line react-hooks/exhaustive-deps
  return null;
}
