/** Visual tone of a toast (drives its accent color). */
export type ToastKind = "success" | "error";

/** A single toast entry in the queue. */
export interface Toast {
  /** Unique id used to target dismissal. */
  id: number;
  /** Tone of the toast. */
  kind: ToastKind;
  /** Visible message text. */
  message: string;
}

/** Zustand store shape for the app-wide toast queue. */
export interface ToastState {
  /** Active toasts, oldest first. */
  toasts: Toast[];
  /** Add a toast (auto-dismisses after the configured delay). */
  push: (kind: ToastKind, message: string) => void;
  /** Remove a toast by id. */
  dismiss: (id: number) => void;
}
