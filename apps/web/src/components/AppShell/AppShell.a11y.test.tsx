import { describe, expect, it, vi } from "vitest";
import { render } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { axe, toHaveNoViolations } from "jest-axe";

const theme = vi.hoisted(() => ({ resolvedTheme: "light", setTheme: vi.fn() }));
vi.mock("next-themes", () => ({
  useTheme: () => theme,
}));

import type { ActiveSection } from "./types";
import { AppShell } from "./AppShell";

expect.extend(toHaveNoViolations);

function renderShell(activeItem: ActiveSection) {
  return render(
    <MemoryRouter>
      <AppShell activeItem={activeItem} />
    </MemoryRouter>
  );
}

describe("AppShell accessibility (jest-axe)", () => {
  it("renders with no axe violations", async () => {
    // The real index.html declares a lang attribute; mirror that in jsdom so the
    // html-has-lang rule reflects production rather than the bare test document.
    document.documentElement.setAttribute("lang", "en");
    const { container } = renderShell("knowledge");
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it("exposes a single main landmark and a labelled primary nav", async () => {
    document.documentElement.setAttribute("lang", "en");
    const { container } = renderShell("chat");
    const results = await axe(container);
    expect(results).toHaveNoViolations();
    // Landmark checks: one nav (primary) and the app-level main is provided by
    // App.tsx; here we assert the shell contributes exactly one labelled nav.
    const navs = container.querySelectorAll("nav");
    expect(navs.length).toBe(1);
    expect(navs[0].getAttribute("aria-label")).toMatch(/primary/i);
  });
});
