import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { StatusBadge } from "./StatusBadge";

describe("StatusBadge", () => {
  it("renders a solid pill with the status label and token background", () => {
    const { container } = render(<StatusBadge status="ready" />);
    expect(screen.queryByText("Ready")).not.toBeNull();
    const pill = container.querySelector<HTMLElement>("span");
    expect(pill?.style.backgroundColor).toBe("var(--ready)");
  });

  it("renders a soft pill with a colored dot indicator", () => {
    const { container } = render(<StatusBadge status="error" variant="soft" />);
    expect(screen.queryByText("Error")).not.toBeNull();
    const spans = container.querySelectorAll<HTMLElement>("span");
    expect(spans.length).toBeGreaterThanOrEqual(2);
    /** The trailing span is the dot, colored with the error token. */
    expect(spans[spans.length - 1].style.backgroundColor).toBe("var(--error)");
  });

  it("labels each status distinctly", () => {
    render(<StatusBadge status="processing" />);
    expect(screen.queryByText("Processing")).not.toBeNull();
  });
});
