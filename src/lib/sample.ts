import { contractorId, typeKey, type Contractor, type DailyEntry } from "./types";

/**
 * Anchored to a fixed date rather than "today": the seed has to be identical
 * on the server and in the browser or the prerender and the hydrated render
 * disagree.
 */
export const SAMPLE_ANCHOR = "2026-10-07";

/**
 * The roster as it appears in the register this dashboard was built from,
 * under the MEP / Interior split. Electrical and Fire Fighting carry the real
 * figures; the remaining types are placeholders so the structure is visible.
 */
const ROSTER: [
  category: string,
  type: string,
  name: string,
  committed: number,
  today: number,
][] = [
  ["MEP", "Electrical", "Prajapati", 12, 3],
  ["MEP", "Electrical", "Amritpal", 15, 12],
  ["MEP", "Electrical", "Harjeet Saini", 10, 4],
  ["MEP", "Electrical", "Dharmendra", 10, 7],
  ["MEP", "Electrical", "Unique Engineering", 10, 10],
  ["MEP", "Electrical", "Bijli wala", 10, 20],

  ["MEP", "Fire Fighting", "Gara", 10, 3],
  ["MEP", "Fire Fighting", "Apex", 8, 4],
  ["MEP", "Fire Fighting", "Synoptic", 10, 10],
  ["MEP", "Fire Fighting", "Modern Agency", 10, 12],
  ["MEP", "Fire Fighting", "Dumex", 10, 3],

  ["MEP", "Mechanical", "Thermo Air", 8, 6],
  ["MEP", "Mechanical", "Vayu Systems", 6, 5],

  ["MEP", "Plumbing", "Jal Works", 9, 7],
  ["MEP", "Plumbing", "Pipe Craft", 7, 7],

  ["Interior", "HOI", "Homeland Interiors", 14, 11],
  ["Interior", "HOI", "Deco Line", 8, 6],
];

export const SAMPLE_CATEGORY_ORDER: Record<string, number> = {
  MEP: 1,
  Interior: 2,
};

export const SAMPLE_TYPE_ORDER: Record<string, number> = {
  [typeKey("MEP", "Electrical")]: 1,
  [typeKey("MEP", "Fire Fighting")]: 2,
  [typeKey("MEP", "Mechanical")]: 3,
  [typeKey("MEP", "Plumbing")]: 4,
  [typeKey("Interior", "HOI")]: 1,
};

export function sampleContractors(): Contractor[] {
  const seen = new Map<string, number>();
  return ROSTER.map(([category, type, name, committed]) => {
    const k = typeKey(category, type);
    const srNo = (seen.get(k) ?? 0) + 1;
    seen.set(k, srNo);
    return { id: contractorId(category, type, name), category, type, name, committed, srNo };
  });
}

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

    for (const [category, type, name, , today] of ROSTER) {
      const id = contractorId(category, type, name);
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

export const ROSTER_CSV_HEADERS =
  "Sr. No.,Category,Contractor Type,Contractor Name,Committed,Today's Manpower";

/** The downloadable template — the same columns the importer looks for. */
export function rosterCsv(contractors: Contractor[], actuals: Map<string, number>): string {
  const cell = (v: string | number) => {
    const s = String(v);
    return /[",]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const body = contractors
    .map((c) =>
      [c.srNo, c.category, c.type, c.name, c.committed, actuals.get(c.id) ?? ""]
        .map(cell)
        .join(","),
    )
    .join("\n");
  return `${ROSTER_CSV_HEADERS}\n${body}\n`;
}
