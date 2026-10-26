# Pages — doc-assistant (apps/web)

Three pages, all client-rendered inside the shared `App.tsx` shell (top nav + `max-w-4xl` content column). Data source: `GET /api/documents` via `lib/api.ts#listDocuments`. No page-level state library in use (plain `useState`/`useEffect`).

## LibraryPage

- **File path**: `apps/web/src/pages/LibraryPage.tsx`
- **Description**: Document collection. Live list of documents; each row is a link to `/documents/:id` showing the truncated title and a `StatusBadge`. Explicit error / loading / empty states as plain text. No upload UI, no search, no grid yet.

```tsx
import { useEffect, useState } from "react";
import { Link } from "react-router";
import { listDocuments, type Document } from "../lib/api";
import { StatusBadge } from "../components/StatusBadge";

export function LibraryPage() {
  const [docs, setDocs] = useState<Document[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listDocuments()
      .then(setDocs)
      .catch((e) => setError(e instanceof Error ? e.message : String(e)));
  }, []);

  if (error) {
    return (
      <div className="space-y-3">
        <h1 className="text-2xl font-semibold">Library</h1>
        <p style={{ color: "var(--error)" }}>Failed to load documents: {error}</p>
      </div>
    );
  }

  if (docs === null) {
    return (
      <div className="space-y-3">
        <h1 className="text-2xl font-semibold">Library</h1>
        <p style={{ color: "var(--muted)" }}>Loading documents…</p>
      </div>
    );
  }

  if (docs.length === 0) {
    return (
      <div className="space-y-3">
        <h1 className="text-2xl font-semibold">Library</h1>
        <p>No documents yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Library</h1>
      <ul>
        {docs.map((doc, i) => (
          <li
            key={doc.id}
            style={i < docs.length - 1 ? { borderBottom: "1px solid var(--muted)" } : undefined}
          >
            <Link
              to={`/documents/${doc.id}`}
              className="flex items-center justify-between gap-4 py-3 hover:opacity-80"
            >
              <span className="truncate">{doc.title}</span>
              <StatusBadge status={doc.status} />
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
```

Dependencies:

- src/lib/api.ts
  - (no local imports — fetches `/api/documents`)
- src/components/StatusBadge.tsx
  - (no local imports)

## DocumentDetailPage

- **File path**: `apps/web/src/pages/DocumentDetailPage.tsx`
- **Description**: Single document view. Resolves the doc by `useParams().id` from the full list. States: error / not-found / loading / success (back link, title, `StatusBadge`, mono id). No content preview, no metadata (size/pages/date) yet.

```tsx
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router";
import { listDocuments, type Document } from "../lib/api";
import { StatusBadge } from "../components/StatusBadge";

export function DocumentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [doc, setDoc] = useState<Document | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listDocuments()
      .then((docs) => {
        const found = docs.find((d) => d.id === id) ?? null;
        if (found) setDoc(found);
        else setNotFound(true);
      })
      .catch((e) => setError(e instanceof Error ? e.message : String(e)));
  }, [id]);

  if (error) {
    return (
      <div className="space-y-3">
        <h1 className="text-2xl font-semibold">Document</h1>
        <p style={{ color: "var(--error)" }}>Failed to load: {error}</p>
        <Link to="/" className="inline-block text-sm" style={{ color: "var(--accent)" }}>
          ← Back to library
        </Link>
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="space-y-3">
        <h1 className="text-2xl font-semibold">Not found</h1>
        <p>No document with id “{id}”.</p>
        <Link to="/" className="inline-block text-sm" style={{ color: "var(--accent)" }}>
          ← Back to library
        </Link>
      </div>
    );
  }

  if (!doc) {
    return (
      <div className="space-y-3">
        <h1 className="text-2xl font-semibold">Document</h1>
        <p style={{ color: "var(--muted)" }}>Loading…</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Link to="/" className="inline-block text-sm" style={{ color: "var(--accent)" }}>
        ← Back to library
      </Link>
      <h1 className="text-2xl font-semibold">{doc.title}</h1>
      <div className="flex items-center gap-3">
        <StatusBadge status={doc.status} />
        <span className="font-mono text-sm" style={{ color: "var(--muted)" }}>
          {doc.id}
        </span>
      </div>
    </div>
  );
}
```

Dependencies:

- src/lib/api.ts
  - (no local imports — fetches `/api/documents`)
- src/components/StatusBadge.tsx
  - (no local imports)

## ChatPage

- **File path**: `apps/web/src/pages/ChatPage.tsx`
- **Description**: **Stub** (6 lines) — only a heading. M4 adds streaming messages and citation chips per the project roadmap; this is the primary design target.

```tsx
export function ChatPage() {
  return (
    <section className="flex min-h-[calc(100vh-3rem)] p-6">
      <h1>Chat</h1>
    </section>
  );
}
```

Dependencies:

- (none — stub; M4 adds SSE streaming client, message list, citation chips, scoped input)
