"use client";

import { ChevronRight, Home } from "lucide-react";

export type Crumb = {
  label: string;
  /** Omit on the level currently open — it is where you already are. */
  onClick?: () => void;
};

/**
 * The path down the roster, as a trail rather than a single back link.
 *
 * Three levels deep, "back" only ever says where you came from; a trail says
 * where you are and lets you jump straight to any level above it.
 */
export default function Breadcrumb({ crumbs }: { crumbs: Crumb[] }) {
  return (
    <nav aria-label="Breadcrumb" className="mb-4">
      <ol className="flex flex-wrap items-center gap-0.5 text-xs">
        {crumbs.map((crumb, i) => {
          const last = i === crumbs.length - 1;
          return (
            <li key={`${crumb.label}-${i}`} className="flex items-center gap-0.5">
              {i === 0 && (
                <Home
                  size={13}
                  strokeWidth={2.2}
                  className="mr-1 shrink-0 text-ink-muted"
                  aria-hidden
                />
              )}

              {crumb.onClick && !last ? (
                <button
                  onClick={crumb.onClick}
                  className="rounded-md px-1.5 py-1 font-medium text-ink-secondary transition-colors hover:bg-surface-2 hover:text-ink"
                >
                  {crumb.label}
                </button>
              ) : (
                <span
                  aria-current={last ? "page" : undefined}
                  className={`px-1.5 py-1 ${
                    last ? "font-semibold text-ink" : "font-medium text-ink-secondary"
                  }`}
                >
                  {crumb.label}
                </span>
              )}

              {!last && (
                <ChevronRight
                  size={13}
                  strokeWidth={2.2}
                  className="shrink-0 text-ink-muted"
                  aria-hidden
                />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
