"use client";

import { useMemo, useState } from "react";
import { Check, RotateCcw } from "lucide-react";
import { saveDay } from "@/lib/dataset";
import { num, pct, signed } from "@/lib/format";
import { fillRate, type DayRow } from "@/lib/metrics";
import StatusChip from "./StatusChip";

/**
 * The daily input form. Contractor type, name and committed headcount are
 * master data and read-only here; only today's manpower is editable, which is
 * the one thing the user fills in each day.
 *
 * Mount this with `key={date}` so switching day re-seeds the draft — no effect
 * needed to sync state to props.
 */
export default function EntryForm({
  rows,
  date,
  showTypeColumn = true,
}: {
  rows: DayRow[];
  date: string;
  /** Off when the table is already filtered to a single type — the column
   *  would then repeat the heading on every row. */
  showTypeColumn?: boolean;
}) {
  const seed = () =>
    Object.fromEntries(rows.map((r) => [r.id, r.actual == null ? "" : String(r.actual)]));

  const [draft, setDraft] = useState<Record<string, string>>(seed);
  const [saved, setSaved] = useState(false);

  const parsed = useMemo(() => {
    const out = new Map<string, number | null>();
    for (const r of rows) {
      const raw = (draft[r.id] ?? "").trim();
      if (raw === "") {
        out.set(r.id, null);
        continue;
      }
      const n = Number(raw);
      out.set(r.id, Number.isFinite(n) && n >= 0 ? Math.round(n) : null);
    }
    return out;
  }, [draft, rows]);

  const totals = useMemo(() => {
    let committed = 0;
    let actual = 0;
    let filled = 0;
    for (const r of rows) {
      const v = parsed.get(r.id);
      if (v == null) continue;
      committed += r.committed;
      actual += v;
      filled += 1;
    }
    return { committed, actual, filled };
  }, [parsed, rows]);

  const dirty = rows.some((r) => {
    const stored = r.actual == null ? "" : String(r.actual);
    return (draft[r.id] ?? "") !== stored;
  });

  function update(id: string, value: string) {
    // Digits only — a manpower count is never negative or fractional.
    if (value !== "" && !/^\d{0,5}$/.test(value)) return;
    setDraft((d) => ({ ...d, [id]: value }));
    setSaved(false);
  }

  function handleSave() {
    saveDay(date, parsed);
    setSaved(true);
  }

  function handleReset() {
    setDraft(seed());
    setSaved(false);
  }

  // Grouped by type so the table reads like the register it replaces, with
  // the type named once per block.
  const blocks = useMemo(() => {
    const map = new Map<string, DayRow[]>();
    for (const r of rows) {
      const list = map.get(r.type);
      if (list) list.push(r);
      else map.set(r.type, [r]);
    }
    return [...map.entries()];
  }, [rows]);

  if (rows.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-ink-muted">
        No contractors on the roster yet. Add them under Roster first.
      </p>
    );
  }

  return (
    <div>
      <div className="overflow-x-auto">
        <table className={`w-full text-sm ${showTypeColumn ? "min-w-[680px]" : "min-w-[560px]"}`}>
          <thead>
            <tr className="border-b border-hairline text-left">
              {showTypeColumn && <Th>Contractor type</Th>}
              <Th>Contractor name</Th>
              <Th align="right">Committed</Th>
              <Th align="right">Today&rsquo;s manpower</Th>
              <Th align="right">Variance</Th>
              <Th>Status</Th>
            </tr>
          </thead>
          <tbody>
            {blocks.map(([type, block]) =>
              block.map((r, i) => {
                const value = parsed.get(r.id) ?? null;
                const rate =
                  value == null ? null : fillRate({ committed: r.committed, actual: value });
                return (
                  <tr key={r.id} className="border-b border-hairline/60">
                    {showTypeColumn && (
                      <td className="py-1.5 pr-4">
                        {/* Named once per block, as it is on the register. */}
                        {i === 0 ? <span className="font-medium text-ink">{type}</span> : null}
                      </td>
                    )}
                    <td className="py-1.5 pr-4 font-medium text-ink">{r.name}</td>
                    <td className="tnum py-1.5 pr-4 text-right text-ink-secondary">
                      {num(r.committed)}
                    </td>
                    <td className="py-1.5 pr-4 text-right">
                      <input
                        type="text"
                        inputMode="numeric"
                        aria-label={`Manpower reported by ${r.name} under ${type}`}
                        value={draft[r.id] ?? ""}
                        onChange={(e) => update(r.id, e.target.value)}
                        placeholder="—"
                        className="tnum w-20 rounded-md border border-hairline bg-surface-2 px-2 py-1.5 text-right text-ink placeholder:text-ink-muted focus:border-series-1 focus:outline-none focus:ring-1 focus:ring-series-1"
                      />
                    </td>
                    <td
                      className={`tnum py-1.5 pr-4 text-right ${
                        value != null && value - r.committed < 0
                          ? "text-[var(--critical)]"
                          : "text-ink-secondary"
                      }`}
                    >
                      {value == null ? "—" : signed(value - r.committed)}
                    </td>
                    <td className="py-1.5">
                      {value == null ? (
                        <span className="text-xs text-ink-muted">Not entered</span>
                      ) : (
                        <StatusChip rate={rate} />
                      )}
                    </td>
                  </tr>
                );
              }),
            )}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-hairline font-semibold">
              <td className="py-2.5 pr-4 text-ink" colSpan={showTypeColumn ? 2 : 1}>
                Total — {num(totals.filled)} of {num(rows.length)} entered
              </td>
              <td className="tnum py-2.5 pr-4 text-right text-ink">{num(totals.committed)}</td>
              <td className="tnum py-2.5 pr-4 text-right text-ink">{num(totals.actual)}</td>
              <td className="tnum py-2.5 pr-4 text-right text-ink">
                {signed(totals.actual - totals.committed)}
              </td>
              <td className="py-2.5 text-xs font-medium text-ink-secondary">
                {pct(fillRate({ committed: totals.committed, actual: totals.actual }), 1)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <button
          onClick={handleSave}
          disabled={!dirty}
          className="flex items-center gap-1.5 rounded-lg bg-series-1 px-4 py-2 text-xs font-semibold text-white disabled:opacity-50"
        >
          <Check size={14} strokeWidth={2.6} aria-hidden />
          Save this day
        </button>
        {dirty && (
          <button
            onClick={handleReset}
            className="flex items-center gap-1.5 rounded-lg border border-hairline bg-surface-2 px-3.5 py-2 text-xs font-semibold text-ink-secondary hover:text-ink"
          >
            <RotateCcw size={14} strokeWidth={2.4} aria-hidden />
            Discard changes
          </button>
        )}
        {saved && !dirty && (
          <span className="flex items-center gap-1.5 text-xs font-medium text-[var(--success-text)]">
            <Check size={14} strokeWidth={2.6} aria-hidden />
            Saved
          </span>
        )}
        <span className="ml-auto max-w-sm text-xs text-ink-muted">
          Leave a box empty for a contractor who did not report — it stays
          &ldquo;not entered&rdquo; rather than counting as zero.
        </span>
      </div>
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
