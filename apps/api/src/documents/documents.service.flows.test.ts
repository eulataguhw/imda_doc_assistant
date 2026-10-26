import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NotFoundException } from "@nestjs/common";

vi.mock("./extract", () => {
  class UnsupportedFileTypeError extends Error {}
  class NoExtractableTextError extends Error {}
  return { extractText: vi.fn(), UnsupportedFileTypeError, NoExtractableTextError };
});
vi.mock("./ingest", () => ({
  chunkText: vi.fn(),
  deletePoints: vi.fn(),
  embedChunks: vi.fn(),
  upsertPoints: vi.fn(),
}));
vi.mock("./queue", () => {
  const progress: Record<string, any> = {};
  return { enqueue: vi.fn(), markStaleProcessing: vi.fn(), progress };
});

import { db } from "../lib/db";
import { DocumentsService } from "./documents.service";
import * as extract from "./extract";
import * as ingest from "./ingest";
import * as queue from "./queue";

const svc = () => new DocumentsService();
const clearDocs = () => db.prepare("DELETE FROM documents").run();

beforeEach(() => {
  vi.clearAllMocks();
  clearDocs();
});
afterEach(() => vi.unstubAllGlobals());

describe("list() (API-M8-5)", () => {
  it("maps rows to DTOs and filters by origin", () => {
    db.prepare(
      "INSERT INTO documents (id,title,status,origin) VALUES ('k1','Know','ready','knowledge')"
    ).run();
    db.prepare(
      "INSERT INTO documents (id,title,status,origin,content,pages,size_bytes) VALUES ('c1','Chat','ready','chat','body',4,900)"
    ).run();

    const all = svc().list();
    expect(all.map((d) => d.id).sort()).toEqual(["c1", "k1"]);

    const chat = svc().list("chat");
    expect(chat).toHaveLength(1);
    expect(chat[0]).toMatchObject({
      id: "c1",
      origin: "chat",
      status: "ready",
      pages: 4,
      sizeBytes: 900,
    });

    const know = svc().list("knowledge");
    expect(know.map((d) => d.id)).toEqual(["k1"]);
    expect(know[0].origin).toBe("knowledge");
  });

  it("exposes progress for processing rows and omits empty summaries", () => {
    (queue.progress as Record<string, any>)["p1"] = { stage: "embedding", done: 1, total: 3 };
    db.prepare(
      "INSERT INTO documents (id,title,status) VALUES ('p1','Processing','processing')"
    ).run();
    db.prepare(
      "INSERT INTO documents (id,title,status,summary) VALUES ('e1','Empty Summary','ready','')"
    ).run();

    const [p, e] = svc().list();
    expect(p.progress).toEqual({ stage: "embedding", done: 1, total: 3 });
    expect("progress" in e).toBe(false);
    expect("summary" in e).toBe(false); // empty-string summary treated as absent
  });
});

describe("delete() (API-M8-6)", () => {
  it("removes a knowledge doc and deletes its Qdrant points", async () => {
    db.prepare(
      "INSERT INTO documents (id,title,status,origin) VALUES ('k1','Know','ready','knowledge')"
    ).run();
    await svc().delete("k1");
    expect(ingest.deletePoints).toHaveBeenCalledWith("k1");
    expect(db.prepare("SELECT id FROM documents WHERE id = 'k1'").get()).toBeUndefined();
  });

  it("removes a chat doc WITHOUT deleting points (not embedded)", async () => {
    db.prepare(
      "INSERT INTO documents (id,title,status,origin) VALUES ('c1','Chat','ready','chat')"
    ).run();
    await svc().delete("c1");
    expect(ingest.deletePoints).not.toHaveBeenCalled();
  });

  it("throws 404 for an unknown id", async () => {
    await expect(svc().delete("nope")).rejects.toBeInstanceOf(NotFoundException);
  });
});

describe("uploadChat() (API-M8-7)", () => {
  it("stores extracted text on the row, ready immediately, without enqueuing", async () => {
    vi.mocked(extract.extractText).mockResolvedValue({
      text: "the body",
      pages: 2,
      pageStarts: [0, 9],
    });
    const dto = await svc().uploadChat(Buffer.from("x"), "note.docx", "My Note");
    expect(dto).toMatchObject({ title: "My Note", origin: "chat", status: "ready", pages: 2 });
    expect(queue.enqueue).not.toHaveBeenCalled();
    const row = db.prepare("SELECT content FROM documents WHERE id = ?").get(dto.id) as {
      content: string;
    };
    expect(row.content).toBe("the body");
  });

  it("falls back to the filename (sans extension) when no title is given", async () => {
    vi.mocked(extract.extractText).mockResolvedValue({ text: "t", pages: null });
    const dto = await svc().uploadChat(Buffer.from("x"), "report.pdf");
    expect(dto.title).toBe("report");
  });

  it("rejects unsupported extensions and oversize buffers before extraction", async () => {
    await expect(svc().uploadChat(Buffer.from("x"), "note.txt")).rejects.toThrow(
      /Unsupported file type/
    );
    const huge = Buffer.alloc(10 * 1024 * 1024 + 1);
    await expect(svc().uploadChat(huge, "note.pdf")).rejects.toThrow(/too large/i);
    expect(extract.extractText).not.toHaveBeenCalled();
  });

  it("maps NoExtractableTextError to a 400", async () => {
    vi.mocked(extract.extractText).mockRejectedValue(
      new extract.NoExtractableTextError("note.pdf")
    );
    await expect(svc().uploadChat(Buffer.from("x"), "note.pdf")).rejects.toThrow(
      /No extractable text/
    );
  });
});

describe("upload() JSON path (M4)", () => {
  it("embeds + upserts and reaches ready on success", async () => {
    vi.mocked(ingest.chunkText).mockReturnValue(["a", "b"]);
    vi.mocked(ingest.embedChunks).mockResolvedValue([[0.1], [0.2]]);
    const dto = await svc().upload("Title", "some content");
    expect(dto.status).toBe("ready");
    expect(ingest.upsertPoints).toHaveBeenCalledWith(
      expect.any(String),
      "Title",
      ["a", "b"],
      [[0.1], [0.2]]
    );
  });

  it("reaches error when there is no chunkable content", async () => {
    vi.mocked(ingest.chunkText).mockReturnValue([]);
    const dto = await svc().upload("Title", "   ");
    expect(dto.status).toBe("error");
    expect(dto.errorReason).toMatch(/empty/i);
    expect(ingest.upsertPoints).not.toHaveBeenCalled();
  });

  it("reaches error when embedding fails, keeping the message", async () => {
    vi.mocked(ingest.chunkText).mockReturnValue(["a"]);
    vi.mocked(ingest.embedChunks).mockRejectedValue(new Error("embed down"));
    const dto = await svc().upload("Title", "content");
    expect(dto.status).toBe("error");
    expect(dto.errorReason).toBe("embed down");
  });
});

describe("uploadFile() fast path (M5)", () => {
  it("extracts, inserts a processing row, and enqueues background indexing", async () => {
    vi.mocked(extract.extractText).mockResolvedValue({
      text: "pdf body",
      pages: 3,
      pageStarts: [0, 12],
    });
    const dto = await svc().uploadFile(Buffer.from("bytes"), "paper.pdf");
    expect(dto.status).toBe("processing");
    expect(dto.title).toBe("paper"); // filename fallback
    expect(queue.enqueue).toHaveBeenCalledWith({
      documentId: dto.id,
      title: "paper",
      text: "pdf body",
      pageStarts: [0, 12],
    });
  });

  it("rejects unsupported extensions and maps NoExtractableTextError to a 400", async () => {
    await expect(svc().uploadFile(Buffer.from("x"), "note.txt")).rejects.toThrow(
      /Unsupported file type/
    );
    vi.mocked(extract.extractText).mockRejectedValue(
      new extract.NoExtractableTextError("note.pdf")
    );
    await expect(svc().uploadFile(Buffer.from("x"), "note.pdf")).rejects.toThrow(
      /No extractable text/
    );
  });
});

describe("onModuleInit()", () => {
  it("marks stale processing rows", () => {
    svc().onModuleInit();
    expect(queue.markStaleProcessing).toHaveBeenCalled();
  });
});
