import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router";

vi.mock("../../lib/api", () => ({
  listDocuments: vi.fn(),
  deleteDocument: vi.fn(async (_id: string) => {}),
  uploadDocumentFile: vi.fn(async () => ({})),
}));

import { KnowledgePage } from "./KnowledgePage";
import { Toaster, useToastStore } from "../../components/Toaster/Toaster";
import { listDocuments, deleteDocument, uploadDocumentFile } from "../../lib/api";
import { useDocumentsStore } from "../../lib/stores/documents";

const KNOWLEDGE_DOCS = [
  { id: "k1", title: "Annual Report", status: "ready", origin: "knowledge" },
  { id: "k2", title: "HR Policy", status: "ready", origin: "knowledge" },
];

/** Mount the page with a live Toaster so handler toasts are asserted from the DOM. */
function renderPage() {
  return render(
    <MemoryRouter>
      <KnowledgePage />
      <Toaster />
    </MemoryRouter>
  );
}

const asFn = (fn: unknown) => fn as ReturnType<typeof vi.fn>;

describe("KnowledgePage (M8 / WEB-M8-8)", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    useToastStore.setState({ toasts: [] });
    useDocumentsStore.setState({ documents: [], loaded: false, error: null });
    asFn(listDocuments).mockResolvedValue(KNOWLEDGE_DOCS);
    asFn(deleteDocument).mockResolvedValue(undefined);
    asFn(uploadDocumentFile).mockResolvedValue({});
  });

  it("lists knowledge-origin documents and exposes a delete control per doc", async () => {
    renderPage();
    expect(await screen.findByText("Annual Report")).toBeTruthy();
    expect(screen.getByText("HR Policy")).toBeTruthy();
    // The store fetches the full library once; origin filtering is client-side.
    expect(listDocuments).toHaveBeenCalled();
    expect(
      screen.getByRole("button", { name: /Delete knowledge document: Annual Report/ })
    ).toBeTruthy();
  });

  it("deletes a document on click and reloads the list", async () => {
    renderPage();
    await screen.findByText("Annual Report");
    fireEvent.click(
      screen.getByRole("button", { name: /Delete knowledge document: Annual Report/ })
    );
    await waitFor(() => expect(deleteDocument).toHaveBeenCalledWith("k1"));
  });

  it("uploads a valid PDF via the file input and shows a success toast", async () => {
    const { container } = renderPage();
    await screen.findByText("Annual Report");
    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(["x"], "notes.pdf", { type: "application/pdf" });
    fireEvent.change(input, { target: { files: [file] } });
    await waitFor(() => expect(uploadDocumentFile).toHaveBeenCalledWith(file));
    expect(await screen.findByText(/uploaded/)).toBeTruthy();
  });

  it("rejects an unsupported file without calling the upload API", async () => {
    const { container } = renderPage();
    await screen.findByText("Annual Report");
    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(["x"], "notes.txt", { type: "text/plain" });
    fireEvent.change(input, { target: { files: [file] } });
    await waitFor(() => expect(uploadDocumentFile).not.toHaveBeenCalled());
    expect(await screen.findByText(/unsupported type/)).toBeTruthy();
  });

  it("shows an error toast when delete fails", async () => {
    asFn(deleteDocument).mockRejectedValue(new Error("500"));
    renderPage();
    await screen.findByText("Annual Report");
    fireEvent.click(
      screen.getByRole("button", { name: /Delete knowledge document: Annual Report/ })
    );
    expect(await screen.findByText(/Delete failed/)).toBeTruthy();
  });

  it("shows the empty state when there are no knowledge documents", async () => {
    asFn(listDocuments).mockResolvedValue([]);
    renderPage();
    expect(await screen.findByText(/No knowledge documents yet/)).toBeTruthy();
  });

  it("surfaces a load error with a Retry control that re-fetches", async () => {
    asFn(listDocuments).mockRejectedValueOnce(new Error("network down"));
    renderPage();
    expect(await screen.findByText(/network down/)).toBeTruthy();
    const retry = await screen.findByRole("button", { name: /Retry/ });
    fireEvent.click(retry);
    await waitFor(() => expect(listDocuments).toHaveBeenCalledTimes(2));
  });
});
