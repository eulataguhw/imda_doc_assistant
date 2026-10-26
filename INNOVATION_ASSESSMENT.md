# Innovation Assessment

A first-person account of the engineering decisions I found most interesting in this build — and the tradeoffs behind them. This is not a feature list; it's about *why* the system is shaped the way it is, where I made non-obvious choices, and where I'm honest about what I left out.

## The core tension I was designing against

The brief asks for two things that usually pull in opposite directions: **production-quality frontend polish** and a **genuine Gen AI streaming experience**. Most "AI document assistant" demos treat the model as a black box you `fetch` once and render — which makes the streaming, citations, and error handling feel bolted on. My goal was to make those three things *load-bearing* parts of the architecture rather than decorations, while keeping the whole thing runnable locally with no API keys.

## One continuous streaming loop, not a fetch-and-render

The most consequential decision was how I drew the boundary between "the model" and "the app." Rather than treating chat as `POST → JSON → render`, I modeled it as a **single long-lived SSE conversation** that carries three kinds of event — *citations*, *deltas*, and a *terminal* frame — over one connection.

That forces several decisions to be made deliberately:

- **Citations arrive before the answer.** The server emits each retrieved context item first, so the UI can surface "this is grounded in these sources" as the tokens land, instead of re-parsing the final text for references afterward. Citations are part of the protocol, not a post-hoc extraction.
- **The error taxonomy depends on where you are in the stream.** Before headers flush, a failure is a normal HTTP 502 with a JSON body — the client handles it like any request error. *After* headers flush, the connection is open and can't change status, so a mid-stream failure becomes an in-band SSE `error` frame. The client treats both identically ("show a friendly message"), but the server has to know which channel is available at that moment. Getting this right was more work than it looks, because a naive implementation either hangs the UI or shows a raw stack trace depending on *when* the model drops.
- **Client disconnect cancels upstream generation.** When the user navigates away mid-answer, I cancel the model's response body server-side so we stop paying for tokens that will never be read. That's a small line of code but it's the difference between a demo and something you'd leave running.

## Two trust domains, not one document list

I separated documents into two **origins** — `knowledge` (RAG corpus) and `chat` (documents attached to a specific conversation) — and that separation drives real behavior, not just a label:

- Knowledge documents are chunked, embedded, and indexed in Qdrant; chat documents are stored whole and served directly without retrieval.
- Deleting a knowledge document also deletes its vector points; deleting a chat document does not (there are none).
- The Library view shows *only* chat-origin docs and deliberately exposes **no upload control**, while Knowledge owns the upload dropzone. This is an intentional UI invariant — two different mental models for "a file I uploaded" — and it's enforced in code, tested in e2e, and asserted both ways (dropzone present on one view, absent on the other).

I could have collapsed this into a single list with a flag. Keeping them as first-class origins made the retrieval-vs-direct paths honest instead of conditional spaghetti.

## Provider abstraction that actually holds up

The LLM layer speaks **OpenAI-compatible HTTP** (`/chat/completions` with `stream: true`, `/embeddings`). That one seam is what lets the same code run against llama.cpp on `:8888`, Ollama on `:11434`, or a hosted endpoint — chosen purely by `LLM_BASE_URL` / `LLM_MODEL`. A few details made it real rather than aspirational:

- **The auth header is conditional.** I only send `Authorization: Bearer …` when `LLM_API_KEY` is set, because local llama.cpp/Ollama servers don't expect one and some reject the request for an unexpected header. It's a one-liner that would otherwise be a "works in my demo, fails in CI" bug.
- **Embeddings can live on a different box than chat.** `EMBED_BASE_URL` defaults to the chat base URL but can diverge — which is how you'd run cheap local embeddings while using a hosted model for generation.
- **No native driver dependency.** The API uses Node's built-in `node:sqlite`, so there's no `better-sqlite3` rebuild step and no platform-specific build matrix to babysit in Docker.

The honest limit of the indexing queue: it's an in-process FIFO, so a restart can't finish a job that was mid-flight. I handle this explicitly — on module init, any row still marked `processing` (orphaned by a prior process) is reconciled rather than left dangling forever. That's a deliberate "good enough for local-first" choice; a durable queue would be the upgrade path if this ever needed to survive horizontal scaling.

## State as a first-class citizen

The frontend keeps all shared state in **two Zustand stores** (documents, sessions) created with the curried `create<State>()` form, and I was careful about a subtle trap: selectors must return **stable references**, not fresh arrays, or `useSyncExternalStore` re-renders on every store touch. Deriving filtered slices in the render body instead of inside the selector is what keeps navigation cheap.

The payoff is that state **survives route changes** because it lives outside the component tree: leave Chat, go to Library, come back — the conversation and document list are exactly where you left them, with no remount flicker and no duplicated copies of "the documents." This was a deliberate rejection of per-component `useState` for anything shared, which is where most React apps accumulate stale-state bugs.

## What I chose *not* to build

Honesty about scope matters as much as what's present:

- **No embedded PDF passage viewer.** Citations link to the source document's detail view; there's no in-PDF scroll-to-and-highlight of the exact cited passage. That would be the natural next step and I'd rather ship clean citations than a half-finished viewer.
- **No model picker in the UI.** The chat model is fixed via config. Adding a dropdown without also handling per-model token limits, context windows, and streaming quirks would be false flexibility.
- **Snapshot and jest-axe suites are present as dependencies but not yet wired in.** I'd rather grow them deliberately than add churn; structural accessibility assertions (roles, labels, live regions) already gate the current behavior.

## What I'm proudest of

The thing that surprised me is how much *coherence* falls out when you refuse to treat the model as a black box. Once streaming, citations, error handling, and provider choice are all expressed through one explicit protocol and one config seam, the whole system becomes testable LLM-free (stub the boundary) *and* runnable locally (point it at a real server) — two properties that usually require separate code paths. That's the part I'd point to first if asked what makes this more than a demo.
