"use client";

import type { GroupRow } from "@/lib/metrics";
import { num, pct, signed } from "@/lib/format";
import StatusChip from "./StatusChip";

/**
 * The readable twin of the charts: every plotted value is here too, so nothing
 * is gated behind a tooltip.
 */
export default function GroupTable({
  rows,
  dimensionLabel,
}: {
  rows: GroupRow[];
  dimensionLabel: string;
}) {
  if (rows.length === 0) {
    return (
      <p className="py-6 text-center text-xs text-ink-muted">
        Nothing entered for the current selection.
      </p>
    );
  }

  const totals = rows.reduce(
    (a, r) => ({ committed: a.committed + r.committed, actual: a.actual + r.actual }),
    { committed: 0, actual: 0 },
  );
  const totalRate = totals.committed > 0 ? totals.actual / totals.committed : null;

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[600px] text-sm">
        <thead>
          <tr className="border-b border-hairline text-left">
            <Th>{dimensionLabel}</Th>
            <Th align="right">Committed</Th>
            <Th align="right">Reported</Th>
            <Th align="right">Variance</Th>
            <Th align="right">Fill rate</Th>
            <Th>Status</Th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.key} className="border-b border-hairline/60 last:border-0">
              <td className="py-2.5 pr-4 font-medium text-ink">{r.key}</td>
              <Td>{num(r.committed)}</Td>
              <Td>{num(r.actual)}</Td>
              <Td className={r.variance < 0 ? "text-[var(--critical)]" : "text-ink-secondary"}>
                {signed(r.variance)}
              </Td>
              <Td>{pct(r.fillRate, 1)}</Td>
              <td className="py-2.5">
                <StatusChip rate={r.fillRate} />
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="border-t-2 border-hairline font-semibold">
            <td className="py-2.5 pr-4 text-ink">Total</td>
            <Td>{num(totals.committed)}</Td>
            <Td>{num(totals.actual)}</Td>
            <Td>{signed(totals.actual - totals.committed)}</Td>
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
  return (
    <td className={`tnum py-2.5 pr-4 text-right text-ink-secondary ${className}`}>{children}</td>
  );
}
