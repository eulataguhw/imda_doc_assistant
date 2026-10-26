import { describe, it, expect } from "vitest";
import { citeLinks } from "./markdown";

describe("citeLinks (M8 / WEB-M8-3)", () => {
  it("rewrites a bare [n] marker into a #cite-n markdown link", () => {
    expect(citeLinks("Revenue grew 20% [1] last year.")).toBe(
      "Revenue grew 20% [1](#cite-1) last year."
    );
  });

  it("rewrites every marker, including multiple and multi-digit ones", () => {
    expect(citeLinks("[1] and [2] and [10]")).toBe(
      "[1](#cite-1) and [2](#cite-2) and [10](#cite-10)"
    );
  });

  it("leaves text without numeric bracket markers unchanged", () => {
    const md = "**bold** and a list:\n- item";
    expect(citeLinks(md)).toBe(md);
  });

  it("does not touch markdown links whose text is not a bare number", () => {
    expect(citeLinks("[Docs](https://x.dev)")).toBe("[Docs](https://x.dev)");
  });
});
