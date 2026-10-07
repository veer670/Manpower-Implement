/** Compact for tiles and axes: 1,284 → 1,284 · 12,900 → 12.9K */
export function compact(n: number): string {
  if (Math.abs(n) >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (Math.abs(n) >= 10_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString("en-IN");
}

export const num = (n: number): string => n.toLocaleString("en-IN");

export const signed = (n: number): string => (n > 0 ? `+${num(n)}` : num(n));

export const pct = (v: number | null, digits = 0): string =>
  v == null ? "—" : `${(v * 100).toFixed(digits)}%`;

/** "2026-10-07" → "7 Oct" (axis ticks, tooltips) */
export function shortDate(iso: string): string {
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

/** "2026-10-07" → "Tue, 7 Oct 2026" */
export function longDate(iso: string): string {
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}
