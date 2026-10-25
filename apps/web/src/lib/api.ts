export interface Document {
  id: string;
  title: string;
  status: "ready" | "processing" | "error";
  errorReason?: string | null;
}

const BASE = "/api";

/** GET /api/documents — live list with per-document status. */
export async function listDocuments(): Promise<Document[]> {
  const res = await fetch(`${BASE}/documents`);
  if (!res.ok) throw new Error(`GET ${BASE}/documents → HTTP ${res.status}`);
  return (await res.json()) as Document[];
}

/** POST /api/documents — upload text content; resolves with the final document DTO. */
export async function uploadDocument(input: { title: string; content: string }): Promise<Document> {
  const res = await fetch(`${BASE}/documents`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    let message = `POST ${BASE}/documents → HTTP ${res.status}`;
    try {
      const data = (await res.json()) as { message?: string | string[] };
      if (typeof data?.message === "string") message = data.message;
      else if (Array.isArray(data?.message)) message = data.message.join("; ");
    } catch {
      // non-JSON body — keep the HTTP status message
    }
    throw new Error(message);
  }
  return (await res.json()) as Document;
}
