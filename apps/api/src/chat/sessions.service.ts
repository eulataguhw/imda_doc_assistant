import { Injectable, NotFoundException } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import { db } from "../lib/db";

// M8 (API-M8-2/3): session/message DTOs. Shapes mirror the web client's `api.ts` contract:
// timestamps are ISO strings; a session detail is FLAT ({id,title,createdAt,updatedAt,messages}).
export interface SessionDto {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
}

export interface MessageDto {
  id: string;
  role: "user" | "assistant";
  content: string;
  /** Citation refs the assistant drew on ({documentId,title?,page?}); absent for user messages. */
  citations?: Array<{ documentId: string; title?: string; page?: number }>;
  createdAt: string;
}

export interface SessionDetailDto {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messages: MessageDto[];
}

interface SessionRow {
  id: string;
  title: string | null;
  created_at: number;
  updated_at: number;
}

interface MessageRow {
  id: string;
  role: string;
  content: string;
  citations: string | null;
  created_at: number;
}

// Server-side history cap, kept in parity with chat.service's HISTORY_CAP.
const RECENT_CAP = 6;

const iso = (n: number): string => new Date(n).toISOString();

@Injectable()
export class SessionsService {
  /** Most-recently-updated sessions first (WEB-M8-1: revisit past conversations). */
  list(): SessionDto[] {
    const rows = db
      .prepare("SELECT id, title, created_at, updated_at FROM sessions ORDER BY updated_at DESC, rowid DESC")
      .all() as unknown as SessionRow[];
    return rows.map((r) => ({ id: r.id, title: r.title ?? "", createdAt: iso(r.created_at), updatedAt: iso(r.updated_at) }));
  }

  create(title?: string): SessionDto {
    const id = randomUUID();
    const now = Date.now();
    db.prepare("INSERT INTO sessions (id, title, created_at, updated_at) VALUES (?, ?, ?, ?)").run(
      id,
      title?.trim() || null,
      now,
      now,
    );
    return { id, title: title?.trim() ?? "", createdAt: iso(now), updatedAt: iso(now) };
  }

  get(id: string): SessionDetailDto {
    const s = db
      .prepare("SELECT id, title, created_at, updated_at FROM sessions WHERE id = ?")
      .get(id) as unknown as SessionRow | undefined;
    if (!s) throw new NotFoundException(`Session ${id} not found`);
    // rowid is a stable insertion-order tiebreaker for same-millisecond messages.
    const rows = db
      .prepare("SELECT id, role, content, citations, created_at FROM messages WHERE session_id = ? ORDER BY created_at ASC, rowid ASC")
      .all(id) as unknown as MessageRow[];
    return {
      id: s.id,
      title: s.title ?? "",
      createdAt: iso(s.created_at),
      updatedAt: iso(s.updated_at),
      messages: rows.map((m) => ({
        id: m.id,
        role: (m.role === "assistant" ? "assistant" : "user") as MessageDto["role"],
        content: m.content,
        ...(m.citations ? { citations: JSON.parse(m.citations) as MessageDto["citations"] } : {}),
        createdAt: iso(m.created_at),
      })),
    };
  }

  /** Append one message and bump the session's updated_at. */
  appendMessage(sessionId: string, role: "user" | "assistant", content: string, citations?: Array<{ documentId: string; title?: string; page?: number }>): void {
    const id = randomUUID();
    const now = Date.now();
    db.prepare("INSERT INTO messages (id, session_id, role, content, citations, created_at) VALUES (?, ?, ?, ?, ?, ?)").run(
      id,
      sessionId,
      role,
      content,
      citations && citations.length > 0 ? JSON.stringify(citations) : null,
      now,
    );
    db.prepare("UPDATE sessions SET updated_at = ? WHERE id = ?").run(now, sessionId);
  }

  /** Last-N messages for a session as chat context (oldest → newest). */
  recentMessages(sessionId: string): Array<{ role: "user" | "assistant"; content: string }> {
    const rows = db
      .prepare("SELECT role, content FROM messages WHERE session_id = ? ORDER BY created_at DESC, rowid DESC LIMIT ?")
      .all(sessionId, RECENT_CAP) as unknown as Array<{ role: string; content: string }>;
    return rows
      .reverse()
      .filter((m) => (m.role === "user" || m.role === "assistant") && typeof m.content === "string" && m.content.trim() !== "")
      .map((m) => ({ role: m.role as "user" | "assistant", content: m.content }));
  }
}
