/** Message author — the human ("user") or the assistant. */
export type Role = "user" | "assistant";

/** A source-document citation rendered as an inline [n] chip in an assistant message. */
export interface Citation {
  /** Document id the chip links to (/documents/:id). */
  doc: string;
  /** Document title (resolved server-side on the citation event). */
  title: string;
  /** PDF page number; absent for DOCX/legacy citations. */
  page?: number;
}

/** One turn in the visible chat transcript, newest last. */
export interface Message {
  id: string;
  role: Role;
  text: string;
  citations?: Citation[];
  /** True while the assistant stream for this message is still arriving. */
  streaming?: boolean;
}
