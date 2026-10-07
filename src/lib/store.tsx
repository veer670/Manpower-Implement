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
import { emptyFilters, type Filters, type ManpowerRow } from "./types";

type Store = {
  dataset: ds.Dataset;
  filters: Filters;
  setDataset: (rows: ManpowerRow[], source: string) => void;
  resetToSample: () => void;
  setFilters: (next: Filters | ((prev: Filters) => Filters)) => void;
  clearFilters: () => void;
};

const StoreContext = createContext<Store | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  // The dataset lives outside React (it is backed by localStorage); filters
  // are ephemeral per-session state, so they stay in ordinary React state.
  const dataset = useSyncExternalStore(ds.subscribe, ds.getSnapshot, ds.getServerSnapshot);
  const [filters, setFiltersState] = useState<Filters>(emptyFilters);

  const setDataset = useCallback((rows: ManpowerRow[], source: string) => {
    ds.loadRows(rows, source);
    setFiltersState(emptyFilters);
  }, []);

  const resetToSample = useCallback(() => {
    ds.resetToSample();
    setFiltersState(emptyFilters);
  }, []);

  const setFilters = useCallback((next: Filters | ((prev: Filters) => Filters)) => {
    setFiltersState((prev) => (typeof next === "function" ? next(prev) : next));
  }, []);

  const clearFilters = useCallback(() => setFiltersState(emptyFilters), []);

  const value = useMemo<Store>(
    () => ({ dataset, filters, setDataset, resetToSample, setFilters, clearFilters }),
    [dataset, filters, setDataset, resetToSample, setFilters, clearFilters],
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): Store {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used inside <StoreProvider>");
  return ctx;
}
