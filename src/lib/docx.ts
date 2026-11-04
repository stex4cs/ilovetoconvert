/**
 * Extracted PDF structure → a Word document with real paragraphs, headings,
 * bullet lists, bold/italic runs and images, on the PDF's page size.
 */
import type { Extracted, Para } from "./pdftext";

const FONT = { sans: "Calibri", serif: "Times New Roman", mono: "Courier New" } as const;
const twip = (pt: number) => Math.round(pt * 20);

export async function toDocx(x: Extracted): Promise<Blob> {
  const d = await import("docx");
  const contentWidthPt = x.page.width - x.page.marginLeft - x.page.marginRight;

  const paragraph = (p: Para, pageBreakBefore: boolean) =>
    new d.Paragraph({
      pageBreakBefore,
      heading: p.heading === 1 ? d.HeadingLevel.HEADING_1 : p.heading === 2 ? d.HeadingLevel.HEADING_2 : p.heading === 3 ? d.HeadingLevel.HEADING_3 : undefined,
      alignment: p.align === "center" ? d.AlignmentType.CENTER : p.align === "right" ? d.AlignmentType.RIGHT : d.AlignmentType.LEFT,
      numbering: p.bullet ? { reference: "bullets", level: 0 } : undefined,
      spacing: { after: p.heading ? 120 : 100, line: 276 },
      children: p.runs.map(
        (r) =>
          new d.TextRun({
            text: r.text,
            bold: r.bold || undefined,
            italics: r.italic || undefined,
            size: Math.round(Math.min(Math.max(r.size, 6), 72) * 2), // half-points
            font: FONT[r.family],
          }),
      ),
    });

  const children: (InstanceType<typeof d.Paragraph> | InstanceType<typeof d.Table>)[] = [];
  let breakNext = false;
  for (const b of x.blocks) {
    if (b.kind === "pagebreak") {
      breakNext = true;
      continue;
    }
    if (b.kind === "para") {
      children.push(paragraph(b, breakNext));
    } else if (b.kind === "table") {
      const total = b.widths.reduce((s, w) => s + w, 0) || 1;
      const scale = Math.min(1, contentWidthPt / total);
      if (breakNext) children.push(new d.Paragraph({ pageBreakBefore: true, children: [] }));
      children.push(
        new d.Table({
          columnWidths: b.widths.map((w) => twip(w * scale)),
          rows: b.rows.map(
            (row, ri) =>
              new d.TableRow({
                tableHeader: ri === 0,
                children: row.map(
                  (cell, ci) =>
                    new d.TableCell({
                      width: { size: twip(b.widths[ci]! * scale), type: d.WidthType.DXA },
                      margins: { top: 40, bottom: 40, left: 80, right: 80 },
                      children: cell.length ? cell.map((p) => paragraph(p, false)) : [new d.Paragraph({ children: [] })],
                    }),
                ),
              }),
          ),
        }),
      );
      children.push(new d.Paragraph({ children: [] }));
    } else {
      // docx sizes images in pixels at 96 dpi; keep the size it had on the page, capped to the text width
      const scale = Math.min(1, contentWidthPt / b.width);
      children.push(
        new d.Paragraph({
          pageBreakBefore: breakNext,
          spacing: { after: 120 },
          children: [
            new d.ImageRun({
              type: "png",
              data: b.png,
              transformation: { width: Math.round(b.width * scale * (96 / 72)), height: Math.round(b.height * scale * (96 / 72)) },
            }),
          ],
        }),
      );
    }
    breakNext = false;
  }
  if (!children.length) children.push(new d.Paragraph({ children: [] }));

  const doc = new d.Document({
    creator: "ilovetoconvert",
    numbering: {
      config: [
        {
          reference: "bullets",
          levels: [{ level: 0, format: d.LevelFormat.BULLET, text: "•", alignment: d.AlignmentType.LEFT, style: { paragraph: { indent: { left: 360, hanging: 260 } } } }],
        },
      ],
    },
    styles: { default: { document: { run: { font: "Calibri" } } } },
    sections: [
      {
        properties: {
          page: {
            size: { width: twip(x.page.width), height: twip(x.page.height) },
            margin: { top: twip(54), bottom: twip(54), left: twip(x.page.marginLeft), right: twip(x.page.marginRight) },
          },
        },
        children,
      },
    ],
  });
  return d.Packer.toBlob(doc);
}
