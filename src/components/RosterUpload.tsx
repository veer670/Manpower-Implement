"use client";

import { useRef, useState, useSyncExternalStore } from "react";
import {
  CheckCircle2,
  Download,
  FileSpreadsheet,
  RotateCcw,
  TriangleAlert,
  Upload,
} from "lucide-react";
import { parseRoster } from "@/lib/parse";
import { replaceRoster, resetToSample, saveDay } from "@/lib/dataset";
import { pruneUsers } from "@/lib/auth";
import { longDate, num } from "@/lib/format";
import { rosterCsv } from "@/lib/sample";
import { useStore } from "@/lib/store";
import * as todayStore from "@/lib/today";

export default function RosterUpload() {
  const { data } = useStore();
  const today = useSyncExternalStore(
    todayStore.subscribe,
    todayStore.getSnapshot,
    todayStore.getServerSnapshot,
  );
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [note, setNote] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);

  async function handleFile(file: File) {
    setBusy(true);
    setError(null);
    setWarnings([]);
    setNote(null);
    try {
      const result = parseRoster(await file.arrayBuffer());
      if (result.contractors.length === 0) {
        setError(result.warnings.join(" ") || "No contractor rows found in that file.");
      } else {
        replaceRoster(result.contractors, file.name);
        // Logins for contractors the new sheet dropped have nothing to enter.
        pruneUsers(new Set(result.contractors.map((c) => c.id)));
        // A sheet that also carries the day's figures is filed against today,
        // which is what a freshly exported register is.
        if (result.hadActualColumn && result.actuals.size > 0 && today) {
          saveDay(today, new Map(result.actuals));
          setNote(
            `${num(result.contractors.length)} contractors loaded. ` +
              `${num(result.actuals.size)} manpower figures were saved against ${longDate(today)} — ` +
              `change the date under Daily entry if they belong to another day.`,
          );
        } else {
          setNote(
            `${num(result.contractors.length)} contractors loaded` +
              (result.hadCategoryColumn
                ? "."
                : " under a single General category — add a Category column to split them."),
          );
        }
        setWarnings(result.warnings);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not read that file.");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  function downloadTemplate() {
    const actuals = new Map(
      data.entries
        .filter((e) => e.date === (today ?? ""))
        .map((e) => [e.contractorId, e.actual] as const),
    );
    const csv = rosterCsv(data.contractors, actuals);
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "contractor-roster.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-4">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          const file = e.dataTransfer.files?.[0];
          if (file) void handleFile(file);
        }}
        className={`rounded-xl border-2 border-dashed p-8 text-center transition-colors ${
          dragging ? "border-accent bg-surface-2" : "border-hairline"
        }`}
      >
        <FileSpreadsheet
          size={28}
          strokeWidth={1.6}
          className="mx-auto text-ink-muted"
          aria-hidden
        />
        <p className="mt-3 text-sm font-medium text-ink">
          Drop your contractor sheet here, or pick a file
        </p>
        <p className="mt-1 text-xs text-ink-secondary">
          .xlsx, .xls or .csv — first sheet is read. Nothing leaves your browser.
        </p>

        <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
          <button
            onClick={() => inputRef.current?.click()}
            disabled={busy}
            className="flex items-center gap-1.5 rounded-lg bg-accent px-3.5 py-2 text-xs font-semibold text-white disabled:opacity-60"
          >
            <Upload size={14} strokeWidth={2.4} aria-hidden />
            {busy ? "Reading…" : "Choose file"}
          </button>
          <button
            onClick={downloadTemplate}
            className="flex items-center gap-1.5 rounded-lg border border-hairline bg-surface-2 px-3.5 py-2 text-xs font-semibold text-ink-secondary hover:text-ink"
          >
            <Download size={14} strokeWidth={2.4} aria-hidden />
            Download as sheet
          </button>
          {!data.isSample && (
            <button
              onClick={() => {
                resetToSample();
                setNote(null);
                setWarnings([]);
                setError(null);
              }}
              className="flex items-center gap-1.5 rounded-lg border border-hairline bg-surface-2 px-3.5 py-2 text-xs font-semibold text-ink-secondary hover:text-ink"
            >
              <RotateCcw size={14} strokeWidth={2.4} aria-hidden />
              Back to sample
            </button>
          )}
        </div>

        <input
          ref={inputRef}
          type="file"
          accept=".xlsx,.xls,.csv,text/csv"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void handleFile(file);
          }}
        />
      </div>

      <div className="rounded-xl border border-hairline bg-surface-1 p-4">
        <h3 className="text-xs font-semibold text-ink">Columns the importer looks for</h3>
        <p className="mt-1 text-xs text-ink-secondary">
          Header names are matched loosely, so <code className="text-ink">Type</code>,{" "}
          <code className="text-ink">Discipline</code> and{" "}
          <code className="text-ink">Trade</code> all land on{" "}
          <strong className="text-ink">Contractor Type</strong>.
        </p>
        <dl className="mt-3 grid gap-x-6 gap-y-2 text-xs sm:grid-cols-2">
          {[
            ["Category", "optional — group, division, section, stream"],
            ["Contractor Type", "required — type, discipline, trade, scope"],
            ["Contractor Name", "required — name, contractor, agency, vendor, firm"],
            ["Committed", "required — commitment, agreed, contracted, required"],
            ["Today's Manpower", "optional — actual, deployed, present, attendance"],
            ["Sr. No.", "optional — sets the display order within a type"],
            ["Site", "optional — only if you run more than one site"],
          ].map(([field, hint]) => (
            <div key={field} className="flex gap-2">
              <dt className="min-w-[132px] font-medium text-ink">{field}</dt>
              <dd className="text-ink-secondary">{hint}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-3 text-xs text-ink-secondary">
          Importing replaces the roster. Saved manpower for contractors still on the new
          roster is kept.
        </p>
      </div>

      {error && (
        <Notice tone="critical" title="Could not use that file">
          {error}
        </Notice>
      )}

      {note && !error && (
        <Notice tone="good" title="Roster updated">
          {note}
        </Notice>
      )}

      {warnings.length > 0 && (
        <Notice tone="warning" title={`${num(warnings.length)} row(s) needed attention`}>
          <ul className="mt-1 list-disc space-y-0.5 pl-4">
            {warnings.slice(0, 10).map((w, i) => (
              <li key={i}>{w}</li>
            ))}
            {warnings.length > 10 && <li>…and {num(warnings.length - 10)} more.</li>}
          </ul>
        </Notice>
      )}
    </div>
  );
}

function Notice({
  tone,
  title,
  children,
}: {
  tone: "critical" | "warning" | "good";
  title: string;
  children: React.ReactNode;
}) {
  const color =
    tone === "critical" ? "var(--critical)" : tone === "warning" ? "var(--warning)" : "var(--good)";
  // Icon carries the tone alongside the colour — a success note must not wear
  // a warning triangle.
  const Icon = tone === "good" ? CheckCircle2 : TriangleAlert;
  return (
    <div className="flex gap-2.5 rounded-xl border border-hairline bg-surface-1 p-4">
      <Icon
        size={16}
        strokeWidth={2.2}
        style={{ color }}
        className="mt-0.5 shrink-0"
        aria-hidden
      />
      <div className="text-xs">
        <p className="font-semibold text-ink">{title}</p>
        <div className="mt-0.5 text-ink-secondary">{children}</div>
      </div>
    </div>
  );
}
