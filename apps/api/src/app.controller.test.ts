import { describe, it, expect } from "vitest";
import { AppController } from "./app.controller";

describe("AppController (GET /api/health)", () => {
  it("reports status ok with a numeric uptime", () => {
    const res = new AppController().check();
    expect(res.status).toBe("ok");
    expect(typeof res.uptime).toBe("number");
    expect(res.uptime).toBeGreaterThanOrEqual(0);
  });

  it("is dependency-free (no injected service needed)", () => {
    // The health probe must stay constructible with no args so it works even if
    // downstream modules fail to initialize.
    expect(new AppController()).toBeInstanceOf(AppController);
  });
});
