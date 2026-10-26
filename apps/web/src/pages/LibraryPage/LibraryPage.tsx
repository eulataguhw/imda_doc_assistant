import { useEffect, useState } from "react";
import { Link } from "react-router";
import { FileText, MessageSquarePlus, Trash2 } from "lucide-react";
import { deleteDocument, type Document } from "../../lib/api";
import { getDocDisplayMeta } from "../../lib/docMeta";
import { DOC_ORIGIN, ROUTE_CHAT, documentRoute } from "../../lib/constants";
import { StatusBadge } from "../../components/StatusBadge/StatusBadge";
import { toast } from "../../components/Toaster/Toaster";
import { useDocuments } from "../../hooks/useDocuments";

/**
 * Card for a chat-origin document (M8 WEB-M8-9). These are files the user
 * dropped into the chat composer; they're stored in SQLite (no embedding) and
 * attached to a conversation. No "Ask about this" — that's RAG-scoped and lives
 * on the Knowledge page. Delete is supported (M8: remove documents from Library).
 */
function Card({ doc, onDeleted }: { doc: Document; onDeleted: () => void }) {
  const meta = getDocDisplayMeta(doc);
  const [deleting, setDeleting] = useState(false);

  const subtitle = [
    meta.pages != null ? `${meta.pages} pages` : null,
    meta.sizeLabel,
    meta.uploadedAt,
  ]
    .filter((part): part is string => Boolean(part))
    .join(" · ");

  async function handleDelete() {
    if (deleting) return;
    setDeleting(true);
    try {
      await deleteDocument(doc.id);
      toast("success", `Removed “${doc.title}”`);
      onDeleted();
    } catch (err) {
      toast("error", `Remove failed — ${err instanceof Error ? err.message : String(err)}`);
      setDeleting(false);
    }
  }

  return (
    <article
      className="flex flex-col gap-4 rounded-xl border bg-white/50 p-5 dark:bg-black/5"
      style={{ borderColor: "var(--muted)" }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="rounded-lg p-3" style={{ backgroundColor: "var(--muted)" }}>
          <FileText className="size-6" style={{ color: "var(--accent)" }} />
        </div>
        <div className="flex items-center gap-2">
          <StatusBadge status={doc.status} variant="solid" />
          <button
            type="button"
            aria-label={`Remove chat document: ${doc.title}`}
            onClick={handleDelete}
            disabled={deleting}
            className="rounded-md p-1.5 transition-opacity hover:opacity-80 disabled:cursor-not-allowed disabled:opacity-50"
            style={{ color: "var(--text-secondary)" }}
          >
            <Trash2 className="size-4" />
          </button>
        </div>
      </div>

      <div className="min-w-0">
        <h3 className="line-clamp-2 text-sm font-medium">
          <Link to={documentRoute(doc.id)} className="hover:underline">
            {doc.title}
          </Link>
        </h3>
        {subtitle && (
          <p className="mt-1 text-xs" style={{ color: "var(--text-secondary)" }}>
            {subtitle}
          </p>
        )}
      </div>
    </article>
  );
}

/** Presentational loading placeholder — hidden from AT; a single sr-only label is announced instead. */
function SkeletonRows() {
  return (
    <div aria-hidden="true" className="grid grid-cols-1 gap-4 md:grid-cols-2">
      {[0, 1].map((i) => (
        <div
          key={i}
          className="flex items-center gap-3 rounded-xl border bg-white/50 p-4 dark:bg-black/5"
          style={{ borderColor: "var(--muted)" }}
        >
          <div
            className="size-10 shrink-0 rounded-lg"
            style={{ backgroundColor: "var(--muted)" }}
          />
          <div className="flex-1 space-y-2">
            <div className="h-3 w-1/3 rounded" style={{ backgroundColor: "var(--muted)" }} />
            <div className="h-3 w-1/2 rounded" style={{ backgroundColor: "var(--muted)" }} />
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * Library page (M8 WEB-M8-9) — lists ONLY chat-origin documents (`origin=chat`),
 * i.e. files the user dropped into the chat composer. No upload dropzone here:
 * uploads happen inline in the Chat composer and land in this list. Delete is
 * supported per document.
 */
export function LibraryPage() {
  /* Shared library store (chat origin) — single source of truth across pages. */
  const { documents: docs, loaded, error, refresh } = useDocuments(DOC_ORIGIN.chat);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return (
    <div className="flex-1 w-full">
      <div className="mx-auto w-full max-w-4xl p-6">
        <header className="mb-6">
          <h1 className="text-2xl font-semibold tracking-tight">Library</h1>
          <p className="mt-1 text-sm" style={{ color: "var(--text-secondary)" }}>
            Documents you've uploaded in chat. They attach to your conversations and are cited
            inline.
          </p>
        </header>

        {error && (
          <div
            role="alert"
            className="mb-6 flex flex-col gap-3 rounded-lg border p-4 text-sm sm:flex-row sm:items-center sm:justify-between"
            style={{ borderColor: "var(--error)", color: "var(--error)" }}
          >
            <p>Failed to load library documents: {error}</p>
            <button
              type="button"
              onClick={refresh}
              className="shrink-0 rounded-md px-3 py-1.5 font-medium"
              style={{ backgroundColor: "var(--error)", color: "var(--badge-solid-text)" }}
            >
              Retry
            </button>
          </div>
        )}

        {!loaded && !error && (
          <>
            <span className="sr-only">Loading library documents…</span>
            <SkeletonRows />
          </>
        )}

        {loaded && docs.length === 0 && (
          <div
            className="flex flex-col items-center gap-3 rounded-xl border border-dashed p-10 text-center"
            style={{ borderColor: "var(--muted)" }}
          >
            <MessageSquarePlus className="size-8" style={{ color: "var(--text-secondary)" }} />
            <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
              No documents uploaded in chat yet.
            </p>
            <Link
              to={ROUTE_CHAT}
              className="text-sm font-medium hover:underline"
              style={{ color: "var(--accent)" }}
            >
              Open a conversation and drag & drop a PDF or DOCX into the composer →
            </Link>
          </div>
        )}

        {loaded && docs.length > 0 && (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {docs.map((doc) => (
              <Card key={doc.id} doc={doc} onDeleted={refresh} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
