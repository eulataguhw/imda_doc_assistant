import { useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router";
import { Check, ChevronDown, FileText, Link2, Paperclip, Plus, Send, X } from "lucide-react";
import { uploadChatDocument, type Document } from "../../lib/api";
import { ACCEPT_ATTR, isAcceptedFile } from "../../lib/constants";
import { toast } from "../../components/Toaster/Toaster";
import { Markdown } from "../../components/Markdown/Markdown";
import { CHIP_CLASS } from "../../components/Markdown/constants";
import { useChatStream } from "../../hooks/useChatStream";
import { useDocuments } from "../../hooks/useDocuments";
import { SUGGESTIONS } from "./constants";
import type { Citation } from "./types";

/** Render the list of unique cited sources below or alongside the assistant message. */
function CitationSourcesList({ citations }: { citations?: Citation[] }) {
  if (!citations || citations.length === 0) return null;
  // Deduplicate by doc + page
  const unique = Array.from(new Map(citations.map((c) => [`${c.doc}-${c.page ?? 0}`, c])).values());
  return (
    <div
      className="flex flex-wrap items-center gap-1.5 pt-2"
      style={{ borderTop: "1px solid var(--muted)" }}
      aria-label="Sources referenced in this answer"
    >
      <span
        className="text-[11px] font-semibold uppercase tracking-wider"
        style={{ color: "var(--text-secondary)" }}
      >
        Sources:
      </span>
      {unique.map((c, i) => (
        <Link
          key={`${c.doc}-${c.page ?? i}`}
          to={`/documents/${encodeURIComponent(c.doc)}`}
          className={CHIP_CLASS}
          style={{ backgroundColor: "var(--muted)", color: "var(--foreground)" }}
        >
          <FileText className="size-3" />
          <span>{c.title || "Document"}</span>
          {typeof c.page === "number" ? <span className="opacity-70">· p.{c.page}</span> : null}
        </Link>
      ))}
    </div>
  );
}

/** Render a compact relative time for the "past conversations" list; empty string when unparseable. */
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

/** Animated "assistant is typing" indicator shown while the first chunk of an answer has not arrived. */
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

/** Round avatar that visually distinguishes assistant turns from the user's right-aligned bubbles. */
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

/**
 * Chat page (M8) — RAG over the knowledge corpus, optionally scoped to one document
 * (via `?docId=` or the scope picker), with direct chat-origin attachments.
 * Streams assistant answers, renders markdown + inline [n] citation chips, and
 * supports starting fresh or reopening a past conversation.
 *
 * Conversation history + the active transcript live in the global `useSessionsStore`
 * (via `useChatStream`) so they survive route changes; this page keeps only
 * presentation-local state (composer text, RAG scope picker, attachment chips, drag cue).
 */
export function ChatPage() {
  const [searchParams] = useSearchParams();
  const docId = searchParams.get("docId");

  /* Presentation-local state: composer, RAG scope picker, attachments, drag cue. */
  const [input, setInput] = useState("");
  const [scopeDocId, setScopeDocId] = useState<string | null>(docId ?? null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [attachments, setAttachments] = useState<Document[]>([]);
  const [uploadingCount, setUploadingCount] = useState(0);
  const [dragOver, setDragOver] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  /* Global chat state: sessions, active transcript, streaming — backed by useSessionsStore. */
  const { sessions, activeId, messages, busy, send, newConversation, openSession } = useChatStream({
    scopeDocId,
    attachments,
  });

  /* All ready library docs for the scope picker. */
  const { documents: allDocs, load: loadDocs } = useDocuments();

  useEffect(() => {
    void loadDocs();
  }, [loadDocs]);

  /* When navigating from Knowledge/DocumentDetail with ?docId=, start a fresh
     conversation scoped to that document instead of reusing the active session. */
  const prevDocIdRef = useRef<string | null>(null);
  useEffect(() => {
    if (docId && docId !== prevDocIdRef.current) {
      newConversation();
      setScopeDocId(docId);
      setAttachments([]);
      setInput("");
      setPickerOpen(false);
    }
    prevDocIdRef.current = docId;
  }, [docId]); // eslint-disable-line react-hooks/exhaustive-deps -- newConversation identity is stable

  const readyDocs = allDocs.filter((d) => d.status === "ready");
  const scopedDoc = readyDocs.find((d) => d.id === scopeDocId) ?? null;

  const hasAttachments = attachments.length > 0 || uploadingCount > 0;
  const scopeLabel = hasAttachments
    ? "current documents"
    : scopedDoc
      ? scopedDoc.title
      : "All documents";

  /** Wrap the store-backed new-conversation to also clear presentation-local state. */
  function handleNewConversation() {
    newConversation();
    setAttachments([]);
    setInput("");
    setPickerOpen(false);
  }

  /** Wrap the store-backed open-session to also clear composer/attachments on success. */
  async function handleOpenSession(id: string) {
    if (id === activeId) return;
    setPickerOpen(false);
    const ok = await openSession(id);
    if (ok) {
      setAttachments([]);
      setInput("");
    }
  }

  /** Validate + upload selected files as chat-origin docs and add them to the attachment list. */
  async function handleFiles(files: FileList | File[]) {
    const arr = Array.from(files).filter((f) => isAcceptedFile(f));
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
        toast(
          "error",
          `Couldn't attach ${file.name} — ${e instanceof Error ? e.message : String(e)}`
        );
      } finally {
        setUploadingCount((c) => c - 1);
      }
    }
  }

  /** Remove one attachment from the current conversation. */
  function removeAttachment(id: string) {
    setAttachments((prev) => prev.filter((d) => d.id !== id));
  }

  /** Send a question (composer or a suggestion chip): clear the box, then stream via the hook. */
  function submit(text: string) {
    if (!text.trim() || busy) return;
    setInput("");
    void send(text);
  }

  /** Submit on Enter (Shift+Enter inserts a newline). */
  function onComposerKey(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submit(input);
    }
  }

  const showSuggestions = messages.length === 0;

  return (
    <>
      <div className="relative mx-auto flex w-full max-w-4xl flex-col px-6 pb-32 pt-8">
        {/* Polite live region announces streaming status to assistive tech (M7 / WEB-M7-2). */}
        <div aria-live="polite" className="sr-only">
          {busy ? "Assistant is responding…" : ""}
        </div>

        {/* Conversation controls: start fresh or revisit a past session (M8 / WEB-M8-1). */}
        <div className="mb-6 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={handleNewConversation}
            className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors hover:bg-[var(--muted)]"
            style={{ borderColor: "var(--muted)", color: "var(--foreground)" }}
          >
            <Plus className="size-3.5" /> New conversation
          </button>
          {sessions.length > 0 && (
            <label
              className="inline-flex items-center gap-2 text-xs"
              style={{ color: "var(--text-secondary)" }}
            >
              Past conversations
              <select
                value={activeId ?? ""}
                onChange={(e) => e.target.value && handleOpenSession(e.target.value)}
                className="rounded-lg border px-2 py-1.5 text-xs"
                style={{
                  backgroundColor: "var(--background)",
                  borderColor: "var(--muted)",
                  color: "var(--foreground)",
                }}
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
            <h2 className="mb-4 text-2xl font-semibold tracking-tight">
              How can I help you today?
            </h2>
            <p className="mx-auto mb-6 max-w-md text-sm" style={{ color: "var(--text-secondary)" }}>
              Ask about your knowledge base, or drop a PDF/DOCX into the box below to answer from
              that document directly.
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s.key}
                  type="button"
                  onClick={() => submit(s.label)}
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
                <div key={m.id} className="sd-msg-enter flex justify-end">
                  <div
                    className="max-w-[80%] whitespace-pre-wrap rounded-2xl rounded-tr-none px-4 py-3 text-sm leading-relaxed shadow-sm"
                    style={{ backgroundColor: "var(--accent)", color: "#ffffff" }}
                  >
                    {m.text}
                  </div>
                </div>
              ) : (
                <div key={m.id} className="sd-msg-enter flex items-start gap-3">
                  <AssistantAvatar />
                  <div className="max-w-[90%] space-y-4">
                    {m.streaming && m.text === "" ? (
                      <div className="space-y-3">
                        {m.citations && m.citations.length > 0 && (
                          <CitationSourcesList citations={m.citations} />
                        )}
                        <div
                          className="flex w-24 items-center justify-center rounded-2xl rounded-tl-none px-4 py-4"
                          style={{ backgroundColor: "var(--muted)" }}
                        >
                          <TypingDots />
                        </div>
                      </div>
                    ) : (
                      <>
                        {/* M8 / WEB-M8-3: render markdown + inline [n] citation chips. */}
                        <Markdown text={m.text} citations={m.citations} />
                        {m.streaming && (
                          /* Live typing cursor while the answer is still streaming (WEB-6). */
                          <span className="sd-stream-cursor" aria-hidden="true" />
                        )}
                        {m.citations && m.citations.length > 0 && (
                          <CitationSourcesList citations={m.citations} />
                        )}
                      </>
                    )}
                  </div>
                </div>
              )
            )}
          </div>
        )}
      </div>

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
                <span
                  className="rounded-lg px-3 py-1.5 text-sm font-medium"
                  style={{ backgroundColor: "var(--background)", color: "var(--foreground)" }}
                >
                  Drop PDF or DOCX to attach
                </span>
              </div>
            )}

            <div className="flex items-center justify-between gap-2 px-4 pt-3">
              {/* Scope picker (M8 / WEB-M8-2): choose the document to scope to, or All. Disabled when documents are uploaded/attached. */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => {
                    if (!hasAttachments) setPickerOpen((o) => !o);
                  }}
                  disabled={hasAttachments}
                  aria-disabled={hasAttachments}
                  aria-haspopup="listbox"
                  aria-expanded={!hasAttachments && pickerOpen}
                  className={`flex items-center gap-1.5 text-xs font-medium transition-colors ${
                    hasAttachments
                      ? "cursor-not-allowed opacity-60 [color:var(--text-secondary)]"
                      : "[color:var(--text-secondary)] hover:[color:var(--foreground)]"
                  }`}
                >
                  <Link2 className="size-3.5" style={{ color: "var(--accent)" }} />
                  <span>Scoped to: {scopeLabel}</span>
                  {!hasAttachments && (
                    <ChevronDown
                      className={`size-3.5 transition-transform ${pickerOpen ? "rotate-180" : ""}`}
                    />
                  )}
                </button>
                {!hasAttachments && pickerOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setPickerOpen(false)}
                      aria-hidden
                    />
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
                          {scopeDocId === null && (
                            <Check className="size-3.5" style={{ color: "var(--accent)" }} />
                          )}
                        </button>
                      </li>
                      {readyDocs.map((d) => (
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
                            {scopeDocId === d.id && (
                              <Check
                                className="size-3.5 shrink-0"
                                style={{ color: "var(--accent)" }}
                              />
                            )}
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
                placeholder={
                  attachments.length > 0
                    ? "Ask about the attached document…"
                    : "Ask a question, or drop a PDF/DOCX to attach…"
                }
                className="flex-1 resize-none border-none bg-transparent px-2 py-2 text-sm focus:ring-0"
                style={{ color: "var(--foreground)" }}
              />
              <button
                type="button"
                onClick={() => submit(input)}
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
              accept={ACCEPT_ATTR}
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
