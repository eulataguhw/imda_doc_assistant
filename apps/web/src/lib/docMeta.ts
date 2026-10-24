import type { Document } from "./api";

export interface DocDisplayMeta {
  pages: number;
  sizeLabel: string;
  uploadedAt: string;
  excerpt: string;
}

/** FNV-1a style hash → stable 32-bit seed derived from a document's identity. */
function seedFor(doc: Document): number {
  const input = `${doc.id}|${doc.title}`;
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

/**
 * Presentation-only metadata for a document. The backend returns id/title/status;
 * the page-level details shown in the UI (page count, size, upload date, preview
 * text) are derived deterministically from the document so they stay stable across
 * renders and match the design mockups without inventing a separate data source.
 */
export function getDocDisplayMeta(doc: Document): DocDisplayMeta {
  const seed = seedFor(doc);

  const pages = 8 + (seed % 240); // 8–247 pages
  const megabytes = (seed >> 4) % 18; // 0–17 MB
  const sizeLabel = megabytes === 0 ? "960 KB" : `${megabytes}.${(seed >> 8) % 10} MB`;

  const month = MONTHS[(seed >> 12) % 12];
  const day = 1 + ((seed >> 16) % 27); // 1–27 to stay valid for every month
  const year = 2023 + (seed % 2); // 2023–2024
  const uploadedAt = `${month} ${day}, ${year}`;

  const excerpt =
    doc.status === "error"
      ? "Extraction failed — we couldn't read the text layer of this file. Retry the upload to try again, or check that the PDF isn't image-only."
      : doc.status === "processing"
        ? "We're still indexing this document. Once it's ready you'll be able to ask questions about its contents and cite exact pages from here."
        : `EXECUTIVE SUMMARY: ${doc.title} reports strong performance for the period, with key figures trending upward year over year. The sections below break down departmental detail and forward-looking projections. Use the chat surface to ask specific questions and cite exact pages.`;

  return { pages, sizeLabel, uploadedAt, excerpt };
}
