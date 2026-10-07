import type { Filters, ManpowerRow } from "./types";

export type Totals = { planned: number; actual: number };

export type GroupRow = Totals & {
  key: string;
  variance: number;
  fillRate: number | null;
};

export type TrendPoint = Totals & { date: string };

export function applyFilters(rows: ManpowerRow[], f: Filters): ManpowerRow[] {
  return rows.filter((r) => {
    if (f.from && r.date < f.from) return false;
    if (f.to && r.date > f.to) return false;
    if (f.sites.length && !f.sites.includes(r.site)) return false;
    if (f.contractors.length && !f.contractors.includes(r.contractor)) return false;
    if (f.trades.length && !f.trades.includes(r.trade)) return false;
    return true;
  });
}

export const sum = (rows: ManpowerRow[]): Totals =>
  rows.reduce<Totals>(
    (acc, r) => ({ planned: acc.planned + r.planned, actual: acc.actual + r.actual }),
    { planned: 0, actual: 0 },
  );

export const fillRate = (t: Totals): number | null =>
  t.planned > 0 ? t.actual / t.planned : null;

function groupBy(rows: ManpowerRow[], pick: (r: ManpowerRow) => string): GroupRow[] {
  const buckets = new Map<string, Totals>();
  for (const r of rows) {
    const k = pick(r);
    const cur = buckets.get(k) ?? { planned: 0, actual: 0 };
    cur.planned += r.planned;
    cur.actual += r.actual;
    buckets.set(k, cur);
  }
  return [...buckets.entries()].map(([key, t]) => ({
    key,
    ...t,
    variance: t.actual - t.planned,
    fillRate: fillRate(t),
  }));
}

/** Sites, worst fill-rate first — the shortfalls are what a PM opens this for. */
export const bySite = (rows: ManpowerRow[]): GroupRow[] =>
  groupBy(rows, (r) => r.site).sort(
    (a, b) => (a.fillRate ?? Infinity) - (b.fillRate ?? Infinity),
  );

export const byContractor = (rows: ManpowerRow[]): GroupRow[] =>
  groupBy(rows, (r) => r.contractor).sort((a, b) => b.actual - a.actual);

export const byTrade = (rows: ManpowerRow[]): GroupRow[] =>
  groupBy(rows, (r) => r.trade).sort((a, b) => b.actual - a.actual);

export const trend = (rows: ManpowerRow[]): TrendPoint[] => {
  const buckets = new Map<string, Totals>();
  for (const r of rows) {
    const cur = buckets.get(r.date) ?? { planned: 0, actual: 0 };
    cur.planned += r.planned;
    cur.actual += r.actual;
    buckets.set(r.date, cur);
  }
  return [...buckets.entries()]
    .map(([date, t]) => ({ date, ...t }))
    .sort((a, b) => a.date.localeCompare(b.date));
};

export const distinct = (rows: ManpowerRow[], pick: (r: ManpowerRow) => string): string[] =>
  [...new Set(rows.map(pick))].sort((a, b) => a.localeCompare(b));

export const dateRange = (rows: ManpowerRow[]): { min: string; max: string } | null => {
  if (rows.length === 0) return null;
  let min = rows[0].date;
  let max = rows[0].date;
  for (const r of rows) {
    if (r.date < min) min = r.date;
    if (r.date > max) max = r.date;
  }
  return { min, max };
};

/**
 * Collapse a long tail into "Other" so a categorical chart never needs a 9th
 * hue. Returns the top `limit` by actual headcount plus one rolled-up row.
 */
export function withOther(groups: GroupRow[], limit: number): GroupRow[] {
  if (groups.length <= limit) return groups;
  const head = groups.slice(0, limit);
  const tail = groups.slice(limit);
  const rolled = tail.reduce<Totals>(
    (acc, g) => ({ planned: acc.planned + g.planned, actual: acc.actual + g.actual }),
    { planned: 0, actual: 0 },
  );
  return [
    ...head,
    {
      key: `Other (${tail.length})`,
      ...rolled,
      variance: rolled.actual - rolled.planned,
      fillRate: fillRate(rolled),
    },
  ];
}

export type Severity = "good" | "warning" | "serious" | "critical";

/** Fill-rate banding. Thresholds are deliberately conservative for site work. */
export function severityForFillRate(rate: number | null): Severity {
  if (rate == null) return "good";
  if (rate >= 0.95) return "good";
  if (rate >= 0.85) return "warning";
  if (rate >= 0.7) return "serious";
  return "critical";
}

export const severityLabel: Record<Severity, string> = {
  good: "On plan",
  warning: "Slight shortfall",
  serious: "Short",
  critical: "Critical shortfall",
};
