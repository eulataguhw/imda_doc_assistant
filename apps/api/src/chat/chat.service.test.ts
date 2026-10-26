import { describe, it, expect, beforeEach } from "vitest";
import { db } from "../lib/db";
import { ChatService } from "./chat.service";

// M8 (TEST-M8-1): direct-mode answering — buildMessagesDirect (pure prompt builder) and
// loadDirectContext (DB read of chat-origin docs). No Qdrant/LLM network is touched here.
describe("ChatService direct mode (M8 / API-CHAT-5)", () => {
  let svc: ChatService;

  beforeEach(() => {
    db.prepare("DELETE FROM documents").run();
    svc = new ChatService();
  });

  it("builds system + history + question, citing each attached doc by bracket number", () => {
    const docs = [
      { documentId: "d1", title: "Annual Report", text: "Revenue grew 20%." },
      { documentId: "d2", title: "HR Policy", text: "Remote work allowed.", pages: 5 },
    ];
    const history = [
      { role: "user" as const, content: "prev q" },
      { role: "assistant" as const, content: "prev a" },
    ];

    const msgs = svc.buildMessagesDirect("What changed?", history, docs);
    expect(msgs[0].role).toBe("system");
    expect(msgs[0].content).toContain("[1] Annual Report:");
    expect(msgs[0].content).toContain("[2] HR Policy:");
    expect(msgs.at(-1)).toEqual({ role: "user", content: "What changed?" });
    // history preserved in order between the system prompt and the question.
    expect(msgs.map((m) => m.role)).toEqual(["system", "user", "assistant", "user"]);
  });

  it("falls back to a no-attachment prompt when docs is empty", () => {
    const msgs = svc.buildMessagesDirect("Q", [], []);
    expect(msgs[0].role).toBe("system");
    expect(msgs[0].content).toMatch(/No attached document/);
  });

  it("caps history at the last 6 messages", () => {
    const history = Array.from({ length: 10 }, (_, i) => ({
      role: (i % 2 ? "assistant" : "user") as "user" | "assistant",
      content: `m${i}`,
    }));
    const msgs = svc.buildMessagesDirect("Q", history, [
      { documentId: "d", title: "T", text: "X" },
    ]);
    // system + 6 (capped) + user = 8.
    expect(msgs.length).toBe(8);
  });

  it("loadDirectContext returns only chat-origin docs that have stored content", () => {
    db.prepare(
      "INSERT INTO documents (id, title, status, origin, content, pages) VALUES (?, ?, 'ready', 'chat', ?, ?)"
    ).run("chat-1", "Chat Doc", "Hello from the chat doc.", 2);
    db.prepare(
      "INSERT INTO documents (id, title, status, origin, content) VALUES (?, ?, 'ready', 'knowledge', ?)"
    ).run("know-1", "Knowledge Doc", "Should be excluded by origin.");
    db.prepare(
      "INSERT INTO documents (id, title, status, origin, content) VALUES (?, ?, 'ready', 'chat', NULL)"
    ).run("chat-empty", "Empty Chat Doc");

    const docs = svc.loadDirectContext(["chat-1", "know-1", "chat-empty", "missing"]);
    expect(docs.map((d) => d.documentId)).toEqual(["chat-1"]);
    expect(docs[0].text).toBe("Hello from the chat doc.");
    expect(docs[0].pages).toBe(2);
  });
});
