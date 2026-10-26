import * as path from "node:path";
import * as mammoth from "mammoth";
// pdfjs-dist v6 is ESM-only; the legacy Node build ships a sibling .d.mts that TS resolves for this specifier.
import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf.mjs";

export class UnsupportedFileTypeError extends Error {
  constructor(filename: string) {
    super(`Unsupported file type: ${filename} (expected .pdf or .docx)`);
    this.name = "UnsupportedFileTypeError";
  }
}

export class NoExtractableTextError extends Error {
  constructor(filename: string) {
    super(`No extractable text found in ${filename}`);
    this.name = "NoExtractableTextError";
  }
}

export interface ExtractResult {
  text: string;
  /** Real page count from pdfjs (API-M6-6); null for DOCX — no reliable page concept. */
  pages: number | null;
  /** Char offset in `text` where each 1-based PDF page begins (absent for DOCX) — feeds chunk→page attribution. */
  pageStarts?: number[];
}

async function extractPdf(buffer: Buffer): Promise<ExtractResult> {
  const doc = await pdfjsLib.getDocument({ data: new Uint8Array(buffer) }).promise;
  try {
    const pageTexts: string[] = [];
    for (let i = 1; i <= doc.numPages; i++) {
      const page = await doc.getPage(i);
      const content = await page.getTextContent();
      // TextItem carries `str`; TextMarkedContent entries are layout noise.
      pageTexts.push(content.items.map((item) => ("str" in item ? item.str : "")).join(""));
    }
    const text = pageTexts.join("\n");
    let offset = 0;
    const pageStarts = pageTexts.map((t) => {
      const start = offset;
      offset += t.length + 1; // +1 for the "\n" joiner
      return start;
    });
    return { text, pages: doc.numPages, pageStarts };
  } finally {
    // pdfjs v6: PDFDocumentProxy has no destroy(); cleanup() releases page resources.
    await doc.cleanup();
  }
}

/** Synchronous extraction (runs before the row is inserted, so failures can 400 without leaving a row behind). */
export async function extractText(buffer: Buffer, filename: string): Promise<ExtractResult> {
  const ext = path.extname(filename).toLowerCase();
  let result: ExtractResult;
  if (ext === ".pdf") {
    result = await extractPdf(buffer);
  } else if (ext === ".docx") {
    result = { text: (await mammoth.extractRawText({ buffer })).value, pages: null };
  } else {
    throw new UnsupportedFileTypeError(filename);
  }
  if (!result.text.trim()) {
    throw new NoExtractableTextError(filename);
  }
  return result;
}
