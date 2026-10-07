"use client";

import { useMemo, useState } from "react";
import { Check, RotateCcw } from "lucide-react";
import { removeContractor, saveDay, setContractorSrNo } from "@/lib/dataset";
import { pruneUsers } from "@/lib/auth";
import { num, pct, signed } from "@/lib/format";
import { fillRate, type DayRow } from "@/lib/metrics";
import StatusChip from "./StatusChip";
import DeleteButton from "./DeleteButton";
import SrNoInput from "./SrNoInput";

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
  /** Name the type above each group — off when already inside one type. */
  showTypeColumn?: boolean;
  /** Off for a signed-in contractor — they may report, not reshape the roster. */
  canEditRoster?: boolean;
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

  // Grouped by type so the list reads like the register it replaces.
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
      <div className="rounded-xl border border-dashed border-hairline py-12 text-center">
        <p className="text-sm text-ink-muted">
          No contractors here yet. Add one with the button above.
        </p>
      </div>
    );
  }

  return (
    <div>
      {/* Column labels live here once, not on every card. The widths below are
          shared with the card columns so the two line up. */}
      <div className="mb-2 hidden items-center gap-x-5 px-4 lg:flex">
        <span className="flex-1 basis-44" />
        <span className={`${W.committed} text-right text-[10px] font-semibold uppercase tracking-wider text-ink-muted`}>
          Committed
        </span>
        <span className={`${W.input} text-right text-[10px] font-semibold uppercase tracking-wider text-ink-muted`}>
          Today&rsquo;s manpower
        </span>
        <span className={`${W.variance} text-right text-[10px] font-semibold uppercase tracking-wider text-ink-muted`}>
          Variance
        </span>
        <span className={W.status} />
        {canEditRoster && <span className="w-11" />}
      </div>

      <div className="space-y-5">
        {blocks.map(([type, block]) => (
          <section key={type}>
            {showTypeColumn && (
              <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-ink-muted">
                {type}
              </h3>
            )}
            <ul className="space-y-2">
              {block.map((r) => {
                const srNo = rows.indexOf(r) + 1;
                const value = parsed.get(r.id) ?? null;
                const rate =
                  value == null ? null : fillRate({ committed: r.committed, actual: value });

                return (
                  <li
                    key={r.id}
                    className="group overflow-hidden rounded-xl border border-hairline bg-surface-1 transition-colors hover:border-accent/45"
                  >
                    <div className="flex items-stretch">
                      <div className="min-w-0 flex-1 px-4 py-3">
                        {/* Identity and figures, aligned to the header strip. */}
                        <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
                          <div className="flex min-w-0 flex-1 basis-44 items-center gap-2">
                            {canEditRoster ? (
                              <SrNoInput
                                value={r.srNo}
                                placeholder={srNo}
                                label={r.name}
                                onChange={(n) => setContractorSrNo(r.id, n)}
                              />
                            ) : (
                              <span className="tnum w-9 shrink-0 text-center text-xs font-medium text-ink-muted">
                                {r.srNo || srNo}
                              </span>
                            )}
                            <span className="min-w-0 flex-1 truncate text-[15px] font-semibold text-ink">
                              {r.name}
                            </span>
                          </div>

                          <span
                            className={`${W.committed} tnum text-right text-sm text-ink-secondary`}
                          >
                            <Label>Committed</Label>
                            {num(r.committed)}
                          </span>

                          <span className={`${W.input} flex items-center justify-end gap-1.5`}>
                            <Label>Today&rsquo;s</Label>
                            <input
                              type="text"
                              inputMode="numeric"
                              aria-label={`Manpower reported by ${r.name} under ${r.type}`}
                              value={draft[r.id] ?? ""}
                              onChange={(e) => update(r.id, e.target.value)}
                              placeholder="—"
                              className="tnum w-full rounded-lg border border-hairline bg-surface-2 px-3 py-2 text-right text-sm font-semibold text-ink placeholder:font-normal placeholder:text-ink-muted hover:border-ink-muted/50 focus:border-accent focus:bg-surface-1 focus:outline-none focus:ring-2 focus:ring-accent/30"
                            />
                          </span>

                          <span
                            className={`${W.variance} tnum text-right text-sm font-medium ${
                              value != null && value - r.committed < 0
                                ? "text-[var(--critical)]"
                                : "text-ink-secondary"
                            }`}
                          >
                            <Label>Variance</Label>
                            {value == null ? "—" : signed(value - r.committed)}
                          </span>

                          <span className={`${W.status} flex justify-start`}>
                            {value == null ? (
                              <span className="whitespace-nowrap rounded-full bg-surface-2 px-2.5 py-1 text-xs text-ink-muted">
                                Not entered
                              </span>
                            ) : (
                              <StatusChip rate={rate} />
                            )}
                          </span>
                        </div>


                      </div>

                      {canEditRoster && (
                        <div className="flex w-11 shrink-0 items-center justify-center border-l border-hairline/60 transition-colors hover:bg-surface-2">
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
                        </div>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </div>

      {/* Totals, as a strip under the cards rather than a table foot. */}
      <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-2 rounded-xl border border-hairline bg-surface-2 px-4 py-3">
        <span className="flex-1 text-sm font-semibold text-ink">
          Total — {num(totals.filled)} of {num(rows.length)} entered
        </span>
        <Summary label="Committed" value={num(totals.committed)} />
        <Summary label="Reported" value={num(totals.actual)} />
        <Summary label="Variance" value={signed(totals.actual - totals.committed)} />
        <Summary
          label="Fill rate"
          value={pct(fillRate({ committed: totals.committed, actual: totals.actual }), 1)}
        />
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <button
          onClick={() => {
            saveDay(date, parsed);
            setSaved(true);
          }}
          disabled={!dirty}
          className="flex items-center gap-1.5 rounded-lg bg-accent px-4 py-2 text-xs font-semibold text-white disabled:opacity-50"
        >
          <Check size={14} strokeWidth={2.6} aria-hidden />
          Save this day
        </button>
        {dirty && (
          <button
            onClick={() => {
              setDraft(seed());
              setSaved(false);
            }}
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

/**
 * Column widths, shared by the header strip and every card so the labels at
 * the top keep pointing at the right figures.
 */
const W = {
  committed: "w-24",
  input: "w-28",
  variance: "w-20",
  status: "w-40",
} as const;

/**
 * Repeats the column name on narrow screens, where the header strip is
 * hidden and a bare figure would be ambiguous.
 */
function Label({ children }: { children: React.ReactNode }) {
  return (
    <span className="mr-1 text-[10px] font-semibold uppercase tracking-wider text-ink-muted lg:hidden">
      {children}
    </span>
  );
}

function Summary({ label, value }: { label: string; value: string }) {
  return (
    <span className="flex items-baseline gap-1.5">
      <span className="text-[10px] font-semibold uppercase tracking-wider text-ink-muted">
        {label}
      </span>
      <span className="tnum text-sm font-semibold text-ink">{value}</span>
    </span>
  );
}
