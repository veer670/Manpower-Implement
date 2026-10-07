# Manpower Implementation Dashboard

Site-wise manpower deployment for interior fit-out and construction projects:
planned versus actual headcount, fill rate, trade mix and contractor
performance — read straight from the daily manpower register you already keep
in Excel.

![Next.js](https://img.shields.io/badge/Next.js-16-black)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-4-06b6d4)

## What it shows

| View | Answers |
|---|---|
| **Site deployment** | How many heads turned up today against plan, which sites are short, how deployment is trending, and which trades the labour sits in |
| **Contractors** | Man-days each labour contractor committed versus supplied, and who is weakest |
| **Data** | Load your register, see exactly how the columns were read |

Fill rate is banded so shortfalls surface without reading numbers:
**≥ 95 %** on plan · **≥ 85 %** slight shortfall · **≥ 70 %** short ·
**below 70 %** critical. Status is always icon + label + colour, never colour
alone.

## Getting started

```bash
npm install
npm run dev
```

Open <http://localhost:3000>. The dashboard opens on a generated 30-day sample
programme (6 sites, 7 trades, 4 contractors) so there is something to look at
before you load anything.

## Loading your own register

Go to **Data**, then drop in a `.xlsx`, `.xls` or `.csv`. The first sheet is
read. **Parsing happens entirely in the browser — the file is never uploaded
anywhere**, and the parsed dataset is kept in `localStorage` so it survives a
reload.

### Columns

Header names are matched loosely, so `Site Name`, `Project` and `Location` all
land on **Site**.

| Field | Required | Also accepted as |
|---|---|---|
| **Date** | yes | day, report date, attendance date |
| **Site** | yes | site name, project, location, tower, block |
| **Actual** | yes | deployed, present, reported, attendance, strength, headcount |
| **Planned** | no | plan, required, target, budgeted |
| **Contractor** | no | subcontractor, vendor, agency, party |
| **Trade** | no | skill, designation, category, labour type |

One row per site / trade / contractor / day. Omit **Planned** and it is taken
as equal to actual, so fill rate reads 100 % rather than a misleading zero —
the dashboard says so when that happens.

### Dates

`dd-mm-yyyy`, `dd/mm/yyyy`, `yyyy-mm-dd` and native Excel date cells all work.
Where the day and month are both ≤ 12 and therefore ambiguous, **day-first is
assumed** (`01-10-2026` is 1 October), which is how Indian site registers are
written.

Rows with an unreadable date, a missing site or an unreadable headcount are
skipped and reported back to you rather than silently dropped.

## Project layout

```
src/
  app/
    page.tsx            Site deployment dashboard
    contractors/        Contractor performance
    data/               Upload + dataset summary
    globals.css         Design tokens (light & dark)
  components/
    charts/             Recharts wrappers + shared chart primitives
    AppShell.tsx        Sidebar, nav, theme toggle
    FilterBar.tsx       One filter row, scoping every chart on the page
    SiteTable.tsx       Readable twin of the charts
  lib/
    parse.ts            Excel/CSV → rows, with loose header matching
    metrics.ts          Aggregation: by site, contractor, trade, day
    dataset.ts          External store, backed by localStorage
    sample.ts           Seeded sample programme
```

## Design notes

Charts follow a few rules worth keeping if you extend this:

- **One axis, never two.** Planned and actual are both headcounts, so they
  share a scale. Two measures of different scale get two charts.
- **Colour follows the entity.** Actual is always slot 1, planned always
  slot 2 — filtering never repaints the survivors.
- The categorical palette is validated for colour-vision deficiency in both
  light and dark (worst adjacent ΔE 24.7 light / 26.8 dark, against an
  ≥ 8 target).
- Dark mode is a **selected** set of steps against the dark surface, not an
  automatic inversion.
- Every charted value is also in the table, so nothing is gated behind a
  tooltip.

## Scripts

```bash
npm run dev     # dev server
npm run build   # production build
npm run start   # serve the build
npm run lint    # eslint
```

## Status

Working single-user tool. There is no database, no authentication and no
server-side storage — the dataset lives in the browser. See the issues list
for what comes next.
