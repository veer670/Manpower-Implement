"use client";

import { useState } from "react";
import { ArrowLeft, Plus } from "lucide-react";
import { removeContractor, removeType, upsertContractor } from "@/lib/dataset";
import { pruneUsers } from "@/lib/auth";
import { num } from "@/lib/format";
import { useStore } from "@/lib/store";
import { contractorId, type Contractor } from "@/lib/types";
import TypePicker from "./TypePicker";
import DeleteButton from "./DeleteButton";
import { FootRow, HeadRow, Row, Td, Th } from "./Table";

/**
 * The master list, in two levels: contractor types first, then the
 * contractors inside one. Everything here is set up once and changes rarely —
 * the daily figure is entered on Daily entry, not here.
 */
export default function RosterTable() {
  const { data } = useStore();
  const [openType, setOpenType] = useState<string | null>(null);

  const types = [...new Set(data.contractors.map((c) => c.type))].sort((a, b) =>
    a.localeCompare(b),
  );

  function deleteType(type: string) {
    removeType(type);
    // Logins for the contractors that just went would otherwise point at
    // nothing.
    pruneUsers(new Set(data.contractors.filter((c) => c.type !== type).map((c) => c.id)));
  }

  if (openType === null) {
    return (
      <div className="space-y-5">
        <TypePicker
          types={types}
          onSelect={setOpenType}
          onDelete={deleteType}
          countFor={(t) => data.contractors.filter((c) => c.type === t).length}
          emptyMessage="No contractors yet. Add one below, or import a sheet."
        />
        <AddContractor types={types} />
      </div>
    );
  }

  const list = data.contractors.filter((c) => c.type === openType);

  function editCommitted(c: Contractor, value: string) {
    const n = Number(value);
    if (value === "" || !Number.isFinite(n) || n < 0) return;
    upsertContractor({ ...c, committed: Math.round(n) });
  }

  function remove(c: Contractor) {
    removeContractor(c.id);
    // Its login would otherwise be left pointing at nothing.
    pruneUsers(new Set(data.contractors.filter((x) => x.id !== c.id).map((x) => x.id)));
    // Removing the last contractor of a type empties this view.
    if (list.length === 1) setOpenType(null);
  }

  return (
    <div className="space-y-5">
      <button
        onClick={() => setOpenType(null)}
        className="flex items-center gap-1.5 rounded-md text-xs font-medium text-ink-secondary hover:text-ink"
      >
        <ArrowLeft size={14} strokeWidth={2.4} aria-hidden />
        All contractor types
      </button>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[520px] text-sm">
          <thead>
            <HeadRow>
              <Th>Sr. No.</Th>
              <Th>Contractor name</Th>
              <Th align="right">Committed</Th>
              <Th align="right">
                <span className="sr-only">Actions</span>
              </Th>
            </HeadRow>
          </thead>
          <tbody>
            {list.map((c, i) => (
              <Row key={c.id}>
                <Td align="left" className="text-ink-muted">
                  {i + 1}
                </Td>
                <Td align="left" numeric={false} className="font-semibold text-ink">
                  {c.name}
                </Td>
                <td className="py-2 pr-4 text-right">
                  <input
                    type="text"
                    inputMode="numeric"
                    aria-label={`Committed headcount for ${c.name}`}
                    defaultValue={c.committed}
                    onBlur={(e) => editCommitted(c, e.target.value.trim())}
                    className="tnum w-24 rounded-lg border border-hairline bg-surface-2 px-3 py-2 text-right text-sm font-semibold text-ink hover:border-ink-muted/50 focus:border-series-1 focus:bg-surface-1 focus:outline-none focus:ring-2 focus:ring-series-1/25"
                  />
                </td>
                <td className="py-2.5 pl-4 text-right">
                  <DeleteButton label={`${c.name} from the roster`} onConfirm={() => remove(c)} />
                </td>
              </Row>
            ))}
          </tbody>
          <tfoot>
            <FootRow>
              <td className="py-3 pr-4" colSpan={2}>
                {num(list.length)} contractor{list.length === 1 ? "" : "s"}
              </td>
              <Td className="text-ink">{num(list.reduce((s, c) => s + c.committed, 0))}</Td>
              <td />
            </FootRow>
          </tfoot>
        </table>
      </div>

      <AddContractor types={types} fixedType={openType} />
    </div>
  );
}

function AddContractor({ types, fixedType }: { types: string[]; fixedType?: string }) {
  const { data } = useStore();
  const [type, setType] = useState(fixedType ?? "");
  const [name, setName] = useState("");
  const [committed, setCommitted] = useState("");
  const [error, setError] = useState<string | null>(null);

  function add() {
    const t = (fixedType ?? type).trim();
    const n = name.trim();
    const c = Number(committed);
    if (!t || !n) {
      setError("Contractor type and name are both needed.");
      return;
    }
    if (!Number.isFinite(c) || c < 0 || committed.trim() === "") {
      setError("Committed must be a number.");
      return;
    }
    const id = contractorId(t, n);
    if (data.contractors.some((x) => x.id === id)) {
      setError(`${n} is already on the roster under ${t}.`);
      return;
    }
    upsertContractor({ id, type: t, name: n, committed: Math.round(c) });
    setName("");
    setCommitted("");
    setError(null);
  }

  return (
    <div className="rounded-xl border border-hairline bg-surface-2 p-4">
      <h3 className="text-xs font-semibold text-ink">
        {fixedType ? `Add a contractor to ${fixedType}` : "Add a contractor"}
      </h3>
      <div className="mt-3 flex flex-wrap items-end gap-3">
        {!fixedType && (
          <label className="flex flex-col gap-1">
            <span className="text-[11px] font-medium text-ink-muted">Contractor type</span>
            <input
              list="contractor-types"
              value={type}
              onChange={(e) => setType(e.target.value)}
              placeholder="Electrical"
              className={field}
            />
            <datalist id="contractor-types">
              {types.map((t) => (
                <option key={t} value={t} />
              ))}
            </datalist>
          </label>
        )}
        <label className="flex flex-col gap-1">
          <span className="text-[11px] font-medium text-ink-muted">Contractor name</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Prajapati"
            className={field}
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-[11px] font-medium text-ink-muted">Committed</span>
          <input
            type="text"
            inputMode="numeric"
            value={committed}
            onChange={(e) => setCommitted(e.target.value.replace(/[^\d]/g, ""))}
            placeholder="10"
            className={`${field} tnum w-24 text-right`}
          />
        </label>
        <button
          onClick={add}
          className="flex items-center gap-1.5 rounded-lg bg-series-1 px-3.5 py-2 text-xs font-semibold text-white"
        >
          <Plus size={14} strokeWidth={2.6} aria-hidden />
          Add
        </button>
      </div>
      {error && <p className="mt-2 text-xs text-[var(--critical)]">{error}</p>}
    </div>
  );
}

const field =
  "rounded-md border border-hairline bg-surface-1 px-2.5 py-1.5 text-xs text-ink " +
  "placeholder:text-ink-muted focus:border-series-1 focus:outline-none focus:ring-1 focus:ring-series-1";
