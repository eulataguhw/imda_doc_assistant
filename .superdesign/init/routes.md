# Routes — doc-assistant (apps/web)

## Routing mode: config-based (react-router v8)

- `BrowserRouter` is mounted in `main.tsx`; the route table lives in `App.tsx`. No file-system routing, no server-rendered routes.

## Route map

| Path | Element | Summary |
| --- | --- | --- |
| `/` | `<Navigate to="/library" replace />` | Redirects to Library (default landing). |
| `/library` | `LibraryPage` | Document collection: live list from `GET /api/documents`, each row links to `/documents/:id` with a `StatusBadge`. Plain-text loading/error/empty states. No upload UI yet. |
| `/documents/:id` | `DocumentDetailPage` | Single document: back link, title, `StatusBadge`, mono id. No content preview or metadata (size/pages/date) yet. |
| `/chat` | `ChatPage` | **Stub** — only an `<h1>Chat</h1>`; streaming messages + citation chips land in M4. |

## Full router config (App.tsx, render section)

```tsx
<Routes>
  <Route path="/" element={<Navigate to="/library" replace />} />
  <Route path="/library" element={<LibraryPage />} />
  <Route path="/documents/:id" element={<DocumentDetailPage />} />
  <Route path="/chat" element={<ChatPage />} />
</Routes>
```

## Page → component dependency notes

- `LibraryPage` → `lib/api.ts#listDocuments`, `StatusBadge`, `react-router#Link`
- `DocumentDetailPage` → `lib/api.ts#listDocuments`, `useParams`, `StatusBadge`, `react-router#Link`
- `ChatPage` → none yet (stub)
