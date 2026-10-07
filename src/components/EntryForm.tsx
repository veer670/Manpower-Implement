"use client";

import { useMemo, useState } from "react";
import { Check, RotateCcw } from "lucide-react";
import { removeContractor, saveDay } from "@/lib/dataset";
import { pruneUsers } from "@/lib/auth";
import { num, pct, signed } from "@/lib/format";
import { fillRate, type DayRow } from "@/lib/metrics";
import StatusChip from "./StatusChip";
import { FootRow, HeadRow, Row, Td, Th } from "./Table";
import DeleteButton from "./DeleteButton";

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
  canEditRoster = false,
}: {
  rows: DayRow[];
  date: string;
  /** Off for a signed-in contractor — they may report, not reshape the roster. */
  canEditRoster?: boolean;
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
        <table className={`w-full text-sm ${showTypeColumn ? "min-w-[760px]" : "min-w-[640px]"}`}>
          <thead>
            <HeadRow>
              <Th>Sr. No.</Th>
              {showTypeColumn && <Th>Contractor type</Th>}
              <Th>Contractor name</Th>
              <Th align="right">Committed</Th>
              <Th align="right">Today&rsquo;s manpower</Th>
              <Th align="right">Variance</Th>
              <Th>Status</Th>
              {canEditRoster && (
                <Th align="right">
                  <span className="sr-only">Actions</span>
                </Th>
              )}
            </HeadRow>
          </thead>
          <tbody>
            {blocks.map(([type, block]) =>
              block.map((r, i) => {
                const srNo = rows.indexOf(r) + 1;
                const value = parsed.get(r.id) ?? null;
                const rate =
                  value == null ? null : fillRate({ committed: r.committed, actual: value });
                return (
                  <Row key={r.id}>
                    <Td align="left" className="text-ink-muted">{srNo}</Td>
                    {showTypeColumn && (
                      <Td align="left" numeric={false}>
                        {/* Named once per block, as it is on the register. */}
                        {i === 0 ? <span className="font-semibold text-ink">{type}</span> : null}
                      </Td>
                    )}
                    <Td align="left" numeric={false} className="font-semibold text-ink">
                      {r.name}
                    </Td>
                    <Td>{num(r.committed)}</Td>
                    <td className="py-2 pr-4 text-right">
                      <input
                        type="text"
                        inputMode="numeric"
                        aria-label={`Manpower reported by ${r.name} under ${type}`}
                        value={draft[r.id] ?? ""}
                        onChange={(e) => update(r.id, e.target.value)}
                        placeholder="—"
                        className="tnum w-24 rounded-lg border border-hairline bg-surface-2 px-3 py-2 text-right text-sm font-semibold text-ink placeholder:font-normal placeholder:text-ink-muted hover:border-ink-muted/50 focus:border-series-1 focus:bg-surface-1 focus:outline-none focus:ring-2 focus:ring-series-1/25"
                      />
                    </td>
                    <Td
                      className={
                        value != null && value - r.committed < 0
                          ? "font-medium text-[var(--critical)]"
                          : "font-medium"
                      }
                    >
                      {value == null ? "—" : signed(value - r.committed)}
                    </Td>
                    <td className="py-2.5">
                      {value == null ? (
                        <span className="text-xs text-ink-muted">Not entered</span>
                      ) : (
                        <StatusChip rate={rate} />
                      )}
                    </td>
                    {canEditRoster && (
                      <td className="py-2.5 pl-4 text-right">
                        <DeleteButton
                          label={`${r.name} from the roster`}
                          onConfirm={() => {
                            removeContractor(r.id);
                            // Its login would otherwise point at nothing.
                            pruneUsers(
                              new Set(rows.filter((x) => x.id !== r.id).map((x) => x.id)),
                            );
                          }}
                        />
                      </td>
                    )}
                  </Row>
                );
              }),
            )}
          </tbody>
          <tfoot>
            <FootRow>
              <td className="py-3 pr-4" colSpan={showTypeColumn ? 3 : 2}>
                Total — {num(totals.filled)} of {num(rows.length)} entered
              </td>
              <Td className="text-ink">{num(totals.committed)}</Td>
              <Td className="text-ink">{num(totals.actual)}</Td>
              <Td className="text-ink">{signed(totals.actual - totals.committed)}</Td>
              <td className="tnum py-3 text-xs text-ink-secondary">
                {pct(fillRate({ committed: totals.committed, actual: totals.actual }), 1)}
              </td>
              {canEditRoster && <td />}
            </FootRow>
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

