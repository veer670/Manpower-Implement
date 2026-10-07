import * as XLSX from "xlsx";
import { contractorId, type Contractor, type ParseResult } from "./types";

type Field = "category" | "type" | "name" | "committed" | "actual" | "site" | "srno";

/**
 * Header aliases, in priority order. Registers come in from many hands, so
 * matching is on a normalised key rather than an exact column name.
 */
const ALIASES: Record<Field, string[]> = {
  srno: ["srno", "sno", "serialno", "sl", "slno", "sr", "serial"],
  category: ["category", "group", "division", "section", "head", "stream", "package"],
  type: ["contractortype", "type", "discipline", "trade", "service", "workcategory", "scope"],
  name: [
    "contractorname",
    "name",
    "contractor",
    "subcontractor",
    "vendor",
    "agency",
    "agencyname",
    "party",
    "firm",
  ],
  committed: [
    "committed",
    "commitment",
    "committedmanpower",
    "planned",
    "required",
    "requirement",
    "target",
    "agreed",
    "contracted",
  ],
  actual: [
    "todaysmanpower",
    "todaymanpower",
    "todays",
    "actual",
    "actualmanpower",
    "deployed",
    "present",
    "attendance",
    "reported",
    "strength",
    "headcount",
    "manpower",
  ],
  site: ["site", "sitename", "project", "projectname", "location", "tower", "block"],
};

/** Where a sheet carries no category column, everything lands in one bucket. */
const DEFAULT_CATEGORY = "General";

const norm = (s: unknown) =>
  String(s ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");

function buildMapping(headers: string[]): Record<Field, string | null> {
  const normalised = headers.map((h) => ({ raw: h, key: norm(h) }));
  const taken = new Set<string>();
  const mapping = {} as Record<Field, string | null>;

  // "Committed" before "Today's Manpower": both can match loose manpower
  // aliases, and claiming the committed column first stops the daily figure
  // being read as the commitment. "Category" before "type" for the same
  // reason — a sheet headed only "Category" means the outer level.
  for (const field of [
    "srno",
    "category",
    "type",
    "name",
    "committed",
    "actual",
    "site",
  ] as Field[]) {
    let hit: string | null = null;
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

function toCount(value: unknown): number | null {
  if (value == null || value === "") return null;
  if (typeof value === "number") return Number.isFinite(value) ? Math.round(value) : null;
  const cleaned = String(value).replace(/[,\s]/g, "");
  if (cleaned === "" || cleaned === "-") return null;
  const n = Number(cleaned);
  return Number.isFinite(n) && n >= 0 ? Math.round(n) : null;
}

const MAX_WARNINGS = 25;

/**
 * Parse a roster sheet. The first sheet wins. Contractor type, name and
 * committed headcount are the master data; a "Today's Manpower" column is
 * optional and, when present, is returned separately so the caller can file
 * it against whichever date the user is entering.
 */
export function parseRoster(data: ArrayBuffer): ParseResult {
  // raw: true stops SheetJS guessing types on CSV text.
  const wb = XLSX.read(data, { type: "array", raw: true, cellDates: false });
  const sheetName = wb.SheetNames[0];
  const empty: ParseResult = {
    contractors: [],
    actuals: new Map(),
    hadActualColumn: false,
    hadCategoryColumn: false,
    warnings: [],
  };

  if (!sheetName) return { ...empty, warnings: ["The file has no sheets in it."] };

  const table = XLSX.utils.sheet_to_json<Record<string, unknown>>(wb.Sheets[sheetName], {
    defval: "",
    raw: true,
  });

  if (table.length === 0) return { ...empty, warnings: [`Sheet "${sheetName}" is empty.`] };

  const headers = Object.keys(table[0]);
  const mapping = buildMapping(headers);

  const missing = (["type", "name", "committed"] as const).filter((f) => !mapping[f]);
  if (missing.length > 0) {
    const labels: Record<string, string> = {
      type: "Contractor Type",
      name: "Contractor Name",
      committed: "Committed",
    };
    return {
      ...empty,
      warnings: [
        `Could not find a column for: ${missing.map((f) => labels[f]).join(", ")}. ` +
          `Columns in your sheet: ${headers.join(", ")}.`,
      ],
    };
  }

  const warnings: string[] = [];
  const contractors: Contractor[] = [];
  const actuals = new Map<string, number>();
  const seen = new Set<string>();
  // Sr. No. falls back to position within its type, so a sheet without the
  // column still gets a sensible order rather than every row numbered 0.
  const nextInType = new Map<string, number>();

  table.forEach((raw, i) => {
    const sheetLine = i + 2; // +1 zero-index, +1 header row
    const category = mapping.category
      ? String(raw[mapping.category] ?? "").trim() || DEFAULT_CATEGORY
      : DEFAULT_CATEGORY;
    const type = String(raw[mapping.type!] ?? "").trim();
    const name = String(raw[mapping.name!] ?? "").trim();

    // A blank line between blocks is normal in a hand-kept sheet, not an error.
    if (!type && !name) return;

    if (!name) {
      if (warnings.length < MAX_WARNINGS)
        warnings.push(`Row ${sheetLine}: no contractor name — skipped.`);
      return;
    }
    if (!type) {
      if (warnings.length < MAX_WARNINGS)
        warnings.push(`Row ${sheetLine}: "${name}" has no contractor type — skipped.`);
      return;
    }

    const committed = toCount(raw[mapping.committed!]);
    if (committed == null) {
      if (warnings.length < MAX_WARNINGS)
        warnings.push(
          `Row ${sheetLine}: "${name}" has an unreadable committed figure ` +
            `("${raw[mapping.committed!]}") — skipped.`,
        );
      return;
    }

    const id = contractorId(category, type, name);
    if (seen.has(id)) {
      if (warnings.length < MAX_WARNINGS)
        warnings.push(
          `Row ${sheetLine}: "${name}" under ${category} / ${type} appears twice — kept the first.`,
        );
      return;
    }
    seen.add(id);

    const k = `${category}::${type}`;
    const position = (nextInType.get(k) ?? 0) + 1;
    nextInType.set(k, position);
    const stated = mapping.srno ? toCount(raw[mapping.srno]) : null;

    const site = mapping.site ? String(raw[mapping.site] ?? "").trim() : "";
    contractors.push({
      id,
      category,
      type,
      name,
      committed,
      srNo: stated ?? position,
      ...(site ? { site } : {}),
    });

    if (mapping.actual) {
      const actual = toCount(raw[mapping.actual]);
      if (actual != null) actuals.set(id, actual);
    }
  });

  if (contractors.length === 0 && warnings.length === 0) {
    warnings.push("No contractor rows found in that sheet.");
  }

  return {
    contractors,
    actuals,
    hadActualColumn: Boolean(mapping.actual),
    hadCategoryColumn: Boolean(mapping.category),
    warnings,
  };
}
