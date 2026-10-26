import type { Status } from "./types";

/** Semantic color token per status (defined in styles/globals.css). */
export const TOKEN: Record<Status, string> = {
  ready: "--ready",
  processing: "--processing",
  error: "--error",
};

/** Visible label per status. Single source for the pill text. */
export const LABEL: Record<Status, string> = {
  ready: "Ready",
  processing: "Processing",
  error: "Error",
};
