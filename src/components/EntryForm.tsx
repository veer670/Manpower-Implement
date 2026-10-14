"use client";

import { useMemo, useState } from "react";
import { Check, RotateCcw } from "lucide-react";
import {
  removeContractor,
  renameContractor,
  saveDay,
  setContractorSrNo,
} from "@/lib/dataset";
import { num, pct, signed } from "@/lib/format";
import { fillRate, severityForFillRate, severityLabel, type DayRow } from "@/lib/metrics";
import { SEVERITY_COLOR } from "./StatusChip";
import DeleteButton from "./DeleteButton";
import SrNoInput from "./SrNoInput";
import SortHeader from "./SortHeader";
import EditableName, { EditButton } from "./EditableName";

type SortKey = "srNo" | "name" | "committed" | "reported";
type Sort = { key: SortKey; dir: "asc" | "desc" };

/**
 * The one grid the day's totals, the column headers and every row share, so
 * that a row's committed figure sits directly under the day's committed total
 * and its reported box under the day's reported total.
 */
const COLUMNS =
  // The names column takes the extra width, since it is the only one holding
  // words rather than a figure.
  "grid grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)] items-center gap-4 px-3";

/**
 * The daily input form. Contractor type, name and committed headcount are
 * master data and read-only here; only today's manpower is editable, which is
 * the one thing the user fills in each day — so it is the heaviest element on
 * the row, and every other figure is quieter than it.
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
  const [editingId, setEditingId] = useState<string | null>(null);
  const [sort, setSort] = useState<Sort | null>(null);
  const [order, setOrder] = useState<string[] | null>(null);

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

  /**
   * Re-order on a header click, and only then: the order is frozen into a
   * list of ids rather than recomputed each render, so typing a figure into
   * the column being sorted cannot make the row jump out from under the
   * cursor mid-entry.
   */
  function sortBy(key: SortKey) {
    const dir: "asc" | "desc" =
      sort?.key === key
        ? sort.dir === "asc"
          ? "desc"
          : "asc"
        : // A column of figures is opened to find the big numbers; a column of
          // names or serials to find a place in the list.
          key === "committed" || key === "reported"
          ? "desc"
          : "asc";

    const srNoOf = (r: DayRow) => r.srNo || rows.indexOf(r) + 1;
    const ranked = [...rows].sort((a, b) => {
      let cmp: number;
      if (key === "name") cmp = a.name.localeCompare(b.name);
      else if (key === "srNo") cmp = srNoOf(a) - srNoOf(b);
      else if (key === "committed") cmp = a.committed - b.committed;
      else cmp = (parsed.get(a.id) ?? 0) - (parsed.get(b.id) ?? 0);
      return dir === "asc" ? cmp : -cmp;
    });

    setSort({ key, dir });
    setOrder(ranked.map((r) => r.id));
  }

  const rank = order ? new Map(order.map((id, i) => [id, i])) : null;

  if (rows.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-hairline py-12 text-center">
        <p className="text-sm text-ink-muted">
          No contractors here yet. Add one with the button above.
        </p>
      </div>
    );
  }

  const dayRate = fillRate({ committed: totals.committed, actual: totals.actual });

  return (
    <div>
      {/* The day in four figures, at a size that is read rather than squinted
          at. The rows below share this grid, so each row's committed and
          reported figure sits directly under the day's own total. */}
      <div className={`mb-4 ${COLUMNS}`}>
        <Metric label="entered">
          {num(totals.filled)}
          <span className="text-sm font-normal text-ink-muted">/{num(rows.length)}</span>
        </Metric>
        <Metric label="committed">{num(totals.committed)}</Metric>
        <Metric label="reported">{num(totals.actual)}</Metric>
        <Metric
          label="fill rate"
          // The one place colour raises an alarm, and the figure beside it
          // always says the same thing in numbers.
          tone={totals.filled > 0 ? SEVERITY_COLOR[severityForFillRate(dayRate)] : undefined}
        >
          {totals.filled > 0 ? pct(dayRate, 0) : "—"}
        </Metric>
      </div>

      {/* Sort controls, sitting over the columns they sort. */}
      {rows.length > 1 && (
        <div className={`mb-2 ${COLUMNS}`}>
          <span className="flex items-center gap-3">
            <span className="w-[3px] shrink-0" />
            <Head label="Sr." sortKey="srNo" sort={sort} onSort={sortBy} className="w-9 shrink-0" />
            <Head label="Name" sortKey="name" sort={sort} onSort={sortBy} className="min-w-0" />
          </span>
          <Head label="Committed" sortKey="committed" sort={sort} onSort={sortBy} />
          <Head label="Reported" sortKey="reported" sort={sort} onSort={sortBy} />
          <span className="text-[10px] font-semibold uppercase tracking-wider text-ink-muted">
            +/−
          </span>
        </div>
      )}

      <div className="space-y-4">
        {blocks.map(([type, block]) => (
          <section key={type}>
            {showTypeColumn && (
              <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-ink-muted">
                {type}
              </h3>
            )}

            <ul className="overflow-hidden rounded-xl border border-hairline bg-surface-1">
              {(rank
                ? [...block].sort((a, b) => (rank.get(a.id) ?? 0) - (rank.get(b.id) ?? 0))
                : block
              ).map((r, i) => {
                const srNo = rows.indexOf(r) + 1;
                const value = parsed.get(r.id) ?? null;
                const variance = value == null ? null : value - r.committed;
                const rate =
                  value == null ? null : fillRate({ committed: r.committed, actual: value });
                const severity = severityForFillRate(rate);

                return (
                  <li
                    key={r.id}
                    className={`group ${COLUMNS} py-2.5 transition-colors hover:bg-surface-2/50 ${
                      i > 0 ? "border-t border-hairline/50" : ""
                    }`}
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      {/* Status as a bar, not a pill: a column of these is
                          scannable in a way a column of words is not. The line
                          under the name still says it in words. */}
                      <span
                        role="img"
                        aria-label={value == null ? "Not entered" : severityLabel[severity]}
                        className="h-8 w-[3px] shrink-0 rounded-full"
                        style={{
                          background: value == null ? "var(--gridline)" : SEVERITY_COLOR[severity],
                        }}
                      />

                      {canEditRoster ? (
                        <SrNoInput
                          value={r.srNo}
                          placeholder={srNo}
                          label={r.name}
                          onChange={(n) => setContractorSrNo(r.id, n)}
                        />
                      ) : (
                        <span className="tnum w-9 shrink-0 text-center text-xs text-ink-muted">
                          {r.srNo || srNo}
                        </span>
                      )}

                      <div className="min-w-0 flex-1">
                        {canEditRoster ? (
                          <EditableName
                            key={`${r.id}:${editingId === r.id}`}
                            value={r.name}
                            label={r.name}
                            editing={editingId === r.id}
                            onCancel={() => setEditingId(null)}
                            onRename={(to) => renameContractor(r.id, to).size > 0}
                          />
                        ) : (
                          <span className="block truncate text-sm font-semibold text-ink">
                            {r.name}
                          </span>
                        )}
                        {/* The committed figure has its own column now, so the
                            line under the name only says where the day stands. */}
                        <span className="mt-0.5 block truncate text-xs text-ink-muted">
                          {stateOf(value, variance)}
                        </span>
                      </div>
                    </div>

                    <span className="tnum text-sm font-semibold text-ink">
                      {num(r.committed)}
                    </span>

                    {/* The only thing on the row you ever touch. */}
                    <span className="flex">
                      <input
                        type="text"
                        inputMode="numeric"
                        aria-label={`Manpower reported by ${r.name} under ${r.type}`}
                        value={draft[r.id] ?? ""}
                        onChange={(e) => update(r.id, e.target.value)}
                        placeholder="—"
                        className={`tnum w-16 rounded-lg px-2 py-2 text-center text-[15px] font-semibold text-ink placeholder:font-normal placeholder:text-ink-muted focus:outline-none focus:ring-2 focus:ring-accent/30 ${
                          value == null
                            ? // Blank reads as waiting for you, not as empty.
                              "border border-dashed border-hairline bg-transparent focus:border-accent focus:bg-surface-1"
                            : "border border-hairline bg-surface-2 focus:border-accent focus:bg-surface-1"
                        }`}
                      />
                    </span>

                    {/* The row's own standing, under the day's fill rate, with
                        the roster controls kept out at the far edge. */}
                    <span className="flex items-center justify-between">
                      <span
                        className={`tnum text-xs ${
                          variance != null && variance < 0
                            ? "text-[var(--critical)]"
                            : "text-ink-muted"
                        }`}
                      >
                        {variance == null ? "—" : signed(variance)}
                      </span>

                      {canEditRoster && (
                        <span className="flex shrink-0 items-center opacity-0 transition-opacity focus-within:opacity-100 group-hover:opacity-100">
                          <EditButton label={r.name} onClick={() => setEditingId(r.id)} />
                          <DeleteButton
                            label={`${r.name} from the roster`}
                            onConfirm={() => removeContractor(r.id)}
                          />
                        </span>
                      )}
                    </span>
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
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
          Leave a box empty for a contractor who did not report — it stays &ldquo;not
          entered&rdquo; rather than counting as zero.
        </span>
      </div>
    </div>
  );
}

/** SortHeader, with this form's sort state wired in. */
function Head({
  label,
  sortKey,
  sort,
  onSort,
  className,
}: {
  label: string;
  sortKey: SortKey;
  /** Null until a header is clicked: the roster's own order. */
  sort: Sort | null;
  onSort: (key: SortKey) => void;
  className?: string;
}) {
  return (
    <SortHeader
      label={label}
      active={sort?.key === sortKey}
      dir={sort?.dir ?? "asc"}
      onSort={() => onSort(sortKey)}
      className={className}
    />
  );
}

/** What the row says in words, so the colour bar never carries it alone. */
function stateOf(value: number | null, variance: number | null): string {
  if (value == null || variance == null) return "not entered";
  if (variance < 0) return `short by ${num(-variance)}`;
  if (variance > 0) return `over by ${num(variance)}`;
  return "on commitment";
}

function Metric({
  label,
  tone,
  children,
}: {
  label: string;
  /** Only the fill rate uses this; the rest stay in ink. */
  tone?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <p
        className="tnum text-2xl font-semibold leading-none tracking-tight text-ink"
        style={tone ? { color: tone } : undefined}
      >
        {children}
      </p>
      <p className="mt-1.5 text-[11px] text-ink-muted">{label}</p>
    </div>
  );
}
