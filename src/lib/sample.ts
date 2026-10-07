import { contractorId, type Contractor, type DailyEntry } from "./types";

/**
 * Anchored to a fixed date rather than "today": the seed has to be identical
 * on the server and in the browser or the prerender and the hydrated render
 * disagree.
 */
export const SAMPLE_ANCHOR = "2026-10-07";

/** The roster as it appears in the register this dashboard was built from. */
const ROSTER: [type: string, name: string, committed: number, today: number][] = [
  ["Electrical", "Prajapati", 12, 3],
  ["Electrical", "Amritpal", 15, 12],
  ["Electrical", "Harjeet Saini", 10, 4],
  ["Electrical", "Dharmendra", 10, 7],
  ["Electrical", "Unique Engineering", 10, 10],
  ["Electrical", "Bijli wala", 10, 20],
  ["Fire Fighting", "Gara", 10, 3],
  ["Fire Fighting", "Apex", 8, 4],
  ["Fire Fighting", "Synoptic", 10, 10],
  ["Fire Fighting", "Modern Agency", 10, 12],
  ["Fire Fighting", "Dumex", 10, 3],
];

export const sampleContractors = (): Contractor[] =>
  ROSTER.map(([type, name, committed]) => ({
    id: contractorId(type, name),
    type,
    name,
    committed,
  }));

/** Mulberry32 — seeded, so every reload shows the same numbers. */
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
 * The anchor day carries the exact figures from the register; the days before
 * it are plausible variations around each contractor's own showing, so the
 * trend has something to plot.
 */
export function sampleEntries(days = 14, anchor = SAMPLE_ANCHOR): DailyEntry[] {
  const rand = rng(20261007);
  const end = new Date(`${anchor}T00:00:00Z`);
  const entries: DailyEntry[] = [];

  for (let d = days - 1; d >= 0; d--) {
    const day = new Date(end);
    day.setUTCDate(day.getUTCDate() - d);
    const iso = day.toISOString().slice(0, 10);
    const sunday = day.getUTCDay() === 0;

    for (const [type, name, , today] of ROSTER) {
      const id = contractorId(type, name);
      if (d === 0) {
        entries.push({ date: iso, contractorId: id, actual: today });
        continue;
      }
      const drift = 0.65 + 0.7 * rand();
      const actual = Math.max(0, Math.round(today * drift * (sunday ? 0.4 : 1)));
      entries.push({ date: iso, contractorId: id, actual });
    }
  }
  return entries;
}

export const ROSTER_CSV_HEADERS = "Contractor Type,Contractor Name,Committed,Today's Manpower";

/** The downloadable template — the same columns the importer looks for. */
export function rosterCsv(contractors: Contractor[], actuals: Map<string, number>): string {
  const cell = (v: string | number) => {
    const s = String(v);
    return /[",]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const body = contractors
    .map((c) => [c.type, c.name, c.committed, actuals.get(c.id) ?? ""].map(cell).join(","))
    .join("\n");
  return `${ROSTER_CSV_HEADERS}\n${body}\n`;
}
