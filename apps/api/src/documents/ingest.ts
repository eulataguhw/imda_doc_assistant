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
export async function call(label: string, url: string, init?: RequestInit): Promise<Response> {
  try {
    return await fetch(url, init);
  } catch (e) {
    throw new Error(`${label}: ${e instanceof Error ? e.message : String(e)}`);
  }
}

async function embedBatch(chunks: string[]): Promise<number[][]> {
  const headers: Record<string, string> = { "content-type": "application/json" };
  // Provider-agnostic: Bearer auth only when a key is configured (Ollama/llama.cpp ignore it).
  if (config.llmApiKey) headers.authorization = `Bearer ${config.llmApiKey}`;
  const res = await call("Embedding request failed", `${config.embedBaseUrl}/embeddings`, {
    method: "POST",
    headers,
    body: JSON.stringify({ model: config.embedModel, input: chunks }),
  });
  if (!res.ok) {
    throw new Error(`Embedding request failed: ${res.status} ${res.statusText}`);
  }
  const body = (await res.json()) as { data: Array<{ embedding: number[] }> };
  return body.data.map((d) => d.embedding);
}

export async function embedChunks(
  chunks: string[],
  onProgress?: (done: number, total: number) => void,
): Promise<number[][]> {
  // M4 path unchanged: single request, no progress reporting.
  if (!onProgress) return embedBatch(chunks);
  const BATCH = 16;
  const embeddings: number[][] = [];
  for (let i = 0; i < chunks.length; i += BATCH) {
    embeddings.push(...(await embedBatch(chunks.slice(i, i + BATCH))));
    onProgress(Math.min(i + BATCH, chunks.length), chunks.length);
  }
  return embeddings;
}

/**
 * M6 (API-M6-1/2): attribute each chunk to its source PDF page. Chunks are emitted in
 * document order and are verbatim slices of the extracted text, so a sequential indexOf
 * with an advancing cursor recovers each chunk's offset; the last page start ≤ that
 * offset is the chunk's page (multi-page chunks cite their first page). DOCX → all null.
 */
export function chunkPages(text: string, chunks: string[], pageStarts?: number[]): Array<number | null> {
  if (!pageStarts) return chunks.map(() => null);
  let pos = 0;
  const pageAt = (offset: number): number | null => {
    let page: number | null = null;
    for (let i = 0; i < pageStarts.length; i++) {
      if (offset >= pageStarts[i]) page = i + 1;
      else break;
    }
    return page;
  };
  return chunks.map((chunk) => {
    const idx = text.indexOf(chunk, pos);
    const offset = idx >= 0 ? idx : pos - chunk.length;
    if (idx >= 0) pos = idx + chunk.length;
    return pageAt(offset);
  });
}

// M6 (API-M6-5): LLM executive summary, non-streaming. Throws on any failure — the
// caller (queue.ts) decides best-effort handling so a dead chat model never blocks indexing.
export async function generateSummary(text: string): Promise<string> {
  // PONYTAIL: only the first ~8k chars are summarized — long documents' summaries reflect their opening; ceiling: later sections unrepresented; upgrade: map-reduce over chunks; trigger: users report summaries missing later content.
  const body: Record<string, unknown> = {
    model: config.llmModel,
    messages: [
      { role: "system", content: "Write a factual executive summary of the provided document in 2-4 sentences. Do not invent details that are not present." },
      { role: "user", content: text.slice(0, 8000) },
    ],
    temperature: config.llmTemperature,
    max_tokens: config.llmMaxTokens,
    stream: false,
  };
  if (config.llmTopP != null) body.top_p = config.llmTopP; // omitted entirely when unset (API-M6-7)
  const headers: Record<string, string> = { "content-type": "application/json" };
  if (config.llmApiKey) headers.authorization = `Bearer ${config.llmApiKey}`;
  const res = await call("Summary request failed", `${config.llmBaseUrl}/chat/completions`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    throw new Error(`Summary request failed: ${res.status} ${res.statusText}`);
  }
  const json = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
  const summary = json.choices?.[0]?.message?.content?.trim();
  if (!summary) throw new Error("Summary request returned an empty completion");
  return summary;
}

export async function upsertPoints(
  documentId: string,
  title: string,
  chunks: string[],
  embeddings: number[][],
  pages?: Array<number | null>,
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
    // `page` only when known (PDF); bare payload key so Qdrant filters can match it.
    payload: { document_id: documentId, title, chunk_index: i, text, ...(pages?.[i] != null ? { page: pages[i] } : {}) },
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

/** M8 (API-M8-6): remove all Qdrant points for a document. No-op when the doc had no points. */
export async function deletePoints(documentId: string): Promise<void> {
  const res = await call("Qdrant delete failed", `${config.qdrantBaseUrl}/collections/documents/points/delete`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ filter: { must: [{ key: "document_id", match: { value: documentId } }] } }),
  });
  if (!res.ok) {
    throw new Error(`Qdrant delete failed: ${res.status} ${res.statusText}`);
  }
}
