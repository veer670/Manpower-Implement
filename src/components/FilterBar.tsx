"use client";

import { X } from "lucide-react";
import { useStore } from "@/lib/store";
import { allDates, distinctSites, distinctTypes } from "@/lib/metrics";

/**
 * One filter row above everything it scopes — never per-chart filters. Every
 * chart and table on the page re-renders against the same slice.
 */
export default function FilterBar() {
  const { data, filters, setFilters, clearFilters } = useStore();

  const dates = allDates(data.entries);
  const min = dates[0];
  const max = dates.at(-1);
  const types = distinctTypes(data.contractors);
  const sites = distinctSites(data.contractors);

  const active =
    filters.from || filters.to || filters.types.length > 0 || filters.sites.length > 0;

  const preset = (days: number) => {
    if (!max) return;
    const from = new Date(`${max}T00:00:00`);
    from.setDate(from.getDate() - (days - 1));
    const p = (n: number) => String(n).padStart(2, "0");
    const iso = `${from.getFullYear()}-${p(from.getMonth() + 1)}-${p(from.getDate())}`;
    setFilters((prev) => ({ ...prev, from: min && iso < min ? min : iso, to: max }));
  };

  return (
    <div className="flex flex-wrap items-end gap-3 rounded-xl border border-hairline bg-surface-1 p-4">
      <Field label="From">
        <input
          type="date"
          value={filters.from ?? ""}
          min={min}
          max={max}
          onChange={(e) => setFilters((p) => ({ ...p, from: e.target.value || null }))}
          className={inputClass}
        />
      </Field>
      <Field label="To">
        <input
          type="date"
          value={filters.to ?? ""}
          min={min}
          max={max}
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
        label="Contractor type"
        value={filters.types[0] ?? ""}
        allLabel="All types"
        options={types}
        onChange={(v) => setFilters((p) => ({ ...p, types: v ? [v] : [] }))}
      />

      {sites.length > 1 && (
        <Select
          label="Site"
          value={filters.sites[0] ?? ""}
          allLabel="All sites"
          options={sites}
          onChange={(v) => setFilters((p) => ({ ...p, sites: v ? [v] : [] }))}
        />
      )}

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
  allLabel,
  value,
  options,
  onChange,
}: {
  label: string;
  allLabel: string;
  value: string;
  options: string[];
  onChange: (v: string) => void;
}) {
  return (
    <Field label={label}>
      <select value={value} onChange={(e) => onChange(e.target.value)} className={inputClass}>
        <option value="">{allLabel}</option>
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </Field>
  );
}
