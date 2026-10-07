"use client";

import { AlertTriangle, CheckCircle2, CircleAlert, OctagonAlert } from "lucide-react";
import { severityForFillRate, severityLabel, type GroupRow, type Severity } from "@/lib/metrics";
import { num, pct, signed } from "@/lib/format";

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
 * The WCAG-clean twin of the charts above: every plotted value is also
 * readable here, so nothing is gated behind a tooltip. Status is icon +
 * label + colour, never colour alone.
 */
export default function SiteTable({
  rows,
  dimensionLabel,
}: {
  rows: GroupRow[];
  dimensionLabel: string;
}) {
  if (rows.length === 0) {
    return <p className="py-6 text-center text-xs text-ink-muted">Nothing in the current selection.</p>;
  }

  const totals = rows.reduce(
    (a, r) => ({ planned: a.planned + r.planned, actual: a.actual + r.actual }),
    { planned: 0, actual: 0 },
  );
  const totalRate = totals.planned > 0 ? totals.actual / totals.planned : null;

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[620px] text-sm">
        <thead>
          <tr className="border-b border-hairline text-left">
            <Th>{dimensionLabel}</Th>
            <Th align="right">Planned</Th>
            <Th align="right">Actual</Th>
            <Th align="right">Variance</Th>
            <Th align="right">Fill rate</Th>
            <Th>Status</Th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const sev = severityForFillRate(r.fillRate);
            const Icon = ICONS[sev];
            return (
              <tr key={r.key} className="border-b border-hairline/60 last:border-0">
                <td className="py-2.5 pr-4 font-medium text-ink">{r.key}</td>
                <Td>{num(r.planned)}</Td>
                <Td>{num(r.actual)}</Td>
                <Td className={r.variance < 0 ? "text-[var(--critical)]" : "text-ink-secondary"}>
                  {signed(r.variance)}
                </Td>
                <Td>{pct(r.fillRate, 1)}</Td>
                <td className="py-2.5">
                  <span className="flex items-center gap-1.5 text-xs text-ink-secondary">
                    <Icon
                      size={14}
                      strokeWidth={2.2}
                      style={{ color: COLORS[sev] }}
                      aria-hidden
                    />
                    {severityLabel[sev]}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
        <tfoot>
          <tr className="border-t-2 border-hairline font-semibold">
            <td className="py-2.5 pr-4 text-ink">Total</td>
            <Td>{num(totals.planned)}</Td>
            <Td>{num(totals.actual)}</Td>
            <Td>{signed(totals.actual - totals.planned)}</Td>
            <Td>{pct(totalRate, 1)}</Td>
            <td />
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

function Th({
  children,
  align = "left",
}: {
  children: React.ReactNode;
  align?: "left" | "right";
}) {
  return (
    <th
      scope="col"
      className={`pb-2 pr-4 text-xs font-medium text-ink-secondary ${
        align === "right" ? "text-right" : "text-left"
      }`}
    >
      {children}
    </th>
  );
}

function Td({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <td className={`tnum py-2.5 pr-4 text-right text-ink-secondary ${className}`}>{children}</td>;
}
