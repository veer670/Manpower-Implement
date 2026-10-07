"use client";

import { X } from "lucide-react";
import { useStore } from "@/lib/store";
import type { ManpowerRow } from "@/lib/types";
import { distinct, dateRange } from "@/lib/metrics";

/**
 * One filter row above everything it scopes — never per-chart filters.
 * Every chart and the table re-render against the same slice.
 */
export default function FilterBar({ allRows }: { allRows: ManpowerRow[] }) {
  const { filters, setFilters, clearFilters } = useStore();
  const range = dateRange(allRows);

  const sites = distinct(allRows, (r) => r.site);
  const contractors = distinct(allRows, (r) => r.contractor);
  const trades = distinct(allRows, (r) => r.trade);

  const active =
    filters.from ||
    filters.to ||
    filters.sites.length > 0 ||
    filters.contractors.length > 0 ||
    filters.trades.length > 0;

  const preset = (days: number) => {
    if (!range) return;
    const to = range.max;
    const from = new Date(`${to}T00:00:00`);
    from.setDate(from.getDate() - (days - 1));
    const fromIso = from.toISOString().slice(0, 10);
    setFilters((p) => ({ ...p, from: fromIso < range.min ? range.min : fromIso, to }));
  };

  return (
    <div className="flex flex-wrap items-end gap-3 rounded-xl border border-hairline bg-surface-1 p-4">
      <Field label="From">
        <input
          type="date"
          value={filters.from ?? ""}
          min={range?.min}
          max={range?.max}
          onChange={(e) => setFilters((p) => ({ ...p, from: e.target.value || null }))}
          className={inputClass}
        />
      </Field>
      <Field label="To">
        <input
          type="date"
          value={filters.to ?? ""}
          min={range?.min}
          max={range?.max}
          onChange={(e) => setFilters((p) => ({ ...p, to: e.target.value || null }))}
          className={inputClass}
        />
      </Field>

      <div className="flex items-center gap-1 pb-0.5">
        {[7, 30].map((d) => (
          <button key={d} onClick={() => preset(d)} className={chipClass}>
            Last {d}d
          </button>
        ))}
      </div>

      <Select
        label="Site"
        value={filters.sites[0] ?? ""}
        options={sites}
        onChange={(v) => setFilters((p) => ({ ...p, sites: v ? [v] : [] }))}
      />
      <Select
        label="Contractor"
        value={filters.contractors[0] ?? ""}
        options={contractors}
        onChange={(v) => setFilters((p) => ({ ...p, contractors: v ? [v] : [] }))}
      />
      <Select
        label="Trade"
        value={filters.trades[0] ?? ""}
        options={trades}
        onChange={(v) => setFilters((p) => ({ ...p, trades: v ? [v] : [] }))}
      />

      {active && (
        <button
          onClick={clearFilters}
          className="mb-0.5 flex items-center gap-1 rounded-md px-2 py-1.5 text-xs font-medium text-ink-secondary hover:bg-surface-2 hover:text-ink"
        >
          <X size={13} strokeWidth={2.5} aria-hidden />
          Clear
        </button>
      )}
    </div>
  );
}

const inputClass =
  "rounded-md border border-hairline bg-surface-2 px-2.5 py-1.5 text-xs text-ink " +
  "focus:border-series-1 focus:outline-none focus:ring-1 focus:ring-series-1";

const chipClass =
  "rounded-md border border-hairline bg-surface-2 px-2.5 py-1.5 text-xs font-medium " +
  "text-ink-secondary hover:text-ink";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[11px] font-medium text-ink-muted">{label}</span>
      {children}
    </label>
  );
}

function Select({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (v: string) => void;
}) {
  return (
    <Field label={label}>
      <select value={value} onChange={(e) => onChange(e.target.value)} className={inputClass}>
        <option value="">All {label.toLowerCase()}s</option>
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </Field>
  );
}
