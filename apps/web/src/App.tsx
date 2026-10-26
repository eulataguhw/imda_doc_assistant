import { Navigate, Route, Routes, useLocation } from "react-router";
import { ROUTE_CHAT, ROUTE_KNOWLEDGE, ROUTE_LIBRARY } from "./lib/constants";
import { AppShell } from "./components/AppShell/AppShell";
import type { ActiveSection } from "./components/AppShell/types";
import { Toaster } from "./components/Toaster/Toaster";
import { KnowledgePage } from "./pages/KnowledgePage/KnowledgePage";
import { LibraryPage } from "./pages/LibraryPage/LibraryPage";
import { DocumentDetailPage } from "./pages/DocumentDetailPage/DocumentDetailPage";
import { ChatPage } from "./pages/ChatPage/ChatPage";

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
      <Routes>
        <Route path="/" element={<Navigate to={ROUTE_KNOWLEDGE} replace />} />
        <Route path={ROUTE_KNOWLEDGE} element={<KnowledgePage />} />
        <Route path={ROUTE_LIBRARY} element={<LibraryPage />} />
        <Route path="/documents/:id" element={<DocumentDetailPage />} />
        <Route path={ROUTE_CHAT} element={<ChatPage />} />
        <Route path="*" element={<Navigate to={ROUTE_KNOWLEDGE} replace />} />
      </Routes>
    </div>
  );
}
