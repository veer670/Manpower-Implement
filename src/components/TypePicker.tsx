"use client";

import { ChevronRight } from "lucide-react";
import { num, pct } from "@/lib/format";
import StatusChip from "./StatusChip";

export type TypeCard = {
  type: string;
  contractors: number;
  committed: number;
  /** Entry mode only — omit on the roster, where nothing is reported. */
  reported?: number;
  entered?: number;
  fillRate?: number | null;
};

/**
 * The first level of both Daily entry and Roster: contractor types as rows,
 * in the same table format as every other table in the app. Click a row to
 * open that type's contractors.
 */
export default function TypePicker({
  cards,
  onSelect,
  emptyMessage,
}: {
  cards: TypeCard[];
  onSelect: (type: string) => void;
  emptyMessage: string;
}) {
  if (cards.length === 0) {
    return <p className="py-10 text-center text-sm text-ink-muted">{emptyMessage}</p>;
  }

  const entryMode = cards[0].reported !== undefined;

  const totals = cards.reduce(
    (a, c) => ({
      contractors: a.contractors + c.contractors,
      committed: a.committed + c.committed,
      reported: a.reported + (c.reported ?? 0),
      entered: a.entered + (c.entered ?? 0),
    }),
    { contractors: 0, committed: 0, reported: 0, entered: 0 },
  );
  const totalRate = totals.committed > 0 ? totals.reported / totals.committed : null;

  return (
    <div className="overflow-x-auto">
      <table className={`w-full text-sm ${entryMode ? "min-w-[620px]" : "min-w-[400px]"}`}>
        <thead>
          <tr className="border-b border-hairline text-left">
            <Th>Contractor type</Th>
            <Th align="right">Contractors</Th>
            <Th align="right">Committed</Th>
            {entryMode && (
              <>
                <Th align="right">Reported</Th>
                <Th align="right">Fill rate</Th>
                <Th>Status</Th>
              </>
            )}
            <Th align="right">
              <span className="sr-only">Open</span>
            </Th>
          </tr>
        </thead>

        <tbody>
          {cards.map((c) => {
            const reported = c.reported ?? 0;
            const pending = c.contractors - (c.entered ?? 0);
            const open = () => onSelect(c.type);
            return (
              <tr
                key={c.type}
                onClick={open}
                className="group cursor-pointer border-b border-hairline/60 transition-colors hover:bg-surface-2"
              >
                <td className="py-2.5 pr-4">
                  {/* The row is clickable for the mouse; this button is what
                      keyboard and screen-reader users actually operate. */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      open();
                    }}
                    className="text-left font-semibold text-ink focus:outline-none focus-visible:underline focus-visible:underline-offset-2"
                  >
                    {c.type}
                  </button>
                  {entryMode && pending > 0 && (
                    <span className="mt-0.5 block text-xs text-ink-muted">
                      {num(pending)} not entered
                    </span>
                  )}
                </td>

                <Td>{num(c.contractors)}</Td>
                <Td>{num(c.committed)}</Td>

                {entryMode && (
                  <>
                    <Td className="font-medium text-ink">{c.entered === 0 ? "—" : num(reported)}</Td>
                    <Td>{c.entered === 0 ? "—" : pct(c.fillRate ?? null, 1)}</Td>
                    <td className="py-2.5 pr-4">
                      {c.entered === 0 ? (
                        <span className="text-xs text-ink-muted">Not entered</span>
                      ) : (
                        <StatusChip rate={c.fillRate ?? null} />
                      )}
                    </td>
                  </>
                )}

                <td className="py-2.5 text-right">
                  <ChevronRight
                    size={16}
                    strokeWidth={2.2}
                    className="inline-block text-ink-muted transition-colors group-hover:text-ink"
                    aria-hidden
                  />
                </td>
              </tr>
            );
          })}
        </tbody>

        <tfoot>
          <tr className="border-t-2 border-hairline font-semibold">
            <td className="py-2.5 pr-4 text-ink">
              {entryMode
                ? `Total — ${num(totals.entered)} of ${num(totals.contractors)} entered`
                : "Total"}
            </td>
            <Td className="text-ink">{num(totals.contractors)}</Td>
            <Td className="text-ink">{num(totals.committed)}</Td>
            {entryMode && (
              <>
                <Td className="text-ink">{num(totals.reported)}</Td>
                <Td className="text-ink">{pct(totalRate, 1)}</Td>
                <td />
              </>
            )}
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
