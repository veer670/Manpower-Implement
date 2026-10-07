"use client";

import { useMemo } from "react";
import Link from "next/link";
import AdminOnly from "@/components/AdminOnly";
import Card from "@/components/Card";
import FilterBar from "@/components/FilterBar";
import GroupTable from "@/components/GroupTable";
import StatTile from "@/components/StatTile";
import CommittedVsReported from "@/components/charts/CommittedVsReported";
import ManpowerTrend from "@/components/charts/ManpowerTrend";
import TypeMix from "@/components/charts/TypeMix";
import { compact, longDate, num, pct, shortDate, signed } from "@/lib/format";
import {
  allDates,
  byContractor,
  byType,
  fillRate,
  latestDate,
  rowsForDate,
  totalsForRows,
  trend,
  visibleContractors,
  visibleEntries,
  withOther,
} from "@/lib/metrics";
import { useStore } from "@/lib/store";

export default function DashboardPage() {
  return (
    <AdminOnly>
      <Dashboard />
    </AdminOnly>
  );
}

function Dashboard() {
  const { data, filters } = useStore();

  const view = useMemo(() => {
    const roster = visibleContractors(data, filters);
    const entries = visibleEntries(data, filters, roster);
    const dates = allDates(entries);
    const day = latestDate(entries);

    const dayRows = day ? rowsForDate(roster, entries, day) : [];
    const dayTotals = totalsForRows(dayRows);

    const prevDay = dates.length > 1 ? dates[dates.length - 2] : null;
    const prevTotals = prevDay ? totalsForRows(rowsForDate(roster, entries, prevDay)) : null;

    return {
      roster,
      dates,
      day,
      prevDay,
      dayRows,
      dayTotals,
      prevTotals,
      types: withOther(byType(dayRows), 8),
      contractors: byContractor(dayRows),
      trendPoints: trend(roster, entries),
      entered: dayRows.filter((r) => r.actual != null).length,
    };
  }, [data, filters]);

  const {
    roster,
    day,
    prevDay,
    dayRows,
    dayTotals,
    prevTotals,
    types,
    contractors,
    trendPoints,
    entered,
  } = view;

  const rate = fillRate(dayTotals);
  const shortfall = Math.max(0, dayTotals.committed - dayTotals.actual);
  const shortContractors = contractors.filter((c) => (c.fillRate ?? 1) < 0.95).length;

  const delta = prevTotals
    ? {
        text: `${signed(dayTotals.actual - prevTotals.actual)} vs ${
          prevDay ? shortDate(prevDay) : "the previous day"
        }`,
        direction:
          dayTotals.actual === prevTotals.actual
            ? ("flat" as const)
            : dayTotals.actual > prevTotals.actual
              ? ("up" as const)
              : ("down" as const),
        good: dayTotals.actual >= prevTotals.actual,
      }
    : undefined;

  if (roster.length === 0) {
    return <Empty message="No contractors on the roster yet." />;
  }
  if (!day) {
    return <Empty message="No manpower has been entered yet." entry />;
  }

  return (
    <div className="mx-auto max-w-[1400px] space-y-5">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-ink">Manpower deployment</h1>
        <p className="mt-1 text-sm text-ink-secondary">
          {longDate(day)} · {num(entered)} of {num(dayRows.length)} contractors reported ·{" "}
          <span className="text-ink-muted">{data.source}</span>
        </p>
      </div>

      <FilterBar />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile
          label={`Manpower on ${longDate(day).replace(/^\w+, /, "")}`}
          value={compact(dayTotals.actual)}
          hero
          delta={delta}
          footnote={
            dayTotals.committed > 0 ? `against ${num(dayTotals.committed)} committed` : undefined
          }
        />
        <StatTile
          label="Fill rate"
          value={pct(rate, 1)}
          footnote="Reported against committed, for contractors who reported"
        />
        <StatTile
          label="Shortfall"
          value={num(shortfall)}
          unit="heads"
          footnote={
            shortContractors > 0
              ? `${num(shortContractors)} of ${num(contractors.length)} contractors below 95%`
              : "Every contractor met its commitment"
          }
        />
        <StatTile
          label="Contractors reported"
          value={`${num(entered)}`}
          unit={`of ${num(dayRows.length)}`}
          footnote={
            entered < dayRows.length ? (
              <Link href="/entry" className="underline underline-offset-2 hover:text-ink">
                Fill in the rest
              </Link>
            ) : (
              "Full attendance recorded"
            )
          }
        />
      </div>

      {trendPoints.length > 1 && (
        <Card
          title="Manpower against commitment, day by day"
          subtitle="Both series are headcounts on a single axis."
        >
          <ManpowerTrend data={trendPoints} />
        </Card>
      )}

      <div className="grid gap-5 xl:grid-cols-5">
        <Card
          title="Committed versus reported, by contractor type"
          subtitle={longDate(day)}
          className="xl:col-span-3"
        >
          <CommittedVsReported data={types} dimension="contractor type" />
        </Card>

        <Card
          title="Manpower by contractor type"
          subtitle={`Heads reported on ${longDate(day).replace(/^\w+, /, "")}.`}
          className="xl:col-span-2"
        >
          <TypeMix data={types} />
        </Card>
      </div>

      <Card
        title="By contractor type"
        subtitle="Worst fill rate first — and the readable twin of the charts above."
      >
        <GroupTable rows={byTypeSorted(types)} dimensionLabel="Contractor type" />
      </Card>

      <Card
        title="By contractor"
        subtitle="Worst fill rate first. Contractors who have not reported are left out."
      >
        <GroupTable rows={contractors} dimensionLabel="Contractor" />
      </Card>
    </div>
  );
}

/** withOther can push "Other" out of fill-rate order; restore it for the table. */
function byTypeSorted<T extends { fillRate: number | null }>(rows: T[]): T[] {
  return [...rows].sort((a, b) => (a.fillRate ?? Infinity) - (b.fillRate ?? Infinity));
}

function Empty({ message, entry = false }: { message: string; entry?: boolean }) {
  return (
    <div className="mx-auto max-w-[700px] py-16 text-center">
      <h1 className="text-xl font-semibold tracking-tight text-ink">Manpower deployment</h1>
      <p className="mt-2 text-sm text-ink-secondary">{message}</p>
      <div className="mt-5 flex items-center justify-center gap-2">
        <Link
          href={entry ? "/entry" : "/roster"}
          className="rounded-lg bg-accent px-4 py-2 text-xs font-semibold text-white"
        >
          {entry ? "Enter today's manpower" : "Set up the roster"}
        </Link>
      </div>
    </div>
  );
}
