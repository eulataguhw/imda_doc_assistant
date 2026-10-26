import { describe, expect, it, vi, beforeEach } from "vitest";
import type { ReactElement } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";

const theme = vi.hoisted(() => ({ resolvedTheme: "light", setTheme: vi.fn() }));
vi.mock("next-themes", () => ({
  useTheme: () => theme,
}));

import { AppShell } from "./AppShell";

function renderWithRouter(ui: ReactElement) {
  return render(<MemoryRouter>{ui}</MemoryRouter>);
}

describe("AppShell", () => {
  beforeEach(() => {
    theme.resolvedTheme = "light";
    theme.setTheme.mockClear();
  });

  it("renders the three primary nav links with their labels and routes", () => {
    renderWithRouter(<AppShell activeItem="knowledge" />);
    expect(screen.getByRole("link", { name: /Knowledge/ }).getAttribute("href")).toBe("/knowledge");
    expect(screen.getByRole("link", { name: /Library/ }).getAttribute("href")).toBe("/library");
    expect(screen.getByRole("link", { name: /Chat/ }).getAttribute("href")).toBe("/chat");
  });

  it("marks the active nav item and offers a dark-theme toggle in light mode", () => {
    renderWithRouter(<AppShell activeItem="chat" />);
    expect(screen.getByRole("link", { name: /Chat/ }).className).toContain("font-medium");
    fireEvent.click(screen.getByRole("button", { name: "Switch to dark theme" }));
    expect(theme.setTheme).toHaveBeenCalledWith("dark");
  });

  it("offers a light-theme toggle when already in dark mode", () => {
    theme.resolvedTheme = "dark";
    renderWithRouter(<AppShell activeItem="library" />);
    fireEvent.click(screen.getByRole("button", { name: "Switch to light theme" }));
    expect(theme.setTheme).toHaveBeenCalledWith("light");
  });
});
