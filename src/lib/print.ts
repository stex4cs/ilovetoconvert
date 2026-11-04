/**
 * "Save as PDF" through the browser's print engine. Text stays text
 * (selectable, searchable, small), which screenshot-based converters lose.
 *
 * The page rule is added only for the duration of the print, because a Word
 * document brings its own margins while plain text and tables need ours.
 */
export function printAsPdf(fileTitle: string, page: { margin: string; size?: string }): void {
  const style = document.createElement("style");
  style.textContent = `@page { margin: ${page.margin}; size: ${page.size ?? "auto"}; }`;
  document.head.appendChild(style);

  // Chrome and Edge suggest the page title as the PDF file name.
  const title = document.title;
  document.title = fileTitle;

  const restore = () => {
    document.title = title;
    style.remove();
    window.removeEventListener("afterprint", restore);
  };
  window.addEventListener("afterprint", restore);
  window.print();
}

/**
 * Removes scripts, frames and inline event handlers from rendered Markdown.
 * The file is the user's own and never leaves the page, but a pasted
 * document can still carry markup that shouldn't run here.
 */
export function sanitize(html: string): string {
  const doc = new DOMParser().parseFromString(html, "text/html");
  doc.querySelectorAll("script, iframe, object, embed, link, meta, style, form").forEach((n) => n.remove());
  doc.querySelectorAll("*").forEach((el) => {
    for (const attr of [...el.attributes]) {
      const v = attr.value.trim().toLowerCase();
      if (attr.name.startsWith("on") || ((attr.name === "href" || attr.name === "src") && v.startsWith("javascript:"))) {
        el.removeAttribute(attr.name);
      }
    }
  });
  return doc.body.innerHTML;
}
