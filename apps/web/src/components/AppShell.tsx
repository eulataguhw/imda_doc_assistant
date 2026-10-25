import { BookOpen, Library, MessageSquare, Moon, Sun } from "lucide-react";
import { Link } from "react-router";
import { useTheme } from "next-themes";

interface AppShellProps {
  /** Which primary section is active; drives the highlighted nav link. */
  activeItem: "knowledge" | "library" | "chat";
}

const LINK_BASE = "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm transition-colors";

/**
 * Shared app shell (top navigation). Rendered once above the routed views so it
 * persists across Knowledge / Library / Document detail / Chat without remounting.
 * Logo invariant: a plain "DocAssist" wordmark — no <img>, SVG, or initials badge.
 * M8: three primary sections — Knowledge (RAG corpus), Library (chat uploads), Chat.
 */
export function AppShell({ activeItem }: AppShellProps) {
  const { resolvedTheme, setTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  // Inactive links use the AA-passing --text-secondary token (foreground+opacity
  // failed dark-theme AA at 2.35:1); active links use accent. M7 / WEB-M7-4.
  const linkClass = (active: boolean) =>
    `${LINK_BASE} ${active ? "font-medium [color:var(--accent)]" : "[color:var(--text-secondary)] hover:[color:var(--foreground)]"}`;

  return (
    <nav
      className="flex items-center gap-2 border-b px-4 py-2.5"
      style={{ borderColor: "var(--muted)" }}
    >
      <span className="mr-3 text-base font-semibold tracking-tight">DocAssist</span>

      <Link to="/knowledge" className={linkClass(activeItem === "knowledge")}>
        <BookOpen className="size-4" /> Knowledge
      </Link>

      <Link to="/library" className={linkClass(activeItem === "library")}>
        <Library className="size-4" /> Library
      </Link>

      <Link to="/chat" className={linkClass(activeItem === "chat")}>
        <MessageSquare className="size-4" /> Chat
      </Link>

      <button
        type="button"
        onClick={() => setTheme(isDark ? "light" : "dark")}
        className="ml-auto rounded-md p-2 opacity-70 transition-opacity hover:opacity-100"
        aria-label={isDark ? "Switch to light theme" : "Switch to dark theme"}
      >
        {isDark ? <Sun className="size-4" /> : <Moon className="size-4" />}
      </button>
    </nav>
  );
}
