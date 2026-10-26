# Layouts — doc-assistant (apps/web)

The app shell is a single top navigation bar rendered on every route, plus the provider stack in `main.tsx`. There is no sidebar, footer, or breadcrumb.

## App shell / top nav

- **File path**: `apps/web/src/App.tsx`
- **Renders**: sticky-feel top bar (3rem tall) with the "DocAssist" brand wordmark (left), two `NavLink`s (`/library`, `/chat`) with active-state opacity, and a theme toggle button (Moon icon) that flips light/dark via `next-themes`. Below it, the routed page fills `min-h-[calc(100vh-3rem)]`.

```tsx
import { NavLink, Route, Routes } from "react-router";
import { Moon } from "lucide-react";
import { useTheme } from "next-themes";
import LibraryPage from "./pages/LibraryPage";
import DocumentDetailPage from "./pages/DocumentDetailPage";
import ChatPage from "./pages/ChatPage";

export default function App() {
  const { resolvedTheme, setTheme } = useTheme();
  return (
    <div className="min-h-screen">
      <header
        className="flex h-12 items-center justify-between border-b px-4"
        style={{ borderColor: "var(--muted)" }}
      >
        <nav className="flex items-center gap-4">
          <span className="font-semibold tracking-tight">DocAssist</span>
          <NavLink
            to="/library"
            className={({ isActive }) =>
              `flex items-center rounded-md px-3 py-1.5 text-sm transition-opacity ${isActive ? "opacity-100" : "opacity-60 hover:opacity-100"}`
            }
          >
            Library
          </NavLink>
          <NavLink
            to="/chat"
            className={({ isActive }) =>
              `flex items-center rounded-md px-3 py-1.5 text-sm transition-opacity ${isActive ? "opacity-100" : "opacity-60 hover:opacity-100"}`
            }
          >
            Chat
          </NavLink>
        </nav>
        <button
          type="button"
          onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
          className="flex items-center gap-1.5 rounded-md px-2 py-1 text-sm opacity-80 hover:opacity-100"
        >
          <Moon size={16} />
        </button>
      </header>
      <main className="mx-auto max-w-4xl">
        <Routes>
          <Route path="/" element={<LibraryPage />} />
          <Route path="/library" element={<LibraryPage />} />
          <Route path="/documents/:id" element={<DocumentDetailPage />} />
          <Route path="/chat" element={<ChatPage />} />
        </Routes>
      </main>
    </div>
  );
}
```

## Provider stack (root)

- **File path**: `apps/web/src/main.tsx`
- **Renders**: React root wrapped in `StrictMode` → `ThemeProvider` (`attribute="class"`, `defaultTheme="system"`) → `BrowserRouter` → `App`. Imports `./styles/globals.css`.

```tsx
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router";
import { ThemeProvider } from "next-themes";
import App from "./App";
import "./styles/globals.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ThemeProvider attribute="class" defaultTheme="system">
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </ThemeProvider>
  </StrictMode>
);
```
