import { sampleContractors, sampleEntries, SAMPLE_ANCHOR } from "./sample";
import type { AppData, Contractor, DailyEntry } from "./types";

const STORAGE_KEY = "manpower.data.v2";

/**
 * Module constant, not a function call per render: useSyncExternalStore needs
 * a server snapshot that is stable across calls, and the prerender needs it to
 * contain no "now".
 */
export const SAMPLE_DATA: AppData = {
  contractors: sampleContractors(),
  entries: sampleEntries(),
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
    return parsed;
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
export function replaceRoster(contractors: Contractor[], source: string): void {
  const live = new Set(contractors.map((c) => c.id));
  commit({
    contractors,
    entries: current.entries.filter((e) => live.has(e.contractorId)),
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

/**
 * Remove a whole contractor type: every contractor under it and all of their
 * saved manpower. Callers confirm first — this cannot be undone.
 */
export function removeType(type: string): void {
  const doomed = new Set(
    current.contractors.filter((c) => c.type === type).map((c) => c.id),
  );
  if (doomed.size === 0) return;
  commit({
    ...current,
    contractors: current.contractors.filter((c) => !doomed.has(c.id)),
    entries: current.entries.filter((e) => !doomed.has(e.contractorId)),
    isSample: false,
  });
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
