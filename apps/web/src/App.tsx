import { Navigate, Route, Routes, useLocation } from "react-router";
import { AppShell } from "./components/AppShell";
import { LibraryPage } from "./pages/LibraryPage";
import { DocumentDetailPage } from "./pages/DocumentDetailPage";
import { ChatPage } from "./pages/ChatPage";

/** Routed views under a single shared shell (client-side SPA routing). */
export default function App() {
  const { pathname } = useLocation();
  // /chat and any /chat?docId=… scope highlight Chat; everything else (Library,
  // Document detail) highlights Library.
  const activeItem: "library" | "chat" = pathname.startsWith("/chat") ? "chat" : "library";

  return (
    <div className="flex min-h-screen flex-col bg-[var(--background)] text-[var(--foreground)]">
      <AppShell activeItem={activeItem} />
      <Routes>
        <Route path="/" element={<LibraryPage />} />
        <Route path="/library" element={<LibraryPage />} />
        <Route path="/documents/:id" element={<DocumentDetailPage />} />
        <Route path="/chat" element={<ChatPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
}
