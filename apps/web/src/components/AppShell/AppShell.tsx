import { Moon, Sun } from "lucide-react";
import { Link } from "react-router";
import { useTheme } from "next-themes";
import { LINK_BASE, NAV_ITEMS } from "./constants";
import type { AppShellProps } from "./types";

/**
 * Shared app shell (top navigation). Rendered once above the routed views so it
 * persists across Knowledge / Library / Document detail / Chat without remounting.
 * Logo invariant: a plain "DocAssist" wordmark — no `<img>`, SVG, or initials badge.
 */
export function AppShell({ activeItem }: AppShellProps) {
  const { resolvedTheme, setTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  /** Inactive links use `--text-secondary` (AA-passing); active links use `--accent`. */
  const linkClass = (active: boolean) =>
    `${LINK_BASE} ${active ? "font-medium [color:var(--accent)]" : "[color:var(--text-secondary)] hover:[color:var(--foreground)]"}`;

  return (
    <>
      {/* WCAG 2.4.1 bypass block: keyboard users can jump straight to the page content. */}
      <a href="#main" className="skip-link">
        Skip to content
      </a>
      <nav
        aria-label="Primary"
        className="flex flex-wrap items-center gap-x-2 gap-y-1 border-b px-4 py-2.5 sm:gap-2"
        style={{ borderColor: "var(--muted)" }}
      >
        <span className="mr-3 text-base font-semibold tracking-tight">DocAssist</span>

        {NAV_ITEMS.map(({ key, to, label, Icon }) => (
          <Link key={key} to={to} className={linkClass(activeItem === key)}>
            <Icon className="size-4" /> {label}
          </Link>
        ))}

        <button
          type="button"
          onClick={() => setTheme(isDark ? "light" : "dark")}
          className="ml-auto rounded-md p-2 opacity-70 transition-opacity hover:opacity-100"
          aria-label={isDark ? "Switch to light theme" : "Switch to dark theme"}
        >
          {isDark ? <Sun className="size-4" /> : <Moon className="size-4" />}
        </button>
      </nav>
    </>
  );
}
