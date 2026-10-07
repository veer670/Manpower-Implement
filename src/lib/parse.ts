import * as XLSX from "xlsx";
import type { ManpowerRow, ParseResult } from "./types";

/**
 * Header aliases, in priority order. Site registers come in from many hands,
 * so we match on a normalised key rather than an exact column name.
 */
const ALIASES: Record<keyof ManpowerRow, string[]> = {
  date: ["date", "day", "reportdate", "attendancedate", "dt"],
  site: ["site", "sitename", "project", "projectname", "location", "tower", "block"],
  contractor: [
    "contractor",
    "subcontractor",
    "vendor",
    "agency",
    "labourcontractor",
    "laborcontractor",
    "party",
  ],
  trade: [
    "trade",
    "skill",
    "category",
    "designation",
    "labourtype",
    "labortype",
    "manpowertype",
    "activity",
  ],
  planned: ["planned", "plan", "required", "requirement", "target", "budgeted", "plannedmanpower"],
  actual: [
    "actual",
    "deployed",
    "present",
    "reported",
    "attendance",
    "actualmanpower",
    "count",
    "headcount",
    "strength",
  ],
};

const norm = (s: unknown) =>
  String(s ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");

function buildMapping(headers: string[]): Record<keyof ManpowerRow, string | null> {
  const normalised = headers.map((h) => ({ raw: h, key: norm(h) }));
  const taken = new Set<string>();
  const mapping = {} as Record<keyof ManpowerRow, string | null>;

  for (const field of Object.keys(ALIASES) as (keyof ManpowerRow)[]) {
    let hit: string | null = null;
    // Exact alias match first, then a contains-match, so "Planned Nos." still lands.
    for (const alias of ALIASES[field]) {
      const exact = normalised.find((h) => h.key === alias && !taken.has(h.raw));
      if (exact) {
        hit = exact.raw;
        break;
      }
    }
    if (!hit) {
      for (const alias of ALIASES[field]) {
        const partial = normalised.find((h) => h.key.includes(alias) && !taken.has(h.raw));
        if (partial) {
          hit = partial.raw;
          break;
        }
      }
    }
    if (hit) taken.add(hit);
    mapping[field] = hit;
  }
  return mapping;
}

const iso = (y: number, m: number, d: number): string =>
  `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;

/**
 * Excel stores dates as serial numbers; CSVs hand us strings of every shape.
 *
 * Two traps worth naming, both of which produced wrong dates here before:
 * never go through `toISOString()` on a local-midnight Date (east of UTC it
 * lands on the previous day), and never let the day/month order be decided by
 * the machine's locale.
 */
function toISODate(value: unknown): string | null {
  if (value == null || value === "") return null;

  // Local components, not toISOString() — the latter shifts the date in any
  // timezone ahead of UTC.
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return iso(value.getFullYear(), value.getMonth() + 1, value.getDate());
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    const parsed = XLSX.SSF.parse_date_code(value);
    return parsed && parsed.y ? iso(parsed.y, parsed.m, parsed.d) : null;
  }

  const text = String(value).trim();

  // yyyy-mm-dd / yyyy/mm/dd — unambiguous, so it wins.
  let m = /^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/.exec(text);
  if (m) return iso(+m[1], +m[2], +m[3]);

  // Two-part-then-year. Disambiguate by value where we can; otherwise assume
  // day-first, which is what Indian site registers use.
  m = /^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/.exec(text);
  if (m) {
    const a = +m[1];
    const b = +m[2];
    const year = +m[3];
    const [day, month] = a > 12 ? [a, b] : b > 12 ? [b, a] : [a, b];
    if (month < 1 || month > 12 || day < 1 || day > 31) return null;
    return iso(year, month, day);
  }

  // "7 Oct 2026", "Oct 7 2026" and similar. Read back in local components so
  // this path cannot shift either.
  const fallback = new Date(text);
  if (!Number.isNaN(fallback.getTime())) {
    return iso(fallback.getFullYear(), fallback.getMonth() + 1, fallback.getDate());
  }

  return null;
}

function toCount(value: unknown): number | null {
  if (value == null || value === "") return 0;
  if (typeof value === "number") return Number.isFinite(value) ? Math.round(value) : null;
  const cleaned = String(value).replace(/[,\s]/g, "");
  if (cleaned === "" || cleaned === "-") return 0;
  const n = Number(cleaned);
  return Number.isFinite(n) ? Math.round(n) : null;
}

const MAX_WARNINGS = 25;

/** Parse an .xlsx/.xls/.csv buffer into manpower rows. First sheet wins. */
export function parseWorkbook(data: ArrayBuffer): ParseResult {
  // raw: true stops SheetJS guessing types on CSV text. Without it "01-10-2026"
  // is silently read as 10 January, because its guess is month-first.
  const wb = XLSX.read(data, { type: "array", raw: true, cellDates: false });
  const sheetName = wb.SheetNames[0];
  const warnings: string[] = [];

  if (!sheetName) {
    return {
      rows: [],
      warnings: ["The file has no sheets in it."],
      mapping: {} as ParseResult["mapping"],
    };
  }

  const sheet = wb.Sheets[sheetName];
  // raw: true keeps Excel date cells as serial numbers, which toISODate reads
  // without a timezone in the loop.
  const table = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
    defval: "",
    raw: true,
  });

  if (table.length === 0) {
    return {
      rows: [],
      warnings: [`Sheet "${sheetName}" is empty.`],
      mapping: {} as ParseResult["mapping"],
    };
  }

  const headers = Object.keys(table[0]);
  const mapping = buildMapping(headers);

  const missing = (["date", "site", "actual"] as const).filter((f) => !mapping[f]);
  if (missing.length > 0) {
    return {
      rows: [],
      warnings: [
        `Could not find a column for: ${missing.join(", ")}. ` +
          `Columns in your sheet: ${headers.join(", ")}.`,
      ],
      mapping,
    };
  }

  const rows: ManpowerRow[] = [];

  table.forEach((raw, i) => {
    const sheetLine = i + 2; // +1 for zero-index, +1 for the header row
    const date = toISODate(raw[mapping.date!]);
    const site = String(raw[mapping.site!] ?? "").trim();
    const actual = toCount(raw[mapping.actual!]);
    const planned = mapping.planned ? toCount(raw[mapping.planned]) : null;

    if (!date) {
      if (warnings.length < MAX_WARNINGS)
        warnings.push(`Row ${sheetLine}: unreadable date "${raw[mapping.date!]}" — skipped.`);
      return;
    }
    if (!site) {
      if (warnings.length < MAX_WARNINGS) warnings.push(`Row ${sheetLine}: no site — skipped.`);
      return;
    }
    if (actual == null) {
      if (warnings.length < MAX_WARNINGS)
        warnings.push(`Row ${sheetLine}: unreadable headcount "${raw[mapping.actual!]}" — skipped.`);
      return;
    }

    rows.push({
      date,
      site,
      contractor: mapping.contractor
        ? String(raw[mapping.contractor] ?? "").trim() || "Unassigned"
        : "Unassigned",
      trade: mapping.trade ? String(raw[mapping.trade] ?? "").trim() || "Unspecified" : "Unspecified",
      // No planned column is a legitimate sheet shape; treat plan as equal to
      // actual so fill-rate reads 100% rather than a misleading zero.
      planned: planned ?? actual,
      actual,
    });
  });

  if (!mapping.planned) {
    warnings.push(
      "No planned/required column found — planned has been set equal to actual, so variance reads zero.",
    );
  }

  return { rows, warnings, mapping };
}
