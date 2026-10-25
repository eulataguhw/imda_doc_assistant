import { db } from "../lib/db";
import { chunkPages, chunkText, embedChunks, generateSummary, upsertPoints } from "./ingest";

export interface JobProgress {
  stage: "summarizing" | "chunking" | "embedding" | "upserting";
  done: number;
  total: number;
}

interface IndexJob {
  documentId: string;
  title: string;
  text: string;
  /** Char offset of each 1-based PDF page in `text` (absent for DOCX). */
  pageStarts?: number[];
}

const queue: IndexJob[] = [];
let pumping = false;

/** In-flight indexing progress, keyed by document id (fed to `list()` as optional `progress`). */
export const progress: Record<string, JobProgress> = {};

// PONYTAIL: single sequential worker — local Ollama embedding is the bottleneck and parallel jobs would only contend for it; ceiling: one document indexed at a time; upgrade: N-worker pool draining this same queue; trigger: sustained backlog (queue depth > 2 while a job is running).
export function enqueue(job: IndexJob): void {
  queue.push(job);
  void pump();
}

async function pump(): Promise<void> {
  if (pumping) return;
  pumping = true;
  try {
    for (;;) {
      const job = queue.shift();
      if (!job) break;
      await runJob(job);
    }
  } finally {
    pumping = false;
  }
}

async function runJob(job: IndexJob): Promise<void> {
  try {
    // M6 (API-M6-5/6): best-effort LLM summary. Failure warns and continues — the row still
    // reaches `ready` with an empty summary; a dead chat model must not block indexing.
    progress[job.documentId] = { stage: "summarizing", done: 0, total: 1 };
    try {
      const summary = await generateSummary(job.text);
      db.prepare("UPDATE documents SET summary = ? WHERE id = ?").run(summary, job.documentId);
    } catch (e) {
      console.warn(
        `[ingest] summary generation failed for "${job.title}": ${e instanceof Error ? e.message : String(e)} — continuing with empty summary`,
      );
    }

    progress[job.documentId] = { stage: "chunking", done: 0, total: 1 };
    const chunks = chunkText(job.text);
    if (chunks.length === 0) throw new Error("Document content is empty");
    const pages = chunkPages(job.text, chunks, job.pageStarts);

    progress[job.documentId] = { stage: "embedding", done: 0, total: chunks.length };
    const embeddings = await embedChunks(chunks, (done, total) => {
      progress[job.documentId] = { stage: "embedding", done, total };
    });

    progress[job.documentId] = { stage: "upserting", done: 0, total: 1 };
    await upsertPoints(job.documentId, job.title, chunks, embeddings, pages);

    db.prepare("UPDATE documents SET status = 'ready', error_reason = NULL WHERE id = ?").run(job.documentId);
  } catch (e) {
    const reason = e instanceof Error ? e.message : String(e);
    db.prepare("UPDATE documents SET status = 'error', error_reason = ? WHERE id = ?").run(reason, job.documentId);
  } finally {
    delete progress[job.documentId];
  }
}

/** Startup sweep: the queue is in-process, so any row still `processing` after a restart never finished. */
export function markStaleProcessing(): void {
  db.prepare(
    "UPDATE documents SET status = 'error', error_reason = 'server restarted during indexing' WHERE status = 'processing'",
  ).run();
}
