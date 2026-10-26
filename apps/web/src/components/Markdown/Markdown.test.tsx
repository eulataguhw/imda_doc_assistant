import { describe, it, expect } from "vitest";
import type { ReactElement } from "react";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { Markdown } from "./Markdown";

function renderWithRouter(ui: ReactElement) {
  return render(<MemoryRouter>{ui}</MemoryRouter>);
}

describe("Markdown (M8 / WEB-M8-3)", () => {
  it("renders an [n] citation as a chip linking to /documents/:id with title + page", () => {
    renderWithRouter(
      <Markdown
        text="Revenue grew 20% [1]."
        citations={[{ doc: "d1", title: "Annual Report", page: 3 }]}
      />
    );
    const chip = screen.getByRole("link", { name: /Annual Report/ });
    expect(chip.getAttribute("href")).toBe("/documents/d1");
    expect(chip.textContent).toContain("p.3");
  });

  it("renders a bracket marker with no matching citation as plain text (no link)", () => {
    renderWithRouter(<Markdown text="Cite [9] but it is absent." citations={[]} />);
    expect(screen.queryByRole("link")).toBeNull();
  });

  it("renders a regular markdown link as an external anchor", () => {
    renderWithRouter(<Markdown text="See [the docs](https://example.dev)." citations={[]} />);
    const a = screen.getByRole("link", { name: "the docs" });
    expect(a.getAttribute("href")).toBe("https://example.dev");
    expect(a.getAttribute("target")).toBe("_blank");
  });

  it("renders markdown structure (heading, list) via remark-gfm", () => {
    renderWithRouter(<Markdown text={"## Title\n- one\n- two"} citations={[]} />);
    const h = screen.getByRole("heading", { level: 2 });
    expect(h.textContent).toBe("Title");
    expect(screen.getAllByRole("listitem")).toHaveLength(2);
  });
});
