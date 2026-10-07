"use client";

import type { ReactNode } from "react";

/** Recharts reads these as plain strings; CSS vars let the theme swap
 *  without a React re-render. */
export const SERIES = {
  reported: "var(--series-1)",
  committed: "var(--series-2)",
  single: "var(--seq-450)",
} as const;

export const AXIS_STYLE = {
  fontSize: 11,
  fill: "var(--text-muted)",
} as const;

export const GRID_COLOR = "var(--gridline)";
export const AXIS_COLOR = "var(--axis)";
export const SURFACE = "var(--surface-1)";

/**
 * A legend is always present for two or more series, so identity never
 * rests on colour alone. One series needs none — the title names it.
 */
export function Legend({
  items,
}: {
  items: { label: string; color: string; shape?: "bar" | "line" }[];
}) {
  return (
    <ul className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
      {items.map(({ label, color, shape = "bar" }) => (
        <li key={label} className="flex items-center gap-1.5 text-xs text-ink-secondary">
          <span
            aria-hidden
            style={{ background: color }}
            className={shape === "line" ? "h-0.5 w-4 rounded-full" : "h-2.5 w-2.5 rounded-sm"}
          />
          {label}
        </li>
      ))}
    </ul>
  );
}

/** Shared tooltip chrome. Text wears ink tokens; the swatch carries identity. */
export function TooltipShell({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="rounded-lg border border-hairline bg-surface-1 px-3 py-2 shadow-lg">
      <p className="mb-1.5 text-xs font-semibold text-ink">{title}</p>
      <table className="text-xs">
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

export function TooltipRow({
  color,
  label,
  value,
}: {
  color?: string;
  label: string;
  value: string;
}) {
  return (
    <tr>
      <td className="pr-2 align-middle">
        {color ? (
          <span
            aria-hidden
            style={{ background: color }}
            className="inline-block h-2.5 w-2.5 rounded-sm"
          />
        ) : null}
      </td>
      <td className="pr-3 text-ink-secondary">{label}</td>
      <td className="tnum text-right font-medium text-ink">{value}</td>
    </tr>
  );
}

/** Shown in place of a plot when the current filter slice is empty. */
export function EmptyPlot({ message }: { message: string }) {
  return (
    <div className="flex h-56 items-center justify-center rounded-lg border border-dashed border-hairline">
      <p className="text-xs text-ink-muted">{message}</p>
    </div>
  );
}
