# Manpower Implementation Dashboard

Daily contractor manpower against commitment. The contractor roster is set up
once; each day you fill in one column — today's manpower — and the dashboard
does the rest.

![Next.js](https://img.shields.io/badge/Next.js-16-black)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-4-06b6d4)

## How it is split

| | Set up once | Filled in daily |
|---|---|---|
| **Contractor Type** | ✓ | |
| **Contractor Name** | ✓ | |
| **Committed** | ✓ | |
| **Today's Manpower** | | ✓ |

That split is the whole design. Type, name and committed headcount are master
data living on the **Roster** page. **Daily entry** shows them pre-filled and
read-only, with one editable box per contractor.

## The three screens

| Screen | What it is for |
|---|---|
| **Dashboard** | Today's manpower against commitment, fill rate, shortfall, the day-by-day trend, and breakdowns by contractor type and by contractor |
| **Daily entry** | The register, pre-filled. Type the day's figures, see variance and status update live, save |
| **Roster** | Add, edit and remove contractors; import the whole list from a sheet |

Fill rate is banded so shortfalls surface without reading numbers:
**≥ 95 %** on commitment · **≥ 85 %** slightly short · **≥ 70 %** short ·
**below 70 %** critically short. Status is always icon + label + colour, never
colour alone. Over-supply counts as met, not as a problem.

## Getting started

```bash
npm install
npm run dev
```

Open <http://localhost:3000>. It starts on a sample roster so there is
something to look at before you load your own.

## Importing your sheet

**Roster → Import from a sheet**, then drop in a `.xlsx`, `.xls` or `.csv`.
The first sheet is read. **Parsing happens entirely in the browser — the file
is never uploaded anywhere**, and everything is kept in `localStorage` so it
survives a reload.

Header names are matched loosely, so `Type`, `Discipline` and `Trade` all land
on **Contractor Type**.

| Column | Required | Also accepted as |
|---|---|---|
| **Contractor Type** | yes | type, discipline, trade, category, scope |
| **Contractor Name** | yes | name, contractor, agency, vendor, firm, party |
| **Committed** | yes | commitment, agreed, contracted, required, target |
| **Today's Manpower** | no | actual, deployed, present, attendance, strength |
| **Site** | no | project, location, tower, block |

Include **Today's Manpower** and those figures are saved against today's date —
change the date under Daily entry if they belong to another day. Leave the
column out and you just get the roster.

Importing replaces the roster; saved manpower for contractors still on the new
roster is kept, so correcting a sheet never wipes your history.

Rows that cannot be used are reported back with their sheet row number rather
than silently dropped: a missing name, a missing type, an unreadable committed
figure, or the same contractor listed twice. Blank separator rows between
blocks are ignored without comment, because hand-kept sheets are full of them.

## Notes on behaviour worth knowing

- **An empty box is "not entered", not zero.** A contractor who has not
  reported is left out of the fill rate entirely rather than counted as having
  sent nobody — otherwise an unfinished form reads as a disaster.
- **Committed is a standing figure.** It does not vary by day. Edit it on the
  Roster page and it applies everywhere.
- **Dates never shift.** Day-first is assumed where day and month are both
  ambiguous (`01-10-2026` is 1 October), and nothing goes through
  `toISOString()`, which moves the date back a day in any timezone ahead of
  UTC.

## Project layout

```
src/
  app/
    page.tsx          Dashboard
    entry/            Daily manpower entry
    roster/           Contractor master list + import
    globals.css       Design tokens (light & dark)
  components/
    charts/           Recharts wrappers + shared chart primitives
    EntryForm.tsx     The daily input table
    RosterTable.tsx   Master list, editable in place
    RosterUpload.tsx  Sheet import
    GroupTable.tsx    Readable twin of the charts
  lib/
    parse.ts          Sheet → roster, with loose header matching
    metrics.ts        Aggregation by type, by contractor, by day
    dataset.ts        External store, backed by localStorage
    sample.ts         Sample roster
```

## Design notes

Worth keeping if you extend this:

- **One axis, never two.** Committed and reported are both headcounts, so they
  share a scale.
- **Colour follows the entity.** Reported is always slot 1, committed always
  slot 2 — filtering never repaints the survivors.
- The categorical palette is validated for colour-vision deficiency in both
  light and dark (worst adjacent ΔE 24.7 light / 26.8 dark, against an ≥ 8
  target).
- Dark mode is a **selected** set of steps against the dark surface, not an
  automatic inversion.
- Every charted value is also in a table, so nothing is gated behind a tooltip.

## Scripts

```bash
npm run dev     # dev server
npm run build   # production build
npm run start   # serve the build
npm run lint    # eslint
```

## Status

Working single-user tool. No database, no authentication, no server-side
storage — everything lives in the browser. The next step is a real backend so
more than one person can enter and read the same figures.
