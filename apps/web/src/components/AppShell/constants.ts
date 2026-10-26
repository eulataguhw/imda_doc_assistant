import { BookOpen, Library, MessageSquare } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { ROUTE_CHAT, ROUTE_KNOWLEDGE, ROUTE_LIBRARY } from "../../lib/constants";
import type { ActiveSection } from "./types";

/** A single top-nav entry: its route target, label and icon. */
export interface NavItem {
  /** Which section this link activates (matches `AppShellProps.activeItem`). */
  key: ActiveSection;
  /** Route the link navigates to. */
  to: string;
  /** Visible link text. */
  label: string;
  /** Icon rendered before the label. */
  Icon: LucideIcon;
}

/** Top navigation entries, in display order (M8). Single source for labels + routes. */
export const NAV_ITEMS: NavItem[] = [
  { key: "knowledge", to: ROUTE_KNOWLEDGE, label: "Knowledge", Icon: BookOpen },
  { key: "library", to: ROUTE_LIBRARY, label: "Library", Icon: Library },
  { key: "chat", to: ROUTE_CHAT, label: "Chat", Icon: MessageSquare },
];

/** Base classes shared by every nav link (active and inactive). */
export const LINK_BASE =
  "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm transition-colors";
