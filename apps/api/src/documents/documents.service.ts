import { BadRequestException, Injectable, NotFoundException, OnModuleInit } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import * as path from "node:path";
import { db } from "../lib/db";
import { config } from "../lib/env";
import {
  extractText,
  ExtractResult,
  NoExtractableTextError,
  UnsupportedFileTypeError,
} from "./extract";
import { chunkText, deletePoints, embedChunks, upsertPoints } from "./ingest";
import { enqueue, JobProgress, markStaleProcessing, progress } from "./queue";

export interface DocumentDto {
  id: string;
  title: string;
  status: "ready" | "processing" | "error";
  /** M8 (API-M8-5): `knowledge` (RAG/embedded) or `chat` (uploaded in chat, no embedding). */
  origin: "knowledge" | "chat";
  errorReason?: string | null;
  /** ISO timestamp from the `created_at` column (upload date, WEB-M6-3). */
  createdAt?: string;
  /** M6 (API-M6-5): LLM executive summary; absent when empty/failed. */
  summary?: string;
  /** M6 (API-M6-6): real pdfjs page count; absent for DOCX/legacy rows. */
  pages?: number;
  /** M6 (API-M6-6): upload size in bytes; absent for the legacy JSON text path. */
  sizeBytes?: number;
  /** Present only while the row is `processing`; live stage/done/total from the in-process queue. */
  progress?: JobProgress;
}

interface DocumentRow {
  id: string;
  title: string;
  status: string;
  origin: string;
  error_reason: string | null;
  summary: string | null;
  pages: number | null;
  size_bytes: number | null;
  created_at: string;
}

const ROW_SQL =
  "SELECT id, title, status, origin, error_reason, summary, pages, size_bytes, created_at FROM documents";

function toDto(r: DocumentRow): DocumentDto {
  return {
    id: r.id,
    title: r.title,
    status: r.status as DocumentDto["status"],
    origin: (r.origin === "chat" ? "chat" : "knowledge") as DocumentDto["origin"],
    createdAt: r.created_at,
    ...(r.error_reason != null ? { errorReason: r.error_reason } : {}),
    // Empty-string summaries (best-effort failure) are treated as absent → UI neutral fallback.
    ...(r.summary != null && r.summary !== "" ? { summary: r.summary } : {}),
    ...(r.pages != null ? { pages: r.pages } : {}),
    ...(r.size_bytes != null ? { sizeBytes: r.size_bytes } : {}),
    ...(r.status === "processing" && progress[r.id] ? { progress: progress[r.id] } : {}),
  };
}

@Injectable()
export class DocumentsService implements OnModuleInit {
  onModuleInit(): void {
    // Rows left `processing` by a previous process can never finish (the queue is in-process).
    markStaleProcessing();
  }

  /** Reads the persisted `documents` table (schema + migration live in lib/db.ts). M8 (API-M8-5): optional origin filter. */
  list(origin?: "knowledge" | "chat"): DocumentDto[] {
    // M8 (API-DOC-5): optional origin filter — the WHERE clause must precede ORDER BY.
    const where = origin ? " WHERE origin = ?" : "";
    const sql = `${ROW_SQL}${where} ORDER BY created_at DESC`;
    const rows = (origin
      ? db.prepare(sql).all(origin)
      : db.prepare(sql).all()) as unknown as DocumentRow[];
    return rows.map(toDto);
  }

  /** M8 (API-M8-6): remove a document row + its Qdrant points (knowledge docs only; chat docs are not embedded). */
  async delete(id: string): Promise<void> {
    const row = db.prepare("SELECT origin FROM documents WHERE id = ?").get(id) as unknown as
      { origin?: string } | undefined;
    if (!row) throw new NotFoundException(`Document ${id} not found`);
    if (row.origin !== "chat") await deletePoints(id);
    db.prepare("DELETE FROM documents WHERE id = ?").run(id);
  }

  /**
   * M8 (API-M8-7): chat upload — extract text and store it on the row (origin='chat'), no embedding/queue.
   * Ready immediately; the content is served to the LLM directly by the chat stream.
   */
  async uploadChat(buffer: Buffer, filename: string, title?: string): Promise<DocumentDto> {
    const ext = path.extname(filename).toLowerCase();
    if (ext !== ".pdf" && ext !== ".docx") {
      throw new BadRequestException("Unsupported file type (expected .pdf or .docx)");
    }
    if (buffer.length > config.maxUploadMb * 1024 * 1024) {
      throw new BadRequestException(`File too large (max ${config.maxUploadMb} MB)`);
    }

    let extracted: ExtractResult;
    try {
      extracted = await extractText(buffer, filename);
    } catch (e) {
      if (e instanceof UnsupportedFileTypeError) {
        throw new BadRequestException("Unsupported file type (expected .pdf or .docx)");
      }
      if (e instanceof NoExtractableTextError) {
        throw new BadRequestException("No extractable text found");
      }
      throw e;
    }

    const id = randomUUID();
    const docTitle = (title ?? "").trim() || filename.replace(/\.[^.]+$/, "");
    db.prepare(
      "INSERT INTO documents (id, title, status, origin, content, pages, size_bytes) VALUES (?, ?, 'ready', 'chat', ?, ?, ?)"
    ).run(id, docTitle, extracted.text, extracted.pages, buffer.length);
    const row = db.prepare(`${ROW_SQL} WHERE id = ?`).get(id) as unknown as DocumentRow;
    return toDto(row);
  }

  /** M4 synchronous in-request lifecycle (JSON text path): processing → ready | error. */
  async upload(title: string, content: string): Promise<DocumentDto> {
    const id = randomUUID();
    db.prepare("INSERT INTO documents (id, title, status) VALUES (?, ?, 'processing')").run(
      id,
      title
    );

    let status: DocumentDto["status"];
    let errorReason: string | null = null;
    try {
      const chunks = chunkText(content);
      if (chunks.length === 0) throw new Error("Document content is empty");
      const embeddings = await embedChunks(chunks);
      await upsertPoints(id, title, chunks, embeddings);
      status = "ready";
    } catch (e) {
      status = "error";
      errorReason = e instanceof Error ? e.message : String(e);
    }

    db.prepare("UPDATE documents SET status = ?, error_reason = ? WHERE id = ?").run(
      status,
      errorReason,
      id
    );
    const row = db.prepare(`${ROW_SQL} WHERE id = ?`).get(id) as unknown as DocumentRow;
    return toDto(row);
  }

  /**
   * M5 file-upload fast path: validate → extract (sync, so failures can 400 with no row behind)
   * → insert `processing` → enqueue background indexing (queue.ts) → return immediately.
   */
  async uploadFile(buffer: Buffer, filename: string, title?: string): Promise<DocumentDto> {
    const ext = path.extname(filename).toLowerCase();
    if (ext !== ".pdf" && ext !== ".docx") {
      throw new BadRequestException("Unsupported file type (expected .pdf or .docx)");
    }
    if (buffer.length > config.maxUploadMb * 1024 * 1024) {
      throw new BadRequestException(`File too large (max ${config.maxUploadMb} MB)`);
    }

    let extracted: ExtractResult;
    try {
      extracted = await extractText(buffer, filename);
    } catch (e) {
      if (e instanceof UnsupportedFileTypeError) {
        throw new BadRequestException("Unsupported file type (expected .pdf or .docx)");
      }
      if (e instanceof NoExtractableTextError) {
        throw new BadRequestException("No extractable text found");
      }
      throw e;
    }

    const id = randomUUID();
    const docTitle = (title ?? "").trim() || filename.replace(/\.[^.]+$/, "");
    // M6 (API-M6-6): real size + page count stored at upload time.
    db.prepare(
      "INSERT INTO documents (id, title, status, pages, size_bytes) VALUES (?, ?, 'processing', ?, ?)"
    ).run(id, docTitle, extracted.pages, buffer.length);
    enqueue({
      documentId: id,
      title: docTitle,
      text: extracted.text,
      pageStarts: extracted.pageStarts,
    });
    const row = db.prepare(`${ROW_SQL} WHERE id = ?`).get(id) as unknown as DocumentRow;
    return toDto(row);
  }
}
