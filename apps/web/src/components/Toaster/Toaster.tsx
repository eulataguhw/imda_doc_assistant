import { X } from "lucide-react";
import { create } from "zustand";
import { AUTO_DISMISS_MS, DISMISS_ICON_OPACITY, KIND_COLOR } from "./constants";
import type { ToastKind, ToastState } from "./types";

let nextId = 1;

/** App-wide toast store — fire from anywhere with `toast("success" | "error", msg)`. */
export const useToastStore = create<ToastState>()((set) => ({
  toasts: [],
  push: (kind, message) => {
    const id = nextId++;
    set((s) => ({ toasts: [...s.toasts, { id, kind, message }] }));
    setTimeout(() => useToastStore.getState().dismiss(id), AUTO_DISMISS_MS);
  },
  dismiss: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));

/** Convenience wrapper for non-component call sites (upload handlers, api helpers). */
export function toast(kind: ToastKind, message: string) {
  useToastStore.getState().push(kind, message);
}

/** Fixed bottom-right viewport; mount once in App.tsx. */
export function Toaster() {
  const toasts = useToastStore((s) => s.toasts);
  const dismiss = useToastStore((s) => s.dismiss);

  return (
    <div
      aria-live="polite"
      className="fixed bottom-4 right-4 z-50 flex w-80 max-w-[calc(100vw-2rem)] flex-col gap-2"
    >
      {toasts.map((t) => (
        <div
          key={t.id}
          role="status"
          className="flex items-start gap-3 rounded-lg border bg-[var(--background)] p-3 shadow-lg"
          style={{ borderColor: `color-mix(in oklab, var(${KIND_COLOR[t.kind]}) 40%, transparent)` }}
        >
          <span
            className="mt-1 size-2 shrink-0 rounded-full"
            style={{ backgroundColor: `var(${KIND_COLOR[t.kind]})` }}
          />
          <p className="min-w-0 flex-1 break-words text-sm">{t.message}</p>
          <button
            type="button"
            aria-label="Dismiss notification"
            onClick={() => dismiss(t.id)}
            className="shrink-0 rounded p-0.5 hover:opacity-100"
            style={{ color: "var(--foreground)", opacity: DISMISS_ICON_OPACITY }}
          >
            <X className="size-4" />
          </button>
        </div>
      ))}
    </div>
  );
}
