import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router";
import { ChevronDown, FileText, Link2, Send } from "lucide-react";
import { listDocuments, type Document } from "../lib/api";

type Role = "user" | "assistant";

interface Citation {
  doc: string;
  page: number;
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

function buildAnswer(prompt: string, scopeTitle: string | null) {
  const primary = scopeTitle ?? "2023_Financial_Report_Q4.pdf";
  const baseDoc = primary.replace(/\.pdf$/i, "");
  const secondary = scopeTitle ? "Technical_Specs" : "Technical_Specs";

  const citations: Citation[] = [
    { doc: baseDoc, page: 14 },
    { doc: secondary, page: 3 },
  ];

  const p = prompt.toLowerCase();
  let text: string;

  if (p.includes("risk")) {
    text = `Based on ${baseDoc}, the primary risks are concentrated in infrastructure cost growth and dependency on a single high-margin vertical. The report flags rising cloud-migration spend as the largest near-term pressure, while concentration risk in the AI-platform division is called out as a structural exposure. I'd prioritize a scenario analysis on both before finalizing Q4 targets.`;
  } else if (p.includes("change") || p.includes("quarter")) {
    text = `Compared with last quarter, ${baseDoc} shows revenue growth decelerating from 12.5% to 10.8%, driven by higher infrastructure and R&D investment. Operating-expense discipline held, but the margin profile is compressing slightly as we scale the platform. Net-net: top-line still growing, with mix shifting toward lower-margin but strategically important work.`;
  } else if (p.includes("action") || p.includes("item")) {
    text = `From ${baseDoc}, the open action items are: (1) finalize the Q4 cloud-cost budget with Finance, (2) complete the AI-platform concentration-risk memo before the board cycle, and (3) refresh the departmental expenditure model for the new market entries. None of these have a confirmed owner yet — I can draft owners if you want.`;
  } else {
    text = `I pulled the relevant sections from ${baseDoc}. The headline is that performance is trending positively, with the key figures on page 14 and page 3 backing it up. Ask me to drill into any specific metric, table, or section and I'll cite the exact page.`;
  }

  return { text, citations };
}

function TypingDots() {
  return (
    <div className="flex items-center gap-1">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="inline-block size-1.5 rounded-full"
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
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const timersRef = useRef<number[]>([]);

  const scopedDoc = docs?.find((d) => d.id === docId) ?? null;
  const scopeLabel = scopedDoc ? scopedDoc.title : "All documents";

  useEffect(() => {
    listDocuments().then(setDocs).catch(() => setDocs([]));
  }, []);

  useEffect(() => () => timersRef.current.forEach((t) => clearTimeout(t)), []);

  function patchMessage(id: string, patch: Partial<Message>) {
    setMessages((ms) => ms.map((m) => (m.id === id ? { ...m, ...patch } : m)));
  }

  function streamAnswer(messageId: string, prompt: string) {
    const { text, citations } = buildAnswer(prompt, scopedDoc?.title ?? null);
    const words = text.split(" ");
    const step = Math.max(1, Math.round(words.length / 36));
    let i = 0;

    const tick = () => {
      i += step;
      patchMessage(messageId, { text: words.slice(0, i).join(" ") });
      if (i >= words.length) {
        patchMessage(messageId, { streaming: false, citations });
        setBusy(false);
      } else {
        timersRef.current.push(window.setTimeout(tick, 45));
      }
    };

    // Let the typing dots be visible briefly before text starts streaming in.
    timersRef.current.push(window.setTimeout(tick, 500));
  }

  function send(raw: string) {
    const text = raw.trim();
    if (!text || busy) return;

    setBusy(true);
    setInput("");
    setMessages((ms) => [...ms, { id: uid(), role: "user", text }]);

    timersRef.current.push(
      window.setTimeout(() => {
        const asstId = uid();
        setMessages((ms) => [...ms, { id: asstId, role: "assistant", text: "", streaming: true }]);
        streamAnswer(asstId, text);
      }, 650),
    );
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
        {showSuggestions ? (
          <div className="mb-12 text-center">
            <h2 className="mb-4 text-2xl font-semibold tracking-tight">How can I help you today?</h2>
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
                    className="max-w-[80%] rounded-2xl rounded-tr-none px-4 py-3 text-sm leading-relaxed shadow-sm"
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
                      <>
                        <p className="text-sm leading-relaxed" style={{ color: "var(--foreground)" }}>
                          {m.text}
                        </p>
                        {!m.streaming && m.citations && m.citations.length > 0 && (
                          <div className="flex flex-wrap gap-2">
                            {m.citations.map((c, idx) => (
                              <span
                                key={idx}
                                className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider"
                                style={{ backgroundColor: "var(--muted)", color: "var(--foreground)" }}
                              >
                                <FileText className="size-3" /> {c.doc} · p.{c.page}
                              </span>
                            ))}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              ),
            )}
          </div>
        )}
      </main>

      {/* Composer — document-scoped */}
      <div
        className="fixed bottom-0 left-0 right-0 z-40 border-t bg-[var(--background)]"
        style={{ borderColor: "var(--muted)" }}
      >
        <div className="mx-auto max-w-4xl px-6 py-4">
          <div
            className="flex flex-col rounded-xl border shadow-sm focus-within:border-transparent focus-within:ring-2"
            style={{ backgroundColor: "var(--muted)", borderColor: "var(--muted)" }}
          >
            <div className="flex items-center justify-between px-4 pt-3">
              <button
                type="button"
                className="flex items-center gap-1.5 text-xs font-medium opacity-70 transition-opacity hover:opacity-100"
              >
                <Link2 className="size-3.5" style={{ color: "var(--accent)" }} />
                <span>Scoped to: {scopeLabel}</span>
                <ChevronDown className="size-3.5" />
              </button>
            </div>

            <div className="flex items-end gap-2 p-2">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={onComposerKey}
                rows={2}
                placeholder="Ask a question about this document..."
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
          </div>

          <p
            className="mt-2 text-center text-[10px] font-medium uppercase tracking-widest opacity-50"
            style={{ color: "var(--foreground)" }}
          >
            DocAssist can make mistakes. Verify important info.
          </p>
        </div>
      </div>
    </>
  );
}
