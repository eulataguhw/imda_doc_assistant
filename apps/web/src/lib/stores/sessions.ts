import { create } from "zustand";
import { getSession, listSessions, type ChatSession } from "../api";
import type { Message } from "../types";

/**
 * Global conversation-history store (Zustand).
 *
 * Mirrors the previous per-page local state in `ChatPage` so that session history
 * and the active transcript survive route changes and can be shared with future
 * surfaces (e.g. a "recent" list on the knowledge page) without prop drilling.
 *
 * Model: one active transcript at a time (`messages`), matching the prior UI —
 * opening a session replaces it, "New conversation" clears it. `activeId` is the
 * id of the session currently shown (null = a fresh, not-yet-created conversation).
 */
interface SessionsState {
  /** Session metadata list, most-recent-first (from `GET /api/chat/sessions`). */
  sessions: ChatSession[];
  /** True once the initial session list has been fetched (success or failure). */
  loaded: boolean;
  /** Id of the currently displayed session; null while in a fresh conversation. */
  activeId: string | null;
  /** The visible transcript for `activeId`, newest last; empty when fresh. */
  messages: Message[];

  /** Fetch the session list once (idempotent). Safe to call on every mount. */
  load: () => Promise<void>;
  /** Replace the whole session list (e.g. after a send, to pick up new order/titles). */
  setSessions: (sessions: ChatSession[]) => void;
  /** Prepend a newly created session, deduped by id. */
  addSession: (session: ChatSession) => void;
  /** Switch which session is displayed without touching its messages. */
  setActive: (id: string | null) => void;
  /** Replace the active transcript (used when opening an existing session). */
  setMessages: (messages: Message[]) => void;
  /** Append a turn to the active transcript. */
  appendMessage: (message: Message) => void;
  /** Patch one message by id (streaming deltas, final citations, error text). */
  patchMessage: (id: string, patch: Partial<Message>) => void;
  /** Clear the active session + transcript for a fresh conversation. */
  reset: () => void;
}

export const useSessionsStore = create<SessionsState>()((set, get) => ({
  sessions: [],
  loaded: false,
  activeId: null,
  messages: [],

  async load() {
    if (get().loaded) return;
    try {
      set({ sessions: await listSessions(), loaded: true });
    } catch {
      // Leave the list empty but mark loaded so we don't hammer a downed API.
      set({ loaded: true });
    }
  },

  addSession(session) {
    set((s) => ({
      sessions: s.sessions.some((x) => x.id === session.id) ? s.sessions : [session, ...s.sessions],
    }));
  },

  setSessions(sessions) {
    set({ sessions });
  },

  setActive(id) {
    set({ activeId: id });
  },

  setMessages(messages) {
    set({ messages });
  },

  appendMessage(message) {
    set((s) => ({ messages: [...s.messages, message] }));
  },

  patchMessage(id, patch) {
    set((s) => ({ messages: s.messages.map((m) => (m.id === id ? { ...m, ...patch } : m)) }));
  },

  reset() {
    set({ activeId: null, messages: [] });
  },
}));

/**
 * Load a session's ordered messages from the API and stage them as the active
 * transcript. Returns the mapped `Message[]` so callers can also react to it.
 */
export async function loadSessionMessages(id: string): Promise<Message[]> {
  const detail = await getSession(id);
  const messages: Message[] = detail.messages.map((m) => ({
    id: m.id,
    role: m.role,
    text: m.content,
    citations: m.citations?.map((c) => ({ doc: c.documentId, title: c.title ?? "", page: c.page })),
  }));
  return messages;
}
