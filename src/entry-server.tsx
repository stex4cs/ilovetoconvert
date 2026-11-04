import { StrictMode } from "react";
import { prerenderToNodeStream } from "react-dom/static";
import App from "./App";
import { headFor, headHtml } from "./seo";
export { SITE_URL } from "./seo";
import { PAGES } from "./content/pages";

export const ROUTES = ["/", ...PAGES.map((p) => `/${p.slug}`)];

async function streamToString(stream: NodeJS.ReadableStream): Promise<string> {
  let out = "";
  for await (const chunk of stream) out += chunk.toString();
  return out;
}

/** Full HTML for one path; waits for the lazy tool so its first screen is in the markup. */
export async function render(path: string): Promise<{ html: string; head: string }> {
  const { prelude } = await prerenderToNodeStream(
    <StrictMode>
      <App path={path} />
    </StrictMode>,
  );
  return { html: await streamToString(prelude), head: headHtml(headFor(path)) };
}
