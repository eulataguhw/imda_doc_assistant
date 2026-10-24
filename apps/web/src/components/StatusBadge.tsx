import type { Document } from "../lib/api";

const TOKEN: Record<Document["status"], string> = {
  ready: "--ready",
  processing: "--processing",
  error: "--error",
};

const LABEL: Record<Document["status"], string> = {
  ready: "Ready",
  processing: "Processing",
  error: "Error",
};

interface StatusBadgeProps {
  status: Document["status"];
  /**
   * solid — filled pill with white text (Library cards).
   * soft — bordered, tinted background + dot indicator (Document detail header).
   */
  variant?: "solid" | "soft";
  className?: string;
}

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
        <span
          className="mr-1.5 size-1.5 rounded-full"
          style={{ backgroundColor: `var(${token})` }}
        />
        {LABEL[status]}
      </span>
    );
  }

  return (
    <span className={base} style={{ backgroundColor: `var(${token})`, color: "#ffffff" }}>
      {LABEL[status]}
    </span>
  );
}
