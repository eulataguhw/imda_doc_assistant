import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
import path from "node:path";

const SAMPLE = path.resolve(__dirname, "fixtures/sample.pdf");

test.describe("Knowledge — RAG documents (upload dropzone present)", () => {
  test("lists a knowledge doc, exposes an upload input, and can delete the doc", async ({
    page,
    request,
  }) => {
    // Create a knowledge-origin document via the RAG upload endpoint.
    const form = new FormData();
    form.append(
      "file",
      new Blob([readFileSync(SAMPLE)], { type: "application/pdf" }),
      "m8-know.pdf"
    );
    const res = await request.post("/api/documents/upload", { multipart: form });
    expect(res.ok()).toBeTruthy();
    const body = (await res.json()) as { id: string; title: string; origin: string };
    expect(body.origin).toBe("knowledge");

    const deleteBtn = page.getByRole("button", {
      name: `Delete knowledge document: ${body.title}`,
    });

    await page.goto("/knowledge");

    // The knowledge doc is listed (its delete control is present), even while "processing".
    await expect(deleteBtn).toBeVisible({ timeout: 30_000 });

    // Knowledge HAS an upload dropzone (a file input exists on the page).
    await expect(page.locator('input[type="file"]')).toHaveCount(1);

    // Delete it → its delete control disappears from the list.
    await deleteBtn.click();
    await expect(deleteBtn).toHaveCount(0, { timeout: 30_000 });
  });
});
