import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
import path from "node:path";

const SAMPLE = path.resolve(__dirname, "fixtures/sample.pdf");
const payload = () => ({
  name: "sample.pdf",
  mimeType: "application/pdf",
  buffer: readFileSync(SAMPLE),
});

/**
 * Local-LLM streaming headroom. The llama.cpp model is a slow reasoning model on
 * CPU (~100s for a 16-token completion), so a real RAG answer can take several
 * minutes. These waits are LLM-bound; non-streaming assertions keep small timeouts.
 */
const STREAM_TIMEOUT = 480_000;

/** Wait until the streamed assistant reply has real content (not the typing-dots placeholder). */
async function expectAnswered(page: import("@playwright/test").Page, timeout = STREAM_TIMEOUT) {
  const assistant = page.locator(".space-y-8 > div").nth(1);
  await expect(async () => {
    const text = (await assistant.textContent()) ?? "";
    expect(text.trim().length).toBeGreaterThan(20);
  }).toPass({ timeout });
}

test.describe("Chat — M8 direct mode, RAG mode, and session history", () => {
  test("direct: attach a PDF in chat, ask, get an answer with an inline source citation", async ({
    page,
  }) => {
    await page.goto("/chat");

    // Attach the sample PDF via the (hidden) file input driven by the Attach button.
    await page.locator('input[type="file"]').setInputFiles(payload());
    // Attachment registered → composer switches to "attached document" mode.
    await expect(page.locator("textarea")).toHaveAttribute("placeholder", /attached document/i, {
      timeout: 30_000,
    });

    await page.locator("textarea").fill("How much did quarterly revenue grow?");
    await page.getByRole("button", { name: "Send message" }).click();

    // The streamed answer must render an inline citation chip linking to the source document.
    const cite = page.locator('a[href^="/documents/"]').first();
    await expect(cite).toBeVisible({ timeout: STREAM_TIMEOUT });
    await expect(cite).toHaveAttribute(
      "href",
      /^\/documents\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    );
    // And the answer itself has real content.
    await expectAnswered(page);
  });

  test("RAG: no attachment → an answer is retrieved from the knowledge base and streamed", async ({
    page,
  }) => {
    await page.goto("/chat");
    await page.locator("textarea").fill("What can DocAssist help me with?");
    await page.getByRole("button", { name: "Send message" }).click();

    // User bubble + a non-empty assistant reply stream in without any attachment.
    await expect(page.locator(".space-y-8 > div")).toHaveCount(2, { timeout: STREAM_TIMEOUT });
    await expectAnswered(page);
  });

  test("sessions: start a conversation, then revisit it from the past-conversations list", async ({
    page,
  }) => {
    await page.goto("/chat");

    // Create a session by asking one direct-mode question.
    await page.locator('input[type="file"]').setInputFiles(payload());
    await expect(page.locator("textarea")).toHaveAttribute("placeholder", /attached document/i, {
      timeout: 30_000,
    });
    await page.locator("textarea").fill("Summarize the report in one sentence.");
    await page.getByRole("button", { name: "Send message" }).click();
    await expect(page.locator('a[href^="/documents/"]').first()).toBeVisible({ timeout: STREAM_TIMEOUT });

    // Start a fresh conversation → the transcript clears.
    await page.getByRole("button", { name: "New conversation" }).click();
    await expect(page.locator(".space-y-8")).toHaveCount(0, { timeout: 15_000 });

    // The past-conversations control now lists the session we just created.
    const past = page.locator('select[aria-label="Past conversations"]');
    await expect(past).toBeVisible({ timeout: 15_000 });
    await expect(past.locator("option").first()).toHaveValue(/^[0-9a-f]{8}-/i);

    // Revisit it → the prior transcript (user Q + cited assistant A) renders again.
    // This is a stored-transcript load (single API GET, no new LLM call) — modest headroom.
    await past.selectOption({ index: 0 });
    await expect(page.locator('a[href^="/documents/"]').first()).toBeVisible({ timeout: 120_000 });
  });
});
