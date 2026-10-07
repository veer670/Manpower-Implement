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
| **Daily entry** | Pick a contractor type, then fill in that type's figures — variance and status update live |
| **Roster** | Pick a contractor type, then add, edit and remove its contractors; import the whole list from a sheet |
| **User create** | Give a contractor a user ID and password so they can enter their own figures |

Fill rate is banded so shortfalls surface without reading numbers:
**≥ 95 %** on commitment · **≥ 85 %** slightly short · **≥ 70 %** short ·
**below 70 %** critically short. Status is always icon + label + colour, never
colour alone. Over-supply counts as met, not as a problem.

Daily entry and Roster both open on a **list of contractor types** rather than
the whole roster at once. Each entry card carries that type's progress for the
day — heads reported, fill rate, and how many of its contractors are still
blank — so you can see what is outstanding before opening anything. Clicking a
type gives the familiar columns: contractor name, committed, today's manpower,
variance, status.

## Contractor logins

**User create** issues one login per contractor. The user ID is suggested from
the contractor name (`Prajapati` → `prajapati`) and the password is generated
unless you type one.

A contractor signs in at `/login` and gets a single screen — **My manpower** —
showing only their own row, with no type list in front of it. They cannot see the dashboard, the roster, other
contractors' figures, or the login list, by the nav or by typing the URL.

The password is shown **once**, at the moment it is issued, and is stored as a
PBKDF2-SHA256 hash with a per-user salt. It cannot be read back; if it is lost,
use **Reset password** to issue a new one.

> **These logins separate roles, not data.** There is no server to check a
> password against, so they control what a signed-in person sees and can edit
> — which is genuinely useful — but anyone with access to the browser can still
> read the underlying storage. Passwords are hashed rather than stored in plain
> text so the model ports to a real backend unchanged. Treat this as role
> separation until there is one.

The site office is simply "nobody signed in" — there is no admin password,
because one that cannot be enforced would be theatre.

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
- **A contractor's save touches only their own rows.** Saving scopes itself to
  the contractors on screen, so one contractor filing their figure never wipes
  another's for the same day.
- **Dates never shift.** Day-first is assumed where day and month are both
  ambiguous (`01-10-2026` is 1 October), and nothing goes through
  `toISOString()`, which moves the date back a day in any timezone ahead of
  UTC.

## Project layout

```
src/
  app/
    page.tsx          Dashboard
    entry/            Daily manpower entry (scoped when a contractor signs in)
    roster/           Contractor master list + import
    users/            Create contractor logins
    login/            Contractor sign in
    globals.css       Design tokens (light & dark)
  components/
    charts/           Recharts wrappers + shared chart primitives
    EntryForm.tsx     The daily input table
    RosterTable.tsx   Master list, editable in place
    RosterUpload.tsx  Sheet import
    GroupTable.tsx    Readable twin of the charts
  lib/
    auth.ts           Per-contractor logins, PBKDF2 hashing, session
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
