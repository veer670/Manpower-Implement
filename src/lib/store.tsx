"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import * as ds from "./dataset";
import { emptyFilters, type AppData, type Filters } from "./types";

type Store = {
  data: AppData;
  filters: Filters;
  setFilters: (next: Filters | ((prev: Filters) => Filters)) => void;
  clearFilters: () => void;
};

const StoreContext = createContext<Store | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  // The roster and entries live outside React (backed by localStorage);
  // filters are ephemeral per-session state, so they stay in React state.
  const data = useSyncExternalStore(ds.subscribe, ds.getSnapshot, ds.getServerSnapshot);
  const [filters, setFiltersState] = useState<Filters>(emptyFilters);

  const setFilters = useCallback((next: Filters | ((prev: Filters) => Filters)) => {
    setFiltersState((prev) => (typeof next === "function" ? next(prev) : next));
  }, []);

  const clearFilters = useCallback(() => setFiltersState(emptyFilters), []);

  const value = useMemo<Store>(
    () => ({ data, filters, setFilters, clearFilters }),
    [data, filters, setFilters, clearFilters],
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): Store {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used inside <StoreProvider>");
  return ctx;
}
