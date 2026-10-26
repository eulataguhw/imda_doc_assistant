/**
 * Global, cross-module constants for the web app.
 *
 * Single source of truth for route paths, the API base URL, and the domain
 * enums (document status / origin) plus a few shared UI tokens that more than
 * one module depends on. Constants used by only one component or page live in
 * that folder's own `constants.ts` instead.
 */

/** Base path for every HTTP request to the NestJS API (proxied under `/api`). */
export const API_BASE = "/api";

/** Top-level route paths, shared by `<Link>`, `<Navigate>` and route defs. */
export const ROUTE_KNOWLEDGE = "/knowledge";
export const ROUTE_LIBRARY = "/library";
export const ROUTE_CHAT = "/chat";

/** Build a concrete link to a single document's detail page. */
export function documentRoute(id: string): string {
  return `/documents/${encodeURIComponent(id)}`;
}

/** Document processing statuses, shared by badges, lists and the API client. */
export const DOC_STATUS = {
  ready: "ready",
  processing: "processing",
  error: "error",
} as const;
export type DocStatus = (typeof DOC_STATUS)[keyof typeof DOC_STATUS];

/** Upload origin of a document, shared by the API client and the pages. */
export const DOC_ORIGIN = {
  knowledge: "knowledge",
  chat: "chat",
} as const;
export type DocOrigin = (typeof DOC_ORIGIN)[keyof typeof DOC_ORIGIN];

/** Anchor prefix for inline citation chips (`[1]` in markdown → `#cite-1`). */
export const CITE_PREFIX = "#cite-";

/** File extensions accepted for upload, shared by the Knowledge and Chat pages. */
export const ACCEPTED_EXTENSIONS = [".pdf", ".docx"] as const;

/** `accept` attribute value for `<input type="file">` (e.g. `.pdf,.docx`). */
export const ACCEPT_ATTR = ACCEPTED_EXTENSIONS.join(",");

/** True when a file name ends with one of the accepted extensions. */
export function isAcceptedFile(file: File): boolean {
  return ACCEPTED_EXTENSIONS.some((ext) => file.name.toLowerCase().endsWith(ext));
}
