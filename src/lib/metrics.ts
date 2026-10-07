import { typeKey, type AppData, type Contractor, type DailyEntry, type Filters } from "./types";

export type Totals = { committed: number; actual: number };

export type GroupRow = Totals & {
  key: string;
  variance: number;
  fillRate: number | null;
};

export type TrendPoint = Totals & { date: string };

/** A roster row joined to one day's reported manpower. */
export type DayRow = Contractor & {
  /** null when nothing was entered for that contractor on that day. */
  actual: number | null;
};

/** A category or type, with the serial number the user gave it. */
export type OrderedName = { name: string; srNo: number | null };

export const fillRate = (t: Totals): number | null =>
  t.committed > 0 ? t.actual / t.committed : null;

export function allDates(entries: DailyEntry[]): string[] {
  return [...new Set(entries.map((e) => e.date))].sort();
}

export const latestDate = (entries: DailyEntry[]): string | null =>
  allDates(entries).at(-1) ?? null;

/**
 * Sort by serial number, then name. An unnumbered item sorts after every
 * numbered one rather than jumping to the front as a zero would.
 */
function byOrder(a: OrderedName, b: OrderedName): number {
  const x = a.srNo ?? Number.POSITIVE_INFINITY;
  const y = b.srNo ?? Number.POSITIVE_INFINITY;
  return x === y ? a.name.localeCompare(b.name) : x - y;
}

export function categoriesOf(data: AppData, roster?: Contractor[]): OrderedName[] {
  const list = roster ?? data.contractors;
  return [...new Set(list.map((c) => c.category))]
    .map((name) => ({ name, srNo: data.categoryOrder[name] ?? null }))
    .sort(byOrder);
}

export function typesOf(data: AppData, category: string, roster?: Contractor[]): OrderedName[] {
  const list = roster ?? data.contractors;
  return [...new Set(list.filter((c) => c.category === category).map((c) => c.type))]
    .map((name) => ({ name, srNo: data.typeOrder[typeKey(category, name)] ?? null }))
    .sort(byOrder);
}

/** Contractors within one type, in the user's order. */
export const contractorsOf = (roster: Contractor[], category: string, type: string): Contractor[] =>
  roster
    .filter((c) => c.category === category && c.type === type)
    .sort((a, b) => (a.srNo === b.srNo ? a.name.localeCompare(b.name) : a.srNo - b.srNo));

export const distinctSites = (contractors: Contractor[]): string[] =>
  [...new Set(contractors.map((c) => c.site).filter((s): s is string => Boolean(s)))].sort((a, b) =>
    a.localeCompare(b),
  );

/** Roster rows left after the category/type/site filters. */
export function visibleContractors(data: AppData, f: Filters): Contractor[] {
  return data.contractors.filter((c) => {
    if (f.categories.length && !f.categories.includes(c.category)) return false;
    if (f.types.length && !f.types.includes(c.type)) return false;
    if (f.sites.length && !(c.site && f.sites.includes(c.site))) return false;
    return true;
  });
}

/** Entries left after the date filter, restricted to the visible roster. */
export function visibleEntries(data: AppData, f: Filters, roster: Contractor[]): DailyEntry[] {
  const live = new Set(roster.map((c) => c.id));
  return data.entries.filter((e) => {
    if (!live.has(e.contractorId)) return false;
    if (f.from && e.date < f.from) return false;
    if (f.to && e.date > f.to) return false;
    return true;
  });
}

/** The roster joined to a single day — what the entry form and today's KPIs read. */
export function rowsForDate(roster: Contractor[], entries: DailyEntry[], date: string): DayRow[] {
  const byId = new Map(
    entries.filter((e) => e.date === date).map((e) => [e.contractorId, e.actual]),
  );
  return roster.map((c) => ({ ...c, actual: byId.get(c.id) ?? null }));
}

export function totalsForRows(rows: DayRow[]): Totals {
  return rows.reduce<Totals>(
    (acc, r) => ({
      // A contractor with nothing entered contributes no commitment either,
      // so the fill rate compares like with like.
      committed: acc.committed + (r.actual == null ? 0 : r.committed),
      actual: acc.actual + (r.actual ?? 0),
    }),
    { committed: 0, actual: 0 },
  );
}

function group(rows: DayRow[], pick: (r: DayRow) => string): GroupRow[] {
  const buckets = new Map<string, Totals>();
  for (const r of rows) {
    if (r.actual == null) continue;
    const k = pick(r);
    const cur = buckets.get(k) ?? { committed: 0, actual: 0 };
    cur.committed += r.committed;
    cur.actual += r.actual;
    buckets.set(k, cur);
  }
  return [...buckets.entries()].map(([key, t]) => ({
    key,
    ...t,
    variance: t.actual - t.committed,
    fillRate: fillRate(t),
  }));
}

/** Worst fill rate first — the shortfalls are what this is opened for. */
const worstFirst = (g: GroupRow[]) =>
  g.sort((a, b) => (a.fillRate ?? Infinity) - (b.fillRate ?? Infinity));

export const byCategory = (rows: DayRow[]): GroupRow[] => worstFirst(group(rows, (r) => r.category));

export const byType = (rows: DayRow[]): GroupRow[] => worstFirst(group(rows, (r) => r.type));

export function byContractor(rows: DayRow[]): GroupRow[] {
  return rows
    .filter((r) => r.actual != null)
    .map((r) => {
      const t = { committed: r.committed, actual: r.actual as number };
      return { key: r.name, ...t, variance: t.actual - t.committed, fillRate: fillRate(t) };
    })
    .sort((a, b) => (a.fillRate ?? Infinity) - (b.fillRate ?? Infinity));
}

/** Committed versus reported, day by day, across the whole filtered window. */
export function trend(roster: Contractor[], entries: DailyEntry[]): TrendPoint[] {
  const committedById = new Map(roster.map((c) => [c.id, c.committed]));
  const buckets = new Map<string, Totals>();
  for (const e of entries) {
    const committed = committedById.get(e.contractorId);
    if (committed == null) continue;
    const cur = buckets.get(e.date) ?? { committed: 0, actual: 0 };
    cur.committed += committed;
    cur.actual += e.actual;
    buckets.set(e.date, cur);
  }
  return [...buckets.entries()]
    .map(([date, t]) => ({ date, ...t }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * Collapse a long tail into "Other" so a categorical chart never needs a
 * ninth hue.
 */
export function withOther(groups: GroupRow[], limit: number): GroupRow[] {
  if (groups.length <= limit) return groups;
  const head = groups.slice(0, limit);
  const tail = groups.slice(limit);
  const rolled = tail.reduce<Totals>(
    (acc, g) => ({ committed: acc.committed + g.committed, actual: acc.actual + g.actual }),
    { committed: 0, actual: 0 },
  );
  return [
    ...head,
    {
      key: `Other (${tail.length})`,
      ...rolled,
      variance: rolled.actual - rolled.committed,
      fillRate: fillRate(rolled),
    },
  ];
}

export type Severity = "good" | "warning" | "serious" | "critical";

/** Fill-rate banding. Over-commitment counts as met, not as a problem. */
export function severityForFillRate(rate: number | null): Severity {
  if (rate == null) return "good";
  if (rate >= 0.95) return "good";
  if (rate >= 0.85) return "warning";
  if (rate >= 0.7) return "serious";
  return "critical";
}

export const severityLabel: Record<Severity, string> = {
  good: "On commitment",
  warning: "Slightly short",
  serious: "Short",
  critical: "Critically short",
};
