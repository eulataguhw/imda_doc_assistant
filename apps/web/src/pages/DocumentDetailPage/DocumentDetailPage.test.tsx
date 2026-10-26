import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router";

const listDocuments = vi.hoisted(() => vi.fn());
vi.mock("../../lib/api", () => ({ listDocuments: (...args: unknown[]) => listDocuments(...args) }));

import { DocumentDetailPage } from "./DocumentDetailPage";

function renderAt(id: string) {
  return render(
    <MemoryRouter initialEntries={[`/documents/${id}`]}>
      <Routes>
        <Route path="/documents/:id" element={<DocumentDetailPage />} />
      </Routes>
    </MemoryRouter>
  );
}

describe("DocumentDetailPage", () => {
  it("shows a not-found state when no document matches the id", async () => {
    listDocuments.mockResolvedValueOnce([]);
    renderAt("missing");
    expect(await screen.findByText("Not found")).not.toBeNull();
    expect(screen.getByRole("link", { name: /Back to knowledge/ }).getAttribute("href")).toBe(
      "/knowledge"
    );
  });

  it("renders a ready document with its status and a doc-scoped chat CTA", async () => {
    listDocuments.mockResolvedValueOnce([
      { id: "d1", title: "Annual Report", status: "ready", origin: "knowledge" },
    ]);
    renderAt("d1");
    expect(await screen.findByText("Annual Report")).not.toBeNull();
    expect(screen.getByText("Ready")).not.toBeNull();
    expect(screen.getByRole("link", { name: /Ask about this document/ }).getAttribute("href")).toBe(
      "/chat?docId=d1"
    );
  });

  it("surfaces the ingestion error reason for an errored document", async () => {
    listDocuments.mockResolvedValueOnce([
      { id: "d2", title: "Broken", status: "error", origin: "knowledge", errorReason: "corrupt" },
    ]);
    renderAt("d2");
    const matches = await screen.findAllByText(/corrupt/);
    expect(matches.length).toBeGreaterThan(0);
  });
});
