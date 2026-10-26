import { API_BASE, DocOrigin, DocStatus } from "./constants";

/** Document origin. In sync with the API's `documents.origin` enum (M8). */
export type DocumentOrigin = DocOrigin;

/** Document processing status, in sync with the API's document status enum. */
export type DocumentStatus = DocStatus;

export interface Document {
  id: string;
  title: string;
  /** Processing status; one of `ready` | `processing` | `error`. */
  status: DocumentStatus;
  /** Origin of the document (M8). Absent on legacy rows → treat as `knowledge` for filtering. */
  origin?: DocumentOrigin;
  errorReason?: string | null;
  /** Live indexing progress, present while `status === "processing"` (may be absent before queue pickup). */
  progress?: { stage: string; done: number; total: number };
  /** LLM-generated executive summary (2–4 sentences); absent on legacy rows. */
  summary?: string | null;
  /** Real page count (PDFs); null/absent for DOCX or rows indexed before M6. */
  pages?: number | null;
  /** File size in bytes; null/absent for text-content uploads or legacy rows. */
  sizeBytes?: number | null;
  /** ISO upload timestamp (API `created_at`); absent on very old responses. */
  createdAt?: string | null;
}

const BASE = API_BASE;

/**
 * GET /api/documents — live list with per-document status.
 * Pass `origin` to filter by knowledge vs chat (M8); omit for the full list (back-compat).
 */
export async function listDocuments(origin?: DocumentOrigin): Promise<Document[]> {
  const qs = origin ? `?origin=${encodeURIComponent(origin)}` : "";
  const res = await fetch(`${BASE}/documents${qs}`);
  if (!res.ok) throw new Error(`GET ${BASE}/documents → HTTP ${res.status}`);
  return (await res.json()) as Document[];
}

/**
 * DELETE /api/documents/:id — remove the row (and its Qdrant points for knowledge docs).
 * Resolves 204 on success; rejects on 404/other.
 */
export async function deleteDocument(id: string): Promise<void> {
  const res = await fetch(`${BASE}/documents/${encodeURIComponent(id)}`, { method: "DELETE" });
  if (res.status === 204) return;
  throw new Error(`DELETE ${BASE}/documents/${id} → HTTP ${res.status}`);
}

/**
 * POST /api/chat/documents — multipart file upload for chat-origin docs (M8).
 * The server extracts text directly and stores the document without embedding;
 * 201 returns `{id,title,pages}`. Resolve with the created Document-row shape.
 */
export async function uploadChatDocument(file: File, title?: string): Promise<Document> {
  const form = new FormData();
  form.append("file", file);
  if (title) form.append("title", title);
  const res = await fetch(`${BASE}/chat/documents`, { method: "POST", body: form });
  if (!res.ok)
    throw new Error(
      await postErrorMessage(res, `POST ${BASE}/chat/documents → HTTP ${res.status}`)
    );
  return (await res.json()) as Document;
}

/** Session metadata from `GET /api/chat/sessions` (M8). */
export interface ChatSession {
  id: string;
  title: string;
  /** ISO timestamp. */
  createdAt: string;
  /** ISO timestamp. */
  updatedAt: string;
}

/** One message in a session (M8). */
export interface ChatSessionMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  /** JSON-parsed array of `{documentId,title?,page?}` (M8); undefined for user messages. */
  citations?: { documentId: string; title?: string; page?: number }[];
  /** ISO timestamp. */
  createdAt: string;
}

/** GET /api/sessions/:id — a session with its ordered messages. */
export interface ChatSessionDetail {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messages: ChatSessionMessage[];
}

/** GET /api/chat/sessions — list, most-recent-first (M8). */
export async function listSessions(): Promise<ChatSession[]> {
  const res = await fetch(`${BASE}/chat/sessions`);
  if (!res.ok) throw new Error(`GET ${BASE}/chat/sessions → HTTP ${res.status}`);
  return (await res.json()) as ChatSession[];
}

/** POST /api/chat/sessions — create (optional title); returns the created session. */
export async function createSession(title?: string): Promise<ChatSession> {
  const res = await fetch(`${BASE}/chat/sessions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(title ? { title } : {}),
  });
  if (!res.ok)
    throw new Error(await postErrorMessage(res, `POST ${BASE}/chat/sessions → HTTP ${res.status}`));
  return (await res.json()) as ChatSession;
}

/** GET /api/chat/sessions/:id — session + ordered messages; 404 on unknown id. */
export async function getSession(id: string): Promise<ChatSessionDetail> {
  const res = await fetch(`${BASE}/chat/sessions/${encodeURIComponent(id)}`);
  if (!res.ok) throw new Error(`GET ${BASE}/chat/sessions/${id} → HTTP ${res.status}`);
  return (await res.json()) as ChatSessionDetail;
}

/** Shared error-message parsing for POST responses ({message: string | string[]} or raw text). */
async function postErrorMessage(res: Response, fallback: string): Promise<string> {
  let message = fallback;
  try {
    const data = (await res.json()) as { message?: string | string[] };
    if (typeof data?.message === "string") message = data.message;
    else if (Array.isArray(data?.message)) message = data.message.join("; ");
  } catch {
    /** Non-JSON error body — fall back to the HTTP status message. */
  }
  return message;
}

/** POST /api/documents — upload text content; resolves with the final document DTO. */
export async function uploadDocument(input: { title: string; content: string }): Promise<Document> {
  const res = await fetch(`${BASE}/documents`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok)
    throw new Error(await postErrorMessage(res, `POST ${BASE}/documents → HTTP ${res.status}`));
  return (await res.json()) as Document;
}

/** POST /api/documents/upload — multipart file upload (.pdf/.docx); resolves with the document DTO (status `processing` until indexing completes). */
export async function uploadDocumentFile(file: File, title?: string): Promise<Document> {
  const form = new FormData();
  form.append("file", file);
  if (title) form.append("title", title);
  const res = await fetch(`${BASE}/documents/upload`, { method: "POST", body: form });
  if (!res.ok)
    throw new Error(
      await postErrorMessage(res, `POST ${BASE}/documents/upload → HTTP ${res.status}`)
    );
  return (await res.json()) as Document;
}

/** One `citation` SSE event — a retrieved Qdrant point backing the answer. */
export interface ChatCitation {
  documentId: string;
  title: string;
  /** PDF page number (1-based); absent for DOCX and legacy points. */
  page?: number;
  score?: number;
}

export interface ChatHistoryMessage {
  role: "user" | "assistant";
  content: string;
}

export type ChatStreamEvent =
  | { type: "citation"; data: ChatCitation }
  | { type: "chunk"; data: { delta: string } }
  | { type: "done"; data: Record<string, unknown> }
  | { type: "error"; data: { message: string } };

/**
 * POST /api/chat/stream — RAG question over the document corpus.
 *
 * Parses the upstream SSE stream manually (split on `\n\n`, strip the
 * `data: ` prefix, JSON.parse each payload) and dispatches one `onEvent`
 * callback per `citation` / `chunk` / `done` / `error` event, in order.
 * Non-2xx responses reject before any event is emitted.
 */
export async function streamChat(params: {
  question: string;
  documentIds?: string[];
  history?: ChatHistoryMessage[];
  /** Server-side session id (M8). When set, the server loads the last N messages
   *  from `messages` as context and persists user+assistant after the stream
   *  completes. `history` is retained as a client-side fallback only. */
  sessionId?: string;
  /**
   * Chat-origin document ids to attach to the next message (M8 direct mode).
   * When non-empty, the server switches from RAG to direct mode: it emits one
   * `citation` event per attached doc and references the docs' full text as
   * context, with an inline `[1]…[n]` citation scheme. Takes precedence over
   * `documentIds` / RAG scope (M8 §6).
   */
  attachments?: string[];
  onEvent: (event: ChatStreamEvent) => void;
  signal?: AbortSignal;
}): Promise<void> {
  const res = await fetch(`${BASE}/chat/stream`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      question: params.question,
      documentIds: params.documentIds ?? [],
      history: params.history ?? [],
      ...(params.sessionId ? { sessionId: params.sessionId } : {}),
      ...(params.attachments && params.attachments.length > 0
        ? { attachments: params.attachments }
        : {}),
    }),
    signal: params.signal,
  });
  if (!res.ok)
    throw new Error(await postErrorMessage(res, `POST ${BASE}/chat/stream → HTTP ${res.status}`));
  if (!res.body) throw new Error("POST /api/chat/stream → no response body");

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    let sep = buffer.indexOf("\n\n");
    while (sep !== -1) {
      const frame = buffer.slice(0, sep);
      buffer = buffer.slice(sep + 2);
      sep = buffer.indexOf("\n\n");

      for (const rawLine of frame.split("\n")) {
        const line = rawLine.trimEnd();
        if (!line.startsWith("data:")) continue;
        const payload = line.slice(5).trim();
        if (!payload || payload === "[DONE]") continue;
        /** The API emits flat events; map each onto this client's nested event shape. */
        let parsed: Record<string, unknown>;
        try {
          parsed = JSON.parse(payload) as Record<string, unknown>;
        } catch {
          /** Defensive: skip a malformed frame rather than killing the whole stream. */
          continue;
        }
        if (parsed.type === "citation") {
          const data: ChatCitation = {
            documentId: String(parsed.documentId ?? ""),
            title: String(parsed.title ?? ""),
          };
          if (typeof parsed.page === "number") data.page = parsed.page;
          if (typeof parsed.score === "number") data.score = parsed.score;
          params.onEvent({ type: "citation", data });
        } else if (parsed.type === "chunk") {
          params.onEvent({ type: "chunk", data: { delta: String(parsed.delta ?? "") } });
        } else if (parsed.type === "done") {
          params.onEvent({ type: "done", data: {} });
        } else if (parsed.type === "error") {
          params.onEvent({
            type: "error",
            data: { message: String(parsed.reason ?? "Unknown chat error") },
          });
        }
      }
    }
  }
}
