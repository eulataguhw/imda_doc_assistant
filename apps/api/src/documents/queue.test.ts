import { describe, it, expect, vi, beforeEach } from "vitest";
import { db } from "../lib/db";

vi.mock("./ingest", () => ({
  chunkText: vi.fn(),
  chunkPages: vi.fn(),
  embedChunks: vi.fn(),
  generateSummary: vi.fn(),
  upsertPoints: vi.fn(),
}));

import { enqueue, progress, markStaleProcessing } from "./queue";
import * as ingest from "./ingest";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Poll until the job reaches a terminal status (ready|error), guarding against pump serialization. */
async function awaitJob(
  id: string
): Promise<{ status: string; summary?: string | null; error_reason?: string | null }> {
  for (let i = 0; i < 100; i++) {
    const row = db
      .prepare("SELECT status, summary, error_reason FROM documents WHERE id = ?")
      .get(id) as any;
    if (row && row.status !== "processing") return row;
    await sleep(10);
  }
  throw new Error(`job ${id} did not reach a terminal state`);
}

describe("indexing queue (API-M5-2/3, API-M6-5)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    db.prepare("DELETE FROM documents").run();
    vi.mocked(ingest.chunkText).mockReturnValue(["alpha", "beta"]);
    vi.mocked(ingest.chunkPages).mockReturnValue([1, 2]);
    vi.mocked(ingest.embedChunks).mockResolvedValue([[0.1], [0.2]]);
    vi.mocked(ingest.generateSummary).mockResolvedValue("A summary");
    vi.mocked(ingest.upsertPoints).mockResolvedValue(undefined);
  });

  it("indexes a job to ready, upserts points, and clears in-flight progress", async () => {
    db.prepare(
      "INSERT INTO documents (id, title, status) VALUES ('j1', 'Doc', 'processing')"
    ).run();
    enqueue({ documentId: "j1", title: "Doc", text: "alpha\nbeta" });

    const row = await awaitJob("j1");
    expect(row.status).toBe("ready");
    expect(row.summary).toBe("A summary");
    expect(ingest.upsertPoints).toHaveBeenCalledWith(
      "j1",
      "Doc",
      ["alpha", "beta"],
      [[0.1], [0.2]],
      [1, 2]
    );
    expect(progress["j1"]).toBeUndefined();
  });

  it("still reaches ready when summary generation fails (best-effort)", async () => {
    vi.mocked(ingest.generateSummary).mockRejectedValue(new Error("llm down"));
    db.prepare(
      "INSERT INTO documents (id, title, status) VALUES ('j2', 'Doc', 'processing')"
    ).run();
    enqueue({ documentId: "j2", title: "Doc", text: "alpha\nbeta" });

    const row = await awaitJob("j2");
    expect(row.status).toBe("ready");
    // Indexing must not be blocked by a dead chat model.
    expect(ingest.upsertPoints).toHaveBeenCalledTimes(1);
  });

  it("marks the job error when there is no chunkable content", async () => {
    vi.mocked(ingest.chunkText).mockReturnValue([]);
    db.prepare(
      "INSERT INTO documents (id, title, status) VALUES ('j3', 'Doc', 'processing')"
    ).run();
    enqueue({ documentId: "j3", title: "Doc", text: "" });

    const row = await awaitJob("j3");
    expect(row.status).toBe("error");
    expect(String(row.error_reason)).toMatch(/empty/i);
  });

  it("markStaleProcessing flips leftover processing rows to error, leaving ready rows intact", () => {
    db.prepare(
      "INSERT INTO documents (id, title, status) VALUES ('j4', 'Doc', 'processing')"
    ).run();
    db.prepare("INSERT INTO documents (id, title, status) VALUES ('j5', 'Doc', 'ready')").run();

    markStaleProcessing();

    const j4 = db.prepare("SELECT status FROM documents WHERE id = 'j4'").get() as any;
    const j5 = db.prepare("SELECT status FROM documents WHERE id = 'j5'").get() as any;
    expect(j4.status).toBe("error");
    expect(j5.status).toBe("ready");
  });
});
