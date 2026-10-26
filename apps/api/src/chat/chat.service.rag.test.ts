import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { db } from "../lib/db";
import { ChatService } from "./chat.service";

const enc = new TextEncoder();
afterEach(() => vi.unstubAllGlobals());

function stubFetch(handler: (url: string, init?: any) => unknown) {
  const mock = vi.fn(async (url: string, init?: any) => handler(url, init));
  vi.stubGlobal("fetch", mock);
  return mock;
}

const embedOk = () => ({
  ok: true,
  status: 200,
  json: async () => ({ data: [[0.1, 0.2]], usage: { prompt_tokens: 3, total_tokens: 3 } }),
});

describe("ChatService retrieval + prompt (API-M6-1/2/3/4)", () => {
  it("retrieve() embeds the question and returns top-k citations (global scope)", async () => {
    const svc = new ChatService();
    stubFetch((url) => {
      if (String(url).endsWith("/embeddings")) return embedOk();
      if (String(url).includes("/points/search"))
        return {
          ok: true,
          status: 200,
          json: async () => ({
            result: [
              {
                score: 0.91,
                payload: { document_id: "d1", title: "Doc A", page: 3, text: "chunk one" },
              },
              {
                score: 0.7,
                payload: { document_id: "d2", title: "Doc B", text: "no page (docx)" },
              },
            ],
          }),
        };
      throw new Error("unexpected fetch " + url);
    });

    const cites = await svc.retrieve("What is X?", []);
    expect(cites).toHaveLength(2);
    expect(cites[0]).toMatchObject({
      documentId: "d1",
      title: "Doc A",
      page: 3,
      score: 0.91,
      text: "chunk one",
    });
    expect("page" in cites[1]).toBe(false); // docx chunk carries no page
  });

  it("retrieve() scopes the Qdrant filter to the selected document ids", async () => {
    const svc = new ChatService();
    stubFetch((url, init) => {
      if (String(url).endsWith("/embeddings")) return embedOk();
      if (String(url).includes("/points/search")) {
        const body = JSON.parse(init.body);
        expect(body.limit).toBe(6); // TOP_K
        expect(body.filter).toEqual({
          must: [
            { key: "document_id", match: { value: "a" } },
            { key: "document_id", match: { value: "b" } },
          ],
        });
        return { ok: true, status: 200, json: async () => ({ result: [] }) };
      }
      throw new Error("unexpected fetch " + url);
    });

    await expect(svc.retrieve("q", ["a", "b"])).resolves.toEqual([]);
  });

  it("retrieve() throws when the search endpoint is not ok", async () => {
    const svc = new ChatService();
    stubFetch((url) =>
      String(url).endsWith("/embeddings")
        ? embedOk()
        : { ok: false, status: 503, statusText: "Service Unavailable" }
    );
    await expect(svc.retrieve("q", [])).rejects.toThrow(/Document search failed/);
  });

  it("buildMessages() grounds the system prompt in context and drops empty history", () => {
    const svc = new ChatService();
    const msgs = svc.buildMessages(
      "q",
      [
        { role: "user", content: "u1" },
        { role: "assistant", content: "a1" },
        { role: "user", content: "" },
      ],
      [{ documentId: "d", title: "T", score: 0.5, text: "ctx text" }]
    );
    expect(msgs[0].role).toBe("system");
    expect(msgs[0].content).toContain("[1] ctx text");
    expect(msgs.some((m) => m.content === "")).toBe(false);
    expect(msgs[msgs.length - 1]).toEqual({ role: "user", content: "q" });
  });

  it("buildMessages() states no context when retrieval is empty", () => {
    const svc = new ChatService();
    const msgs = svc.buildMessages("q", [], []);
    expect(msgs[0].content).toMatch(/No relevant context/i);
  });
});

describe("ChatService direct mode (API-CHAT-5)", () => {
  beforeEach(() => db.prepare("DELETE FROM documents").run());

  it("loadDirectContext() returns only chat docs with non-empty content", () => {
    db.prepare(
      "INSERT INTO documents (id,title,status,origin,content,pages) VALUES ('c1','Chat Doc','ready','chat','The body',5)"
    ).run();
    db.prepare(
      "INSERT INTO documents (id,title,status,origin,content) VALUES ('c2','Empty','ready','chat','   ')"
    ).run();
    db.prepare(
      "INSERT INTO documents (id,title,status,origin,content) VALUES ('k1','Knowledge','ready','knowledge','x')"
    ).run();

    const svc = new ChatService();
    expect(svc.loadDirectContext(["c1", "c2", "k1", 123 as any])).toEqual([
      { documentId: "c1", title: "Chat Doc", pages: 5, text: "The body" },
    ]);
  });

  it("buildMessagesDirect() cites attachments by bracket number, with a no-attachment fallback", () => {
    const svc = new ChatService();
    expect(
      svc.buildMessagesDirect(
        "q",
        [],
        [{ documentId: "c1", title: "Attach A", pages: 5, text: "body" }]
      )[0].content
    ).toContain("[1] Attach A");
    expect(svc.buildMessagesDirect("q", [], [])[0].content).toMatch(/No attached document/i);
  });
});

describe("ChatService streaming (API-M6-7)", () => {
  it("openCompletion() posts a streaming request and returns the response when ok", async () => {
    const svc = new ChatService();
    stubFetch((url) => {
      if (!String(url).includes("/chat/completions")) throw new Error("unexpected " + url);
      return { ok: true, status: 200, body: {} };
    });
    await expect(svc.openCompletion([{ role: "user", content: "hi" }])).resolves.toBeDefined();
  });

  it("openCompletion() throws before the first byte when the LLM is not ok", async () => {
    const svc = new ChatService();
    stubFetch(() => ({ ok: false, status: 429, statusText: "Too Many Requests" }));
    await expect(svc.openCompletion([{ role: "user", content: "hi" }])).rejects.toThrow(
      /Chat request failed/
    );
  });

  it("readDeltas() yields deltas, skips keep-alives/empty/non-JSON, and stops at [DONE]", async () => {
    const svc = new ChatService();
    const frames = [
      enc.encode('data: {"choices":[{"delta":{"content":"Hel"}}]}\n\n'),
      enc.encode(
        ': keep-alive\ndata: {"choices":[{"delta":{}}]}\n\ndata: {"choices":[{"delta":{"content":"lo"}}]}\n\n'
      ),
      enc.encode("data: not-json\n\ndata: [DONE]\n\n"),
    ];
    let i = 0;
    const reader = {
      read: async () =>
        i < frames.length ? { done: false, value: frames[i++] } : { done: true, value: undefined },
      releaseLock: vi.fn(),
    };
    const res = { body: { getReader: () => reader } } as any;

    const deltas: string[] = [];
    for await (const d of svc.readDeltas(res)) deltas.push(d);
    expect(deltas).toEqual(["Hel", "lo"]);
    expect(reader.releaseLock).toHaveBeenCalled();
  });

  it("readDeltas() returns immediately when there is no body", async () => {
    const svc = new ChatService();
    const deltas: string[] = [];
    for await (const d of svc.readDeltas({} as any)) deltas.push(d);
    expect(deltas).toEqual([]);
  });
});
