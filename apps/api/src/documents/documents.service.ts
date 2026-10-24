import { Injectable } from "@nestjs/common";
import { db } from "../lib/db";

export interface DocumentDto {
  id: string;
  title: string;
  status: "ready" | "processing" | "error";
}

@Injectable()
export class DocumentsService {
  /** Reads the persisted `documents` table (schema + seed live in lib/db.ts). */
  list(): DocumentDto[] {
    const rows = db
      .prepare("SELECT id, title, status FROM documents ORDER BY created_at DESC")
      .all() as unknown as Array<{ id: string; title: string; status: string }>;
    return rows.map((r) => ({ id: r.id, title: r.title, status: r.status as DocumentDto["status"] }));
  }
}
