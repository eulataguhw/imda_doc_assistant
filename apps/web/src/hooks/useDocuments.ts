import { useCallback } from "react";
import { deleteDocument, type Document, type DocumentOrigin } from "../lib/api";
import { selectByOrigin, useDocumentsStore } from "../lib/stores/documents";
import { toast } from "../components/Toaster/Toaster";

/**
 * Global document-library hook for one origin. Returns the shared (origin-filtered)
 * list plus load/remove actions that keep the store in sync and surface toasts.
 *
 * Selects the stable `documents` array from the store, then derives the filtered
 * slice in the render body — never returns a fresh array from the selector itself,
 * which would defeat useSyncExternalStore's snapshot caching.
 */
export function useDocuments(origin?: DocumentOrigin) {
  const all = useDocumentsStore((s) => s.documents);
  const loaded = useDocumentsStore((s) => s.loaded);
  const error = useDocumentsStore((s) => s.error);

  const documents = selectByOrigin(all, origin);

  const load = useCallback(() => useDocumentsStore.getState().load(), []);
  const refresh = useCallback(() => useDocumentsStore.getState().refresh(), []);

  const removeDocument = useCallback(async (doc: Pick<Document, "id" | "title">) => {
    try {
      await deleteDocument(doc.id);
      useDocumentsStore.getState().removeDocument(doc.id);
      toast("success", `Removed “${doc.title}”`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      toast("error", `Remove failed — ${msg}`);
      throw err; // let the caller reset its local "deleting" UI state
    }
  }, []);

  return { documents, loaded, error, load, refresh, removeDocument };
}
