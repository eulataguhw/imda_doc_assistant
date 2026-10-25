import { useEffect, useState, type FormEvent } from "react";
import { Link } from "react-router";
import { ArrowRight, FileText, FileWarning, Upload } from "lucide-react";
import { listDocuments, uploadDocument, type Document } from "../lib/api";
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
        : "Ingestion failed";

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

function UploadPanel({ onUploaded }: { onUploaded: () => void }) {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy) return;
    const t = title.trim();
    const c = content.trim();
    if (!t || !c) {
      setError("Provide both a title and some content before submitting.");
      return;
    }
    setError(null);
    setBusy(true);
    try {
      await uploadDocument({ title: t, content: c });
      onUploaded();
      setTitle("");
      setContent("");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mb-10 flex flex-col gap-4 rounded-xl border bg-white/50 p-5 dark:bg-black/5"
      style={{ borderColor: "var(--muted)" }}
    >
      <div>
        <h2
          className="text-xs font-semibold uppercase tracking-wider"
          style={{ color: "var(--foreground)", opacity: 0.5 }}
        >
          Add document
        </h2>
        <p className="mt-1 text-xs" style={{ color: "var(--foreground)", opacity: 0.6 }}>
          Paste the title and text content of a document to index it.
        </p>
      </div>

      <label className="flex flex-col gap-1.5 text-sm">
        <span style={{ color: "var(--foreground)", opacity: 0.6 }}>Title</span>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          disabled={busy}
          placeholder="Quarterly report"
          className="w-full rounded-md border bg-[var(--background)] px-3 py-2 text-sm"
          style={{ borderColor: "var(--muted)" }}
        />
      </label>

      <label className="flex flex-col gap-1.5 text-sm">
        <span style={{ color: "var(--foreground)", opacity: 0.6 }}>Content</span>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          disabled={busy}
          rows={5}
          placeholder="Paste the document text here…"
          className="w-full resize-y rounded-md border bg-[var(--background)] px-3 py-2 text-sm"
          style={{ borderColor: "var(--muted)" }}
        />
      </label>

      {error && (
        <p className="text-sm" style={{ color: "var(--error)" }}>
          {error}
        </p>
      )}

      <div>
        <button
          type="submit"
          disabled={busy}
          className="inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          style={{ backgroundColor: "var(--accent)", color: "#ffffff" }}
        >
          <Upload className="size-4" /> {busy ? "Adding…" : "Add document"}
        </button>
      </div>
    </form>
  );
}

export function LibraryPage() {
  const [docs, setDocs] = useState<Document[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = () => {
    setError(null);
    return listDocuments()
      .then(setDocs)
      .catch((e) => setError(e instanceof Error ? e.message : String(e)));
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- initial load only
  }, []);

  return (
    <main className="flex-1 w-full">
      <div className="mx-auto w-full max-w-4xl p-6">
        <header className="mb-6">
          <h1 className="text-2xl font-semibold tracking-tight">Library</h1>
          <p className="mt-1 text-sm" style={{ color: "var(--foreground)", opacity: 0.6 }}>
            Add documents to start asking questions across your library.
          </p>
        </header>

        <UploadPanel onUploaded={load} />

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
