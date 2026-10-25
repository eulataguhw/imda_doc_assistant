import { useEffect, useRef, useState } from "react";
import { Link } from "react-router";
import { ArrowRight, FileText, FileWarning, Trash2, Upload } from "lucide-react";
import { deleteDocument, listDocuments, uploadDocumentFile, type Document } from "../lib/api";
import { getDocDisplayMeta } from "../lib/docMeta";
import { StatusBadge } from "../components/StatusBadge";
import { toast } from "../components/Toaster";

type Group = "ready" | "processing" | "error";

const ACCEPTED_EXTENSIONS = [".pdf", ".docx"];
// PONYTAIL: client-side 10 MB cap mirrors the server's MAX_UPLOAD_MB env var —
// ceiling: UI convenience only; the API is the source of truth and re-validates.
// upgrade: fetch the limit from the server if it becomes per-deployment config.
const MAX_UPLOAD_MB = 10;
const UPLOAD_CONCURRENCY = 2;

function validateFile(file: File): string | null {
  const dot = file.name.lastIndexOf(".");
  const ext = dot === -1 ? "" : file.name.slice(dot).toLowerCase();
  if (!ACCEPTED_EXTENSIONS.includes(ext)) return "unsupported type";
  if (file.size > MAX_UPLOAD_MB * 1024 * 1024) return `too large (max ${MAX_UPLOAD_MB} MB)`;
  return null;
}

function progressLabel(doc: Document): string {
  return doc.progress
    ? `${doc.progress.stage} ${doc.progress.done}/${doc.progress.total} chunks`
    : "Indexing…";
}

const SECTION_ORDER: { key: Group; label: string }[] = [
  { key: "ready", label: "Ready" },
  { key: "processing", label: "Processing" },
  { key: "error", label: "Errors" },
];

/**
 * Card for a knowledge-origin RAG document (M8 WEB-M8-8). Adds a per-doc Delete
 * button to the prior Library card; the delete handler removes the row + Qdrant
 * points server-side and re-fetches the list, with an error toast on failure.
 */
function Card({ doc, onDeleted }: { doc: Document; onDeleted: () => void }) {
  const meta = getDocDisplayMeta(doc);
  const isError = doc.status === "error";
  const isProcessing = doc.status === "processing";
  const [deleting, setDeleting] = useState(false);

  const subtitle =
    doc.status === "ready"
      ? [meta.pages != null ? `${meta.pages} pages` : null, meta.sizeLabel, meta.uploadedAt]
          .filter((part): part is string => Boolean(part))
          .join(" · ")
      : doc.status === "processing"
        ? progressLabel(doc)
        : "Ingestion failed";

  async function handleDelete() {
    if (deleting) return;
    setDeleting(true);
    try {
      await deleteDocument(doc.id);
      toast("success", `Deleted “${doc.title}”`);
      onDeleted();
    } catch (err) {
      toast("error", `Delete failed — ${err instanceof Error ? err.message : String(err)}`);
      setDeleting(false);
    }
  }

  const ariaLabel = `Delete knowledge document: ${doc.title}`;

  return (
    <article
      className="flex flex-col gap-4 rounded-xl border bg-white/50 p-5 dark:bg-black/5"
      style={{ borderColor: "var(--muted)" }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="rounded-lg p-3" style={{ backgroundColor: "var(--muted)" }}>
          {isError ? (
            <FileWarning className="size-6" style={{ color: "var(--error)" }} />
          ) : (
            <FileText className="size-6" style={{ color: "var(--accent)" }} />
          )}
        </div>
        <div className="flex items-center gap-2">
          <StatusBadge status={doc.status} variant="solid" />
          <button
            type="button"
            aria-label={ariaLabel}
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
          <Link to={`/documents/${doc.id}`} className="hover:underline">
            {doc.title}
          </Link>
        </h3>
        <p
          className="mt-1 text-xs"
          style={isError ? { color: "var(--error)" } : { color: "var(--text-secondary)" }}
        >
          {subtitle}
        </p>
      </div>

      <div className="mt-auto flex items-center justify-between border-t pt-4" style={{ borderColor: "var(--muted)" }}>
        {doc.status === "ready" ? (
          <Link
            to={`/chat?docId=${encodeURIComponent(doc.id)}`}
            className="inline-flex items-center gap-1 text-sm font-medium hover:underline"
            style={{ color: "var(--accent)" }}
          >
            Ask about this <ArrowRight className="size-4" />
          </Link>
        ) : isProcessing ? (
          <span className="text-sm italic" style={{ color: "var(--text-secondary)" }}>
            {progressLabel(doc)}
          </span>
        ) : (
          <span className="text-sm italic" style={{ color: "var(--text-secondary)" }}>
            See API logs for the failure reason.
          </span>
        )}
        {deleting && (
          <span className="text-xs italic" style={{ color: "var(--text-secondary)" }}>
            Deleting…
          </span>
        )}
      </div>
    </article>
  );
}

function Section({ label, docs, onDeleted }: { label: string; docs: Document[]; onDeleted: () => void }) {
  if (docs.length === 0) return null;
  return (
    <section className="space-y-4">
      <h2
        className="text-xs font-semibold uppercase tracking-wider"
        style={{ color: "var(--text-secondary)" }}
      >
        {label}
      </h2>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {docs.map((doc) => (
          <Card key={doc.id} doc={doc} onDeleted={onDeleted} />
        ))}
      </div>
    </section>
  );
}

function Dropzone({ onUploaded }: { onUploaded: () => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [upload, setUpload] = useState<{ done: number; total: number } | null>(null);

  async function handleFiles(selected: File[]) {
    if (upload) return;

    const valid: File[] = [];
    for (const file of selected) {
      const reason = validateFile(file);
      if (reason) toast("error", `${file.name} — ${reason}`);
      else valid.push(file);
    }
    if (valid.length === 0) return;

    let done = 0;
    setUpload({ done: 0, total: valid.length });
    const queue = [...valid];
    // PONYTAIL: fixed worker-pool concurrency (~2 at a time) instead of an upload
    // progress stream; ceiling: slow networks with many large files; upgrade:
    // per-file progress via fetch streaming; trigger: user feedback on long batches.
    const workers = Array.from({ length: Math.min(UPLOAD_CONCURRENCY, queue.length) }, async () => {
      while (queue.length > 0) {
        const file = queue.shift()!;
        try {
          await uploadDocumentFile(file);
          toast("success", `${file.name} uploaded`);
          onUploaded();
        } catch (err) {
          toast("error", `${file.name} — ${err instanceof Error ? err.message : String(err)}`);
        } finally {
          done += 1;
          setUpload({ done, total: valid.length });
        }
      }
    });
    await Promise.all(workers);
    setUpload(null);
    onUploaded();
  }

  const busy = upload !== null;

  return (
    <div className="mb-10 flex flex-col gap-3 rounded-xl border bg-white/50 p-5 dark:bg-black/5" style={{ borderColor: "var(--muted)" }}>
      <div>
        <h2
          className="text-xs font-semibold uppercase tracking-wider"
          style={{ color: "var(--text-secondary)" }}
        >
          Add documents
        </h2>
        <p className="mt-1 text-xs" style={{ color: "var(--text-secondary)" }}>
          Drop PDF or DOCX files here, or click to browse — up to {MAX_UPLOAD_MB} MB each.
        </p>
      </div>

      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          void handleFiles(Array.from(e.dataTransfer.files));
        }}
        disabled={busy}
        className="flex flex-col items-center gap-2 rounded-lg border border-dashed px-4 py-10 text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-50"
        style={{
          borderColor: dragOver ? "var(--accent)" : "var(--muted)",
          backgroundColor: dragOver ? "color-mix(in oklab, var(--accent) 8%, transparent)" : undefined,
          color: "var(--foreground)",
        }}
      >
        <Upload className="size-6" style={{ color: dragOver ? "var(--accent)" : "var(--text-secondary)" }} />
        {dragOver ? "Drop files to upload" : "Drag & drop files, or click to browse"}
      </button>

      <input
        ref={inputRef}
        type="file"
        multiple
        accept=".pdf,.docx"
        className="hidden"
        onChange={(e) => {
          void handleFiles(Array.from(e.target.files ?? []));
          e.target.value = "";
        }}
      />

      {upload && (
        <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
          Uploading {upload.done} of {upload.total}…
        </p>
      )}
    </div>
  );
}

function SkeletonRows() {
  return (
    <div aria-hidden="true" className="space-y-4">
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="flex items-center gap-3 rounded-xl border bg-white/50 p-4 dark:bg-black/5"
          style={{ borderColor: "var(--muted)" }}
        >
          <div className="size-10 shrink-0 rounded-lg" style={{ backgroundColor: "var(--muted)" }} />
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
 * Knowledge page (M8) — renamed from the prior Library page; shows documents
 * with `origin=knowledge` (the RAG corpus) and keeps the upload dropzone.
 * Per-doc delete is new (M8 WEB-M8-8).
 */
export function KnowledgePage() {
  const [docs, setDocs] = useState<Document[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = () => {
    setError(null);
    return listDocuments("knowledge")
      .then(setDocs)
      .catch((e) => setError(e instanceof Error ? e.message : String(e)));
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- initial load only
  }, []);

  useEffect(() => {
    if (!docs || !docs.some((d) => d.status === "processing")) return;
    const timer = setInterval(() => load(), 2000);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- re-armed by docs changes
  }, [docs]);

  return (
    <main className="flex-1 w-full">
      <div className="mx-auto w-full max-w-4xl p-6">
        <header className="mb-6">
          <h1 className="text-2xl font-semibold tracking-tight">Knowledge</h1>
          <p className="mt-1 text-sm" style={{ color: "var(--text-secondary)" }}>
            Your RAG corpus. Add documents here to start asking questions across them.
          </p>
        </header>

        <Dropzone onUploaded={load} />

        {error && (
          <div
            role="alert"
            className="flex flex-col gap-3 rounded-lg border p-4 text-sm sm:flex-row sm:items-center sm:justify-between"
            style={{ borderColor: "var(--error)", color: "var(--error)" }}
          >
            <p>Failed to load knowledge documents: {error}</p>
            <button
              type="button"
              onClick={load}
              className="shrink-0 rounded-md px-3 py-1.5 font-medium"
              style={{ backgroundColor: "var(--error)", color: "var(--badge-solid-text)" }}
            >
              Retry
            </button>
          </div>
        )}

        {docs === null && !error && (
          <>
            <span className="sr-only">Loading knowledge documents…</span>
            <SkeletonRows />
          </>
        )}

        {docs !== null && docs.length === 0 && (
          <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
            No knowledge documents yet. Drop one above.
          </p>
        )}

        {docs !== null && docs.length > 0 && (
          <div className="space-y-12">
            {SECTION_ORDER.map(({ key, label }) => (
              <Section key={key} label={label} docs={docs.filter((d) => d.status === key)} onDeleted={load} />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}