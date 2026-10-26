import { lazy, Suspense } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router";
import { ROUTE_CHAT, ROUTE_KNOWLEDGE, ROUTE_LIBRARY } from "./lib/constants";
import { AppShell } from "./components/AppShell/AppShell";
import type { ActiveSection } from "./components/AppShell/types";
import { Toaster } from "./components/Toaster/Toaster";

/**
 * Route-level code splitting (ARCH-4): each page is a lazy module so Vite emits
 * one chunk per route and the initial bundle only ships the shared shell + the
 * first route. The fallback is an accessible, reduced-motion-safe status node —
 * no spinner animation to respect `prefers-reduced-motion`.
 */
const KnowledgePage = lazy(() =>
  import("./pages/KnowledgePage/KnowledgePage").then((m) => ({ default: m.KnowledgePage }))
);
const LibraryPage = lazy(() =>
  import("./pages/LibraryPage/LibraryPage").then((m) => ({ default: m.LibraryPage }))
);
const DocumentDetailPage = lazy(() =>
  import("./pages/DocumentDetailPage/DocumentDetailPage").then((m) => ({
    default: m.DocumentDetailPage,
  }))
);
const ChatPage = lazy(() =>
  import("./pages/ChatPage/ChatPage").then((m) => ({ default: m.ChatPage }))
);

/** Accessible "view is loading" placeholder shown while a route chunk resolves. */
function RouteFallback() {
  return (
    <div role="status" aria-busy="true" className="flex min-h-[40vh] items-center justify-center">
      <span className="text-sm font-medium" style={{ color: "var(--text-secondary)" }}>
        Loading…
      </span>
    </div>
  );
}

/** Routed views under a single shared shell (client-side SPA routing). */
export default function App() {
  const { pathname } = useLocation();

  /** M8: three primary sections — /chat → chat, /library → library, everything else highlights knowledge. */
  const activeItem: ActiveSection = pathname.startsWith(ROUTE_CHAT)
    ? "chat"
    : pathname.startsWith(ROUTE_LIBRARY)
      ? "library"
      : "knowledge";

  return (
    <div className="flex min-h-screen flex-col bg-[var(--background)] text-[var(--foreground)]">
      <AppShell activeItem={activeItem} />
      <Toaster />
      {/* Primary content landmark; the skip link (in AppShell) targets #main. */}
      <main id="main" tabIndex={-1} className="flex-1 outline-none">
        <Suspense fallback={<RouteFallback />}>
          <Routes>
            <Route path="/" element={<Navigate to={ROUTE_KNOWLEDGE} replace />} />
            <Route path={ROUTE_KNOWLEDGE} element={<KnowledgePage />} />
            <Route path={ROUTE_LIBRARY} element={<LibraryPage />} />
            <Route path="/documents/:id" element={<DocumentDetailPage />} />
            <Route path={ROUTE_CHAT} element={<ChatPage />} />
            <Route path="*" element={<Navigate to={ROUTE_KNOWLEDGE} replace />} />
          </Routes>
        </Suspense>
      </main>
    </div>
  );
}
