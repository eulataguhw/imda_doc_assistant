import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router";

vi.mock("../lib/api", () => ({
  listDocuments: vi.fn(),
  deleteDocument: vi.fn(async (_id: string) => {}),
  uploadDocumentFile: vi.fn(async () => ({})),
}));

import { KnowledgePage } from "./KnowledgePage";
import { listDocuments, deleteDocument } from "../lib/api";

const KNOWLEDGE_DOCS = [
  { id: "k1", title: "Annual Report", status: "ready", origin: "knowledge" },
  { id: "k2", title: "HR Policy", status: "ready", origin: "knowledge" },
];

describe("KnowledgePage (M8 / WEB-M8-8)", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    (listDocuments as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(KNOWLEDGE_DOCS);
  });

  it("lists knowledge-origin documents and exposes a delete control per doc", async () => {
    render(
      <MemoryRouter>
        <KnowledgePage />
      </MemoryRouter>,
    );
    expect(await screen.findByText("Annual Report")).toBeTruthy();
    expect(screen.getByText("HR Policy")).toBeTruthy();
    expect(listDocuments).toHaveBeenCalledWith("knowledge");
    expect(screen.getByRole("button", { name: /Delete knowledge document: Annual Report/ })).toBeTruthy();
  });

  it("deletes a document on click and reloads the list", async () => {
    render(
      <MemoryRouter>
        <KnowledgePage />
      </MemoryRouter>,
    );
    await screen.findByText("Annual Report");
    fireEvent.click(screen.getByRole("button", { name: /Delete knowledge document: Annual Report/ }));
    await waitFor(() => expect(deleteDocument).toHaveBeenCalledWith("k1"));
  });
});
