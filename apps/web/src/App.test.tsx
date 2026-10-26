import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";

const setTheme = vi.hoisted(() => vi.fn());
vi.mock("next-themes", () => ({ useTheme: () => ({ resolvedTheme: "light", theme: "light", setTheme }) }));
vi.mock("./lib/api", () => ({
  listDocuments: vi.fn().mockResolvedValue([]),
  listSessions: vi.fn().mockResolvedValue([]),
  createSession: vi.fn().mockResolvedValue({ id: "s1", title: "", createdAt: "", updatedAt: "" }),
  getSession: vi.fn().mockResolvedValue({ id: "s1", title: "", createdAt: "", updatedAt: "", messages: [] }),
  streamChat: vi.fn().mockResolvedValue(undefined),
  uploadChatDocument: vi.fn().mockResolvedValue({ id: "a1", title: "A", status: "ready" }),
  deleteDocument: vi.fn().mockResolvedValue(undefined),
}));

import App from "./App";

/** Render the full SPA at a given initial path (client-side routing under the shared shell). */
function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  );
}

/** The active nav link carries `font-medium`; inactive links do not. */
const isActive = (name: RegExp) => screen.getByRole("link", { name }).className.includes("font-medium");

describe("App routing + active nav (M8)", () => {
  it("highlights knowledge at /knowledge and dims the other sections", () => {
    renderAt("/knowledge");
    expect(isActive(/Knowledge/)).toBe(true);
    expect(isActive(/Library/)).toBe(false);
    expect(isActive(/Chat/)).toBe(false);
  });

  it("highlights library at /library", () => {
    renderAt("/library");
    expect(isActive(/Library/)).toBe(true);
    expect(isActive(/Knowledge/)).toBe(false);
    expect(isActive(/Chat/)).toBe(false);
  });

  it("highlights chat at /chat", () => {
    renderAt("/chat");
    expect(isActive(/Chat/)).toBe(true);
    expect(isActive(/Knowledge/)).toBe(false);
    expect(isActive(/Library/)).toBe(false);
  });

  it("redirects unknown routes to the knowledge section", () => {
    renderAt("/nope");
    expect(isActive(/Knowledge/)).toBe(true);
    expect(isActive(/Chat/)).toBe(false);
    expect(isActive(/Library/)).toBe(false);
  });
});
