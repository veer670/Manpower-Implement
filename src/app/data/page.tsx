"use client";

import Card from "@/components/Card";
import UploadPanel from "@/components/UploadPanel";
import { longDate, num } from "@/lib/format";
import { dateRange, distinct } from "@/lib/metrics";
import { useStore } from "@/lib/store";

export default function DataPage() {
  const { dataset } = useStore();
  const range = dateRange(dataset.rows);

  return (
    <div className="mx-auto max-w-[900px] space-y-5">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-ink">Data</h1>
        <p className="mt-1 text-sm text-ink-secondary">
          Load your daily manpower register. Parsing happens in the browser — the file is
          never uploaded anywhere.
        </p>
      </div>

      <UploadPanel />

      <Card title="What is loaded right now" subtitle={dataset.source}>
        <dl className="grid gap-x-8 gap-y-3 text-sm sm:grid-cols-2">
          <Row label="Rows" value={num(dataset.rows.length)} />
          <Row
            label="Date range"
            value={range ? `${longDate(range.min)} — ${longDate(range.max)}` : "—"}
          />
          <Row label="Sites" value={num(distinct(dataset.rows, (r) => r.site).length)} />
          <Row label="Contractors" value={num(distinct(dataset.rows, (r) => r.contractor).length)} />
          <Row label="Trades" value={num(distinct(dataset.rows, (r) => r.trade).length)} />
          <Row label="Loaded" value={new Date(dataset.loadedAt).toLocaleString("en-GB")} />
        </dl>
      </Card>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 border-b border-hairline/60 pb-2">
      <dt className="text-ink-secondary">{label}</dt>
      <dd className="tnum font-medium text-ink">{value}</dd>
    </div>
  );
}
