import { api, ApiError } from "./api";
import { contractorId, typeKey, type AppData, type Contractor, type DailyEntry } from "./types";

/**
 * The roster and the day's figures, held in memory and backed by the server.
 *
 * Every mutation applies locally first and then calls the API. The optimistic
 * step is what keeps typing in a manpower box feeling immediate over a site
 * connection; if the server disagrees, `reload()` puts the truth back and the
 * error surfaces. The exported shape is unchanged from the browser-only
 * version on purpose — the screens did not need to learn about HTTP.
 */

const EMPTY: AppData = {
  contractors: [],
  entries: [],
  categoryOrder: {},
  typeOrder: {},
  source: "Shared database",
  loadedAt: "",
  isSample: false,
};

export type Status =
  | { kind: "loading" }
  | { kind: "ready" }
  /** The server is reachable but nobody is signed in. */
  | { kind: "signed-out" }
  /** Reachable but unusable — almost always a database that is not attached. */
  | { kind: "error"; message: string };

let current: AppData = EMPTY;
let status: Status = { kind: "loading" };
let loading: Promise<void> | null = null;

const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

export function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export const getSnapshot = (): AppData => current;
export const getServerSnapshot = (): AppData => EMPTY;

export const getStatus = (): Status => status;
// Must be the same object every call: useSyncExternalStore compares the
// server snapshot by identity, and a fresh object each time is an infinite
// render loop.
const LOADING: Status = { kind: "loading" };
export const getServerStatus = (): Status => LOADING;

type RosterResponse = {
  contractors: Contractor[];
  categoryOrder: Record<string, number>;
  typeOrder: Record<string, number>;
};

/** Fetch everything. Safe to call repeatedly; concurrent calls share one trip. */
export function reload(): Promise<void> {
  loading ??= (async () => {
    try {
      const [roster, entries] = await Promise.all([
        api.get<RosterResponse>("/api/roster"),
        api.get<{ entries: DailyEntry[] }>("/api/entries"),
      ]);
      current = {
        contractors: roster.contractors,
        entries: entries.entries,
        categoryOrder: roster.categoryOrder,
        typeOrder: roster.typeOrder,
        source: "Shared database",
        loadedAt: new Date().toISOString(),
        isSample: false,
      };
      status = { kind: "ready" };
    } catch (err) {
      current = EMPTY;
      status =
        err instanceof ApiError && err.status === 401
          ? { kind: "signed-out" }
          : {
              kind: "error",
              message: err instanceof Error ? err.message : "Could not load the roster.",
            };
    } finally {
      loading = null;
      emit();
    }
  })();
  return loading;
}

/** Apply locally, then confirm with the server; reload if it disagrees. */
function optimistic(next: AppData, call: () => Promise<unknown>): void {
  current = next;
  emit();
  void call().catch((err) => {
    console.error("write rejected, reloading:", err);
    void reload();
  });
}

/* ---------------------------------------------------------- contractors */

export function upsertContractor(contractor: Contractor): void {
  const i = current.contractors.findIndex((c) => c.id === contractor.id);
  const contractors =
    i >= 0
      ? current.contractors.map((c) => (c.id === contractor.id ? contractor : c))
      : [...current.contractors, contractor];

  optimistic({ ...current, contractors }, () =>
    i >= 0
      ? api.patch("/api/roster", {
          kind: "contractor",
          id: contractor.id,
          committed: contractor.committed,
          srNo: contractor.srNo,
        })
      : api.post("/api/roster", {
          category: contractor.category,
          type: contractor.type,
          name: contractor.name,
          committed: contractor.committed,
        }),
  );
}

export function removeContractor(id: string): void {
  optimistic(
    {
      ...current,
      contractors: current.contractors.filter((c) => c.id !== id),
      entries: current.entries.filter((e) => e.contractorId !== id),
    },
    () => api.del("/api/roster", { kind: "contractor", id }),
  );
}

export function removeType(category: string, type: string): void {
  const doomed = new Set(
    current.contractors.filter((c) => c.category === category && c.type === type).map((c) => c.id),
  );
  if (doomed.size === 0) return;
  const typeOrder = { ...current.typeOrder };
  delete typeOrder[typeKey(category, type)];

  optimistic(
    {
      ...current,
      contractors: current.contractors.filter((c) => !doomed.has(c.id)),
      entries: current.entries.filter((e) => !doomed.has(e.contractorId)),
      typeOrder,
    },
    () => api.del("/api/roster", { kind: "type", category, type }),
  );
}

export function removeCategory(category: string): void {
  const doomed = new Set(
    current.contractors.filter((c) => c.category === category).map((c) => c.id),
  );
  if (doomed.size === 0) return;
  const categoryOrder = { ...current.categoryOrder };
  delete categoryOrder[category];
  const prefix = typeKey(category, "");
  const typeOrder = Object.fromEntries(
    Object.entries(current.typeOrder).filter(([k]) => !k.startsWith(prefix)),
  );

  optimistic(
    {
      ...current,
      contractors: current.contractors.filter((c) => !doomed.has(c.id)),
      entries: current.entries.filter((e) => !doomed.has(e.contractorId)),
      categoryOrder,
      typeOrder,
    },
    () => api.del("/api/roster", { kind: "category", category }),
  );
}

/* -------------------------------------------------------------- renaming */

/**
 * Renaming mints new ids, because an id is derived from all three names. The
 * clash check runs locally so the form can answer immediately; the server
 * repeats it, and the database cascades the entries.
 */
export type IdMap = Map<string, string>;

function rename(
  changed: Contractor[],
  untouched: Contractor[],
  patch: Partial<AppData>,
  call: () => Promise<unknown>,
): IdMap {
  const map: IdMap = new Map();
  const renamed = changed.map((c) => {
    const next = contractorId(c.category, c.type, c.name);
    if (next !== c.id) map.set(c.id, next);
    return { ...c, id: next };
  });

  const seen = new Set(untouched.map((c) => c.id));
  for (const c of renamed) {
    if (seen.has(c.id)) return new Map();
    seen.add(c.id);
  }

  optimistic(
    {
      ...current,
      ...patch,
      contractors: [...untouched, ...renamed],
      entries: current.entries.map((e) =>
        map.has(e.contractorId) ? { ...e, contractorId: map.get(e.contractorId)! } : e,
      ),
    },
    call,
  );
  return map;
}

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

  return rename(
    changed,
    current.contractors.filter((c) => c.category !== from),
    { categoryOrder, typeOrder },
    () => api.patch("/api/roster", { kind: "category", category: from, name }),
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

  return rename(
    changed,
    current.contractors.filter((c) => !(c.category === category && c.type === from)),
    { typeOrder },
    () => api.patch("/api/roster", { kind: "type", category, type: from, name }),
  );
}

export function renameContractor(id: string, to: string): IdMap {
  const name = to.trim();
  const target = current.contractors.find((c) => c.id === id);
  if (!name || !target || name === target.name) return new Map();

  return rename(
    [{ ...target, name }],
    current.contractors.filter((c) => c.id !== id),
    {},
    () => api.patch("/api/roster", { kind: "contractor", id, name }),
  );
}

/* ------------------------------------------------- display order (Sr. No.) */

export function setContractorSrNo(id: string, srNo: number): void {
  optimistic(
    {
      ...current,
      contractors: current.contractors.map((c) => (c.id === id ? { ...c, srNo } : c)),
    },
    () => api.patch("/api/roster", { kind: "contractor", id, srNo }),
  );
}

export function setCategorySrNo(category: string, srNo: number): void {
  optimistic({ ...current, categoryOrder: { ...current.categoryOrder, [category]: srNo } }, () =>
    api.patch("/api/roster", { kind: "category", category, srNo }),
  );
}

export function setTypeSrNo(category: string, type: string, srNo: number): void {
  optimistic(
    { ...current, typeOrder: { ...current.typeOrder, [typeKey(category, type)]: srNo } },
    () => api.patch("/api/roster", { kind: "type", category, type, srNo }),
  );
}

/* ------------------------------------------------------------- entries */

/**
 * Save one day. Only the contractors in `actuals` are touched, which is what
 * lets one person save their own rows without clearing anyone else's; a null
 * is a delete, keeping "not entered" distinct from a reported zero.
 */
export function saveDay(date: string, actuals: Map<string, number | null>): void {
  const scope = new Set(actuals.keys());
  const untouched = current.entries.filter(
    (e) => e.date !== date || !scope.has(e.contractorId),
  );
  const saved: DailyEntry[] = [];
  actuals.forEach((actual, id) => {
    if (actual != null) saved.push({ date, contractorId: id, actual });
  });

  optimistic({ ...current, entries: [...untouched, ...saved] }, () =>
    api.put("/api/entries", { date, actuals: Object.fromEntries(actuals) }),
  );
}

/* --------------------------------------------------------------- import */

/** Replace the roster wholesale, as a sheet import does. */
export async function replaceRoster(contractors: Contractor[]): Promise<void> {
  // Send the rows the server does not have yet, one at a time: the import is
  // rare and a partial failure should leave the rows that did land.
  const existing = new Set(current.contractors.map((c) => c.id));
  for (const c of contractors) {
    if (existing.has(c.id)) continue;
    await api
      .post("/api/roster", {
        category: c.category,
        type: c.type,
        name: c.name,
        committed: c.committed,
      })
      .catch((err) => console.error(`import: ${c.name} rejected`, err));
  }
  await reload();
}
