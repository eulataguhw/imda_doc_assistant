import { describe, it, expect } from "vitest";
import { db } from "../lib/db";

// M8 (TEST-M8-1): the migration in lib/db.ts is idempotent — guarded ALTER + CREATE TABLE IF NOT EXISTS.
// A fresh temp DB (see vitest.setup.ts) exercises a single clean application; we assert the resulting
// schema has each new column exactly once and the two new tables with their expected columns.
describe("M8 migration (TEST-M8-1)", () => {
  it("adds origin + content to documents exactly once (no duplicate columns)", () => {
    const cols = db.prepare("PRAGMA table_info(documents)").all() as unknown as Array<{ name: string }>;
    const names = cols.map((c) => c.name);
    expect(names.filter((n) => n === "origin")).toHaveLength(1);
    expect(names.filter((n) => n === "content")).toHaveLength(1);
  });

  it("creates sessions + messages tables with the expected columns", () => {
    const sess = db.prepare("PRAGMA table_info(sessions)").all() as unknown as Array<{ name: string }>;
    expect(sess.map((c) => c.name)).toEqual(expect.arrayContaining(["id", "title", "created_at", "updated_at"]));

    const msgs = db.prepare("PRAGMA table_info(messages)").all() as unknown as Array<{ name: string }>;
    expect(msgs.map((c) => c.name)).toEqual(
      expect.arrayContaining(["id", "session_id", "role", "content", "citations", "created_at"]),
    );
  });

  it("enforces the role CHECK (user/assistant only) on messages", () => {
    const sid = `mig-${Date.now()}`;
    db.prepare("INSERT INTO sessions (id, title, created_at, updated_at) VALUES (?, NULL, 0, 0)").run(sid);
    expect(() =>
      db.prepare("INSERT INTO messages (id, session_id, role, content, created_at) VALUES (?, ?, 'system', 'x', 0)").run(`m-${sid}`, sid),
    ).toThrow();
  });
});
