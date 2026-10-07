/**
 * The roster is master data, three levels deep:
 *
 *   Category (MEP, Interior)
 *     └── Contractor type (Electrical, Fire Fighting, HOI…)
 *           └── Contractor (Prajapati…)
 *
 * Only the contractor is a record. Categories and types exist as fields on it,
 * so one with nobody under it does not survive a reload — which is why the
 * forms that create them always ask for a contractor too.
 */
export type Contractor = {
  /** Stable id from category + type + name, so re-importing a sheet matches. */
  id: string;
  category: string;
  type: string;
  name: string;
  /** Headcount committed under the contract. */
  committed: number;
  /** Display order within its type. Editable; ties break on name. */
  srNo: number;
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
  /**
   * Display order for the two levels that are not records of their own.
   * Keyed by name; a name absent here sorts after the numbered ones.
   */
  categoryOrder: Record<string, number>;
  /** Keyed `category::type`, since two categories may share a type name. */
  typeOrder: Record<string, number>;
  /** Roster file name, or "Sample roster". */
  source: string;
  loadedAt: string;
  isSample: boolean;
};

export type Filters = {
  from: string | null;
  to: string | null;
  categories: string[];
  types: string[];
  sites: string[];
};

export const emptyFilters: Filters = {
  from: null,
  to: null,
  categories: [],
  types: [],
  sites: [],
};

const slug = (s: string) =>
  s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

/** Stable, and collision-resistant enough for a roster of a few hundred rows. */
export function contractorId(category: string, type: string, name: string): string {
  return `${slug(category)}__${slug(type)}__${slug(name)}`;
}

export const typeKey = (category: string, type: string): string =>
  `${slug(category)}::${slug(type)}`;

export type ParseResult = {
  contractors: Contractor[];
  /** Today's Manpower column, when the sheet carried one. */
  actuals: Map<string, number>;
  hadActualColumn: boolean;
  hadCategoryColumn: boolean;
  warnings: string[];
};
