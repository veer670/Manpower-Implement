"use client";

import { useMemo, useState } from "react";
import { ArrowLeft, UserPlus } from "lucide-react";
import {
  removeCategory,
  removeContractor,
  removeType,
  renameCategory,
  renameContractor,
  renameType,
  setCategorySrNo,
  setContractorSrNo,
  setTypeSrNo,
  upsertContractor,
} from "@/lib/dataset";
import { pruneUsers, remapCategory, remapUsers } from "@/lib/auth";
import { num } from "@/lib/format";
import { categoriesOf, contractorsOf, typesOf } from "@/lib/metrics";
import { useStore } from "@/lib/store";
import { useAccess } from "@/lib/useAuth";
import type { Contractor } from "@/lib/types";
import ListPicker from "./ListPicker";
import DeleteButton from "./DeleteButton";
import SrNoInput from "./SrNoInput";
import EditableName from "./EditableName";
import QuickAdd from "./QuickAdd";

/**
 * The master list, three levels deep: categories, the types inside one, and
 * the contractors inside that. Everything here is set up once and changes
 * rarely — the daily figure is entered on Daily entry, not here.
 */
export default function RosterTable() {
  const { data: all } = useStore();
  const access = useAccess();
  // An admin login manages only its own category.
  const data = useMemo(
    () =>
      access.category
        ? { ...all, contractors: all.contractors.filter((c) => c.category === access.category) }
        : all,
    [all, access.category],
  );
  const [category, setCategory] = useState<string | null>(null);
  const [type, setType] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  const categories = categoriesOf(data);
  const liveCategory = category && categories.some((c) => c.name === category) ? category : null;
  const types = liveCategory ? typesOf(data, liveCategory) : [];
  const liveType = liveCategory && type && types.some((t) => t.name === type) ? type : null;

  function prune(remaining: Contractor[]) {
    pruneUsers(new Set(remaining.map((c) => c.id)));
  }

  const addButton = (
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
  );

  const quickAdd = adding ? (
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
      className="flex items-center gap-1.5 rounded-md text-xs font-medium text-ink-secondary hover:text-ink"
    >
      <ArrowLeft size={14} strokeWidth={2.4} aria-hidden />
      {label}
    </button>
  );

  /* ------------------------------------------------------- categories */
  if (liveCategory === null) {
    return (
      <div className="space-y-4">
        <div className="flex justify-end">{addButton}</div>
        {quickAdd}
        <ListPicker
          items={categories}
          onSelect={setCategory}
          onDelete={(c) => {
            removeCategory(c);
            prune(data.contractors.filter((x) => x.category !== c));
          }}
          onSrNo={setCategorySrNo}
          onRename={(from, to) => {
            const map = renameCategory(from, to);
            if (map.size === 0) return false;
            remapUsers(map);
            remapCategory(from, to);
            setCategory(to);
            return true;
          }}
          countFor={(c) => data.contractors.filter((x) => x.category === c).length}
          deleteNote={(c) => {
            const n = data.contractors.filter((x) => x.category === c).length;
            const t = typesOf(data, c).length;
            return `This removes ${t} contractor type${t === 1 ? "" : "s"} and ${n} contractor${
              n === 1 ? "" : "s"
            }, with every manpower figure saved against them. It cannot be undone.`;
          }}
          emptyMessage="No contractors yet. Add one above, or import a sheet."
        />
      </div>
    );
  }

  /* ------------------------------------------------------------ types */
  if (liveType === null) {
    return (
      <div className="space-y-4">
        <div className="flex justify-end">{addButton}</div>
        {quickAdd}
        {back("Manpower Details", () => setCategory(null))}
        <ListPicker
          items={types}
          onSelect={setType}
          onDelete={(t) => {
            removeType(liveCategory, t);
            prune(data.contractors.filter((x) => !(x.category === liveCategory && x.type === t)));
          }}
          onSrNo={(t, n) => setTypeSrNo(liveCategory, t, n)}
          onRename={(from, to) => {
            const map = renameType(liveCategory, from, to);
            if (map.size === 0) return false;
            remapUsers(map);
            setType(to);
            return true;
          }}
          countFor={(t) =>
            data.contractors.filter((x) => x.category === liveCategory && x.type === t).length
          }
          emptyMessage="No contractor types here yet. Add a contractor above."
        />
      </div>
    );
  }

  /* ------------------------------------------------------ contractors */
  const list = contractorsOf(data.contractors, liveCategory, liveType);

  function editCommitted(c: Contractor, value: string) {
    const n = Number(value);
    if (value === "" || !Number.isFinite(n) || n < 0) return;
    upsertContractor({ ...c, committed: Math.round(n) });
  }

  function remove(c: Contractor) {
    removeContractor(c.id);
    prune(data.contractors.filter((x) => x.id !== c.id));
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">{addButton}</div>
      {quickAdd}
      {back(liveCategory, () => setType(null))}

      {/* The column label is stated once here, not on every card. */}
      <div className="hidden items-center gap-x-5 px-4 lg:flex">
        <span className="flex-1 basis-44" />
        <span className="w-28 text-right text-[10px] font-semibold uppercase tracking-wider text-ink-muted">
          Committed
        </span>
        <span className="w-11" />
      </div>

      <ul className="space-y-2">
        {list.map((c, i) => (
          <li
            key={c.id}
            className="group flex items-stretch overflow-hidden rounded-xl border border-hairline bg-surface-1 transition-colors hover:border-accent/45"
          >
            <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-5 gap-y-3 px-3 py-3">
              <div className="flex min-w-0 flex-1 basis-44 items-center gap-2">
                <SrNoInput
                  value={c.srNo}
                  placeholder={i + 1}
                  label={c.name}
                  onChange={(n) => setContractorSrNo(c.id, n)}
                />
                <EditableName
                  value={c.name}
                  label={c.name}
                  onRename={(to) => {
                    const map = renameContractor(c.id, to);
                    if (map.size === 0) return false;
                    remapUsers(map);
                    return true;
                  }}
                />
              </div>

              <div className="flex w-28 items-center justify-end gap-1.5">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-ink-muted lg:hidden">
                  Committed
                </span>
                <input
                  type="text"
                  inputMode="numeric"
                  aria-label={`Committed headcount for ${c.name}`}
                  defaultValue={c.committed}
                  onBlur={(e) => editCommitted(c, e.target.value.trim())}
                  className="tnum w-full rounded-lg border border-hairline bg-surface-2 px-3 py-2 text-right text-sm font-semibold text-ink hover:border-ink-muted/50 focus:border-accent focus:bg-surface-1 focus:outline-none focus:ring-2 focus:ring-accent/30"
                />
              </div>
            </div>

            <div className="flex w-11 shrink-0 items-center justify-center border-l border-hairline/60 transition-colors hover:bg-surface-2">
              <DeleteButton label={`${c.name} from the roster`} onConfirm={() => remove(c)} />
            </div>
          </li>
        ))}
      </ul>

      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 rounded-xl border border-hairline bg-surface-2 px-4 py-3">
        <span className="flex-1 text-sm font-semibold text-ink">
          {num(list.length)} contractor{list.length === 1 ? "" : "s"}
        </span>
        <span className="flex items-baseline gap-1.5">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-ink-muted">
            Committed
          </span>
          <span className="tnum text-sm font-semibold text-ink">
            {num(list.reduce((sum, c) => sum + c.committed, 0))}
          </span>
        </span>
      </div>
    </div>
  );
}
