import {
  sampleContractors,
  sampleEntries,
  SAMPLE_ANCHOR,
  SAMPLE_CATEGORY_ORDER,
  SAMPLE_TYPE_ORDER,
} from "./sample";
import {
  contractorId,
  typeKey,
  type AppData,
  type Contractor,
  type DailyEntry,
} from "./types";

// v3: the roster gained a category level and editable serial numbers, so ids
// from v2 no longer match.
const STORAGE_KEY = "manpower.data.v3";

export type { AppData } from "./types";

/**
 * Module constant, not a function call per render: useSyncExternalStore needs
 * a server snapshot that is stable across calls, and the prerender needs it to
 * contain no "now".
 */
export const SAMPLE_DATA: AppData = {
  contractors: sampleContractors(),
  entries: sampleEntries(),
  categoryOrder: SAMPLE_CATEGORY_ORDER,
  typeOrder: SAMPLE_TYPE_ORDER,
  source: "Sample roster",
  loadedAt: `${SAMPLE_ANCHOR}T00:00:00.000Z`,
  isSample: true,
};

function read(): AppData | null {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return null;
    const parsed = JSON.parse(saved) as AppData;
    if (!Array.isArray(parsed.contractors) || !Array.isArray(parsed.entries)) return null;
    return {
      ...parsed,
      categoryOrder: parsed.categoryOrder ?? {},
      typeOrder: parsed.typeOrder ?? {},
    };
  } catch {
    // A corrupt entry, or a browser refusing storage, is not worth failing the
    // page over — the sample roster is a working fallback.
    return null;
  }
}

/**
 * Read once at module load on the client. React hydrates against
 * getServerSnapshot and only then switches to this value, so there is no
 * hydration mismatch and no setState inside an effect.
 */
let current: AppData = typeof window === "undefined" ? SAMPLE_DATA : (read() ?? SAMPLE_DATA);

const listeners = new Set<() => void>();

function commit(next: AppData) {
  current = next;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Quota, or private mode: the change still applies for this session, it
    // just will not survive a reload.
  }
  listeners.forEach((l) => l());
}

export function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export const getSnapshot = (): AppData => current;

/** Must be referentially stable across calls. */
export const getServerSnapshot = (): AppData => SAMPLE_DATA;

/**
 * Replace the roster. Daily entries for contractors that are still on the
 * roster are kept — re-importing a corrected sheet must not wipe history.
 */
export function replaceRoster(
  contractors: Contractor[],
  source: string,
  order?: { categoryOrder?: Record<string, number>; typeOrder?: Record<string, number> },
): void {
  const live = new Set(contractors.map((c) => c.id));
  commit({
    contractors,
    entries: current.entries.filter((e) => live.has(e.contractorId)),
    categoryOrder: order?.categoryOrder ?? {},
    typeOrder: order?.typeOrder ?? {},
    source,
    loadedAt: new Date().toISOString(),
    isSample: false,
  });
}

export function upsertContractor(contractor: Contractor): void {
  const i = current.contractors.findIndex((c) => c.id === contractor.id);
  const contractors =
    i >= 0
      ? current.contractors.map((c) => (c.id === contractor.id ? contractor : c))
      : [...current.contractors, contractor];
  commit({ ...current, contractors, isSample: false });
}

export function removeContractor(id: string): void {
  commit({
    ...current,
    contractors: current.contractors.filter((c) => c.id !== id),
    entries: current.entries.filter((e) => e.contractorId !== id),
    isSample: false,
  });
}

/**
 * Remove a whole contractor type: every contractor under it and all of their
 * saved manpower. Callers confirm first — this cannot be undone.
 */
export function removeType(category: string, type: string): void {
  const doomed = new Set(
    current.contractors.filter((c) => c.category === category && c.type === type).map((c) => c.id),
  );
  if (doomed.size === 0) return;
  const typeOrder = { ...current.typeOrder };
  delete typeOrder[typeKey(category, type)];
  commit({
    ...current,
    contractors: current.contractors.filter((c) => !doomed.has(c.id)),
    entries: current.entries.filter((e) => !doomed.has(e.contractorId)),
    typeOrder,
    isSample: false,
  });
}

/** Remove a category, and with it every type and contractor underneath. */
export function removeCategory(category: string): void {
  const doomed = new Set(
    current.contractors.filter((c) => c.category === category).map((c) => c.id),
  );
  if (doomed.size === 0) return;
  const categoryOrder = { ...current.categoryOrder };
  delete categoryOrder[category];
  // typeKey(category, "") is exactly the prefix every key under this
  // category starts with.
  const prefix = typeKey(category, "");
  const typeOrder = Object.fromEntries(
    Object.entries(current.typeOrder).filter(([k]) => !k.startsWith(prefix)),
  );
  commit({
    ...current,
    contractors: current.contractors.filter((c) => !doomed.has(c.id)),
    entries: current.entries.filter((e) => !doomed.has(e.contractorId)),
    categoryOrder,
    typeOrder,
    isSample: false,
  });
}

/* ------------------------------------------------------------- renaming */

/**
 * A contractor's id is derived from its category, type and name, so renaming
 * any of the three mints new ids. Everything keyed by id — saved manpower and
 * contractor logins — has to move with them, which is why these return the
 * old→new map rather than just mutating the roster.
 */
export type IdMap = Map<string, string>;

function applyRename(
  changed: Contractor[],
  untouched: Contractor[],
  patch: Partial<AppData>,
): IdMap {
  const map: IdMap = new Map();
  const renamed = changed.map((c) => {
    const next = contractorId(c.category, c.type, c.name);
    if (next !== c.id) map.set(c.id, next);
    return { ...c, id: next };
  });

  // A rename that collides with an existing contractor would silently merge
  // two rosters rows into one. Refuse rather than lose a row.
  const seen = new Set(untouched.map((c) => c.id));
  for (const c of renamed) {
    if (seen.has(c.id)) return new Map();
    seen.add(c.id);
  }

  commit({
    ...current,
    ...patch,
    contractors: [...untouched, ...renamed],
    entries: current.entries.map((e) =>
      map.has(e.contractorId) ? { ...e, contractorId: map.get(e.contractorId)! } : e,
    ),
    isSample: false,
  });
  return map;
}

/** Returns the old→new id map, or an empty map when the rename was refused. */
export function renameCategory(from: string, to: string): IdMap {
  const name = to.trim();
  if (!name || name === from) return new Map();
  if (current.contractors.some((c) => c.category === name)) return new Map();

  const changed = current.contractors
    .filter((c) => c.category === from)
    .map((c) => ({ ...c, category: name }));
  if (changed.length === 0) return new Map();

  const categoryOrder = { ...current.categoryOrder };
  if (from in categoryOrder) {
    categoryOrder[name] = categoryOrder[from];
    delete categoryOrder[from];
  }

  const oldPrefix = typeKey(from, "");
  const typeOrder: Record<string, number> = {};
  for (const [k, v] of Object.entries(current.typeOrder)) {
    typeOrder[k.startsWith(oldPrefix) ? typeKey(name, k.slice(oldPrefix.length)) : k] = v;
  }

  return applyRename(
    changed,
    current.contractors.filter((c) => c.category !== from),
    { categoryOrder, typeOrder },
  );
}

export function renameType(category: string, from: string, to: string): IdMap {
  const name = to.trim();
  if (!name || name === from) return new Map();
  if (current.contractors.some((c) => c.category === category && c.type === name)) {
    return new Map();
  }

  const changed = current.contractors
    .filter((c) => c.category === category && c.type === from)
    .map((c) => ({ ...c, type: name }));
  if (changed.length === 0) return new Map();

  const typeOrder = { ...current.typeOrder };
  const oldKey = typeKey(category, from);
  if (oldKey in typeOrder) {
    typeOrder[typeKey(category, name)] = typeOrder[oldKey];
    delete typeOrder[oldKey];
  }

  return applyRename(
    changed,
    current.contractors.filter((c) => !(c.category === category && c.type === from)),
    { typeOrder },
  );
}

export function renameContractor(id: string, to: string): IdMap {
  const name = to.trim();
  const target = current.contractors.find((c) => c.id === id);
  if (!name || !target || name === target.name) return new Map();

  return applyRename(
    [{ ...target, name }],
    current.contractors.filter((c) => c.id !== id),
    {},
  );
}

/* ------------------------------------------------- display order (Sr. No.) */

export function setContractorSrNo(id: string, srNo: number): void {
  commit({
    ...current,
    contractors: current.contractors.map((c) => (c.id === id ? { ...c, srNo } : c)),
    isSample: false,
  });
}

export function setCategorySrNo(category: string, srNo: number): void {
  commit({
    ...current,
    categoryOrder: { ...current.categoryOrder, [category]: srNo },
    isSample: false,
  });
}

export function setTypeSrNo(category: string, type: string, srNo: number): void {
  commit({
    ...current,
    typeOrder: { ...current.typeOrder, [typeKey(category, type)]: srNo },
    isSample: false,
  });
}

/**
 * Save one day's manpower. Contractors left blank are recorded as "not
 * entered" (no row) rather than zero, so an unfilled form never reads as
 * nobody turning up.
 *
 * Only the contractors present in `actuals` are touched. That scoping is what
 * lets a contractor save their own row without wiping everyone else's for the
 * same day.
 */
export function saveDay(date: string, actuals: Map<string, number | null>): void {
  const scope = new Set(actuals.keys());
  const untouched = current.entries.filter((e) => e.date !== date || !scope.has(e.contractorId));
  const saved: DailyEntry[] = [];
  actuals.forEach((actual, contractorId) => {
    if (actual != null) saved.push({ date, contractorId, actual });
  });
  commit({ ...current, entries: [...untouched, ...saved], isSample: false });
}

export function resetToSample(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* nothing to clean up */
  }
  current = SAMPLE_DATA;
  listeners.forEach((l) => l());
}
