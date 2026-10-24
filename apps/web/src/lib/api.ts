export interface Document {
  id: string;
  title: string;
  status: "ready" | "processing" | "error";
}

const BASE = "/api";

/** GET /api/documents — live list with per-document status. */
export async function listDocuments(): Promise<Document[]> {
  const res = await fetch(`${BASE}/documents`);
  if (!res.ok) throw new Error(`GET ${BASE}/documents → HTTP ${res.status}`);
  return (await res.json()) as Document[];
}
