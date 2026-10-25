import { Injectable } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import { db } from "../lib/db";
import { chunkText, embedChunks, upsertPoints } from "./ingest";

export interface DocumentDto {
  id: string;
  title: string;
  status: "ready" | "processing" | "error";
  errorReason?: string | null;
}

@Injectable()
export class DocumentsService {
  /** Reads the persisted `documents` table (schema + migration live in lib/db.ts). */
  list(): DocumentDto[] {
    const rows = db
      .prepare("SELECT id, title, status, error_reason FROM documents ORDER BY created_at DESC")
      .all() as unknown as Array<{
        id: string;
        title: string;
        status: string;
        error_reason: string | null;
      }>;
    return rows.map((r) => ({
      id: r.id,
      title: r.title,
      status: r.status as DocumentDto["status"],
      ...(r.error_reason != null ? { errorReason: r.error_reason } : {}),
    }));
  }

  /** Synchronous in-request lifecycle: processing → ready | error (see m4-ingestion change record). */
  async upload(title: string, content: string): Promise<DocumentDto> {
    const id = randomUUID();
    db.prepare("INSERT INTO documents (id, title, status) VALUES (?, ?, 'processing')").run(id, title);

    let status: DocumentDto["status"] = "processing";
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

    db.prepare("UPDATE documents SET status = ?, error_reason = ? WHERE id = ?").run(status, errorReason, id);
    return { id, title, status, ...(errorReason != null ? { errorReason } : {}) };
  }
}
