import { beforeEach, describe, expect, it } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { Toaster, toast, useToastStore } from "./Toaster";

beforeEach(() => {
  useToastStore.setState({ toasts: [] });
});

describe("toast store", () => {
  it("pushes a toast and removes it on dismiss", () => {
    toast("success", "Saved");
    expect(useToastStore.getState().toasts).toHaveLength(1);
    const id = useToastStore.getState().toasts[0].id;
    useToastStore.getState().dismiss(id);
    expect(useToastStore.getState().toasts).toHaveLength(0);
  });
});

describe("Toaster", () => {
  it("renders queued toasts and clears them on dismiss", () => {
    toast("error", "Upload failed");
    render(<Toaster />);
    expect(screen.getByText("Upload failed")).not.toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Dismiss notification" }));
    expect(useToastStore.getState().toasts).toHaveLength(0);
  });
});
