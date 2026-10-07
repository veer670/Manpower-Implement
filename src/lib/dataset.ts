import { generateSampleRows, SAMPLE_ANCHOR } from "./sample";
import type { ManpowerRow } from "./types";

const STORAGE_KEY = "manpower.dataset.v1";

export type Dataset = {
  rows: ManpowerRow[];
  /** File name, or "Sample data" when nothing has been uploaded. */
  source: string;
  /** ISO timestamp of the load. */
  loadedAt: string;
  isSample: boolean;
};

/**
 * The sample dataset is a module constant, not a function call per render:
 * `useSyncExternalStore` requires a server snapshot that is stable across
 * calls, and the prerender requires it to contain no "now".
 */
export const SAMPLE_DATASET: Dataset = {
  rows: generateSampleRows(),
  source: "Sample data",
  loadedAt: `${SAMPLE_ANCHOR}T00:00:00.000Z`,
  isSample: true,
};

function readStorage(): Dataset | null {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return null;
    const parsed = JSON.parse(saved) as Dataset;
    if (!Array.isArray(parsed.rows) || parsed.rows.length === 0) return null;
    return parsed;
  } catch {
    // A corrupt entry, or a browser refusing storage access, is not worth
    // failing the page over — the sample dataset is a working fallback.
    return null;
  }
}

/**
 * Read once at module load on the client. React hydrates against
 * `getServerSnapshot` and only then switches to this value, so there is no
 * hydration mismatch and no setState inside an effect.
 */
let current: Dataset =
  typeof window === "undefined" ? SAMPLE_DATASET : (readStorage() ?? SAMPLE_DATASET);

const listeners = new Set<() => void>();

function commit(next: Dataset) {
  current = next;
  listeners.forEach((l) => l());
}

export function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export const getSnapshot = (): Dataset => current;

/** Must be referentially stable across calls. */
export const getServerSnapshot = (): Dataset => SAMPLE_DATASET;

export function loadRows(rows: ManpowerRow[], source: string): void {
  const next: Dataset = {
    rows,
    source,
    loadedAt: new Date().toISOString(),
    isSample: false,
  };
  commit(next);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Quota, or private mode: the dataset still works for this session, it
    // just will not survive a reload.
  }
}

export function resetToSample(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* nothing to clean up */
  }
  commit(SAMPLE_DATASET);
}
