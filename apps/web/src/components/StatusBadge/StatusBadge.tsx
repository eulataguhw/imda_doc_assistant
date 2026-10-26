import { LABEL, TOKEN } from "./constants";
import type { StatusBadgeProps } from "./types";

/** Color-coded status pill driven by the semantic tokens in styles/globals.css. */
export function StatusBadge({ status, variant = "solid", className }: StatusBadgeProps) {
  const token = TOKEN[status];
  const base = `inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${className ?? ""}`;

  if (variant === "soft") {
    return (
      <span
        className={base}
        style={{
          color: `var(${token})`,
          backgroundColor: `color-mix(in oklab, var(${token}) 14%, transparent)`,
          borderColor: `color-mix(in oklab, var(${token}) 30%, transparent)`,
        }}
      >
        <span className="mr-1.5 size-1.5 rounded-full" style={{ backgroundColor: `var(${token})` }} />
        {LABEL[status]}
      </span>
    );
  }

  /** solid text uses --badge-solid-text (white in light, near-black in dark) to keep AA in both themes. */
  return (
    <span className={base} style={{ backgroundColor: `var(${token})`, color: "var(--badge-solid-text)" }}>
      {LABEL[status]}
    </span>
  );
}
