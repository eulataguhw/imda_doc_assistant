import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router";
import { Check, ChevronDown, FileText, Link2, Paperclip, Plus, Send, X } from "lucide-react";
import {
  createSession,
  getSession,
  listDocuments,
  listSessions,
  streamChat,
  uploadChatDocument,
  type ChatSession,
  type ChatStreamEvent,
  type Document,
} from "../lib/api";
import { toast } from "../components/Toaster";
import { Markdown } from "../components/Markdown";

type Role = "user" | "assistant";

interface Citation {
  /** Document id the chip links to (/documents/:id). */
  doc: string;
  /** Document title (resolved server-side on the citation event). */
  title: string;
  /** PDF page number; absent for DOCX/legacy citations. */
  page?: number;
}

interface Message {
  id: string;
  role: Role;
  text: string;
  citations?: Citation[];
  streaming?: boolean;
}

const SUGGESTIONS = [
  { key: "risks", label: "Summarize key risks" },
  { key: "changes", label: "What changed vs last quarter?" },
  { key: "actions", label: "List open action items" },
];

const uid = () => Math.random().toString(36).slice(2, 10);

function formatWhen(iso: string): string {
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return "";
  const min = Math.round((Date.now() - t) / 60000);
  if (min < 1) return "just now";
  if (min < 60) return `${min}m ago`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.round(hr / 24);
  if (day < 7) return `${day}d ago`;
  return new Date(iso).toLocaleDateString();
}

function TypingDots() {
  return (
    <div className="flex items-center gap-1">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="sd-typing-dot inline-block size-1.5 rounded-full"
          style={{
            backgroundColor: "var(--accent)",
            animation: `sd-typing 1.2s ${i * 0.18}s ease-in-out infinite`,
          }}
        />
      ))}
    </div>
  );
}

function AssistantAvatar() {
  return (
    <div
      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full"
      style={{ backgroundColor: "var(--muted)" }}
    >
      <FileText className="size-4" style={{ color: "var(--accent)" }} />
    </div>
  );
}

export function ChatPage() {
  const [searchParams] = useSearchParams();
  const docId = searchParams.get("docId");

  const [docs, setDocs] = useState<Document[] | null>(null);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  // RAG scope: a single knowledge doc id, or null for the whole corpus (M8 / WEB-M8-2).
  const [scopeDocId, setScopeDocId] = useState<string | null>(docId ?? null);
  const [pickerOpen, setPickerOpen] = useState(false);
  // Chat-origin docs attached to this conversation (M8 / WEB-M8-4 direct mode).
  const [attachments, setAttachments] = useState<Document[]>([]);
  const [uploadingCount, setUploadingCount] = useState(0);
  const [dragOver, setDragOver] = useState(false);

  const abortRef = useRef<AbortController | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const scopedDoc = docs?.find((d) => d.id === scopeDocId) ?? null;
  const scopeLabel = scopedDoc ? scopedDoc.title : "All documents";

  useEffect(() => {
    listDocuments("knowledge").then(setDocs).catch(() => setDocs([]));
    listSessions().then(setSessions).catch(() => {});
  }, []);

  useEffect(() => {
    const a = abortRef.current;
    return () => a?.abort();
  }, []);

  function patchMessage(id: string, patch: Partial<Message>) {
    setMessages((ms) => ms.map((m) => (m.id === id ? { ...m, ...patch } : m)));
  }

  function newConversation() {
    abortRef.current?.abort();
    setCurrentSessionId(null);
    setMessages([]);
    setAttachments([]);
    setInput("");
    setPickerOpen(false);
  }

  async function openSession(id: string) {
    if (id === currentSessionId) return;
    abortRef.current?.abort();
    setPickerOpen(false);
    try {
      const detail = await getSession(id);
      setCurrentSessionId(detail.id);
      setMessages(
        detail.messages.map((m) => ({
          id: m.id,
          role: m.role,
          text: m.content,
          citations: m.citations?.map((c) => ({ doc: c.documentId, title: c.title ?? "", page: c.page })),
        })),
      );
      // Attachments are not persisted per session (M8 minimal scope); the docs
      // remain in Library and can be re-attached.
      setAttachments([]);
      setInput("");
    } catch (e) {
      toast("error", `Couldn't open that conversation — ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  async function handleFiles(files: FileList | File[]) {
    const arr = Array.from(files).filter((f) => /\.(pdf|docx)$/i.test(f.name));
    if (arr.length === 0) {
      toast("error", "Only PDF and DOCX files can be attached.");
      return;
    }
    for (const file of arr) {
      setUploadingCount((c) => c + 1);
      try {
        const doc = await uploadChatDocument(file, file.name.replace(/\.[^.]+$/, ""));
        setAttachments((prev) => (prev.some((d) => d.id === doc.id) ? prev : [...prev, doc]));
        toast("success", `Attached “${doc.title}”`);
      } catch (e) {
        toast("error", `Couldn't attach ${file.name} — ${e instanceof Error ? e.message : String(e)}`);
      } finally {
        setUploadingCount((c) => c - 1);
      }
    }
  }

  function removeAttachment(id: string) {
    setAttachments((prev) => prev.filter((d) => d.id !== id));
  }

  async function send(raw: string) {
    const text = raw.trim();
    if (!text || busy) return;

    // Lazily create a server session on the first message of a fresh conversation.
    let sessionId = currentSessionId;
    if (!sessionId) {
      try {
        const created = await createSession(text.slice(0, 60));
        sessionId = created.id;
        setCurrentSessionId(sessionId);
        setSessions((prev) => [created, ...prev]);
      } catch (e) {
        toast("error", `Couldn't start a conversation — ${e instanceof Error ? e.message : String(e)}`);
      }
    }

    setBusy(true);
    setInput("");
    setMessages((ms) => [...ms, { id: uid(), role: "user", text }]);

    const asstId = uid();
    setMessages((ms) => [...ms, { id: asstId, role: "assistant", text: "", streaming: true }]);

    const controller = new AbortController();
    abortRef.current = controller;

    const citations: Citation[] = [];
    let answer = "";
    let streamError: string | null = null;

    const onEvent = (event: ChatStreamEvent) => {
      if (event.type === "citation") {
        citations.push({ doc: event.data.documentId, title: event.data.title, page: event.data.page });
      } else if (event.type === "chunk") {
        answer += event.data.delta;
        patchMessage(asstId, { text: answer });
      } else if (event.type === "error") {
        streamError = event.data.message || "Unknown chat error";
      }
    };

    try {
      await streamChat({
        question: text,
        documentIds: scopeDocId ? [scopeDocId] : [],
        attachments: attachments.map((d) => d.id),
        // sessionId drives server-side context + persistence (M8); `history` is
        // retained as a client-side fallback in the API but omitted here.
        sessionId: sessionId ?? undefined,
        onEvent,
        signal: controller.signal,
      });
      if (streamError) {
        toast("error", streamError);
        patchMessage(asstId, {
          text: answer
            ? `${answer}\n\n— the answer stream ended early: ${streamError}`
            : `Sorry — the answer stream failed: ${streamError}`,
          streaming: false,
          citations: citations.length > 0 ? citations : undefined,
        });
      } else {
        patchMessage(asstId, {
          text: answer || "No answer was generated.",
          streaming: false,
          citations: citations.length > 0 ? citations : undefined,
        });
      }
    } catch (e) {
      if (e instanceof DOMException && e.name === "AbortError") {
        return; // unmount / navigation abort — leave the in-flight message as-is
      }
      const message = e instanceof Error ? e.message : String(e);
      toast("error", message);
      patchMessage(asstId, {
        text: `Sorry — the answer stream failed: ${message}`,
        streaming: false,
        citations: citations.length > 0 ? citations : undefined,
      });
    } finally {
      abortRef.current = null;
      setBusy(false);
      listSessions().then(setSessions).catch(() => {});
    }
  }

  function onComposerKey(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send(input);
    }
  }

  const showSuggestions = messages.length === 0;

  return (
    <>
      <main className="relative mx-auto flex w-full max-w-4xl flex-col px-6 pb-32 pt-8">
        {/* Polite live region announces streaming status to assistive tech (M7 / WEB-M7-2). */}
        <div aria-live="polite" className="sr-only">
          {busy ? "Assistant is responding…" : ""}
        </div>

        {/* Conversation controls: start fresh or revisit a past session (M8 / WEB-M8-1). */}
        <div className="mb-6 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={newConversation}
            className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors hover:bg-[var(--muted)]"
            style={{ borderColor: "var(--muted)", color: "var(--foreground)" }}
          >
            <Plus className="size-3.5" /> New conversation
          </button>
          {sessions.length > 0 && (
            <label className="inline-flex items-center gap-2 text-xs" style={{ color: "var(--text-secondary)" }}>
              Past conversations
              <select
                value={currentSessionId ?? ""}
                onChange={(e) => e.target.value && openSession(e.target.value)}
                className="rounded-lg border px-2 py-1.5 text-xs"
                style={{ backgroundColor: "var(--background)", borderColor: "var(--muted)", color: "var(--foreground)" }}
                aria-label="Past conversations"
              >
                {sessions.map((s) => (
                  <option key={s.id} value={s.id}>
                    {(s.title || "Untitled").slice(0, 48)} — {formatWhen(s.updatedAt)}
                  </option>
                ))}
              </select>
            </label>
          )}
        </div>

        {showSuggestions ? (
          <div className="mb-12 text-center">
            <h2 className="mb-4 text-2xl font-semibold tracking-tight">How can I help you today?</h2>
            <p className="mx-auto mb-6 max-w-md text-sm" style={{ color: "var(--text-secondary)" }}>
              Ask about your knowledge base, or drop a PDF/DOCX into the box below to answer from that document directly.
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s.key}
                  type="button"
                  onClick={() => send(s.label)}
                  className="rounded-full border px-4 py-2 text-sm transition-colors hover:bg-[var(--muted)]"
                  style={{ borderColor: "var(--muted)", color: "var(--foreground)" }}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-8">
            {messages.map((m) =>
              m.role === "user" ? (
                <div key={m.id} className="flex justify-end">
                  <div
                    className="max-w-[80%] whitespace-pre-wrap rounded-2xl rounded-tr-none px-4 py-3 text-sm leading-relaxed shadow-sm"
                    style={{ backgroundColor: "var(--accent)", color: "#ffffff" }}
                  >
                    {m.text}
                  </div>
                </div>
              ) : (
                <div key={m.id} className="flex items-start gap-3">
                  <AssistantAvatar />
                  <div className="max-w-[90%] space-y-4">
                    {m.streaming && m.text === "" ? (
                      <div
                        className="flex w-24 items-center justify-center rounded-2xl rounded-tl-none px-4 py-4"
                        style={{ backgroundColor: "var(--muted)" }}
                      >
                        <TypingDots />
                      </div>
                    ) : (
                      // M8 / WEB-M8-3: render markdown + inline [n] citation chips.
                      <Markdown text={m.text} citations={m.citations} />
                    )}
                  </div>
                </div>
              ),
            )}
          </div>
        )}
      </main>

      {/* Composer — document-scoped, with drag-and-drop upload (M8 / WEB-M8-2/4). */}
      <div
        className="fixed bottom-0 left-0 right-0 z-40 border-t bg-[var(--background)]"
        style={{ borderColor: "var(--muted)" }}
      >
        <div className="mx-auto max-w-4xl px-6 py-4">
          <div
            className="relative flex flex-col rounded-xl border shadow-sm focus-within:border-transparent focus-within:ring-2"
            style={{
              backgroundColor: "var(--muted)",
              borderColor: dragOver ? "var(--accent)" : "var(--muted)",
            }}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(false);
              if (e.dataTransfer.files.length > 0) handleFiles(e.dataTransfer.files);
            }}
          >
            {/* Drop-target cue while a file hovers over the composer. */}
            {dragOver && (
              <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center rounded-xl">
                <span className="rounded-lg px-3 py-1.5 text-sm font-medium" style={{ backgroundColor: "var(--background)", color: "var(--foreground)" }}>
                  Drop PDF or DOCX to attach
                </span>
              </div>
            )}

            <div className="flex items-center justify-between gap-2 px-4 pt-3">
              {/* Scope picker (M8 / WEB-M8-2): choose the RAG corpus doc, or All. */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setPickerOpen((o) => !o)}
                  aria-haspopup="listbox"
                  aria-expanded={pickerOpen}
                  className="flex items-center gap-1.5 text-xs font-medium [color:var(--text-secondary)] transition-colors hover:[color:var(--foreground)]"
                >
                  <Link2 className="size-3.5" style={{ color: "var(--accent)" }} />
                  <span>Scoped to: {scopeLabel}</span>
                  <ChevronDown className={`size-3.5 transition-transform ${pickerOpen ? "rotate-180" : ""}`} />
                </button>
                {pickerOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setPickerOpen(false)} aria-hidden />
                    <ul
                      role="listbox"
                      aria-label="Scope the answer to a document"
                      className="absolute bottom-full left-0 z-50 mb-2 max-h-64 w-72 overflow-y-auto rounded-lg border p-1 shadow-lg"
                      style={{ backgroundColor: "var(--background)", borderColor: "var(--muted)" }}
                    >
                      <li>
                        <button
                          type="button"
                          onClick={() => {
                            setScopeDocId(null);
                            setPickerOpen(false);
                          }}
                          className="flex w-full items-center justify-between rounded-md px-2.5 py-1.5 text-left text-xs transition-colors hover:bg-[var(--muted)]"
                          style={{ color: "var(--foreground)" }}
                        >
                          All documents
                          {scopeDocId === null && <Check className="size-3.5" style={{ color: "var(--accent)" }} />}
                        </button>
                      </li>
                      {(docs ?? []).map((d) => (
                        <li key={d.id}>
                          <button
                            type="button"
                            onClick={() => {
                              setScopeDocId(d.id);
                              setPickerOpen(false);
                            }}
                            className="flex w-full items-center justify-between gap-2 rounded-md px-2.5 py-1.5 text-left text-xs transition-colors hover:bg-[var(--muted)]"
                            style={{ color: "var(--foreground)" }}
                          >
                            <span className="truncate">{d.title}</span>
                            {scopeDocId === d.id && <Check className="size-3.5 shrink-0" style={{ color: "var(--accent)" }} />}
                          </button>
                        </li>
                      ))}
                    </ul>
                  </>
                )}
              </div>

              {/* Attach button (M8 / WEB-M8-4). */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingCount > 0}
                className="flex items-center gap-1.5 text-xs font-medium [color:var(--text-secondary)] transition-colors hover:[color:var(--foreground)] disabled:opacity-50"
                aria-label="Attach a PDF or DOCX"
              >
                <Paperclip className="size-3.5" style={{ color: "var(--accent)" }} />
                {uploadingCount > 0 ? "Attaching…" : "Attach"}
              </button>
            </div>

            {/* Attached docs (M8 / WEB-M8-4). */}
            {(attachments.length > 0 || uploadingCount > 0) && (
              <div className="flex flex-wrap items-center gap-2 px-4 pb-1 pt-2">
                {attachments.map((d) => (
                  <span
                    key={d.id}
                    className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[11px] font-medium"
                    style={{ backgroundColor: "var(--background)", color: "var(--foreground)" }}
                  >
                    <FileText className="size-3" />
                    {d.title}
                    <button
                      type="button"
                      onClick={() => removeAttachment(d.id)}
                      aria-label={`Remove ${d.title}`}
                      className="rounded-sm p-0.5 transition-opacity hover:opacity-70"
                    >
                      <X className="size-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}

            <div className="flex items-end gap-2 p-2">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={onComposerKey}
                rows={2}
                placeholder={attachments.length > 0 ? "Ask about the attached document…" : "Ask a question, or drop a PDF/DOCX to attach…"}
                className="flex-1 resize-none border-none bg-transparent px-2 py-2 text-sm focus:ring-0"
                style={{ color: "var(--foreground)" }}
              />
              <button
                type="button"
                onClick={() => send(input)}
                disabled={busy || input.trim() === ""}
                className="rounded-lg p-2 transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                style={{ backgroundColor: "var(--accent)", color: "#ffffff" }}
                aria-label="Send message"
              >
                <Send className="size-4" />
              </button>
            </div>

            {/* Hidden file input driven by the Attach button. */}
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.docx"
              multiple
              className="hidden"
              onChange={(e) => {
                if (e.target.files && e.target.files.length > 0) handleFiles(e.target.files);
                e.target.value = "";
              }}
            />
          </div>

          <p
            className="mt-2 text-center text-[10px] font-medium uppercase tracking-widest"
            style={{ color: "var(--text-secondary)" }}
          >
            DocAssist can make mistakes. Verify important info.
          </p>
        </div>
      </div>
    </>
  );
}
