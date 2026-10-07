"use client";

import { useMemo, useState, useSyncExternalStore } from "react";
import { ArrowLeft, UserPlus } from "lucide-react";
import Card from "@/components/Card";
import EntryForm from "@/components/EntryForm";
import ListPicker from "@/components/ListPicker";
import QuickAdd from "@/components/QuickAdd";
import { longDate } from "@/lib/format";
import { allDates, categoriesOf, contractorsOf, rowsForDate, typesOf } from "@/lib/metrics";
import {
  removeCategory,
  removeType,
  renameCategory,
  renameType,
  setCategorySrNo,
  setTypeSrNo,
} from "@/lib/dataset";
import { remapCategory, remapUsers } from "@/lib/auth";
import { useStore } from "@/lib/store";
import { useAccess } from "@/lib/useAuth";
import * as todayStore from "@/lib/today";

export default function EntryPage() {
  const { data } = useStore();
  const access = useAccess();
  const today = useSyncExternalStore(
    todayStore.subscribe,
    todayStore.getSnapshot,
    todayStore.getServerSnapshot,
  );
  const [picked, setPicked] = useState<string | null>(null);
  const [category, setCategory] = useState<string | null>(null);
  const [type, setType] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  const date = picked ?? today;
  const dates = useMemo(() => allDates(data.entries), [data.entries]);

  // A signed-in contractor sees only their own row. EntryForm saves exactly
  // the rows it was given, so this scoping is also what stops one contractor
  // overwriting another's figures.
  const roster = useMemo(() => {
    if (access.contractorId) {
      return data.contractors.filter((c) => c.id === access.contractorId);
    }
    // An admin login sees only its own category; the office sees everything.
    return access.category
      ? data.contractors.filter((c) => c.category === access.category)
      : data.contractors;
  }, [data.contractors, access.contractorId, access.category]);

  const categories = useMemo(() => categoriesOf(data, roster), [data, roster]);

  // Deleting the last contractor under a category or type leaves the opened
  // name pointing at nothing; derive the live value rather than chasing it.
  const liveCategory = category && categories.some((c) => c.name === category) ? category : null;

  const types = useMemo(
    () => (liveCategory ? typesOf(data, liveCategory, roster) : []),
    [data, liveCategory, roster],
  );

  const liveType = liveCategory && type && types.some((t) => t.name === type) ? type : null;

  const scoped = useMemo(() => {
    if (!liveCategory) return roster;
    if (!liveType) return roster.filter((c) => c.category === liveCategory);
    return contractorsOf(roster, liveCategory, liveType);
  }, [roster, liveCategory, liveType]);

  const rows = useMemo(
    () => (date ? rowsForDate(scoped, data.entries, date) : []),
    [scoped, data.entries, date],
  );

  const contractor = access.contractorId
    ? data.contractors.find((c) => c.id === access.contractorId)
    : null;

  // The login survives a roster re-import that dropped this contractor.
  if (access.contractorId && !contractor) {
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

  /** A contractor has one row — levels above it would be doors onto nothing. */
  const level: "category" | "type" | "contractors" = access.contractorId
    ? "contractors"
    : liveCategory == null
      ? "category"
      : liveType == null
        ? "type"
        : "contractors";

  const dateControl = (
    <label className="flex items-center gap-2">
      <span className="text-xs font-medium text-ink-muted">Date</span>
      <input
        type="date"
        value={date ?? ""}
        max={today ?? undefined}
        onChange={(e) => setPicked(e.target.value || null)}
        className="rounded-md border border-hairline bg-surface-2 px-2.5 py-1.5 text-xs text-ink focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
      />
    </label>
  );

  const headerControls = (
    <div className="flex flex-col items-end gap-2">
      {dateControl}
      {access.canManageRoster && (
        <button
          onClick={() => setAdding((a) => !a)}
          aria-expanded={adding}
          className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition-colors ${
            adding
              ? "border-accent bg-surface-2 text-ink"
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
    access.canManageRoster && adding ? (
      <QuickAdd
        key={`${liveCategory ?? "all"}:${liveType ?? "all"}`}
        presetCategory={liveCategory ?? undefined}
        presetType={liveType ?? undefined}
        onClose={() => setAdding(false)}
      />
    ) : null;

  const back = (label: string, onClick: () => void) => (
    <button
      onClick={onClick}
      className="mb-4 flex items-center gap-1.5 rounded-md text-xs font-medium text-ink-secondary hover:text-ink"
    >
      <ArrowLeft size={14} strokeWidth={2.4} aria-hidden />
      {label}
    </button>
  );

  return (
    <div className="mx-auto max-w-[1100px] space-y-5">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-ink">
          {contractor ? "My manpower" : "Daily manpower entry"}
        </h1>
        <p className="mt-1 text-sm text-ink-secondary">
          {contractor ? (
            <>
              Entering for <span className="font-medium text-ink">{contractor?.name}</span> —{" "}
              {contractor?.type}. Your committed headcount is {contractor?.committed}.
            </>
          ) : level === "category" ? (
            <>Pick a category, then a contractor type, then fill in today&rsquo;s manpower.</>
          ) : level === "type" ? (
            <>Pick a contractor type within {liveCategory}.</>
          ) : (
            <>Contractor name and committed headcount come from the roster.</>
          )}
        </p>
      </div>

      {level === "category" && (
        <Card title="Manpower Details" actions={headerControls}>
          {quickAdd}
          <ListPicker
            items={categories}
            onSelect={setCategory}
            onDelete={removeCategory}
            onSrNo={setCategorySrNo}
            onRename={(from, to) => {
              const map = renameCategory(from, to);
              if (map.size === 0) return false;
              // Ids are derived from the name, so logins have to follow it.
              remapUsers(map);
              remapCategory(from, to);
              setCategory(to);
              return true;
            }}
            countFor={(c) => roster.filter((x) => x.category === c).length}
            deleteNote={(c) => {
              const n = roster.filter((x) => x.category === c).length;
              const t = typesOf(data, c, roster).length;
              return `This removes ${t} contractor type${t === 1 ? "" : "s"} and ${n} contractor${
                n === 1 ? "" : "s"
              }, with every manpower figure saved against them. It cannot be undone.`;
            }}
            emptyMessage="No contractors on the roster yet. Add one with the button above."
          />
        </Card>
      )}

      {level === "type" && liveCategory && (
        <Card title={liveCategory} subtitle="Contractor types" actions={headerControls}>
          {quickAdd}
          {back("Manpower Details", () => setCategory(null))}
          <ListPicker
            items={types}
            onSelect={setType}
            onDelete={(t) => removeType(liveCategory, t)}
            onSrNo={(t, n) => setTypeSrNo(liveCategory, t, n)}
            onRename={(from, to) => {
              const map = renameType(liveCategory, from, to);
              if (map.size === 0) return false;
              remapUsers(map);
              setType(to);
              return true;
            }}
            countFor={(t) =>
              roster.filter((x) => x.category === liveCategory && x.type === t).length
            }
            emptyMessage="No contractor types here yet. Add a contractor with the button above."
          />
        </Card>
      )}

      {level === "contractors" && (
        <Card
          title={liveType ?? contractor?.type ?? ""}
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
          {access.canManageRoster && liveCategory && back(liveCategory, () => setType(null))}

          {date ? (
            // Keyed by date and type so switching either re-seeds the draft
            // from storage rather than carrying a stale one across.
            <EntryForm
              key={`${date}:${liveType ?? "mine"}`}
              rows={rows}
              date={date}
              showTypeColumn={false}
              canEditRoster={access.canManageRoster}
            />
          ) : (
            <p className="py-8 text-center text-sm text-ink-muted">Loading today&rsquo;s date…</p>
          )}
        </Card>
      )}
    </div>
  );
}
