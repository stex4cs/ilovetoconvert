// Writes one static HTML file per route, plus sitemap.xml, robots.txt and 404.html.
// Runs after `vite build` (client, into dist/) and `vite build --ssr` (into dist-server/).
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const root = path.resolve(import.meta.dirname, "..");
const dist = path.join(root, "dist");
const { render, ROUTES, SITE_URL } = await import(pathToFileURL(path.join(root, "dist-server/entry-server.js")).href);

const template = fs.readFileSync(path.join(dist, "index.html"), "utf8");
const fill = ({ html, head }) => template.replace("<!--head-->", head).replace("<!--app-->", html);

for (const route of ROUTES) {
  const out = route === "/" ? "index.html" : `${route.slice(1)}.html`;
  fs.writeFileSync(path.join(dist, out), fill(await render(route)));
}
fs.writeFileSync(path.join(dist, "404.html"), fill(await render("/404")));

const today = new Date().toISOString().slice(0, 10);
const urls = ROUTES.map(
  (r) =>
    `  <url><loc>${SITE_URL}${r === "/" ? "/" : r}</loc><lastmod>${today}</lastmod><changefreq>monthly</changefreq><priority>${r === "/" ? "1.0" : "0.8"}</priority></url>`,
).join("\n");
fs.writeFileSync(
  path.join(dist, "sitemap.xml"),
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`,
);
fs.writeFileSync(path.join(dist, "robots.txt"), `User-agent: *\nAllow: /\n\nSitemap: ${SITE_URL}/sitemap.xml\n`);
console.log(`prerendered ${ROUTES.length} routes + 404 for ${SITE_URL}`);
