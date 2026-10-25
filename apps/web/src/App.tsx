import { Navigate, Route, Routes, useLocation } from "react-router";
import { AppShell } from "./components/AppShell";
import { Toaster } from "./components/Toaster";
import { KnowledgePage } from "./pages/KnowledgePage";
import { LibraryPage } from "./pages/LibraryPage";
import { DocumentDetailPage } from "./pages/DocumentDetailPage";
import { ChatPage } from "./pages/ChatPage";

/** Routed views under a single shared shell (client-side SPA routing). */
export default function App() {
  const { pathname } = useLocation();
  // M8: three primary sections. /chat → Chat; /library → chat-origin docs;
  // everything else (Knowledge, document detail) highlights Knowledge.
  const activeItem: "knowledge" | "library" | "chat" = pathname.startsWith("/chat")
    ? "chat"
    : pathname.startsWith("/library")
      ? "library"
      : "knowledge";

  return (
    <div className="flex min-h-screen flex-col bg-[var(--background)] text-[var(--foreground)]">
      <AppShell activeItem={activeItem} />
      <Toaster />
      <Routes>
        <Route path="/" element={<Navigate to="/knowledge" replace />} />
        <Route path="/knowledge" element={<KnowledgePage />} />
        <Route path="/library" element={<LibraryPage />} />
        <Route path="/documents/:id" element={<DocumentDetailPage />} />
        <Route path="/chat" element={<ChatPage />} />
        <Route path="*" element={<Navigate to="/knowledge" replace />} />
      </Routes>
    </div>
  );
}
