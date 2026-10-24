import { Library, MessageSquare, Moon, Sun } from "lucide-react";
import { Link } from "react-router";
import { useTheme } from "next-themes";

interface AppShellProps {
  /** Which primary section is active; drives the highlighted nav link. */
  activeItem: "library" | "chat";
}

const LINK_BASE = "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm transition-opacity";

/**
 * Shared app shell (top navigation). Rendered once above the routed views so it
 * persists across Library / Document detail / Chat without remounting.
 * Logo invariant: a plain "DocAssist" wordmark — no <img>, SVG, or initials badge.
 */
export function AppShell({ activeItem }: AppShellProps) {
  const { resolvedTheme, setTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  const linkClass = (active: boolean) =>
    `${LINK_BASE} ${active ? "opacity-100 font-medium" : "opacity-60 hover:opacity-100"}`;

  return (
    <nav
      className="flex items-center gap-2 border-b px-4 py-2.5"
      style={{ borderColor: "var(--muted)" }}
    >
      <span className="mr-3 text-base font-semibold tracking-tight">DocAssist</span>

      <Link
        to="/library"
        className={linkClass(activeItem === "library")}
        style={activeItem === "library" ? { color: "var(--accent)" } : undefined}
      >
        <Library className="size-4" /> Library
      </Link>

      <Link
        to="/chat"
        className={linkClass(activeItem === "chat")}
        style={activeItem === "chat" ? { color: "var(--accent)" } : undefined}
      >
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
