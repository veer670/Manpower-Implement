"use client";

import { useMemo, useState, useSyncExternalStore } from "react";
import Card from "@/components/Card";
import EntryForm from "@/components/EntryForm";
import { longDate } from "@/lib/format";
import { allDates, rowsForDate } from "@/lib/metrics";
import { useStore } from "@/lib/store";
import * as todayStore from "@/lib/today";

export default function EntryPage() {
  const { data } = useStore();
  const today = useSyncExternalStore(
    todayStore.subscribe,
    todayStore.getSnapshot,
    todayStore.getServerSnapshot,
  );
  const [picked, setPicked] = useState<string | null>(null);

  const date = picked ?? today;
  const dates = useMemo(() => allDates(data.entries), [data.entries]);
  const rows = useMemo(
    () => (date ? rowsForDate(data.contractors, data.entries, date) : []),
    [data.contractors, data.entries, date],
  );

  return (
    <div className="mx-auto max-w-[1100px] space-y-5">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-ink">Daily manpower entry</h1>
        <p className="mt-1 text-sm text-ink-secondary">
          Contractor type, name and committed headcount come from the roster. Fill in
          today&rsquo;s manpower against each one.
        </p>
      </div>

      <Card
        title={date ? longDate(date) : "Loading…"}
        subtitle={
          date && dates.includes(date)
            ? "This day already has figures saved — editing replaces them."
            : "No figures saved for this day yet."
        }
        actions={
          <label className="flex items-center gap-2">
            <span className="text-xs font-medium text-ink-muted">Date</span>
            <input
              type="date"
              value={date ?? ""}
              onChange={(e) => setPicked(e.target.value || null)}
              className="rounded-md border border-hairline bg-surface-2 px-2.5 py-1.5 text-xs text-ink focus:border-series-1 focus:outline-none focus:ring-1 focus:ring-series-1"
            />
          </label>
        }
      >
        {date ? (
          // Keyed by date so switching day re-seeds the draft from storage.
          <EntryForm key={date} rows={rows} date={date} />
        ) : (
          <p className="py-8 text-center text-sm text-ink-muted">Loading today&rsquo;s date…</p>
        )}
      </Card>
    </div>
  );
}
