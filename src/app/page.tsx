"use client";

import { useMemo } from "react";
import Card from "@/components/Card";
import FilterBar from "@/components/FilterBar";
import SiteTable from "@/components/SiteTable";
import StatTile from "@/components/StatTile";
import DeploymentTrend from "@/components/charts/DeploymentTrend";
import PlannedVsActual from "@/components/charts/PlannedVsActual";
import TradeMix from "@/components/charts/TradeMix";
import { compact, longDate, num, pct, shortDate, signed } from "@/lib/format";
import {
  applyFilters,
  bySite,
  byTrade,
  dateRange,
  distinct,
  fillRate,
  sum,
  trend,
  withOther,
} from "@/lib/metrics";
import { useStore } from "@/lib/store";

export default function DashboardPage() {
  const { dataset, filters } = useStore();

  const view = useMemo(() => {
    const rows = applyFilters(dataset.rows, filters);
    const range = dateRange(rows);
    const latest = range?.max ?? null;

    const today = latest ? rows.filter((r) => r.date === latest) : [];
    const todayTotals = sum(today);

    // Previous day present in the slice, for the delta on the hero tile.
    const dates = [...new Set(rows.map((r) => r.date))].sort();
    const prevDate = dates.length > 1 ? dates[dates.length - 2] : null;
    const prevTotals = prevDate ? sum(rows.filter((r) => r.date === prevDate)) : null;

    return {
      rows,
      range,
      latest,
      prevDate,
      todayTotals,
      prevTotals,
      periodTotals: sum(rows),
      sites: bySite(rows),
      trades: withOther(byTrade(rows), 8),
      trendPoints: trend(rows),
      siteCount: distinct(rows, (r) => r.site).length,
      contractorCount: distinct(rows, (r) => r.contractor).length,
    };
  }, [dataset.rows, filters]);

  const {
    rows,
    range,
    latest,
    prevDate,
    todayTotals,
    prevTotals,
    periodTotals,
    sites,
    trades,
    trendPoints,
    siteCount,
    contractorCount,
  } = view;

  const todayRate = fillRate(todayTotals);
  const periodRate = fillRate(periodTotals);
  const shortfall = todayTotals.planned - todayTotals.actual;

  const headDelta = prevTotals
    ? {
        text: `${signed(todayTotals.actual - prevTotals.actual)} vs ${
          prevDate ? shortDate(prevDate) : "the previous day"
        }`,
        direction:
          todayTotals.actual === prevTotals.actual
            ? ("flat" as const)
            : todayTotals.actual > prevTotals.actual
              ? ("up" as const)
              : ("down" as const),
        good: todayTotals.actual >= prevTotals.actual,
      }
    : undefined;

  return (
    <div className="mx-auto max-w-[1400px] space-y-5">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-ink">Site manpower deployment</h1>
        <p className="mt-1 text-sm text-ink-secondary">
          {range ? (
            <>
              {longDate(range.min)} — {longDate(range.max)} · {num(rows.length)} register rows ·{" "}
              <span className="text-ink-muted">{dataset.source}</span>
            </>
          ) : (
            "No rows in the current selection."
          )}
        </p>
      </div>

      <FilterBar allRows={dataset.rows} />

      {/* Four tiles; exactly one hero figure on the view. */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile
          label={latest ? `Deployed on ${longDate(latest).replace(/^\w+, /, "")}` : "Deployed"}
          value={compact(todayTotals.actual)}
          hero
          delta={headDelta}
          footnote={
            todayTotals.planned > 0 ? `against ${num(todayTotals.planned)} planned` : undefined
          }
        />
        <StatTile
          label="Fill rate, latest day"
          value={pct(todayRate, 1)}
          footnote={`${pct(periodRate, 1)} across the whole period`}
        />
        <StatTile
          label="Shortfall, latest day"
          value={shortfall > 0 ? num(shortfall) : "0"}
          unit="heads"
          footnote={
            shortfall > 0
              ? `${sites.filter((s) => (s.fillRate ?? 1) < 0.95).length} of ${siteCount} sites below 95%`
              : "Every site met its plan"
          }
        />
        <StatTile
          label="Active sites"
          value={num(siteCount)}
          footnote={`${num(contractorCount)} contractor${contractorCount === 1 ? "" : "s"} engaged`}
        />
      </div>

      <Card
        title="Deployment against plan, day by day"
        subtitle="Both series are headcounts on a single axis."
      >
        <DeploymentTrend data={trendPoints} />
      </Card>

      <div className="grid gap-5 xl:grid-cols-5">
        <Card
          title="Planned versus actual, by site"
          subtitle="Totals across the selected period."
          className="xl:col-span-3"
        >
          <PlannedVsActual data={sites} dimension="site" />
        </Card>

        <Card
          title="Actual deployment by trade"
          subtitle="Heads deployed across the selected period."
          className="xl:col-span-2"
        >
          <TradeMix data={trades} />
        </Card>
      </div>

      <Card
        title="Site-wise detail"
        subtitle="Worst fill rate first — and the readable twin of every chart above."
      >
        <SiteTable rows={sites} dimensionLabel="Site" />
      </Card>
    </div>
  );
}
