/**
 * "Today" cannot be computed during the prerender: the build has no idea what
 * day the viewer will open the page, and Next rejects an unstable `new Date()`
 * in a prerendered client component. So it is read once in the browser and
 * served through useSyncExternalStore, with a null server snapshot that the
 * UI renders a placeholder for.
 */

function localISO(d: Date): string {
  // Local components, never toISOString() — the latter shifts the date in any
  // timezone ahead of UTC.
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

const CLIENT_TODAY: string | null =
  typeof window === "undefined" ? null : localISO(new Date());

/** Nothing ever changes it, so the subscription is a no-op. */
export const subscribe = (): (() => void) => () => {};

export const getSnapshot = (): string | null => CLIENT_TODAY;

export const getServerSnapshot = (): string | null => null;
