import type { ManpowerRow } from "./types";

/**
 * Deterministic seed data: 6 sites × 7 trades × 30 days of an interior
 * fit-out programme, with realistic absenteeism and a couple of sites
 * deliberately running short so the shortfall views have something to show.
 */
const SITES = [
  { name: "Tower A — Fit-out", contractor: "Shree Interiors", scale: 1.0, discipline: 0.96 },
  { name: "Tower B — Fit-out", contractor: "Shree Interiors", scale: 0.85, discipline: 0.91 },
  { name: "Corporate Office L4", contractor: "Veer Associates", scale: 0.6, discipline: 0.78 },
  { name: "Retail Mall Phase 2", contractor: "Nova Buildcon", scale: 1.2, discipline: 0.88 },
  { name: "Hospital Block C", contractor: "Nova Buildcon", scale: 0.7, discipline: 0.64 },
  { name: "Warehouse Annexe", contractor: "Akhil Labour Co.", scale: 0.45, discipline: 0.93 },
];

const TRADES = [
  { name: "Helper", weight: 0.3 },
  { name: "Mason", weight: 0.16 },
  { name: "Carpenter", weight: 0.15 },
  { name: "Electrician", weight: 0.12 },
  { name: "Painter", weight: 0.1 },
  { name: "Plumber", weight: 0.09 },
  { name: "Gypsum / False Ceiling", weight: 0.08 },
];

/** Mulberry32 — small, seeded, so every reload shows the same numbers. */
function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Anchor the sample window to a fixed date rather than "today": the dataset
 * has to be identical on the server and in the browser, or the prerender and
 * the hydrated render disagree.
 */
export const SAMPLE_ANCHOR = "2026-10-07";

export function generateSampleRows(days = 30, anchor = SAMPLE_ANCHOR): ManpowerRow[] {
  const endDate = new Date(`${anchor}T00:00:00Z`);
  const rand = rng(20261007);
  const rows: ManpowerRow[] = [];

  for (let d = days - 1; d >= 0; d--) {
    const day = new Date(endDate);
    day.setUTCDate(day.getUTCDate() - d);
    const iso = day.toISOString().slice(0, 10);
    const dow = day.getUTCDay();
    // Sunday is a half day on most sites; Saturday runs near-full.
    const dayFactor = dow === 0 ? 0.35 : dow === 6 ? 0.92 : 1;
    // The programme ramps up over the month.
    const ramp = 0.75 + 0.45 * ((days - d) / days);

    for (const site of SITES) {
      for (const trade of TRADES) {
        const base = 120 * site.scale * trade.weight * ramp;
        const planned = Math.max(1, Math.round(base));
        const show = site.discipline * dayFactor * (0.9 + 0.2 * rand());
        const actual = Math.max(0, Math.min(planned + 2, Math.round(planned * show)));
        rows.push({
          date: iso,
          site: site.name,
          contractor: site.contractor,
          trade: trade.name,
          planned,
          actual,
        });
      }
    }
  }
  return rows;
}

export const SAMPLE_CSV_HEADERS = "Date,Site,Contractor,Trade,Planned,Actual";

/** The downloadable template — same columns the parser looks for. */
export function sampleCsv(rows: ManpowerRow[]): string {
  const body = rows
    .map((r) =>
      [r.date, r.site, r.contractor, r.trade, r.planned, r.actual]
        .map((v) => (String(v).includes(",") ? `"${v}"` : String(v)))
        .join(","),
    )
    .join("\n");
  return `${SAMPLE_CSV_HEADERS}\n${body}\n`;
}
