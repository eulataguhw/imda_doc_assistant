import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router";

vi.mock("../../lib/api", () => ({
  createSession: vi.fn(),
  getSession: vi.fn(),
  listDocuments: vi.fn(),
  listSessions: vi.fn(),
  streamChat: vi.fn(),
  uploadChatDocument: vi.fn(),
}));

import { ChatPage } from "./ChatPage";
import {
  createSession,
  getSession,
  listDocuments,
  listSessions,
  streamChat,
  uploadChatDocument,
} from "../../lib/api";
import { useSessionsStore } from "../../lib/stores/sessions";
import { useDocumentsStore } from "../../lib/stores/documents";
import { Toaster, useToastStore } from "../../components/Toaster/Toaster";

type StreamParams = {
  question: string;
  documentIds?: string[];
  attachments?: string[];
  sessionId?: string;
};
const lastStream = (): StreamParams => {
  const calls = (streamChat as unknown as ReturnType<typeof vi.fn>).mock.calls;
  return calls[calls.length - 1][0] as StreamParams;
};

function renderPage() {
  return render(
    <MemoryRouter>
      <ChatPage />
      <Toaster />
    </MemoryRouter>
  );
}

describe("ChatPage (M8)", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    useToastStore.setState({ toasts: [] });
    // Reset the global stores so each test starts from a clean conversation + library.
    useSessionsStore.setState({ sessions: [], loaded: false, activeId: null, messages: [] });
    useDocumentsStore.setState({ documents: [], loaded: false, error: null });
    (listDocuments as unknown as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    (listSessions as unknown as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    (createSession as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "s1",
      title: "",
      createdAt: "",
      updatedAt: "",
    });
    (uploadChatDocument as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "a1",
      title: "Brief",
      status: "ready",
    });
    (streamChat as unknown as ReturnType<typeof vi.fn>).mockImplementation(
      async (params: { onEvent?: (e: unknown) => void }) => {
        params.onEvent?.({ type: "chunk", data: { delta: "Hello from the model" } });
      }
    );
  });

  it("renders the empty state with suggestions and composer controls, loading knowledge docs", async () => {
    renderPage();
    expect(await screen.findByText("How can I help you today?")).toBeTruthy();
    expect(screen.getByRole("button", { name: /Summarize key risks/ })).toBeTruthy();
    expect(screen.getByRole("textbox")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Attach a PDF or DOCX" })).toBeTruthy();
    // The store fetches the full library once; origin filtering is client-side.
    expect(listDocuments).toHaveBeenCalled();
    expect(listSessions).toHaveBeenCalled();
  });

  it("sends a fresh question — lazily creates a session and streams the answer", async () => {
    renderPage();
    const ta = screen.getByRole("textbox");
    fireEvent.change(ta, { target: { value: "What changed this quarter?" } });
    fireEvent.click(screen.getByRole("button", { name: /Send message/ }));

    expect(await screen.findByText("What changed this quarter?")).toBeTruthy();
    expect(createSession).toHaveBeenCalledWith("What changed this quarter?");
    await waitFor(() => expect(streamChat).toHaveBeenCalled());
    const params = lastStream();
    expect(params.question).toBe("What changed this quarter?");
    expect(params.documentIds).toEqual([]);
    expect(await screen.findByText("Hello from the model")).toBeTruthy();
  });

  it("scopes the answer to a selected document before sending", async () => {
    (listDocuments as unknown as ReturnType<typeof vi.fn>).mockResolvedValue([
      { id: "d1", title: "Annual Report", status: "ready" },
    ]);
    renderPage();
    await screen.findByText("How can I help you today?");

    fireEvent.click(screen.getByRole("button", { name: /Scoped to:/ }));
    fireEvent.click(await screen.findByRole("button", { name: "Annual Report" }));

    const ta = screen.getByRole("textbox");
    fireEvent.change(ta, { target: { value: "Summarize the risks" } });
    fireEvent.keyDown(ta, { key: "Enter" });

    await waitFor(() => expect(streamChat).toHaveBeenCalled());
    expect(lastStream().documentIds).toEqual(["d1"]);
  });

  it("attaches an uploaded PDF/DOCX and exposes a remove control", async () => {
    renderPage();
    const file = new File(["abc"], "brief.pdf", { type: "application/pdf" });
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(input, { target: { files: [file] } });

    expect(await screen.findByText("Brief")).toBeTruthy();
    expect(uploadChatDocument).toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Remove Brief" })).toBeTruthy();
  });

  it("rejects a non-PDF/DOCX attachment without uploading", () => {
    renderPage();
    const file = new File(["x"], "notes.txt", { type: "text/plain" });
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(input, { target: { files: [file] } });
    expect(uploadChatDocument).not.toHaveBeenCalled();
  });

  it("renders a past conversation transcript when a session is reopened", async () => {
    (listSessions as unknown as ReturnType<typeof vi.fn>).mockResolvedValue([
      { id: "s9", title: "Old Q2 review", createdAt: "", updatedAt: "" },
    ]);
    (getSession as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "s9",
      title: "Old Q2 review",
      createdAt: "",
      updatedAt: "",
      messages: [
        { id: "m1", role: "user", content: "What changed?", createdAt: "" },
        {
          id: "m2",
          role: "assistant",
          content: "Q2 improved margins.",
          citations: [{ documentId: "d1", title: "Annual Report", page: 3 }],
          createdAt: "",
        },
      ],
    });

    renderPage();
    const select = await screen.findByLabelText("Past conversations");
    fireEvent.change(select, { target: { value: "s9" } });

    expect(await screen.findByText("What changed?")).toBeTruthy();
    expect(await screen.findByText("Q2 improved margins.")).toBeTruthy();
  });

  it("renders past conversations with relative timestamps (formatWhen branches)", async () => {
    const now = Date.now();
    (listSessions as unknown as ReturnType<typeof vi.fn>).mockResolvedValue([
      { id: "t1", title: "Fresh", updatedAt: new Date(now).toISOString() },
      { id: "t2", title: "FiveMin", updatedAt: new Date(now - 5 * 60_000).toISOString() },
      { id: "t3", title: "ThreeHour", updatedAt: new Date(now - 3 * 3_600_000).toISOString() },
      { id: "t4", title: "TwoDay", updatedAt: new Date(now - 2 * 86_400_000).toISOString() },
      { id: "t5", title: "TenDay", updatedAt: new Date(now - 10 * 86_400_000).toISOString() },
      { id: "t6", title: "BadDate", updatedAt: "not-a-date" },
    ]);
    renderPage();
    expect(await screen.findByLabelText("Past conversations")).toBeTruthy();
    expect(await screen.findByText("Fresh — just now")).toBeTruthy();
    expect(screen.getByText("FiveMin — 5m ago")).toBeTruthy();
    expect(screen.getByText("ThreeHour — 3h ago")).toBeTruthy();
    expect(screen.getByText("TwoDay — 2d ago")).toBeTruthy();
  });

  it("attaches a valid PDF and removes it again", async () => {
    const { container } = renderPage();
    await screen.findByText("How can I help you today?");
    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(input, {
      target: { files: [new File(["x"], "brief.pdf", { type: "application/pdf" })] },
    });
    expect(await screen.findByText("Brief")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Remove Brief" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Remove Brief" }));
    await waitFor(() => expect(screen.queryByRole("button", { name: "Remove Brief" })).toBeNull());
  });

  it("rejects a non-PDF/DOCX attachment without calling the upload API", async () => {
    const { container } = renderPage();
    await screen.findByText("How can I help you today?");
    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(input, {
      target: { files: [new File(["x"], "notes.txt", { type: "text/plain" })] },
    });
    await waitFor(() => expect(uploadChatDocument).not.toHaveBeenCalled());
    expect(await screen.findByText(/Only PDF and DOCX files can be attached/)).toBeTruthy();
  });

  it("surfaces a stream failure when the chat request rejects", async () => {
    (streamChat as unknown as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
      new Error("model offline")
    );
    renderPage();
    const ta = screen.getByRole("textbox");
    fireEvent.change(ta, { target: { value: "Hi?" } });
    fireEvent.click(screen.getByRole("button", { name: /Send message/ }));
    expect(await screen.findByText(/the answer stream failed/)).toBeTruthy();
  });

  it("leaves the in-flight message untouched when the stream is aborted", async () => {
    (streamChat as unknown as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
      new DOMException("Aborted", "AbortError")
    );
    renderPage();
    const ta = screen.getByRole("textbox");
    fireEvent.change(ta, { target: { value: "Hi?" } });
    fireEvent.click(screen.getByRole("button", { name: /Send message/ }));
    await waitFor(() => expect(streamChat).toHaveBeenCalled());
    await new Promise((r) => setTimeout(r, 10));
    expect(screen.queryByText(/the answer stream failed/)).toBeNull();
  });

  it("sends a question from a suggestion chip", async () => {
    renderPage();
    await screen.findByText("How can I help you today?");
    fireEvent.click(screen.getByRole("button", { name: /Summarize key risks/ }));
    await waitFor(() => expect(streamChat).toHaveBeenCalled());
    expect(lastStream().question).toBe("Summarize key risks");
  });
});
