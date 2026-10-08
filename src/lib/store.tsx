"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import * as ds from "./dataset";
import * as auth from "./auth";
import { emptyFilters, type AppData, type Filters } from "./types";

type Store = {
  data: AppData;
  status: ds.Status;
  filters: Filters;
  setFilters: (next: Filters | ((prev: Filters) => Filters)) => void;
  clearFilters: () => void;
  reload: () => Promise<void>;
};

const StoreContext = createContext<Store | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const data = useSyncExternalStore(ds.subscribe, ds.getSnapshot, ds.getServerSnapshot);
  const status = useSyncExternalStore(ds.subscribe, ds.getStatus, ds.getServerStatus);
  const access = useSyncExternalStore(auth.subscribe, auth.getAccess, auth.getServerAccess);
  const [filters, setFiltersState] = useState<Filters>(emptyFilters);

  // Find out who we are, then load what they may see. Both live outside React,
  // so this effect starts them rather than setting state itself.
  useEffect(() => {
    void auth.refresh().then((a) => {
      if (a.session) void ds.reload();
    });
  }, []);

  // Signing in or out changes what the roster should contain.
  const username = access.session?.username ?? null;
  useEffect(() => {
    if (username) void ds.reload();
  }, [username]);

  const setFilters = useCallback((next: Filters | ((prev: Filters) => Filters)) => {
    setFiltersState((prev) => (typeof next === "function" ? next(prev) : next));
  }, []);

  const clearFilters = useCallback(() => setFiltersState(emptyFilters), []);

  const value = useMemo<Store>(
    () => ({ data, status, filters, setFilters, clearFilters, reload: ds.reload }),
    [data, status, filters, setFilters, clearFilters],
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): Store {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used inside <StoreProvider>");
  return ctx;
}
