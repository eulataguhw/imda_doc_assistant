import { create } from "zustand";
import { listDocuments, type Document } from "../api";

/**
 * Global document-library store (M8). Single source of truth for the documents
 * shared across the Knowledge page (knowledge origin), the Library page (chat
 * origin) and the Chat scope picker. Pages select their origin slice via
 * `useDocuments(origin)`; mutations (add/remove) keep every consumer in sync.
 */
interface DocumentsState {
  /** Full library (all origins). Consumers filter by origin client-side. */
  documents: Document[];
  /** True once a list fetch has succeeded at least once. */
  loaded: boolean;
  /** Last load/refresh failure message; cleared on the next attempt. */
  error: string | null;

  /** Idempotent initial load — fetches the full library once; safe to call anywhere. */
  load: () => void;
  /** Force a fresh fetch (page mount + after mutations); always re-requests. */
  refresh: () => void;
  setDocuments: (docs: Document[]) => void;
  addDocument: (doc: Document) => void;
  removeDocument: (id: string) => void;
}

function errorMessage(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}

export const useDocumentsStore = create<DocumentsState>()((set, get) => ({
  documents: [],
  loaded: false,
  error: null,

  load() {
    if (get().loaded) return;
    set({ error: null });
    listDocuments()
      .then((docs) => set({ documents: docs, loaded: true, error: null }))
      .catch((e) => set({ error: errorMessage(e) }));
  },

  refresh() {
    set({ error: null });
    listDocuments()
      .then((docs) => set({ documents: docs, loaded: true, error: null }))
      .catch((e) => set({ error: errorMessage(e) }));
  },

  setDocuments(docs) {
    set({ documents: docs, loaded: true });
  },

  addDocument(doc) {
    const existing = get().documents;
    if (existing.some((d) => d.id === doc.id)) return;
    set({ documents: [doc, ...existing] });
  },

  removeDocument(id) {
    set({ documents: get().documents.filter((d) => d.id !== id) });
  },
}));

/** Filter the full library to one origin; docs without an explicit origin are treated as knowledge. */
export function selectByOrigin(docs: Document[], origin?: string): Document[] {
  if (!origin) return docs;
  const effective = (d: Document) => d.origin ?? "knowledge";
  return docs.filter((d) => effective(d) === origin);
}

/** Ready knowledge-origin documents — the RAG corpus available to chat. */
export function selectReadyKnowledge(docs: Document[]): Document[] {
  return docs.filter((d) => (d.origin ?? "knowledge") === "knowledge" && d.status === "ready");
}
