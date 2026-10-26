import { describe, it, expect, beforeEach, vi } from "vitest";
import { db } from "../lib/db";

// M8 (TEST-M8-2): mock the Qdrant/ingest boundary so delete() is verified without a live Qdrant.
vi.mock("./ingest", () => ({
  chunkText: vi.fn(),
  deletePoints: vi.fn(async (_id: string) => {}),
  embedChunks: vi.fn(),
  upsertPoints: vi.fn(),
}));

import { DocumentsService } from "./documents.service";
import { deletePoints } from "./ingest";
import { NotFoundException } from "@nestjs/common";

describe("DocumentsService M8 (API-DOC-5,6)", () => {
  let svc: DocumentsService;

  beforeEach(() => {
    vi.clearAllMocks();
    db.prepare("DELETE FROM documents").run();
    svc = new DocumentsService();
  });

  it("filters list() by origin (knowledge / chat / all)", () => {
    db.prepare(
      "INSERT INTO documents (id, title, status, origin) VALUES ('k1', 'K Doc', 'ready', 'knowledge')"
    ).run();
    db.prepare(
      "INSERT INTO documents (id, title, status, origin) VALUES ('c1', 'C Doc', 'ready', 'chat')"
    ).run();

    expect(
      svc
        .list()
        .map((d) => d.id)
        .sort()
    ).toEqual(["c1", "k1"]);
    expect(svc.list("knowledge").map((d) => d.id)).toEqual(["k1"]);
    expect(svc.list("chat").map((d) => d.id)).toEqual(["c1"]);
    expect(svc.list("knowledge")[0].origin).toBe("knowledge");
  });

  it("delete() removes a knowledge row AND its Qdrant points", async () => {
    db.prepare(
      "INSERT INTO documents (id, title, status, origin) VALUES ('k2', 'K Doc', 'ready', 'knowledge')"
    ).run();
    await svc.delete("k2");
    expect(deletePoints).toHaveBeenCalledTimes(1);
    expect(deletePoints).toHaveBeenCalledWith("k2");
    expect(db.prepare("SELECT id FROM documents WHERE id = 'k2'").get()).toBeUndefined();
  });

  it("delete() removes a chat row WITHOUT touching Qdrant (chat docs are not embedded)", async () => {
    db.prepare(
      "INSERT INTO documents (id, title, status, origin, content) VALUES ('c2', 'C Doc', 'ready', 'chat', 'body')"
    ).run();
    await svc.delete("c2");
    expect(deletePoints).not.toHaveBeenCalled();
    expect(db.prepare("SELECT id FROM documents WHERE id = 'c2'").get()).toBeUndefined();
  });

  it("delete() throws NotFoundException for a missing id and leaves Qdrant untouched", async () => {
    await expect(svc.delete("nope")).rejects.toThrow(NotFoundException);
    expect(deletePoints).not.toHaveBeenCalled();
  });
});
