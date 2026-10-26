import type { Document } from "../../lib/api";

/** A document status value (mirrors the API's `Document.status`). */
export type Status = Document["status"];

/** Pill rendering style. */
export type BadgeVariant = "solid" | "soft";

/** Props for {@link StatusBadge}. */
export interface StatusBadgeProps {
  /** The document status to display. */
  status: Status;
  /** solid — filled pill (Library cards); soft — bordered tinted pill + dot (detail header). */
  variant?: BadgeVariant;
  /** Extra classes appended to the base pill. */
  className?: string;
}
