"use client";

import { useMemo, useState, useSyncExternalStore } from "react";
import { ArrowLeft, UserPlus } from "lucide-react";
import Card from "@/components/Card";
import EntryForm from "@/components/EntryForm";
import TypePicker from "@/components/TypePicker";
import QuickAdd from "@/components/QuickAdd";
import { longDate, num } from "@/lib/format";
import { allDates, rowsForDate } from "@/lib/metrics";
import { removeType } from "@/lib/dataset";
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
  const [adding, setAdding] = useState(false);

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

  const types = useMemo(
    () => [...new Set(allRows.map((r) => r.type))].sort((a, b) => a.localeCompare(b)),
    [allRows],
  );

  // Deleting the last contractor of a type leaves `type` pointing at one that
  // no longer exists; derive the live value rather than chasing it in an effect.
  const activeType = type && types.includes(type) ? type : null;

  const rows = useMemo(
    () => (activeType ? allRows.filter((r) => r.type === activeType) : allRows),
    [allRows, activeType],
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
  const showPicker = !session && activeType === null;

  const entered = allRows.filter((r) => r.actual != null).length;

  const headerControls = (
    <div className="flex flex-col items-end gap-2">
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

      {/* A signed-in contractor has one row and no business editing the roster. */}
      {!session && (
        <button
          onClick={() => setAdding((a) => !a)}
          aria-expanded={adding}
          className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition-colors ${
            adding
              ? "border-series-1 bg-surface-2 text-ink"
              : "border-hairline bg-surface-2 text-ink-secondary hover:text-ink"
          }`}
        >
          <UserPlus size={13} strokeWidth={2.4} aria-hidden />
          Add contractor
        </button>
      )}
    </div>
  );

  const quickAdd =
    !session && adding ? (
      <QuickAdd
        key={activeType ?? "all"}
        presetType={activeType ?? undefined}
        onClose={() => setAdding(false)}
      />
    ) : null;

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
          actions={headerControls}
        >
          {quickAdd}
          <TypePicker
            types={types}
            onSelect={setType}
            onDelete={session ? undefined : removeType}
            countFor={(t) => allRows.filter((r) => r.type === t).length}
            emptyMessage="No contractors on the roster yet. Add one with the button above."
          />
        </Card>
      ) : (
        <Card
          title={activeType ?? (contractor?.type || "")}
          subtitle={
            date
              ? `${longDate(date)}${
                  dates.includes(date) ? " — figures already saved; editing replaces them." : ""
                }`
              : undefined
          }
          actions={headerControls}
        >
          {quickAdd}
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
              key={`${date}:${activeType ?? "mine"}`}
              rows={rows}
              date={date}
              showTypeColumn={false}
              canEditRoster={!session}
            />
          ) : (
            <p className="py-8 text-center text-sm text-ink-muted">Loading today&rsquo;s date…</p>
          )}
        </Card>
      )}

    </div>
  );
}
