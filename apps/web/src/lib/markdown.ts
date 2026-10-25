/**
 * Transform bracket citation markers in LLM output — `[1]`, `[2]`, … — into
 * markdown links (`[1](#cite-1)`, `[2](#cite-2)`). The renderer
 * (components/Markdown.tsx) resolves each `#cite-N` to the Nth source chip.
 *
 * PONYTAIL: a naive whole-string replace; ceiling: a literal `[n]` inside an
 * inline code span or a real link whose text is a bare number also becomes a
 * cite link; upgrade: walk the remark AST and only rewrite bracket nodes at
 * paragraph level; trigger: users report false-positive citation chips.
 */
export function citeLinks(markdown: string): string {
  return markdown.replace(/\[(\d+)\]/g, "[$1](#cite-$1)");
}
