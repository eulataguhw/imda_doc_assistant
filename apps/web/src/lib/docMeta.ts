import type { Document } from "./api";

export interface DocDisplayMeta {
  /** Real PDF page count; null for DOCX / legacy rows → callers hide the span. */
  pages: number | null;
  /** Formatted real upload size; null when the API has no size (text uploads, legacy) → hide. */
  sizeLabel: string | null;
  /** Formatted upload date from the API's `createdAt`; "Unknown date" as last resort. */
  uploadedAt: string;
  /** Real LLM summary, or a status-appropriate fallback line. */
  excerpt: string;
}

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  const kb = n / 1024;
  if (kb < 1024) return `${kb < 10 ? kb.toFixed(1) : Math.round(kb)} KB`;
  return `${(kb / 1024).toFixed(1)} MB`;
}

function formatDate(iso: string | null | undefined): string {
  if (!iso) return "Unknown date";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "Unknown date";
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

/**
 * Presentation metadata for a document, driven by real API fields (M6 WEB-M6-3):
 * summary / pages / sizeBytes / createdAt. Fields the API cannot provide
 * (DOCX page counts, text-upload sizes) are null and hidden by callers.
 */
export function getDocDisplayMeta(doc: Document): DocDisplayMeta {
  const excerpt =
    doc.status === "error"
      ? doc.errorReason
        ? `Ingestion failed: ${doc.errorReason}. You can retry the upload from the library.`
        : "Ingestion failed for this document. Check the API logs for the specific reason, or retry the upload from the library."
      : doc.status === "processing"
        ? "We're still indexing this document. Once it's ready you'll be able to ask questions about its contents and cite exact pages from here."
        : doc.summary ||
          "No summary is available for this document yet. Use chat to ask questions about its contents.";

  return {
    pages: typeof doc.pages === "number" ? doc.pages : null,
    sizeLabel: typeof doc.sizeBytes === "number" ? formatBytes(doc.sizeBytes) : null,
    uploadedAt: formatDate(doc.createdAt),
    excerpt,
  };
}
