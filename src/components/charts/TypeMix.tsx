"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  LabelList,
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
  SERIES,
  TooltipRow,
  TooltipShell,
} from "./primitives";

type Props = { data: GroupRow[] };

/**
 * One series, so one colour for every bar and no legend box — the card
 * title says what is plotted. Values ride outside the bar tip, so no
 * label is ever clipped by a short bar.
 */
export default function TypeMix({ data }: Props) {
  if (data.length === 0) return <EmptyPlot message="Nothing entered for the current selection." />;

  const height = Math.max(200, data.length * 34 + 48);

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart
        data={data}
        layout="vertical"
        margin={{ top: 4, right: 56, bottom: 4, left: 0 }}
      >
        <CartesianGrid stroke={GRID_COLOR} strokeWidth={1} horizontal={false} />
        <XAxis
          type="number"
          tick={AXIS_STYLE}
          tickLine={false}
          axisLine={{ stroke: AXIS_COLOR, strokeWidth: 1 }}
          tickFormatter={compact}
        />
        <YAxis
          type="category"
          dataKey="key"
          tick={AXIS_STYLE}
          tickLine={false}
          axisLine={false}
          width={150}
        />
        <Tooltip content={<TypeTooltip />} cursor={{ fill: GRID_COLOR, fillOpacity: 0.4 }} />
        <Bar dataKey="actual" fill={SERIES.single} maxBarSize={24} radius={[0, 4, 4, 0]}>
          <LabelList
            dataKey="actual"
            position="right"
            formatter={(v) => (typeof v === "number" ? num(v) : "")}
            style={{ fontSize: 11, fontWeight: 500, fill: "var(--text-secondary)" }}
          />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

function TypeTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: { payload: GroupRow }[];
}) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  return (
    <TooltipShell title={p.key}>
      <TooltipRow color={SERIES.single} label="Reported" value={num(p.actual)} />
      <TooltipRow label="Committed" value={num(p.committed)} />
      <TooltipRow label="Variance" value={signed(p.variance)} />
      <TooltipRow label="Fill rate" value={pct(p.fillRate)} />
    </TooltipShell>
  );
}
