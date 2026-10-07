/** One row of the daily manpower deployment register. */
export type ManpowerRow = {
  /** ISO date, yyyy-mm-dd */
  date: string;
  site: string;
  contractor: string;
  /** Trade / skill category, e.g. Mason, Carpenter, Helper */
  trade: string;
  /** Heads planned for that site/trade/day */
  planned: number;
  /** Heads that actually reported */
  actual: number;
};

export type Filters = {
  /** null = all dates in the dataset */
  from: string | null;
  to: string | null;
  /** empty array = all */
  sites: string[];
  contractors: string[];
  trades: string[];
};

export const emptyFilters: Filters = {
  from: null,
  to: null,
  sites: [],
  contractors: [],
  trades: [],
};

/** Shape of a parse attempt, so the UI can report partial success. */
export type ParseResult = {
  rows: ManpowerRow[];
  /** Human-readable problems, one per offending row (capped by the parser). */
  warnings: string[];
  /** Columns the parser matched, for the "we read your sheet as…" summary. */
  mapping: Record<keyof ManpowerRow, string | null>;
};
