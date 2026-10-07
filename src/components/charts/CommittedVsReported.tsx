"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { GroupRow } from "@/lib/metrics";
import { compact, num, pct, signed } from "@/lib/format";
import {
  AXIS_COLOR,
  AXIS_STYLE,
  EmptyPlot,
  GRID_COLOR,
  Legend,
  SERIES,
  TooltipRow,
  TooltipShell,
} from "./primitives";

type Props = { data: GroupRow[]; dimension: string };

/**
 * Grouped columns, committed beside reported on one axis. Bars are capped at
 * 24px with a 2px surface gap between neighbours — the gap does the
 * separating, not a stroke.
 */
export default function CommittedVsReported({ data, dimension }: Props) {
  if (data.length === 0) return <EmptyPlot message="Nothing in the current selection." />;

  return (
    <div>
      <div className="mb-3">
        <Legend
          items={[
            { label: "Reported today", color: SERIES.reported },
            { label: "Committed", color: SERIES.committed },
          ]}
        />
      </div>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data} margin={{ top: 8, right: 8, bottom: 56, left: 0 }} barGap={2}>
          <CartesianGrid stroke={GRID_COLOR} strokeWidth={1} vertical={false} />
          <XAxis
            dataKey="key"
            tick={AXIS_STYLE}
            tickLine={false}
            axisLine={{ stroke: AXIS_COLOR, strokeWidth: 1 }}
            angle={-30}
            textAnchor="end"
            height={56}
            interval={0}
          />
          <YAxis
            tick={AXIS_STYLE}
            tickLine={false}
            axisLine={false}
            width={44}
            tickFormatter={compact}
          />
          <Tooltip content={<GroupTooltip dimension={dimension} />} cursor={{ fill: GRID_COLOR, fillOpacity: 0.4 }} />
          <Bar
            dataKey="actual"
            name="Reported"
            fill={SERIES.reported}
            maxBarSize={24}
            radius={[4, 4, 0, 0]}
          />
          <Bar
            dataKey="committed"
            name="Committed"
            fill={SERIES.committed}
            maxBarSize={24}
            radius={[4, 4, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

type TooltipPayload = {
  payload?: { payload: GroupRow }[];
  active?: boolean;
  dimension: string;
};

function GroupTooltip({ active, payload, dimension }: TooltipPayload) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  return (
    <TooltipShell title={`${p.key} · ${dimension}`}>
      <TooltipRow color={SERIES.reported} label="Reported" value={num(p.actual)} />
      <TooltipRow color={SERIES.committed} label="Committed" value={num(p.committed)} />
      <TooltipRow label="Variance" value={signed(p.variance)} />
      <TooltipRow label="Fill rate" value={pct(p.fillRate)} />
    </TooltipShell>
  );
}
