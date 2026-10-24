import { useEffect, useState } from "react";
import { Link } from "react-router";
import { ArrowRight, FileText, FileWarning, Upload } from "lucide-react";
import { listDocuments, type Document } from "../lib/api";
import { getDocDisplayMeta } from "../lib/docMeta";
import { StatusBadge } from "../components/StatusBadge";

type Group = "ready" | "processing" | "error";

const SECTION_ORDER: { key: Group; label: string }[] = [
  { key: "ready", label: "Ready" },
  { key: "processing", label: "Processing" },
  { key: "error", label: "Errors" },
];

function Card({ doc }: { doc: Document }) {
  const meta = getDocDisplayMeta(doc);
  const isError = doc.status === "error";
  const isProcessing = doc.status === "processing";

  const subtitle =
    doc.status === "ready"
      ? `${meta.pages} pages · ${meta.sizeLabel} · ${meta.uploadedAt}`
      : doc.status === "processing"
        ? "Processing metadata…"
        : "Failed to extract text from PDF";

  return (
    <article
      className="flex flex-col gap-4 rounded-xl border bg-white/50 p-5 dark:bg-black/5"
      style={{ borderColor: "var(--muted)" }}
    >
      <div className="flex items-start justify-between">
        <div className="rounded-lg p-3" style={{ backgroundColor: "var(--muted)" }}>
          {isError ? (
            <FileWarning className="size-6" style={{ color: "var(--error)" }} />
          ) : (
            <FileText className="size-6" style={{ color: "var(--accent)" }} />
          )}
        </div>
        <StatusBadge status={doc.status} variant="solid" />
      </div>

      <div className="min-w-0">
        <h3 className="line-clamp-2 text-sm font-medium">
          <Link to={`/documents/${doc.id}`} className="hover:underline">
            {doc.title}
          </Link>
        </h3>
        <p
          className="mt-1 text-xs"
          style={isError ? { color: "var(--error)" } : { color: "var(--foreground)", opacity: 0.6 }}
        >
          {subtitle}
        </p>
      </div>

      <div className="mt-auto border-t pt-4" style={{ borderColor: "var(--muted)" }}>
        {doc.status === "ready" && (
          <Link
            to={`/chat?docId=${encodeURIComponent(doc.id)}`}
            className="inline-flex items-center gap-1 text-sm font-medium hover:underline"
            style={{ color: "var(--accent)" }}
          >
            Ask about this <ArrowRight className="size-4" />
          </Link>
        )}
        {isProcessing && (
          <span className="text-sm italic" style={{ color: "var(--foreground)", opacity: 0.5 }}>
            Indexing…
          </span>
        )}
        {isError && (
          <button
            type="button"
            className="text-sm font-medium hover:underline"
            style={{ color: "var(--accent)" }}
          >
            Retry upload
          </button>
        )}
      </div>
    </article>
  );
}

function Section({ label, docs }: { label: string; docs: Document[] }) {
  if (docs.length === 0) return null;
  return (
    <section className="space-y-4">
      <h2
        className="text-xs font-semibold uppercase tracking-wider"
        style={{ color: "var(--foreground)", opacity: 0.5 }}
      >
        {label}
      </h2>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {docs.map((doc) => (
          <Card key={doc.id} doc={doc} />
        ))}
      </div>
    </section>
  );
}

export function LibraryPage() {
  const [docs, setDocs] = useState<Document[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listDocuments()
      .then(setDocs)
      .catch((e) => setError(e instanceof Error ? e.message : String(e)));
  }, []);

  return (
    <main className="flex-1 w-full">
      <div className="mx-auto w-full max-w-4xl p-6">
        <header className="mb-10 flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Library</h1>
            <p className="mt-1 text-sm" style={{ color: "var(--foreground)", opacity: 0.6 }}>
              Upload PDFs to start asking questions across your documents.
            </p>
          </div>
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-opacity hover:opacity-90"
            style={{ backgroundColor: "var(--accent)", color: "#ffffff" }}
          >
            <Upload className="size-4" /> Upload PDF
          </button>
        </header>

        {error && (
          <p className="text-sm" style={{ color: "var(--error)" }}>
            Failed to load documents: {error}
          </p>
        )}

        {docs === null && !error && (
          <p className="text-sm" style={{ color: "var(--foreground)", opacity: 0.6 }}>
            Loading documents…
          </p>
        )}

        {docs !== null && docs.length === 0 && (
          <p className="text-sm">No documents yet.</p>
        )}

        {docs !== null && docs.length > 0 && (
          <div className="space-y-12">
            {SECTION_ORDER.map(({ key, label }) => (
              <Section
                key={key}
                label={label}
                docs={docs.filter((d) => d.status === key)}
              />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
