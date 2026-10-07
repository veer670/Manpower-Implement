import { AlertTriangle, CheckCircle2, CircleAlert, OctagonAlert } from "lucide-react";
import { severityForFillRate, severityLabel, type Severity } from "@/lib/metrics";

const ICONS: Record<Severity, typeof CheckCircle2> = {
  good: CheckCircle2,
  warning: AlertTriangle,
  serious: CircleAlert,
  critical: OctagonAlert,
};

export const SEVERITY_COLOR: Record<Severity, string> = {
  good: "var(--good)",
  warning: "var(--warning)",
  serious: "var(--serious)",
  critical: "var(--critical)",
};

/**
 * Status as a tinted pill. Icon + label carry the meaning and the tint only
 * reinforces it — two of the four status hues sit below 3:1 on the light
 * surface by design, so colour alone would not be readable.
 */
export default function StatusChip({ rate }: { rate: number | null }) {
  const severity = severityForFillRate(rate);
  const Icon = ICONS[severity];
  const color = SEVERITY_COLOR[severity];

  return (
    <span
      className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium text-ink-secondary"
      style={{ background: `color-mix(in srgb, ${color} 14%, transparent)` }}
    >
      <Icon size={13} strokeWidth={2.4} style={{ color }} aria-hidden />
      {severityLabel[severity]}
    </span>
  );
}
