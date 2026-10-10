import type { ReactNode } from "react";

/**
 * The chart/table container. Height is never fixed on the plot area's
 * parent — the card grows with its content so x-axis labels are never
 * cropped into a nested scrollbar.
 */
export default function Card({
  title,
  subtitle,
  actions,
  children,
  className = "",
}: {
  /** Omit on a level whose contents already say what it is. */
  title?: string;
  subtitle?: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`rounded-xl border border-hairline bg-surface-1 p-5 ${className}`}
    >
      <header
        className={`mb-4 flex flex-wrap items-start gap-3 ${
          // With no heading the actions sit alone, so push them to the right
          // rather than leaving them stranded at the left edge.
          title ? "justify-between" : "justify-end"
        }`}
      >
        {title && (
          <div>
            <h2 className="text-sm font-semibold text-ink">{title}</h2>
            {subtitle && <p className="mt-0.5 text-xs text-ink-secondary">{subtitle}</p>}
          </div>
        )}
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </header>
      {children}
    </section>
  );
}
