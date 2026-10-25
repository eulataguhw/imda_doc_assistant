import { Link } from "react-router";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import { FileText } from "lucide-react";
import { citeLinks } from "../lib/markdown";

/** A source citation chip (M8). `doc` is the document id the chip links to. */
interface Citation {
  doc: string;
  title: string;
  page?: number;
}

const CITE_PREFIX = "#cite-";

const chipClass =
  "mx-0.5 inline-flex items-center gap-1 rounded-md px-2 py-0.5 align-middle text-[11px] font-semibold transition-opacity hover:opacity-75";

/**
 * Render an assistant message as markdown (M8 / WEB-M8-3): headings, lists,
 * code, tables via remark-gfm, and inline `[n]` citation markers turned into
 * clickable source chips that link to /documents/:id.
 */
export function Markdown({ text, citations = [] }: { text: string; citations?: Citation[] }) {
  const components: Components = {
    a: ({ href, children }) => {
      if (href && href.startsWith(CITE_PREFIX)) {
        const n = Number.parseInt(href.slice(CITE_PREFIX.length), 10);
        const c = Number.isFinite(n) ? citations[n - 1] : undefined;
        if (c) {
          return (
            <Link
              to={`/documents/${encodeURIComponent(c.doc)}`}
              className={chipClass}
              style={{ backgroundColor: "var(--muted)", color: "var(--foreground)" }}
            >
              <FileText className="size-3" />
              {c.title}
              {typeof c.page === "number" ? ` · p.${c.page}` : ""}
            </Link>
          );
        }
        // No matching citation for this marker — render the bracket as plain text.
        return <span>{children}</span>;
      }
      // Regular (non-citation) link — rare in grounded answers; keep it clickable.
      return (
        <a href={href} rel="noreferrer" target="_blank">
          {children}
        </a>
      );
    },
  };

  return (
    <div className="chat-markdown text-sm leading-relaxed" style={{ color: "var(--foreground)" }}>
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {citeLinks(text)}
      </ReactMarkdown>
    </div>
  );
}
