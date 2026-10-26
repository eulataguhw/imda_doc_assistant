/** The primary navigation section currently in view (drives the highlighted link). */
export type ActiveSection = "knowledge" | "library" | "chat";

/** Props for {@link AppShell}. */
export interface AppShellProps {
  /** Which primary section is active; drives the highlighted nav link. */
  activeItem: ActiveSection;
}
