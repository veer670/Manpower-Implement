"use client";

import { useMemo, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import Card from "@/components/Card";
import EntryForm from "@/components/EntryForm";
import TypePicker, { type TypeCard } from "@/components/TypePicker";
import { longDate, num, pct } from "@/lib/format";
import { allDates, fillRate, rowsForDate } from "@/lib/metrics";
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
  const [type, setType] = useState<string | null>(null);

  const date = picked ?? today;
  const dates = useMemo(() => allDates(data.entries), [data.entries]);

  // A signed-in contractor sees only their own row. EntryForm saves exactly
  // the rows it was given, so this scoping is also what stops one contractor
  // overwriting another's figures.
  const roster = useMemo(
    () =>
      session ? data.contractors.filter((c) => c.id === session.contractorId) : data.contractors,
    [data.contractors, session],
  );

  const allRows = useMemo(
    () => (date ? rowsForDate(roster, data.entries, date) : []),
    [roster, data.entries, date],
  );

  /** One card per contractor type, with that type's progress for the day. */
  const cards = useMemo<TypeCard[]>(() => {
    const buckets = new Map<string, TypeCard>();
    for (const r of allRows) {
      const card =
        buckets.get(r.type) ??
        ({ type: r.type, contractors: 0, committed: 0, reported: 0, entered: 0 } as TypeCard);
      card.contractors += 1;
      if (r.actual != null) {
        // Only contractors who reported count toward the type's fill rate, so
        // a half-filled form does not read as a collapse.
        card.committed += r.committed;
        card.reported = (card.reported ?? 0) + r.actual;
        card.entered = (card.entered ?? 0) + 1;
      }
      buckets.set(r.type, card);
    }
    return [...buckets.values()]
      .map((c) => ({
        ...c,
        fillRate: fillRate({ committed: c.committed, actual: c.reported ?? 0 }),
      }))
      .sort((a, b) => a.type.localeCompare(b.type));
  }, [allRows]);

  const rows = useMemo(
    () => (type ? allRows.filter((r) => r.type === type) : allRows),
    [allRows, type],
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

  // A contractor has exactly one row — a type picker in front of it would be
  // a door with nothing behind it.
  const showPicker = !session && type === null;

  const entered = allRows.filter((r) => r.actual != null).length;

  const dateControl = (
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
  );

  return (
    <div className="mx-auto max-w-[1100px] space-y-5">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-ink">
          {session ? "My manpower" : "Daily manpower entry"}
        </h1>
        <p className="mt-1 text-sm text-ink-secondary">
          {session ? (
            <>
              Entering for <span className="font-medium text-ink">{contractor?.name}</span> —{" "}
              {contractor?.type}. Your committed headcount is {contractor?.committed}.
            </>
          ) : showPicker ? (
            <>Pick a contractor type, then fill in today&rsquo;s manpower against each contractor.</>
          ) : (
            <>Contractor name and committed headcount come from the roster.</>
          )}
        </p>
      </div>

      {showPicker ? (
        <Card
          title={date ? longDate(date) : "Loading…"}
          subtitle={
            allRows.length === 0
              ? "No contractors on the roster yet."
              : `${num(entered)} of ${num(allRows.length)} contractors entered for this day.`
          }
          actions={dateControl}
        >
          <TypePicker
            cards={cards}
            onSelect={setType}
            emptyMessage="No contractors on the roster yet. Add them under Roster first."
          />
        </Card>
      ) : (
        <Card
          title={type ?? (contractor?.type || "")}
          subtitle={
            date
              ? `${longDate(date)}${
                  dates.includes(date) ? " — figures already saved; editing replaces them." : ""
                }`
              : undefined
          }
          actions={dateControl}
        >
          {!session && (
            <button
              onClick={() => setType(null)}
              className="mb-4 flex items-center gap-1.5 rounded-md text-xs font-medium text-ink-secondary hover:text-ink"
            >
              <ArrowLeft size={14} strokeWidth={2.4} aria-hidden />
              All contractor types
            </button>
          )}

          {date ? (
            // Keyed by date and type so switching either re-seeds the draft
            // from storage rather than carrying a stale one across.
            <EntryForm
              key={`${date}:${type ?? "mine"}`}
              rows={rows}
              date={date}
              showTypeColumn={false}
            />
          ) : (
            <p className="py-8 text-center text-sm text-ink-muted">Loading today&rsquo;s date…</p>
          )}
        </Card>
      )}

      {!session && showPicker && allRows.length > 0 && (
        <p className="text-xs text-ink-muted">
          Day so far: <span className="tnum font-medium text-ink-secondary">{num(entered)}</span> of{" "}
          {num(allRows.length)} contractors entered
          {entered > 0 && (
            <>
              {" "}
              ·{" "}
              <span className="tnum font-medium text-ink-secondary">
                {pct(
                  fillRate({
                    committed: allRows
                      .filter((r) => r.actual != null)
                      .reduce((s, r) => s + r.committed, 0),
                    actual: allRows.reduce((s, r) => s + (r.actual ?? 0), 0),
                  }),
                  1,
                )}
              </span>{" "}
              fill rate
            </>
          )}
          .{" "}
          <Link href="/users" className="underline underline-offset-2 hover:text-ink-secondary">
            Contractors can enter their own
          </Link>
          .
        </p>
      )}
    </div>
  );
}
