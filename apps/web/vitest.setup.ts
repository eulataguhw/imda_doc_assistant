import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";

// @testing-library/react only auto-registers cleanup when a global afterEach is
// present; with vitest globals disabled we register it explicitly so every test
// starts with a clean DOM.
afterEach(() => {
  cleanup();
});
