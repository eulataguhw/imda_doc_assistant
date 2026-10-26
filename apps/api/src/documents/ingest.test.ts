import { describe, it, expect, vi, afterEach } from "vitest";
import { chunkText, chunkPages, embedChunks, upsertPoints, deletePoints } from "./ingest";

describe("chunkText (API-M6-5)", () => {
  it("splits on paragraph boundaries and keeps meaningful text", () => {
    const chunks = chunkText("para one\n\npara two\n\n\n\npara three");
    expect(chunks.length).toBeGreaterThan(0);
    expect(chunks[0]).toContain("para one");
  });

  it("slices an over-long paragraph into bounded pieces", () => {
    const long = "word ".repeat(500); // ~2.5k chars, single paragraph
    const chunks = chunkText(long);
    expect(chunks.length).toBeGreaterThan(1);
    for (const c of chunks) expect(c.length).toBeLessThanOrEqual(1000);
  });

  it("returns [] for blank input", () => {
    expect(chunkText("   \n\n  ")).toEqual([]);
  });
});

describe("chunkPages (API-M6-1/2)", () => {
  it("attributes each chunk to the page containing its first occurrence", () => {
    const p1 = "AAA BBBB";
    const p2 = "CCCC DDDD";
    const text = `${p1}\n${p2}`;
    const pageStarts = [0, p1.length + 1]; // offset where page 2 begins
    const chunks = [p1.slice(0, 3), p1.slice(3), p2]; // "AAA", " BBBB", "CCCC DDDD"
    const pages = chunkPages(text, chunks, pageStarts);
    expect(pages).toEqual([1, 1, 2]);
  });

  it("returns all null when no pageStarts are supplied (DOCX)", () => {
    expect(chunkPages("abc", ["ab", "c"])).toEqual([null, null]);
  });
});

describe("embeddings + Qdrant (API-M5-3/4)", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("embedChunks posts to /embeddings and reports progress per batch", async () => {
    const fetchMock = vi.fn(async (_url: any, init: any) => ({
      ok: true,
      status: 200,
      statusText: "OK",
      json: async () => ({ data: JSON.parse(init.body).input.map(() => [0.1, 0.2]) }),
    }));
    vi.stubGlobal("fetch", fetchMock);

    const progress: Array<[number, number]> = [];
    const chunks = Array.from({ length: 20 }, (_, i) => `chunk ${i}`);
    const out = await embedChunks(chunks, (d, t) => progress.push([d, t]));

    expect(out).toHaveLength(20);
    // BATCH=16 → two requests; final progress reports the full total.
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(progress.at(-1)).toEqual([20, 20]);
    expect(String(fetchMock.mock.calls[0][0])).toMatch(/\/embeddings$/);
  });

  it("embeds in a single request when no progress callback is given (M4 path)", async () => {
    const fetchMock = vi.fn(async (_url: any, init: any) => ({
      ok: true,
      status: 200,
      statusText: "OK",
      json: async () => ({ data: JSON.parse(init.body).input.map(() => [0.1]) }),
    }));
    vi.stubGlobal("fetch", fetchMock);
    const out = await embedChunks(["a", "b", "c"]);
    expect(out).toHaveLength(3);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("upsertPoints PUTs one point per chunk with document_id + page payload", async () => {
    const fetchMock = vi.fn(async (_url: any, _init?: any) => ({
      ok: true,
      status: 200,
      statusText: "OK",
    }));
    vi.stubGlobal("fetch", fetchMock);

    await upsertPoints("d1", "Title", ["a", "b"], [[0.1], [0.2]], [1, 2]);

    const idx = fetchMock.mock.calls.findIndex(
      ([url, init]) =>
        (init as any)?.method === "PUT" && String(url).endsWith("/collections/documents/points")
    );
    expect(idx).toBeGreaterThanOrEqual(0);
    const [url, init] = fetchMock.mock.calls[idx];
    expect(String(url)).toMatch(/\/collections\/documents\/points$/);
    const body = JSON.parse((init as any).body);
    expect(body.points).toHaveLength(2);
    expect(body.points[0].payload.document_id).toBe("d1");
    expect(body.points[0].payload.page).toBe(1);
  });

  it("creates the collection when the lookup reports it missing, then upserts", async () => {
    const fetchMock = vi.fn(async (url: any, init?: any) => {
      // The bare collection lookup (no method) is 404 → triggers a create; everything else ok.
      const isLookup = /\/collections\/documents$/.test(String(url)) && !(init as any)?.method;
      if (isLookup) return { ok: false, status: 404, statusText: "Not Found" };
      return { ok: true, status: 200, statusText: "OK" };
    });
    vi.stubGlobal("fetch", fetchMock);
    await upsertPoints("d1", "Title", ["a"], [[0.1]], [1]);
    // lookup(404) + create(PUT /collections/documents) + upsert(PUT /points) = 3 calls.
    expect(fetchMock).toHaveBeenCalledTimes(3);
    const createCall = fetchMock.mock.calls.find(
      ([, init]) =>
        (init as any)?.method === "PUT" &&
        String(fetchMock.mock.calls[0][0]).includes("/collections/documents")
    );
    expect(createCall).toBeDefined();
  });

  it("deletePoints POSTs a document_id filter", async () => {
    const fetchMock = vi.fn(async (_url: any, _init?: any) => ({
      ok: true,
      status: 200,
      statusText: "OK",
    }));
    vi.stubGlobal("fetch", fetchMock);
    await deletePoints("d9");
    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toMatch(/\/points\/delete$/);
    expect(JSON.parse((init as any).body).filter.must[0].match.value).toBe("d9");
  });

  it("throws a labelled error when the embedding request is not ok", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({ ok: false, status: 503, statusText: "Service Unavailable" }))
    );
    await expect(embedChunks(["a"])).rejects.toThrow(/Embedding request failed/);
  });
});
