import { describe, expect, it, vi } from "vitest";
import { render } from "@testing-library/react";
import { MemoryRouter } from "react-router";

const theme = vi.hoisted(() => ({ resolvedTheme: "light", setTheme: vi.fn() }));
vi.mock("next-themes", () => ({
  useTheme: () => theme,
}));

import type { ActiveSection } from "./types";
import { AppShell } from "./AppShell";

function renderShell(activeItem: ActiveSection) {
  return render(
    <MemoryRouter>
      <AppShell activeItem={activeItem} />
    </MemoryRouter>,
  );
}

describe("AppShell structural snapshot", () => {
  it("matches its committed markup (knowledge active)", () => {
    const { container } = renderShell("knowledge");
    expect(container).toMatchSnapshot();
  });

  it("matches its committed markup (chat active)", () => {
    const { container } = renderShell("chat");
    expect(container).toMatchSnapshot();
  });
});
