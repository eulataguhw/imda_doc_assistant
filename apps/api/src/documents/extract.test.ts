import { describe, it, expect, vi } from "vitest";

vi.mock("mammoth", () => ({ extractRawText: vi.fn() }));
vi.mock("pdfjs-dist/legacy/build/pdf.mjs", () => ({ getDocument: vi.fn() }));

import { extractText, UnsupportedFileTypeError, NoExtractableTextError } from "./extract";
import * as mammoth from "mammoth";
import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf.mjs";

describe("extractText (API-M5-4 / API-M6-6)", () => {
  it("rejects unsupported extensions with UnsupportedFileTypeError", async () => {
    await expect(extractText(Buffer.from("x"), "notes.txt")).rejects.toThrow(
      UnsupportedFileTypeError
    );
    await expect(extractText(Buffer.from("x"), "img.PNG")).rejects.toThrow(/Unsupported file type/);
  });

  it("extracts DOCX raw text and reports pages=null (no reliable page concept)", async () => {
    vi.mocked(mammoth.extractRawText).mockResolvedValue({
      value: "Hello docx world",
      messages: [],
    } as any);
    const res = await extractText(Buffer.from([1, 2, 3]), "report.docx");
    expect(res.text).toBe("Hello docx world");
    expect(res.pages).toBeNull();
    expect(mammoth.extractRawText).toHaveBeenCalled();
  });

  it("extracts PDF text with the real page count and per-page char offsets", async () => {
    const mkPage = (i: number) => ({
      getTextContent: vi.fn(async () => ({ items: [{ str: `page${i} content` }] })),
    });
    const doc = {
      numPages: 2,
      getPage: vi.fn(async (i: number) => mkPage(i)),
      cleanup: vi.fn(async () => {}),
    };
    vi.mocked(pdfjsLib.getDocument).mockReturnValue({ promise: Promise.resolve(doc) } as any);

    const res = await extractText(Buffer.from([9]), "doc.pdf");
    expect(res.pages).toBe(2);
    expect(res.text).toContain("page1 content");
    expect(res.text).toContain("page2 content");
    // pageStarts: char offset where each 1-based page begins (feeds chunk→page attribution).
    expect(res.pageStarts).toHaveLength(2);
    expect(res.pageStarts![0]).toBe(0);
    expect(res.pageStarts![1]).toBe("page1 content".length + 1);
    // pdfjs v6 cleanup releases page resources.
    expect(doc.cleanup).toHaveBeenCalled();
  });

  it("throws NoExtractableTextError when extraction yields only whitespace", async () => {
    vi.mocked(mammoth.extractRawText).mockResolvedValue({ value: "   \n\t ", messages: [] } as any);
    await expect(extractText(Buffer.from([1]), "blank.docx")).rejects.toThrow(
      NoExtractableTextError
    );
  });
});
