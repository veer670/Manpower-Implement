# Manpower Implement

Contractor manpower tracker for Homeland site teams.

## Pages

- **Dashboard** – pick any saved date: totals (Contractors, Required, Present, Short), a daily trend chart, and a Team / Department table with attendance %.
- **Teams → Departments → Contractors** – Sr. No., names, and Required / Present manpower typed straight into the contractor rows. The contractor page shows the live date & time and when that department was last filled.
- **More → User ID** – admin login, and user IDs limited to one Team, Department or Contractor (view + fill numbers only).
- **More → Store** – one record per day, saved automatically whenever numbers change. View any day, export a day or all days to Excel (.xlsx).

## Online setup (one time, on vercel.com)

1. Push this repo to GitHub.
2. Vercel → **Add New → Project** → import `veer670/Manpower-Implement` → Framework: **Other** → **Deploy**.
3. In the project: **Storage → Create → Upstash for Redis** (free plan) → **Connect** it to this project (all environments).
4. **Deployments → ⋯ → Redeploy** so the new storage is picked up.
5. Open the project link → create the Admin login → **More › User ID → Create User** for each person.

The server (`api/app.js`) checks every login and every change, and sends each user only the Team, Department
or Contractor assigned to them. Data lives in Upstash Redis; every save is one atomic step that only succeeds
if nobody else saved in between (no lost updates). Data from the earlier Vercel Blob setup is copied across once.
Check the connection at `/api/app?action=check`.

## Local copy

`serve.ps1` serves this folder on http://localhost:8000. Once `ONLINE_URL` in `index.html` is set to the
Vercel link, the local copy uses the same online data (and offers a one-time upload of data saved in the
browser before the app went online).
