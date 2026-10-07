import type { ReactNode } from "react";

/**
 * Shared table furniture, so every table in the app wears the same header
 * treatment, row rhythm and hover. Previously each screen carried its own
 * copy and they had already started to drift apart.
 */

export function Th({
  children,
  align = "left",
  className = "",
}: {
  children: ReactNode;
  align?: "left" | "right" | "center";
  className?: string;
}) {
  const a = align === "right" ? "text-right" : align === "center" ? "text-center" : "text-left";
  return (
    <th
      scope="col"
      className={`whitespace-nowrap pb-2.5 pr-4 text-[11px] font-semibold uppercase tracking-wider text-ink-muted ${a} ${className}`}
    >
      {children}
    </th>
  );
}

export function Td({
  children,
  align = "right",
  className = "",
  numeric = true,
}: {
  children: ReactNode;
  align?: "left" | "right" | "center";
  className?: string;
  /** Columns of figures align vertically; prose does not want tabular digits. */
  numeric?: boolean;
}) {
  const a = align === "right" ? "text-right" : align === "center" ? "text-center" : "text-left";
  return (
    <td className={`${numeric ? "tnum " : ""}py-2.5 pr-4 ${a} text-ink-secondary ${className}`}>
      {children}
    </td>
  );
}

/** Head row: one hairline under the column names. */
export function HeadRow({ children }: { children: ReactNode }) {
  return <tr className="border-b border-hairline text-left">{children}</tr>;
}

/** Body row, with a hover that tracks the full width of the table. */
export function Row({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <tr className={`border-b border-hairline/50 transition-colors hover:bg-surface-2/70 ${className}`}>
      {children}
    </tr>
  );
}

/** Totals row — heavier rule, ink-weight figures. */
export function FootRow({ children }: { children: ReactNode }) {
  return <tr className="border-t-2 border-hairline font-semibold text-ink">{children}</tr>;
}

/** Two-letter mark for a contractor type, so the list has an anchor to scan. */
export function initialsOf(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "?";
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}
