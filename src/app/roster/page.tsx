"use client";

import AdminOnly from "@/components/AdminOnly";
import Card from "@/components/Card";
import RosterTable from "@/components/RosterTable";
import RosterUpload from "@/components/RosterUpload";

export default function RosterPage() {
  return (
    <AdminOnly>
      <Roster />
    </AdminOnly>
  );
}

function Roster() {
  return (
    <div className="mx-auto max-w-[1000px] space-y-5">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-ink">Contractor roster</h1>
        <p className="mt-1 text-sm text-ink-secondary">
          The master list: category, contractor type, name and committed headcount. Set
          this up once — the daily figure is entered under Daily entry.
        </p>
      </div>

      <Card
        title="Roster"
        subtitle="Category, then contractor type, then its contractors. Serial numbers and committed headcount are editable in place."
      >
        <RosterTable />
      </Card>

      <Card
        title="Import from a sheet"
        subtitle="Parsing happens in the browser — the file is never uploaded anywhere."
      >
        <RosterUpload />
      </Card>
    </div>
  );
}
