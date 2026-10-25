import { Injectable } from "@nestjs/common";
import { config } from "../lib/env";
import { db } from "../lib/db";
import { call, embedChunks } from "../documents/ingest";

export interface ChatCitation {
  documentId: string;
  title: string;
  /** Source PDF page (from the point payload); absent for DOCX chunks. */
  page?: number;
  score: number;
  text: string;
}

export interface HistoryMessage {
  role: "user" | "assistant";
  content: string;
}

/** M8 (API-CHAT-5): a chat-uploaded document served directly to the LLM (no RAG). */
export interface DirectDoc {
  documentId: string;
  title: string;
  pages?: number;
  text: string;
}

const TOP_K = 6; // API-M6-1
const HISTORY_CAP = 6; // API-M6-3: last 6 messages (3 user + 3 assistant)

@Injectable()
export class ChatService {
  private headers(): Record<string, string> {
    const h: Record<string, string> = { "content-type": "application/json" };
    // Provider-agnostic: Bearer auth only when a key is configured (API-M6-7).
    if (config.llmApiKey) h.authorization = `Bearer ${config.llmApiKey}`;
    return h;
  }

  /** API-M6-1/2: top_k=6 retrieval; scoped to the given document ids when non-empty. */
  async retrieve(question: string, documentIds: string[]): Promise<ChatCitation[]> {
    const [vector] = await embedChunks([question]);
    // with_payload is explicit: this Qdrant build omits payloads from search hits by default.
    const body: Record<string, unknown> = { vector, limit: TOP_K, with_payload: true };
    if (documentIds.length > 0) {
      // Bare payload keys (Qdrant >=1.7 filter shape), one must-clause per selected document.
      body.filter = { must: documentIds.map((id) => ({ key: "document_id", match: { value: id } })) };
    }
    const res = await call("Document search failed", `${config.qdrantBaseUrl}/collections/documents/points/search`, {
      method: "POST",
      headers: this.headers(),
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      throw new Error(`Document search failed: ${res.status} ${res.statusText}`);
    }
    const json = (await res.json()) as { result?: Array<{ score: number; payload?: Record<string, unknown> }> };
    return (json.result ?? []).map((p) => ({
      documentId: String(p.payload?.document_id ?? ""),
      title: String(p.payload?.title ?? ""),
      ...(typeof p.payload?.page === "number" ? { page: p.payload.page } : {}),
      score: p.score,
      text: String(p.payload?.text ?? ""),
    }));
  }

  /** API-M6-3/4: context-grounded prompt; history capped at last 6; empty retrieval still answers. */
  buildMessages(question: string, history: HistoryMessage[], context: ChatCitation[]): Array<{ role: string; content: string }> {
    const cleanHistory = history
      .filter((m) => (m.role === "user" || m.role === "assistant") && typeof m.content === "string" && m.content.trim() !== "")
      .slice(-HISTORY_CAP);
    const ctx = context.map((c, i) => `[${i + 1}] ${c.text}`).join("\n\n");
    const system = ctx
      ? `Answer the user's question using only the provided context. Reference context items by their bracket number where you draw on them. If the context is insufficient, say so briefly.\n\n${ctx}`
      : "No relevant context was found in the document corpus for this question. Answer briefly and clearly state that no supporting context was available.";
    return [{ role: "system", content: system }, ...cleanHistory, { role: "user", content: question }];
  }

  /** M8 (API-CHAT-5): load chat-origin documents by id for direct answering. Skips ids with no stored content. */
  loadDirectContext(attachments: string[]): DirectDoc[] {
    const stmt = db.prepare("SELECT id, title, content, pages FROM documents WHERE origin = 'chat' AND id = ?");
    const docs: DirectDoc[] = [];
    for (const id of attachments) {
      if (typeof id !== "string") continue;
      const row = stmt.get(id) as unknown as { id: string; title: string; content: string | null; pages: number | null } | undefined;
      if (row && typeof row.content === "string" && row.content.trim() !== "") {
        docs.push({ documentId: row.id, title: row.title, ...(row.pages != null ? { pages: row.pages } : {}), text: row.content });
      }
    }
    return docs;
  }

  /** M8 (API-CHAT-5): system prompt + history + question, citing attached documents by bracket number. */
  buildMessagesDirect(
    question: string,
    history: HistoryMessage[],
    docs: DirectDoc[],
  ): Array<{ role: string; content: string }> {
    const cleanHistory = history
      .filter((m) => (m.role === "user" || m.role === "assistant") && typeof m.content === "string" && m.content.trim() !== "")
      .slice(-HISTORY_CAP);
    const ctx = docs.map((d, i) => `[${i + 1}] ${d.title}:\n${d.text}`).join("\n\n");
    const system = ctx
      ? `Answer the user's question using only the attached document(s) below. Reference them by their bracket number [n] where you draw on them, and name the section or page where helpful. If an attachment does not contain the answer, say so briefly.\n\n${ctx}`
      : "No attached document was available for this question. Answer briefly and clearly state that no supporting attachment was provided.";
    return [{ role: "system", content: system }, ...cleanHistory, { role: "user", content: question }];
  }

  /** Opens a streaming chat completion; throws (→ JSON 502) before the first response byte. */
  async openCompletion(messages: Array<{ role: string; content: string }>): Promise<Response> {
    const body: Record<string, unknown> = {
      model: config.llmModel,
      messages,
      temperature: config.llmTemperature,
      max_tokens: config.llmMaxTokens,
      stream: true,
    };
    if (config.llmTopP != null) body.top_p = config.llmTopP; // omitted entirely when unset (API-M6-7)
    const res = await call("Chat request failed", `${config.llmBaseUrl}/chat/completions`, {
      method: "POST",
      headers: this.headers(),
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      throw new Error(`Chat request failed: ${res.status} ${res.statusText}`);
    }
    return res;
  }

  /** Yields content deltas from the OpenAI-compatible SSE stream (`data:` frames, `[DONE]` terminator). */
  async *readDeltas(res: Response): AsyncGenerator<string> {
    const reader = res.body?.getReader();
    if (!reader) return;
    const decoder = new TextDecoder();
    let buf = "";
    try {
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        let sep: number;
        while ((sep = buf.indexOf("\n")) >= 0) {
          const line = buf.slice(0, sep).trim();
          buf = buf.slice(sep + 1);
          if (!line.startsWith("data:")) continue; // skip keep-alives/comments
          const payload = line.slice(5).trim();
          if (payload === "[DONE]") return;
          try {
            const json = JSON.parse(payload) as { choices?: Array<{ delta?: { content?: string } }> };
            const delta = json.choices?.[0]?.delta?.content;
            if (delta) yield delta;
          } catch {
            // Non-JSON frame (e.g. blank keep-alive) — not a completion delta; skip.
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }
}
