import { useEffect, useState } from "react";
import { Link, useParams } from "react-router";
import { ArrowLeft, ArrowRight, FileText, FileWarning } from "lucide-react";
import { listDocuments, type Document } from "../lib/api";
import { getDocDisplayMeta } from "../lib/docMeta";
import { StatusBadge } from "../components/StatusBadge";

function BackLink({ to, label }: { to: string; label: string }) {
  return (
    <Link
      to={to}
      className="inline-flex items-center gap-1.5 text-sm font-medium transition-opacity hover:opacity-80"
      style={{ color: "var(--accent)" }}
    >
      <ArrowLeft className="size-4" /> {label}
    </Link>
  );
}

export function DocumentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [doc, setDoc] = useState<Document | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listDocuments()
      .then((docs) => {
        const found = docs.find((d) => d.id === id) ?? null;
        if (found) setDoc(found);
        else setNotFound(true);
      })
      .catch((e) => setError(e instanceof Error ? e.message : String(e)));
  }, [id]);

  if (error || notFound) {
    return (
      <main className="flex-1 mx-auto w-full max-w-4xl p-6">
        <div className="space-y-3">
          <BackLink to="/knowledge" label="Back to knowledge" />
          <h1 className="text-xl font-semibold">{notFound ? "Not found" : "Document"}</h1>
          {error && (
            <p style={{ color: "var(--error)" }}>Failed to load: {error}</p>
          )}
          {notFound && !error && (
            <p>No document with id "{id}".</p>
          )}
        </div>
      </main>
    );
  }

  if (!doc) {
    return (
      <main className="flex-1 mx-auto w-full max-w-4xl p-6">
        <div className="space-y-3">
          <BackLink to="/knowledge" label="Back to knowledge" />
          <h1 className="text-xl font-semibold">Document</h1>
          <p style={{ color: "var(--text-secondary)" }}>Loading…</p>
        </div>
      </main>
    );
  }

  const meta = getDocDisplayMeta(doc);
  const isError = doc.status === "error";

  return (
    <main className="flex-1 mx-auto w-full max-w-4xl p-6">
      {doc.origin === "chat" ? (
        <BackLink to="/library" label="Back to library" />
      ) : (
        <BackLink to="/knowledge" label="Back to knowledge" />
      )}

      {/* Header: file icon + title + status/metadata */}
      <section className="mb-10 mt-6 flex items-start gap-6">
        <div
          className="flex h-24 w-24 shrink-0 items-center justify-center rounded-2xl"
          style={{ backgroundColor: "var(--muted)" }}
        >
          {isError ? (
            <FileWarning className="size-10" style={{ color: "var(--error)" }} />
          ) : (
            <FileText className="size-10" style={{ color: "var(--text-secondary)" }} />
          )}
        </div>

        <div className="min-w-0 flex-1">
          <h1 className="mb-3 break-words text-3xl font-semibold tracking-tight">{doc.title}</h1>

          <div
            className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm"
            style={{ color: "var(--text-secondary)" }}
          >
            <StatusBadge status={doc.status} variant="soft" />
            {isError ? (
              <span style={{ color: "var(--error)" }}>
                {doc.errorReason ?? "Ingestion failed — see API logs."}
              </span>
            ) : (
              <>
                {/* Real API fields only; DOCX/legacy rows hide what the API can't provide. */}
                {meta.pages != null && (
                  <>
                    <span aria-hidden>•</span>
                    <span>{meta.pages} pages</span>
                  </>
                )}
                {meta.sizeLabel && (
                  <>
                    <span aria-hidden>•</span>
                    <span>{meta.sizeLabel}</span>
                  </>
                )}
                <span aria-hidden>•</span>
                <span>Uploaded {meta.uploadedAt}</span>
              </>
            )}
          </div>

          <div
            className="mt-4 font-mono text-xs uppercase tracking-wider"
            style={{ color: "var(--text-secondary)" }}
          >
            ID: {doc.id}
          </div>
        </div>
      </section>

      {/* Primary action → doc-scoped chat */}
      <section className="mb-10 flex flex-col items-center gap-4 sm:flex-row">
        <Link
          to={`/chat?docId=${encodeURIComponent(doc.id)}`}
          className="inline-flex w-full items-center justify-center gap-2 rounded-lg px-6 py-3 text-base font-medium shadow-sm transition-opacity hover:opacity-90 sm:w-auto"
          style={{ backgroundColor: "var(--accent)", color: "#ffffff" }}
        >
          Ask about this document <ArrowRight className="size-5" />
        </Link>
      </section>

      {/* Content preview */}
      <div className="space-y-3">
        <div
          className="flex items-center justify-between px-1 text-xs font-semibold uppercase tracking-wider"
          style={{ color: "var(--text-secondary)" }}
        >
          <span>Preview</span>
          <span>Extracted Content</span>
        </div>
        <div
          className="overflow-hidden rounded-xl border bg-[var(--background)]"
          style={{ borderColor: "var(--muted)" }}
        >
          <div className="custom-scrollbar max-h-64 overflow-y-auto p-6">
            <p
              className="text-sm leading-relaxed"
              // Full-opacity --error and the AA-passing --text-secondary replace old opacity blends (M7 / WEB-M7-4).
              style={isError ? { color: "var(--error)" } : { color: "var(--text-secondary)" }}
            >
              {meta.excerpt}
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
