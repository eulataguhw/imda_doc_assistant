import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router";

vi.mock("../../lib/api", () => ({
  listDocuments: vi.fn(),
  deleteDocument: vi.fn(async (_id: string) => {}),
}));

import { LibraryPage } from "./LibraryPage";
import { listDocuments, deleteDocument } from "../../lib/api";
import { useDocumentsStore } from "../../lib/stores/documents";

const CHAT_DOCS = [{ id: "c1", title: "Uploaded Briefing", status: "ready", origin: "chat" }];

describe("LibraryPage (M8 / WEB-M8-9)", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    useDocumentsStore.setState({ documents: [], loaded: false, error: null });
    (listDocuments as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(CHAT_DOCS);
  });

  it("lists chat-origin documents and exposes a remove control per doc", async () => {
    render(
      <MemoryRouter>
        <LibraryPage />
      </MemoryRouter>
    );
    expect(await screen.findByText("Uploaded Briefing")).toBeTruthy();
    // The store fetches the full library once; origin filtering is client-side.
    expect(listDocuments).toHaveBeenCalled();
    expect(
      screen.getByRole("button", { name: /Remove chat document: Uploaded Briefing/ })
    ).toBeTruthy();
  });

  it("has NO upload/dropzone control (uploads happen in the Chat composer)", async () => {
    render(
      <MemoryRouter>
        <LibraryPage />
      </MemoryRouter>
    );
    await screen.findByText("Uploaded Briefing");
    expect(document.querySelector('input[type="file"]')).toBeNull();
  });

  it("removes a document on click", async () => {
    render(
      <MemoryRouter>
        <LibraryPage />
      </MemoryRouter>
    );
    await screen.findByText("Uploaded Briefing");
    fireEvent.click(
      screen.getByRole("button", { name: /Remove chat document: Uploaded Briefing/ })
    );
    await waitFor(() => expect(deleteDocument).toHaveBeenCalledWith("c1"));
  });
});
