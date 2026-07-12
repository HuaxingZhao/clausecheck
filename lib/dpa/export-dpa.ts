/**
 * Export DPA markdown as DOCX or simple PDF text blob helpers.
 */

import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
} from "docx";

function markdownToParagraphs(md: string): Paragraph[] {
  const lines = md.replace(/\r\n/g, "\n").split("\n");
  const out: Paragraph[] = [];
  for (const line of lines) {
    const h1 = line.match(/^#\s+(.+)/);
    const h2 = line.match(/^##\s+(.+)/);
    const h3 = line.match(/^###\s+(.+)/);
    if (h1) {
      out.push(
        new Paragraph({
          text: h1[1],
          heading: HeadingLevel.HEADING_1,
          spacing: { before: 240, after: 120 },
        })
      );
      continue;
    }
    if (h2) {
      out.push(
        new Paragraph({
          text: h2[1],
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 200, after: 100 },
        })
      );
      continue;
    }
    if (h3) {
      out.push(
        new Paragraph({
          text: h3[1],
          heading: HeadingLevel.HEADING_3,
          spacing: { before: 160, after: 80 },
        })
      );
      continue;
    }
    if (!line.trim()) {
      out.push(new Paragraph({ text: "" }));
      continue;
    }
    const bullet = line.match(/^[-*]\s+(.+)/);
    out.push(
      new Paragraph({
        children: [
          new TextRun({
            text: bullet ? `• ${bullet[1]}` : line,
            size: 22,
          }),
        ],
        spacing: { after: 80 },
      })
    );
  }
  return out;
}

export async function generateDpaDocx(markdown: string): Promise<Buffer> {
  const doc = new Document({
    sections: [
      {
        properties: {},
        children: markdownToParagraphs(markdown),
      },
    ],
  });
  return Buffer.from(await Packer.toBuffer(doc));
}

/** Minimal text PDF via data URL is handled client-side; server returns plain text for print. */
export function dpaFilename(ext: "docx" | "pdf" | "md", locale: "zh" | "en"): string {
  return locale === "zh"
    ? `ClauseCheck-DPA-草稿.${ext}`
    : `ClauseCheck-DPA-Draft.${ext}`;
}
