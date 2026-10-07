"use client";

import { useMemo, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import Card from "@/components/Card";
import EntryForm from "@/components/EntryForm";
import { longDate } from "@/lib/format";
import { allDates, rowsForDate } from "@/lib/metrics";
import { useStore } from "@/lib/store";
import { useSession } from "@/lib/useAuth";
import * as todayStore from "@/lib/today";

export default function EntryPage() {
  const { data } = useStore();
  const session = useSession();
  const today = useSyncExternalStore(
    todayStore.subscribe,
    todayStore.getSnapshot,
    todayStore.getServerSnapshot,
  );
  const [picked, setPicked] = useState<string | null>(null);

  const date = picked ?? today;
  const dates = useMemo(() => allDates(data.entries), [data.entries]);

  // A signed-in contractor sees only their own row. EntryForm saves exactly
  // the rows it was given, so this scoping is also what stops one contractor
  // overwriting another's figures.
  const roster = useMemo(
    () =>
      session
        ? data.contractors.filter((c) => c.id === session.contractorId)
        : data.contractors,
    [data.contractors, session],
  );

  const rows = useMemo(
    () => (date ? rowsForDate(roster, data.entries, date) : []),
    [roster, data.entries, date],
  );

  const contractor = session ? data.contractors.find((c) => c.id === session.contractorId) : null;

  // The login survives a roster re-import that dropped this contractor.
  if (session && !contractor) {
    return (
      <div className="mx-auto max-w-[700px] py-16 text-center">
        <h1 className="text-xl font-semibold tracking-tight text-ink">Nothing to enter</h1>
        <p className="mt-2 text-sm text-ink-secondary">
          This login is no longer linked to a contractor on the roster. Ask the site office
          to set it up again.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1100px] space-y-5">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-ink">
          {session ? "My manpower" : "Daily manpower entry"}
        </h1>
        <p className="mt-1 text-sm text-ink-secondary">
          {session ? (
            <>
              Entering for{" "}
              <span className="font-medium text-ink">{contractor?.name}</span> —{" "}
              {contractor?.type}. Your committed headcount is {contractor?.committed}.
            </>
          ) : (
            <>
              Contractor type, name and committed headcount come from the roster. Fill in
              today&rsquo;s manpower against each one.
            </>
          )}
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
              max={today ?? undefined}
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

      {!session && data.contractors.length > 0 && (
        <p className="text-xs text-ink-muted">
          Contractors can enter their own figures instead —{" "}
          <Link href="/users" className="underline underline-offset-2 hover:text-ink-secondary">
            create a login for them
          </Link>
          .
        </p>
      )}
    </div>
  );
}
