/**
 * Everything that goes into <head>: title, description, canonical, Open
 * Graph, Twitter and JSON-LD. Built from the same data on the server (into
 * the prerendered HTML) and in the browser (on client-side navigation).
 */
import { BRAND, HOME, PAGES, pageBySlug, type Page } from "./content/pages";

/** Set VITE_SITE_URL when the domain changes (ilovetoconvert.com later). */
export const SITE_URL = (import.meta.env.VITE_SITE_URL || "https://ilovetoconvert.vercel.app").replace(/\/$/, "");

export type Head = {
  title: string;
  description: string;
  canonical: string;
  noindex?: boolean;
  jsonLd: object[];
};

export const normalizePath = (p: string) => {
  const clean = p.replace(/\.html$/, "").replace(/\/+$/, "");
  return clean === "" ? "/" : clean;
};

const org = { "@type": "Organization", name: BRAND, url: SITE_URL, logo: `${SITE_URL}/icon-512.png` };

function appLd(page: Page | null) {
  return {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: page ? `${page.label} · ${BRAND}` : BRAND,
    url: page ? `${SITE_URL}/${page.slug}` : SITE_URL,
    description: page ? page.description : HOME.description,
    applicationCategory: "UtilitiesApplication",
    operatingSystem: "Any (runs in the browser)",
    browserRequirements: "Requires JavaScript",
    isAccessibleForFree: true,
    offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
    publisher: org,
  };
}

export function headFor(path: string): Head {
  const p = normalizePath(path);
  if (p === "/") {
    return {
      title: HOME.title,
      description: HOME.description,
      canonical: `${SITE_URL}/`,
      jsonLd: [
        { "@context": "https://schema.org", "@type": "WebSite", name: BRAND, url: `${SITE_URL}/` },
        appLd(null),
        {
          "@context": "https://schema.org",
          "@type": "ItemList",
          itemListElement: PAGES.map((pg, i) => ({ "@type": "ListItem", position: i + 1, name: pg.label, url: `${SITE_URL}/${pg.slug}` })),
        },
      ],
    };
  }
  const page = pageBySlug(p.slice(1));
  if (!page) {
    return { title: `Page not found | ${BRAND}`, description: HOME.description, canonical: `${SITE_URL}/`, noindex: true, jsonLd: [] };
  }
  return {
    title: page.title,
    description: page.description,
    canonical: `${SITE_URL}/${page.slug}`,
    jsonLd: [
      appLd(page),
      {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: BRAND, item: `${SITE_URL}/` },
          { "@type": "ListItem", position: 2, name: page.label, item: `${SITE_URL}/${page.slug}` },
        ],
      },
      {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: page.faq.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
      },
      {
        "@context": "https://schema.org",
        "@type": "HowTo",
        name: page.h1,
        step: page.steps.map((s, i) => ({ "@type": "HowToStep", position: i + 1, text: s })),
      },
    ],
  };
}

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** The <head> tags as HTML, for prerendering. */
export function headHtml(h: Head): string {
  const og = `${SITE_URL}/og.png`;
  return [
    `<title>${esc(h.title)}</title>`,
    `<meta name="description" content="${esc(h.description)}" />`,
    `<link rel="canonical" href="${h.canonical}" />`,
    h.noindex ? `<meta name="robots" content="noindex" />` : `<meta name="robots" content="index, follow, max-image-preview:large" />`,
    `<meta property="og:type" content="website" />`,
    `<meta property="og:site_name" content="${BRAND}" />`,
    `<meta property="og:title" content="${esc(h.title)}" />`,
    `<meta property="og:description" content="${esc(h.description)}" />`,
    `<meta property="og:url" content="${h.canonical}" />`,
    `<meta property="og:image" content="${og}" />`,
    `<meta property="og:image:width" content="1200" />`,
    `<meta property="og:image:height" content="630" />`,
    `<meta property="og:locale" content="en_US" />`,
    `<meta name="twitter:card" content="summary_large_image" />`,
    `<meta name="twitter:title" content="${esc(h.title)}" />`,
    `<meta name="twitter:description" content="${esc(h.description)}" />`,
    `<meta name="twitter:image" content="${og}" />`,
    ...h.jsonLd.map((ld) => `<script type="application/ld+json">${JSON.stringify(ld).replace(/</g, "\\u003c")}</script>`),
  ].join("\n    ");
}

/** Keeps the live <head> in step during client-side navigation. */
export function applyHead(h: Head): void {
  document.title = h.title;
  const set = (sel: string, attr: string, val: string) => document.querySelector(sel)?.setAttribute(attr, val);
  set('meta[name="description"]', "content", h.description);
  set('link[rel="canonical"]', "href", h.canonical);
  set('meta[property="og:title"]', "content", h.title);
  set('meta[property="og:description"]', "content", h.description);
  set('meta[property="og:url"]', "content", h.canonical);
  set('meta[name="twitter:title"]', "content", h.title);
  set('meta[name="twitter:description"]', "content", h.description);
}
