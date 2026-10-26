import type { ToastKind } from "./types";

/** How long a toast stays visible before auto-dismissing. */
export const AUTO_DISMISS_MS = 5000;

/** Accent token per toast kind (defined in styles/globals.css). */
export const KIND_COLOR: Record<ToastKind, string> = {
  success: "--ready",
  error: "--error",
};

/** Dismiss-icon opacity; 0.85 keeps the icon ≥ 3:1 against background in dark theme (M7 / WEB-M7-4). */
export const DISMISS_ICON_OPACITY = 0.85;
