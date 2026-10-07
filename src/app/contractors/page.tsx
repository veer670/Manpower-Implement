"use client";

import { useMemo } from "react";
import Card from "@/components/Card";
import FilterBar from "@/components/FilterBar";
import SiteTable from "@/components/SiteTable";
import StatTile from "@/components/StatTile";
import PlannedVsActual from "@/components/charts/PlannedVsActual";
import { compact, num, pct } from "@/lib/format";
import { applyFilters, byContractor, fillRate, sum, withOther } from "@/lib/metrics";
import { useStore } from "@/lib/store";

export default function ContractorsPage() {
  const { dataset, filters } = useStore();

  const { contractors, totals, worst } = useMemo(() => {
    const rows = applyFilters(dataset.rows, filters);
    const groups = byContractor(rows);
    const byRate = [...groups].sort((a, b) => (a.fillRate ?? 1) - (b.fillRate ?? 1));
    return { contractors: groups, totals: sum(rows), worst: byRate[0] ?? null };
  }, [dataset.rows, filters]);

  return (
    <div className="mx-auto max-w-[1400px] space-y-5">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-ink">Contractor performance</h1>
        <p className="mt-1 text-sm text-ink-secondary">
          Manpower supplied against commitment, per labour contractor.
        </p>
      </div>

      <FilterBar allRows={dataset.rows} />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <StatTile
          label="Man-days supplied, period"
          value={compact(totals.actual)}
          hero
          footnote={`against ${num(totals.planned)} committed`}
        />
        <StatTile label="Overall fill rate" value={pct(fillRate(totals), 1)} />
        <StatTile
          label="Weakest contractor"
          value={worst ? pct(worst.fillRate, 1) : "—"}
          footnote={worst ? worst.key : undefined}
        />
      </div>

      <Card
        title="Committed versus supplied, by contractor"
        subtitle="Totals across the selected period."
      >
        <PlannedVsActual data={withOther(contractors, 10)} dimension="contractor" />
      </Card>

      <Card title="Contractor detail" subtitle="Ranked by man-days supplied.">
        <SiteTable rows={contractors} dimensionLabel="Contractor" />
      </Card>
    </div>
  );
}
