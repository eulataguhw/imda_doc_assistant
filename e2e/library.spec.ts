import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
import path from "node:path";

const SAMPLE = path.resolve(__dirname, "fixtures/sample.pdf");

test.describe("Library — chat-uploaded documents only (no upload control)", () => {
  test("lists a chat doc, exposes no upload input, and can remove the doc", async ({
    page,
    request,
  }) => {
    // Create a chat-origin document via the API so we target it deterministically.
    const form = new FormData();
    form.append(
      "file",
      new Blob([readFileSync(SAMPLE)], { type: "application/pdf" }),
      "m8-lib.pdf"
    );
    const res = await request.post("/api/chat/documents", { multipart: form });
    expect(res.ok()).toBeTruthy();
    const body = (await res.json()) as { id: string; title: string; origin: string };
    expect(body.origin).toBe("chat");

    const removeBtn = page.getByRole("button", { name: `Remove chat document: ${body.title}` });

    await page.goto("/library");

    // The chat doc is listed (its remove control is present).
    await expect(removeBtn).toBeVisible({ timeout: 30_000 });

    // Library has NO upload control (no file input anywhere on the page).
    await expect(page.locator('input[type="file"]')).toHaveCount(0);

    // Remove it → its remove control disappears from the list.
    await removeBtn.click();
    await expect(removeBtn).toHaveCount(0, { timeout: 30_000 });
  });
});
