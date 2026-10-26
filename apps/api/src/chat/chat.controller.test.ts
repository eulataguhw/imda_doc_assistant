import { describe, it, expect, vi } from "vitest";
import { BadRequestException } from "@nestjs/common";
import { ChatController } from "./chat.controller";

function makeServices() {
  const chat = {
    retrieve: vi.fn().mockResolvedValue([]),
    openCompletion: vi.fn(),
    buildMessages: vi.fn((q: string) => [{ role: "user", content: q }]),
    buildMessagesDirect: vi.fn((q: string) => [{ role: "user", content: q }]),
    loadDirectContext: vi.fn().mockReturnValue([]),
    readDeltas: vi.fn(),
  };
  const sessions = {
    list: vi.fn().mockReturnValue([]),
    create: vi.fn((t?: string) => ({ id: "s1", title: t ?? "untitled" })),
    get: vi.fn().mockReturnValue({ id: "s1", messages: [] }),
    recentMessages: vi.fn().mockReturnValue([]),
    appendMessage: vi.fn(),
  };
  const documents = { uploadChat: vi.fn().mockResolvedValue({ id: "d1" }) };
  return { chat, sessions, documents };
}

function mockRes() {
  const written: string[] = [];
  const res = {
    status: vi.fn(function (this: any) {
      return this;
    }),
    json: vi.fn(function (this: any) {
      return this;
    }),
    setHeader: vi.fn(),
    flushHeaders: vi.fn(),
    write: vi.fn((s: string) => {
      written.push(s);
      return true;
    }),
    end: vi.fn(),
  };
  return { res, written };
}

const req = (body: unknown): any => ({ body, on: vi.fn() });

describe("ChatController session + upload endpoints (API-M8-2/4)", () => {
  it("exposes session CRUD through the service", () => {
    const s = makeServices();
    const c = new ChatController(s.chat as any, s.sessions as any, s.documents as any);

    c.listSessions();
    expect(s.sessions.list).toHaveBeenCalled();

    c.createSession({ title: "My convo" });
    expect(s.sessions.create).toHaveBeenLastCalledWith("My convo");
    c.createSession({});
    expect(s.sessions.create).toHaveBeenLastCalledWith(undefined);

    c.getSession("s9");
    expect(s.sessions.get).toHaveBeenCalledWith("s9");
  });

  it("uploadChatDocument requires a file and forwards an optional title", async () => {
    const s = makeServices();
    const c = new ChatController(s.chat as any, s.sessions as any, s.documents as any);

    await expect(c.uploadChatDocument({ body: {} } as any, undefined)).rejects.toThrow(
      BadRequestException
    );

    await c.uploadChatDocument({ body: { title: "My Note" } } as any, {
      buffer: Buffer.from("x"),
      originalname: "n.pdf",
    });
    expect(s.documents.uploadChat).toHaveBeenCalledWith(Buffer.from("x"), "n.pdf", "My Note");
  });
});

describe("ChatController.stream (API-M6-1/3, API-CHAT-5, API-M8-4)", () => {
  it("rejects an empty question with 400", async () => {
    const s = makeServices();
    const c = new ChatController(s.chat as any, s.sessions as any, s.documents as any);
    const { res } = mockRes();
    await c.stream(req({ question: "   " }), res as any);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it("rejects a non-array documentIds with 400", async () => {
    const s = makeServices();
    const c = new ChatController(s.chat as any, s.sessions as any, s.documents as any);
    const { res } = mockRes();
    await c.stream(req({ question: "hi", documentIds: "d1" }), res as any);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it("rejects a non-array attachments with 400", async () => {
    const s = makeServices();
    const c = new ChatController(s.chat as any, s.sessions as any, s.documents as any);
    const { res } = mockRes();
    await c.stream(req({ question: "hi", attachments: "a1" }), res as any);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it("returns 502 when the LLM cannot be reached", async () => {
    const s = makeServices();
    s.chat.openCompletion.mockRejectedValue(new Error("ECONNREFUSED"));
    const c = new ChatController(s.chat as any, s.sessions as any, s.documents as any);
    const { res } = mockRes();
    await c.stream(req({ question: "hi" }), res as any);
    expect(res.status).toHaveBeenCalledWith(502);
  });

  it("streams citations then chunks and persists the exchange when a session is present", async () => {
    const s = makeServices();
    s.chat.retrieve.mockResolvedValue([{ documentId: "d1", title: "Doc A", page: 2, score: 0.9 }]);
    s.chat.openCompletion.mockResolvedValue({ body: { cancel: vi.fn() } });
    s.chat.readDeltas.mockReturnValue(
      (async function* () {
        yield "Hel";
        yield "lo; ";
      })()
    );

    const c = new ChatController(s.chat as any, s.sessions as any, s.documents as any);
    const { res, written } = mockRes();
    await c.stream(req({ question: "What is X?", sessionId: "s1" }), res as any);

    expect(s.sessions.recentMessages).toHaveBeenCalledWith("s1");
    expect(s.chat.retrieve).toHaveBeenCalledWith("What is X?", []);
    const payload = written.join("");
    expect(payload).toMatch(/"type":"citation"/);
    expect(payload).toContain("Doc A");
    expect(payload).toMatch(/"type":"chunk"/);
    expect(payload).toMatch(/"type":"done"/);

    // The full assistant answer is persisted for the session (API-M8-4).
    const calls = s.sessions.appendMessage.mock.calls;
    expect(calls[0]).toEqual(["s1", "user", "What is X?"]);
    expect(calls[1][2]).toBe("Hello; "); // accumulated fullText
  });

  it("uses direct mode when attachments are present (no RAG retrieval)", async () => {
    const s = makeServices();
    s.chat.loadDirectContext.mockReturnValue([{ documentId: "a1", title: "Attach A", pages: 5 }]);
    s.chat.openCompletion.mockResolvedValue({ body: { cancel: vi.fn() } });
    s.chat.readDeltas.mockReturnValue(
      (async function* () {
        yield "ok";
      })()
    );

    const c = new ChatController(s.chat as any, s.sessions as any, s.documents as any);
    const { res, written } = mockRes();
    await c.stream(req({ question: "Summarize", attachments: ["a1"] }), res as any);

    expect(s.chat.loadDirectContext).toHaveBeenCalledWith(["a1"]);
    expect(s.chat.buildMessagesDirect).toHaveBeenCalled();
    expect(s.chat.retrieve).not.toHaveBeenCalled();
    const payload = written.join("");
    expect(payload).toMatch(/"type":"citation"/);
    expect(payload).toContain("Attach A");
  });

  it("emits an SSE error event when the stream fails mid-flight", async () => {
    const s = makeServices();
    s.chat.openCompletion.mockResolvedValue({ body: { cancel: vi.fn() } });
    s.chat.readDeltas.mockImplementation(function* () {
      yield "partial";
      throw new Error("stream broke");
    });

    const c = new ChatController(s.chat as any, s.sessions as any, s.documents as any);
    const { res, written } = mockRes();
    await c.stream(req({ question: "hi" }), res as any);

    expect(written.join("")).toMatch(/"type":"error"/);
    expect(res.end).toHaveBeenCalled();
  });
});
