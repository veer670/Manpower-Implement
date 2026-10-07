import { ArrowDown, ArrowUp, Minus } from "lucide-react";
import type { ReactNode } from "react";

type Direction = "up" | "down" | "flat";

/**
 * label · value · optional delta. `hero` promotes the value to the single
 * 48px figure a view is allowed to lead with — exactly one per page.
 * Values use proportional figures (never tabular) at display sizes.
 */
export default function StatTile({
  label,
  value,
  unit,
  delta,
  hero = false,
  footnote,
}: {
  label: string;
  value: string;
  unit?: string;
  delta?: { text: string; direction: Direction; good: boolean };
  hero?: boolean;
  footnote?: ReactNode;
}) {
  return (
    <div className="rounded-xl border border-hairline bg-surface-1 p-5">
      <p className="text-xs font-medium text-ink-secondary">{label}</p>
      <p
        className={`mt-2 font-semibold tracking-tight text-ink ${
          hero ? "text-5xl leading-none" : "text-3xl leading-none"
        }`}
      >
        {value}
        {unit && (
          <span className="ml-1.5 text-sm font-medium text-ink-muted">{unit}</span>
        )}
      </p>
      {delta && <Delta {...delta} />}
      {footnote && <p className="mt-2 text-xs text-ink-muted">{footnote}</p>}
    </div>
  );
}

function Delta({ text, direction, good }: { text: string; direction: Direction; good: boolean }) {
  const Icon = direction === "up" ? ArrowUp : direction === "down" ? ArrowDown : Minus;
  // Icon + label carries the meaning; colour only reinforces it.
  const color =
    direction === "flat"
      ? "text-ink-secondary"
      : good
        ? "text-[var(--success-text)]"
        : "text-[var(--critical)]";
  return (
    <p className={`mt-2 flex items-center gap-1 text-xs font-medium ${color}`}>
      <Icon size={13} strokeWidth={2.5} aria-hidden />
      <span>{text}</span>
    </p>
  );
}
