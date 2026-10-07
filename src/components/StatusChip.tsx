import { AlertTriangle, CheckCircle2, CircleAlert, OctagonAlert } from "lucide-react";
import { severityForFillRate, severityLabel, type Severity } from "@/lib/metrics";

const ICONS: Record<Severity, typeof CheckCircle2> = {
  good: CheckCircle2,
  warning: AlertTriangle,
  serious: CircleAlert,
  critical: OctagonAlert,
};

const COLORS: Record<Severity, string> = {
  good: "var(--good)",
  warning: "var(--warning)",
  serious: "var(--serious)",
  critical: "var(--critical)",
};

/**
 * Status is icon + label + colour, never colour alone — two of the three
 * light-mode status hues sit below 3:1 against the surface by design.
 */
export default function StatusChip({ rate }: { rate: number | null }) {
  const severity = severityForFillRate(rate);
  const Icon = ICONS[severity];
  return (
    <span className="flex items-center gap-1.5 whitespace-nowrap text-xs text-ink-secondary">
      <Icon size={14} strokeWidth={2.2} style={{ color: COLORS[severity] }} aria-hidden />
      {severityLabel[severity]}
    </span>
  );
}
