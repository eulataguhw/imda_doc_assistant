import { describe, it, expect, vi, afterEach } from "vitest";
import {
  listDocuments,
  deleteDocument,
  uploadChatDocument,
  listSessions,
  createSession,
  getSession,
  streamChat,
  uploadDocument,
  uploadDocumentFile,
} from "./api";
import type { ChatStreamEvent } from "./api";

afterEach(() => vi.unstubAllGlobals());

describe("api.ts M8 helpers (WEB-M8-4/5)", () => {
  it("listDocuments('chat') sends the origin query param", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue({ ok: true, status: 200, json: async () => [{ id: "c1" }] });
    vi.stubGlobal("fetch", fetchMock);
    expect(await listDocuments("chat")).toEqual([{ id: "c1" }]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toBe("/api/documents?origin=chat");
  });

  it("listDocuments() omits the origin param", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => [] });
    vi.stubGlobal("fetch", fetchMock);
    await listDocuments();
    expect(fetchMock.mock.calls[0][0]).toBe("/api/documents");
  });

  it("deleteDocument resolves on 204 and sends DELETE (id URL-encoded)", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 204 });
    vi.stubGlobal("fetch", fetchMock);
    await deleteDocument("abc/1");
    expect(fetchMock.mock.calls[0][0]).toBe("/api/documents/abc%2F1");
    expect(fetchMock.mock.calls[0][1]?.method).toBe("DELETE");
  });

  it("deleteDocument throws on a non-204 response", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 404 }));
    await expect(deleteDocument("nope")).rejects.toThrow(/404/);
  });

  it("uploadChatDocument posts multipart with the optional title", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue({
        ok: true,
        status: 201,
        json: async () => ({ id: "c9", title: "T", pages: 4 }),
      });
    vi.stubGlobal("fetch", fetchMock);
    const file = new File(["hello"], "a.pdf", { type: "application/pdf" });
    expect(await uploadChatDocument(file, "My Doc")).toMatchObject({ id: "c9", pages: 4 });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/chat/documents");
    expect(init.method).toBe("POST");
    expect(init.body).toBeInstanceOf(FormData);
    expect((init.body as FormData).get("title")).toBe("My Doc");
  });

  it("listSessions / createSession / getSession hit the right endpoints", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    fetchMock.mockResolvedValueOnce({ ok: true, status: 200, json: async () => [{ id: "s1" }] });
    expect(await listSessions()).toEqual([{ id: "s1" }]);
    expect(fetchMock.mock.calls[0][0]).toBe("/api/chat/sessions");

    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 201,
      json: async () => ({ id: "s2", title: "New" }),
    });
    expect(await createSession("New")).toMatchObject({ id: "s2" });
    expect(fetchMock.mock.calls[1][0]).toBe("/api/chat/sessions");
    expect(fetchMock.mock.calls[1][1]?.method).toBe("POST");
    expect(JSON.parse(fetchMock.mock.calls[1][1].body)).toEqual({ title: "New" });

    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ id: "s3", messages: [] }),
    });
    expect(await getSession("s3")).toMatchObject({ id: "s3" });
    expect(fetchMock.mock.calls[2][0]).toBe("/api/chat/sessions/s3");
  });

  it("createSession without a title posts an empty object", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue({ ok: true, status: 201, json: async () => ({ id: "s4" }) });
    vi.stubGlobal("fetch", fetchMock);
    await createSession();
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({});
  });
});

describe("api.ts M8 streaming + error helpers (WEB-M8-5)", () => {
  /** Build a fake SSE response body whose reader yields one chunk per frame, then completes. */
  function sseBody(frames: string[]) {
    const enc = new TextEncoder();
    let i = 0;
    return {
      getReader: () => ({
        read: async () =>
          i < frames.length
            ? { done: false, value: enc.encode(frames[i++]) }
            : { done: true, value: undefined as unknown },
      }),
    };
  }

  it("streamChat parses citation/chunk/done SSE events in order and skips [DONE]", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      body: sseBody([
        'data: {"type":"citation","documentId":"d1","title":"Annual Report","page":3}\n\n',
        'data: {"type":"chunk","delta":"Hello "}\n\n',
        'data: {"type":"chunk","delta":"world"}\n\n',
        'data: {"type":"done"}\n\n',
        "data: [DONE]\n\n",
      ]),
    });
    vi.stubGlobal("fetch", fetchMock);
    const events: ChatStreamEvent[] = [];
    await streamChat({ question: "q", onEvent: (e) => events.push(e) });
    expect(events.map((e) => e.type)).toEqual(["citation", "chunk", "chunk", "done"]);
    expect(events[0]).toMatchObject({ type: "citation", data: { documentId: "d1" } });
  });

  it("streamChat surfaces an error event from the stream", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        body: sseBody(['data: {"type":"error","reason":"boom"}\n\n']),
      })
    );
    const events: ChatStreamEvent[] = [];
    await streamChat({ question: "q", onEvent: (e) => events.push(e) });
    expect(events).toEqual([{ type: "error", data: { message: "boom" } }]);
  });

  it("streamChat rejects before any event on a non-2xx response, using the JSON message", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue({
          ok: false,
          status: 500,
          json: async () => ({ message: "server down" }),
        })
    );
    await expect(streamChat({ question: "q", onEvent: () => {} })).rejects.toThrow(/server down/);
  });

  it("streamChat falls back to the status message when the error body is not JSON", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 502,
        json: async () => {
          throw new Error("nope");
        },
      })
    );
    await expect(streamChat({ question: "q", onEvent: () => {} })).rejects.toThrow(/HTTP 502/);
  });

  it("streamChat rejects when the response has no body", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, status: 200, body: null }));
    await expect(streamChat({ question: "q", onEvent: () => {} })).rejects.toThrow(
      /no response body/
    );
  });

  it("streamChat forwards sessionId/documentIds/history/attachments and maps citation score", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      body: sseBody([
        'data: {"type":"citation","documentId":"d1","title":"R","page":2,"score":0.9}\n\n',
      ]),
    });
    vi.stubGlobal("fetch", fetchMock);
    const events: ChatStreamEvent[] = [];
    await streamChat({
      question: "q",
      documentIds: ["d1"],
      history: [{ role: "user", content: "hi" }],
      sessionId: "s7",
      attachments: ["a1"],
      onEvent: (e) => events.push(e),
    });
    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.sessionId).toBe("s7");
    expect(body.attachments).toEqual(["a1"]);
    expect(body.documentIds).toEqual(["d1"]);
    expect(body.history).toEqual([{ role: "user", content: "hi" }]);
    expect(events[0]).toMatchObject({
      type: "citation",
      data: { documentId: "d1", page: 2, score: 0.9 },
    });
  });

  it("streamChat skips a malformed frame and continues with the next valid event", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        body: sseBody(["data: {not-json\n\n", 'data: {"type":"chunk","delta":"ok"}\n\n']),
      })
    );
    const events: ChatStreamEvent[] = [];
    await streamChat({ question: "q", onEvent: (e) => events.push(e) });
    expect(events).toEqual([{ type: "chunk", data: { delta: "ok" } }]);
  });

  it("uploadDocument posts text content and resolves the DTO", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue({
        ok: true,
        status: 201,
        json: async () => ({ id: "t1", title: "T", status: "ready" }),
      });
    vi.stubGlobal("fetch", fetchMock);
    expect(await uploadDocument({ title: "T", content: "hello" })).toMatchObject({ id: "t1" });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/documents");
    expect(JSON.parse(init.body)).toEqual({ title: "T", content: "hello" });
  });

  it("uploadDocumentFile posts multipart and throws the joined error message on failure", async () => {
    const file = new File(["x"], "a.pdf", { type: "application/pdf" });
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue({
          ok: false,
          status: 400,
          json: async () => ({ message: ["too big", "bad ext"] }),
        })
    );
    await expect(uploadDocumentFile(file, "A")).rejects.toThrow(/too big; bad ext/);
  });

  it("listDocuments / listSessions throw on non-2xx", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 500 }));
    await expect(listDocuments()).rejects.toThrow(/HTTP 500/);
    await expect(listSessions()).rejects.toThrow(/HTTP 500/);
  });
});
