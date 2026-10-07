"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { TrendPoint } from "@/lib/metrics";
import { compact, longDate, num, pct, shortDate } from "@/lib/format";
import {
  AXIS_COLOR,
  AXIS_STYLE,
  EmptyPlot,
  GRID_COLOR,
  Legend,
  SERIES,
  SURFACE,
  TooltipRow,
  TooltipShell,
} from "./primitives";

type Props = { data: TrendPoint[] };

/** Two series on ONE axis — both are headcounts, so no second scale. */
export default function DeploymentTrend({ data }: Props) {
  if (data.length === 0) return <EmptyPlot message="No days in the current selection." />;

  const last = data[data.length - 1];
  // Only the final Actual point is directly labelled; the axis and the
  // tooltip carry the rest.
  const tickGap = data.length > 20 ? Math.ceil(data.length / 10) : 0;

  return (
    <div>
      <div className="mb-3">
        <Legend
          items={[
            { label: "Actual deployed", color: SERIES.actual, shape: "line" },
            { label: "Planned", color: SERIES.planned, shape: "line" },
          ]}
        />
      </div>
      <ResponsiveContainer width="100%" height={260}>
        <LineChart data={data} margin={{ top: 16, right: 48, bottom: 4, left: 0 }}>
          <CartesianGrid stroke={GRID_COLOR} strokeWidth={1} vertical={false} />
          <XAxis
            dataKey="date"
            tickFormatter={shortDate}
            tick={AXIS_STYLE}
            tickLine={false}
            axisLine={{ stroke: AXIS_COLOR, strokeWidth: 1 }}
            interval={tickGap ? tickGap - 1 : "preserveStartEnd"}
            minTickGap={16}
          />
          <YAxis
            tick={AXIS_STYLE}
            tickLine={false}
            axisLine={false}
            width={44}
            tickFormatter={compact}
          />
          <Tooltip
            content={<TrendTooltip />}
            cursor={{ stroke: AXIS_COLOR, strokeWidth: 1 }}
          />
          <Line
            dataKey="planned"
            name="Planned"
            stroke={SERIES.planned}
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            dot={false}
            activeDot={{ r: 4, fill: SERIES.planned, stroke: SURFACE, strokeWidth: 2 }}
          />
          <Line
            dataKey="actual"
            name="Actual deployed"
            stroke={SERIES.actual}
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            dot={false}
            activeDot={{ r: 4, fill: SERIES.actual, stroke: SURFACE, strokeWidth: 2 }}
          />
        </LineChart>
      </ResponsiveContainer>
      <p className="mt-1 text-right text-xs text-ink-secondary">
        <span
          aria-hidden
          style={{ background: SERIES.actual }}
          className="mr-1.5 inline-block h-0.5 w-4 rounded-full align-middle"
        />
        {shortDate(last.date)}: <span className="tnum font-medium text-ink">{num(last.actual)}</span>{" "}
        deployed
      </p>
    </div>
  );
}

type TooltipPayload = { payload?: { payload: TrendPoint }[]; active?: boolean };

function TrendTooltip({ active, payload }: TooltipPayload) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  const rate = p.planned > 0 ? p.actual / p.planned : null;
  return (
    <TooltipShell title={longDate(p.date)}>
      <TooltipRow color={SERIES.actual} label="Actual deployed" value={num(p.actual)} />
      <TooltipRow color={SERIES.planned} label="Planned" value={num(p.planned)} />
      <TooltipRow label="Fill rate" value={pct(rate)} />
    </TooltipShell>
  );
}
