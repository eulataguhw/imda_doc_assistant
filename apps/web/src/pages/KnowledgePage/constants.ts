import type { DocStatus } from "../../lib/constants";

/**
 * Client-side upload size cap in MB, shown in the dropzone and enforced before upload.
 *
 * PONYTAIL: mirrors the server's MAX_UPLOAD_MB env var — ceiling: UI convenience only;
 * the API is the source of truth and re-validates. upgrade: fetch the limit from the
 * server if it becomes per-deployment config.
 */
export const MAX_UPLOAD_MB = 10;

/** Max concurrent in-flight uploads (worker pool) to keep slow networks with many files responsive. */
export const UPLOAD_CONCURRENCY = 2;

/** Fixed order of the status sections used to group the knowledge document list. */
export const SECTION_ORDER: { key: DocStatus; label: string }[] = [
  { key: "ready", label: "Ready" },
  { key: "processing", label: "Processing" },
  { key: "error", label: "Errors" },
];
