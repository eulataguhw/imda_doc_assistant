import { CITE_PREFIX } from "./constants";

/**
 * Rewrite bracket citation markers in LLM output — `[1]`, `[2]`, … — into
 * markdown links (`[1](#cite-1)`) so the Markdown renderer can turn each
 * `#cite-N` anchor into a clickable source chip.
 *
 * Limitation: this is a plain whole-string replace, so a literal `[n]` inside an
 * inline code span (or a real link whose text is a bare number) also becomes a
 * cite link. If that ever bites, rewrite only paragraph-level bracket nodes via
 * the remark AST instead of string-matching.
 */
export function citeLinks(markdown: string): string {
  return markdown.replace(/\[(\d+)\]/g, `[$1](${CITE_PREFIX}$1)`);
}
