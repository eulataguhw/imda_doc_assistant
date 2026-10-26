import { describe, it, expect, beforeEach, vi } from "vitest";

// Force strictly-increasing millisecond timestamps so ordering assertions are deterministic
// (create/append calls otherwise land in the same ms and tie on updated_at).
function withClock(fn: () => void): void {
  let t = 1_700_000_000_000;
  vi.spyOn(Date, "now").mockImplementation(() => (t += 1000));
  try {
    fn();
  } finally {
    vi.restoreAllMocks();
  }
}
import { db } from "../lib/db";
import { SessionsService } from "./sessions.service";
import { NotFoundException } from "@nestjs/common";

// M8 (TEST-M8-1/2): session CRUD + server-side history. DB is isolated per file (vitest.setup.ts);
// each test clears the tables so assertions are deterministic regardless of worker sharing.
describe("SessionsService (M8 / API-M8-2,3)", () => {
  let svc: SessionsService;

  beforeEach(() => {
    db.prepare("DELETE FROM messages").run();
    db.prepare("DELETE FROM sessions").run();
    svc = new SessionsService();
  });

  it("creates a session with ISO timestamps and a trimmed title", () => {
    const s = svc.create("  My chat  ");
    expect(s.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
    expect(s.title).toBe("My chat");
    // ISO round-trips exactly; create sets created_at == updated_at.
    expect(new Date(s.createdAt).toISOString()).toBe(s.createdAt);
    expect(s.updatedAt).toBe(s.createdAt);
  });

  it("lists sessions most-recently-updated first", () => {
    withClock(() => {
      const a = svc.create("A");
      const b = svc.create("B");
      svc.appendMessage(b.id, "user", "hi"); // bumps B's updated_at past A
      expect(svc.list().map((x) => x.id)).toEqual([b.id, a.id]);
    });
  });

  it("returns a FLAT detail with messages ordered by created_at and parsed citations", () => {
    const s = svc.create("C");
    svc.appendMessage(s.id, "user", "q1");
    svc.appendMessage(s.id, "assistant", "a1", [{ documentId: "d1", title: "Doc One", page: 3 }]);
    svc.appendMessage(s.id, "user", "q2");

    const detail = svc.get(s.id);
    expect(detail.title).toBe("C");
    expect(detail.messages.length).toBe(3);
    expect(detail.messages.map((m) => m.role)).toEqual(["user", "assistant", "user"]);
    // assistant message carries its citations; user message has none.
    expect(detail.messages[1].citations).toEqual([{ documentId: "d1", title: "Doc One", page: 3 }]);
    expect(detail.messages[0].citations).toBeUndefined();
    // timestamps are ISO strings at the DTO boundary.
    expect(new Date(detail.createdAt).toISOString()).toBe(detail.createdAt);
  });

  it("stores citations as null for user messages (absent on read)", () => {
    const s = svc.create("D");
    svc.appendMessage(s.id, "user", "no cites");
    const raw = db
      .prepare("SELECT citations FROM messages WHERE session_id = ?")
      .get(s.id) as unknown as { citations: string | null };
    expect(raw.citations).toBeNull();
    expect(svc.get(s.id).messages[0].citations).toBeUndefined();
  });

  it("throws NotFoundException for a missing session", () => {
    expect(() => svc.get("does-not-exist")).toThrow(NotFoundException);
  });

  it("bumps updated_at on append so an older session can move to the front", () => {
    withClock(() => {
      const a = svc.create("A");
      const _b = svc.create("B");
      svc.appendMessage(a.id, "user", "reactivate A");
      expect(svc.list()[0].id).toBe(a.id);
    });
  });

  it("recentMessages returns the last N oldest→newest and drops empty/invalid rows", () => {
    const s = svc.create("E");
    for (let i = 1; i <= 8; i++) svc.appendMessage(s.id, i % 2 ? "user" : "assistant", `m${i}`);
    const recent = svc.recentMessages(s.id);
    expect(recent.length).toBe(6); // RECENT_CAP
    expect(recent[0].content).toBe("m3");
    expect(recent[5].content).toBe("m8");
    expect(recent.map((m) => m.role)).toEqual([
      "user",
      "assistant",
      "user",
      "assistant",
      "user",
      "assistant",
    ]);
  });
});
