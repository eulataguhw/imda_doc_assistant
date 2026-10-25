import { randomUUID } from "node:crypto";
import { config } from "../lib/env";

const TARGET_CHUNK = 500;
const MAX_CHUNK = 1000;

// PONYTAIL: paragraph-boundary chunking without sentence tracking; ceiling: ~50KB total text per upload in this synchronous pipeline; upgrade: job queue + finer tokenizer; trigger: uploads >1MB or concurrent ingest load.
export function chunkText(text: string): string[] {
  const paragraphs = text.split("\n\n").map((p) => p.trim()).filter((p) => p.length > 0);
  const chunks: string[] = [];
  let current = "";
  const flush = () => {
    if (current) {
      chunks.push(current);
      current = "";
    }
  };
  for (const paragraph of paragraphs) {
    if (paragraph.length > MAX_CHUNK) {
      flush();
      for (let i = 0; i < paragraph.length; i += MAX_CHUNK) {
        chunks.push(paragraph.slice(i, i + MAX_CHUNK));
      }
      continue;
    }
    if (current && current.length + 2 + paragraph.length > TARGET_CHUNK) flush();
    current = current ? `${current}\n\n${paragraph}` : paragraph;
  }
  flush();
  return chunks;
}

// Labels network-level fetch failures so errorReason is meaningful, not just "fetch failed".
async function call(label: string, url: string, init?: RequestInit): Promise<Response> {
  try {
    return await fetch(url, init);
  } catch (e) {
    throw new Error(`${label}: ${e instanceof Error ? e.message : String(e)}`);
  }
}

export async function embedChunks(chunks: string[]): Promise<number[][]> {
  const res = await call("Embedding request failed", `${config.llmBaseUrl}/embeddings`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ model: config.embedModel, input: chunks }),
  });
  if (!res.ok) {
    throw new Error(`Embedding request failed: ${res.status} ${res.statusText}`);
  }
  const body = (await res.json()) as { data: Array<{ embedding: number[] }> };
  return body.data.map((d) => d.embedding);
}

export async function upsertPoints(
  documentId: string,
  title: string,
  chunks: string[],
  embeddings: number[][],
): Promise<void> {
  const base = config.qdrantBaseUrl;
  const existing = await call("Qdrant collection lookup failed", `${base}/collections/documents`);
  if (!existing.ok) {
    // 404 (or any not-found state) → create; tolerate a concurrent-create 409.
    const size = embeddings[0]?.length ?? 0;
    // Qdrant >=1.7 creates collections via PUT /collections/{name} (POST /collections is gone).
    const created = await call("Qdrant collection create failed", `${base}/collections/documents`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ vectors: { size, distance: "Cosine" } }),
    });
    if (!created.ok && created.status !== 409) {
      throw new Error(`Qdrant collection create failed: ${created.status} ${created.statusText}`);
    }
  }
  const points = chunks.map((text, i) => ({
    id: randomUUID(),
    vector: embeddings[i],
    payload: { document_id: documentId, title, chunk_index: i, text },
  }));
  // Qdrant >=1.7 upserts via PUT /collections/{name}/points (POST .../points/upsert is gone).
  const res = await call("Qdrant upsert failed", `${base}/collections/documents/points`, {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ points }),
  });
  if (!res.ok) {
    throw new Error(`Qdrant upsert failed: ${res.status} ${res.statusText}`);
  }
}
