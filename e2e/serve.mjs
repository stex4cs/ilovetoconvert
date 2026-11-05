// Static server for dist/ with Vercel-style clean URLs: /x serves x.html,
// unknown paths get 404.html with a 404 status.
import http from "node:http";
import fs from "node:fs";
import path from "node:path";

const TYPES = {
  ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css",
  ".svg": "image/svg+xml", ".png": "image/png", ".ico": "image/x-icon", ".json": "application/json",
  ".xml": "application/xml", ".txt": "text/plain", ".webmanifest": "application/manifest+json",
  ".wasm": "application/wasm", ".bcmap": "application/octet-stream", ".pfb": "application/octet-stream",
};

export function serve(dir, port = 0) {
  const root = path.resolve(dir);
  const server = http.createServer((req, res) => {
    let p = decodeURIComponent(new URL(req.url, "http://x").pathname);
    if (p.length > 1 && p.endsWith("/")) p = p.slice(0, -1);
    const candidates = p === "/" ? ["index.html"] : [p.slice(1), p.slice(1) + ".html"];
    for (const c of candidates) {
      const f = path.join(root, c);
      if (f.startsWith(root) && fs.existsSync(f) && fs.statSync(f).isFile()) {
        res.writeHead(200, { "content-type": TYPES[path.extname(f)] ?? "application/octet-stream" });
        return fs.createReadStream(f).pipe(res);
      }
    }
    res.writeHead(404, { "content-type": TYPES[".html"] });
    fs.createReadStream(path.join(root, "404.html")).pipe(res);
  });
  return new Promise((resolve) => server.listen(port, () => resolve({ server, url: `http://localhost:${server.address().port}` })));
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const { url } = await serve(process.argv[2] ?? "dist", Number(process.argv[3] ?? 4319));
  console.log(url);
}
