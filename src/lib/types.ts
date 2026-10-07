/**
 * The roster is master data: contractor type, name and the headcount each
 * contractor has committed to. It is set up once and changes rarely.
 */
export type Contractor = {
  /** Stable id derived from type + name, so re-importing a sheet matches. */
  id: string;
  /** Discipline — Electrical, Fire Fighting, HVAC… */
  type: string;
  name: string;
  /** Headcount committed under the contract. */
  committed: number;
  /** Optional, for jobs running across more than one site. */
  site?: string;
};

/** One day's reported manpower for one contractor — the user's daily input. */
export type DailyEntry = {
  /** ISO date, yyyy-mm-dd */
  date: string;
  contractorId: string;
  actual: number;
};

export type AppData = {
  contractors: Contractor[];
  entries: DailyEntry[];
  /** Roster file name, or "Sample roster". */
  source: string;
  loadedAt: string;
  isSample: boolean;
};

export type Filters = {
  from: string | null;
  to: string | null;
  types: string[];
  sites: string[];
};

export const emptyFilters: Filters = { from: null, to: null, types: [], sites: [] };

/** Stable, collision-resistant enough for a roster of a few hundred rows. */
export function contractorId(type: string, name: string): string {
  const slug = (s: string) =>
    s
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
  return `${slug(type)}__${slug(name)}`;
}

export type ParseResult = {
  contractors: Contractor[];
  /** Today's Manpower column, when the sheet carried one. */
  actuals: Map<string, number>;
  hadActualColumn: boolean;
  warnings: string[];
};
