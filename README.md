# Manpower Implement

Contractor manpower tracker for site teams.

**Flow**

1. **Teams** — e.g. MEP, FACADE
2. **Departments** inside a team — e.g. Electrical, HVAC
3. **Contractors** inside a department — Contractor Name, Required Manpower, Present Manpower, Short Manpower

Short Manpower = Required − Present (never below 0). If more people are present than required, the extra is shown as `0 (+n)`.
Totals roll up from contractor → department → team → all teams.

## Use

Open `index.html` in any browser. No install needed.

- Add, rename or delete teams, departments and contractors.
- Edit Required / Present directly in the table; everything saves automatically in the browser.
- **Export** downloads a JSON backup; **Import** loads one back (use this to move data to another computer).

> Data is stored in the browser you use (localStorage), so each computer/browser has its own copy until a shared database is added.
