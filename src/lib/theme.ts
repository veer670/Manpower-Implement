export type ThemeMode = "system" | "light" | "dark";

const KEY = "manpower.theme";

function read(): ThemeMode {
  try {
    const saved = localStorage.getItem(KEY);
    return saved === "light" || saved === "dark" ? saved : "system";
  } catch {
    return "system";
  }
}

// Read once on the client. The inline script in the document head has already
// stamped `data-theme` before first paint, so this only syncs the control.
let current: ThemeMode = typeof window === "undefined" ? "system" : read();

const listeners = new Set<() => void>();

export function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export const getSnapshot = (): ThemeMode => current;

/** Stable across calls, as useSyncExternalStore requires. */
export const getServerSnapshot = (): ThemeMode => "system";

export function setMode(mode: ThemeMode): void {
  current = mode;
  const root = document.documentElement;
  if (mode === "system") root.removeAttribute("data-theme");
  else root.setAttribute("data-theme", mode);
  try {
    localStorage.setItem(KEY, mode);
  } catch {
    // The preference just will not persist past this session.
  }
  listeners.forEach((l) => l());
}
