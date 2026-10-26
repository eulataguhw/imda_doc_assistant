/** A source citation chip (M8). `doc` is the document id the chip links to. */
export interface Citation {
  /** Document id; the chip navigates to `/documents/:id`. */
  doc: string;
  /** Visible source title shown on the chip. */
  title: string;
  /** Optional page number, rendered as `p.N` when present. */
  page?: number;
}

/** Props for {@link Markdown}. */
export interface MarkdownProps {
  /** Raw assistant markdown; may contain `[n]` citation markers. */
  text: string;
  /** Sources backing any `[n]` markers, in 1-based order. */
  citations?: Citation[];
}
