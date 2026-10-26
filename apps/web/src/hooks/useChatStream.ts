import { useEffect, useRef, useState } from "react";
import {
  createSession,
  listSessions,
  streamChat,
  type ChatStreamEvent,
  type Document,
} from "../lib/api";
import { toast } from "../components/Toaster/Toaster";
import { loadSessionMessages, useSessionsStore } from "../lib/stores/sessions";
import type { Citation } from "../lib/types";

/** Generate a short unique id for client-only message rows. */
const uid = () => Math.random().toString(36).slice(2, 10);

interface UseChatStreamOptions {
  /** Single knowledge doc id to scope RAG to, or null for the whole corpus (M8 / WEB-M8-2). */
  scopeDocId: string | null;
  /** Chat-origin docs attached to this conversation — their ids ride along with each question. */
  attachments: Document[];
}

/**
 * Owns the chat streaming lifecycle and session navigation, backed by the global
 * `useSessionsStore` so the transcript survives route changes. The page keeps only
 * presentation-local state (composer text, attachment chips, drag state) here.
 *
 * Behavior is a faithful port of the previous inline logic in `ChatPage`: lazy
 * server-session creation on first message, progressive chunk streaming, citation
 * folding, graceful error surfacing, and AbortError tolerance on unmount/navigation.
 */
export function useChatStream({ scopeDocId, attachments }: UseChatStreamOptions) {
  const sessions = useSessionsStore((s) => s.sessions);
  const activeId = useSessionsStore((s) => s.activeId);
  const messages = useSessionsStore((s) => s.messages);

  /** True while an assistant stream is in flight (one at a time). */
  const [busy, setBusy] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    void useSessionsStore.getState().load();
    const controller = abortRef.current;
    return () => controller?.abort();
  }, []);

  /** Send a question: lazily create a server session, stream the answer, fold in citations/errors. */
  async function send(raw: string) {
    const text = raw.trim();
    if (!text || busy) return;

    /* Lazily create a server session on the first message of a fresh conversation. */
    let sessionId = useSessionsStore.getState().activeId;
    if (!sessionId) {
      try {
        const created = await createSession(text.slice(0, 60));
        sessionId = created.id;
        useSessionsStore.getState().addSession(created);
        useSessionsStore.getState().setActive(sessionId);
      } catch (e) {
        toast(
          "error",
          `Couldn't start a conversation — ${e instanceof Error ? e.message : String(e)}`
        );
      }
    }

    setBusy(true);
    const store = useSessionsStore.getState();
    store.appendMessage({ id: uid(), role: "user", text });
    const asstId = uid();
    store.appendMessage({ id: asstId, role: "assistant", text: "", streaming: true });

    const controller = new AbortController();
    abortRef.current = controller;

    const citations: Citation[] = [];
    let answer = "";
    let streamError: string | null = null;

    const onEvent = (event: ChatStreamEvent) => {
      if (event.type === "citation") {
        citations.push({
          doc: event.data.documentId,
          title: event.data.title,
          page: event.data.page,
        });
        useSessionsStore.getState().patchMessage(asstId, {
          citations: [...citations],
        });
      } else if (event.type === "chunk") {
        answer += event.data.delta;
        useSessionsStore.getState().patchMessage(asstId, {
          text: answer,
          citations: citations.length > 0 ? [...citations] : undefined,
        });
      } else if (event.type === "error") {
        streamError = event.data.message || "Unknown chat error";
      }
    };

    try {
      await streamChat({
        question: text,
        documentIds: attachments.length > 0 ? [] : scopeDocId ? [scopeDocId] : [],
        attachments: attachments.map((d) => d.id),
        /* sessionId drives server-side context + persistence (M8); `history` is retained as a client fallback in the API but omitted here. */
        sessionId: sessionId ?? undefined,
        onEvent,
        signal: controller.signal,
      });
      if (streamError) {
        toast("error", streamError);
        useSessionsStore.getState().patchMessage(asstId, {
          text: answer
            ? `${answer}\n\n— the answer stream ended early: ${streamError}`
            : `Sorry — the answer stream failed: ${streamError}`,
          streaming: false,
          citations: citations.length > 0 ? citations : undefined,
        });
      } else {
        useSessionsStore.getState().patchMessage(asstId, {
          text: answer || "No answer was generated.",
          streaming: false,
          citations: citations.length > 0 ? citations : undefined,
        });
      }
    } catch (e) {
      if (e instanceof DOMException && e.name === "AbortError") {
        /* unmount / navigation abort — leave the in-flight message as-is */
        return;
      }
      const message = e instanceof Error ? e.message : String(e);
      toast("error", message);
      useSessionsStore.getState().patchMessage(asstId, {
        text: `Sorry — the answer stream failed: ${message}`,
        streaming: false,
        citations: citations.length > 0 ? citations : undefined,
      });
    } finally {
      abortRef.current = null;
      setBusy(false);
      listSessions()
        .then((list) => useSessionsStore.getState().setSessions(list))
        .catch(() => {});
    }
  }

  /** Abandon the current stream and reset to an empty, fresh conversation (store side). */
  function newConversation() {
    abortRef.current?.abort();
    setBusy(false);
    useSessionsStore.getState().reset();
  }

  /** Load a past conversation's transcript and make it active. Returns success. */
  async function openSession(id: string): Promise<boolean> {
    if (id === useSessionsStore.getState().activeId) return true;
    abortRef.current?.abort();
    try {
      const loaded = await loadSessionMessages(id);
      useSessionsStore.getState().setActive(id);
      useSessionsStore.getState().setMessages(loaded);
      return true;
    } catch (e) {
      toast(
        "error",
        `Couldn't open that conversation — ${e instanceof Error ? e.message : String(e)}`
      );
      return false;
    }
  }

  return { sessions, activeId, messages, busy, send, newConversation, openSession };
}
