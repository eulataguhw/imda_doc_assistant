import { describe, expect, it } from "vitest";
import type { Document } from "./api";
import { getDocDisplayMeta } from "./docMeta";

/** Build a minimal ready-state document, overriding any fields under test. */
function doc(overrides: Partial<Document> = {}): Document {
  return { id: "d1", title: "T", status: "ready", ...overrides };
}

describe("getDocDisplayMeta", () => {
  it("returns the real summary plus page count and size for a ready doc", () => {
    const meta = getDocDisplayMeta(
      doc({
        summary: "Q2 results were strong.",
        pages: 12,
        sizeBytes: 2048,
        createdAt: "2026-06-05T00:00:00.000Z",
      }),
    );
    expect(meta.excerpt).toBe("Q2 results were strong.");
    expect(meta.pages).toBe(12);
    expect(meta.sizeLabel).toBe("2.0 KB");
    expect(meta.uploadedAt).toContain("2026");
  });

  it("falls back to a default excerpt when no summary exists", () => {
    const meta = getDocDisplayMeta(doc({}));
    expect(meta.excerpt).toBe(
      "No summary is available for this document yet. Use chat to ask questions about its contents.",
    );
    expect(meta.pages).toBeNull();
    expect(meta.sizeLabel).toBeNull();
  });

  it("explains that a processing doc is still being indexed", () => {
    const meta = getDocDisplayMeta(doc({ status: "processing" }));
    expect(meta.excerpt).toContain("still indexing");
  });

  it("surfaces the ingestion error reason when present", () => {
    const meta = getDocDisplayMeta(doc({ status: "error", errorReason: "corrupt file" }));
    expect(meta.excerpt).toBe(
      "Ingestion failed: corrupt file. You can retry the upload from the library.",
    );
  });

  it("falls back to a generic failure message without a reason", () => {
    const meta = getDocDisplayMeta(doc({ status: "error" }));
    expect(meta.excerpt).toContain("Ingestion failed for this document");
  });

  it("formats byte sizes across B/KB/MB ranges", () => {
    expect(getDocDisplayMeta(doc({ sizeBytes: 512 })).sizeLabel).toBe("512 B");
    expect(getDocDisplayMeta(doc({ sizeBytes: 2048 })).sizeLabel).toBe("2.0 KB");
    expect(getDocDisplayMeta(doc({ sizeBytes: 20480 })).sizeLabel).toBe("20 KB");
    expect(getDocDisplayMeta(doc({ sizeBytes: 3 * 1024 * 1024 })).sizeLabel).toBe("3.0 MB");
  });

  it("reports an unknown date for missing or unparseable timestamps", () => {
    expect(getDocDisplayMeta(doc({})).uploadedAt).toBe("Unknown date");
    expect(getDocDisplayMeta(doc({ createdAt: "not-a-date" })).uploadedAt).toBe("Unknown date");
  });
});
