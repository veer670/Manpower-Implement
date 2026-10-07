"use client";

import { useRef, useState } from "react";
import { Download, FileSpreadsheet, RotateCcw, TriangleAlert, Upload } from "lucide-react";
import { parseWorkbook } from "@/lib/parse";
import { useStore } from "@/lib/store";
import { num } from "@/lib/format";
import { sampleCsv } from "@/lib/sample";

export default function UploadPanel() {
  const { dataset, setDataset, resetToSample } = useStore();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);

  async function handleFile(file: File) {
    setBusy(true);
    setError(null);
    setWarnings([]);
    try {
      const buffer = await file.arrayBuffer();
      const result = parseWorkbook(buffer);
      if (result.rows.length === 0) {
        setError(result.warnings.join(" ") || "No usable rows found in that file.");
      } else {
        setDataset(result.rows, file.name);
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
    const csv = sampleCsv(dataset.rows.slice(0, 200));
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "manpower-template.csv";
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
          dragging ? "border-series-1 bg-surface-2" : "border-hairline"
        }`}
      >
        <FileSpreadsheet size={28} strokeWidth={1.6} className="mx-auto text-ink-muted" aria-hidden />
        <p className="mt-3 text-sm font-medium text-ink">
          Drop your manpower register here, or pick a file
        </p>
        <p className="mt-1 text-xs text-ink-secondary">
          .xlsx, .xls or .csv — first sheet is read. Nothing leaves your browser.
        </p>

        <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
          <button
            onClick={() => inputRef.current?.click()}
            disabled={busy}
            className="flex items-center gap-1.5 rounded-lg bg-series-1 px-3.5 py-2 text-xs font-semibold text-white disabled:opacity-60"
          >
            <Upload size={14} strokeWidth={2.4} aria-hidden />
            {busy ? "Reading…" : "Choose file"}
          </button>
          <button
            onClick={downloadTemplate}
            className="flex items-center gap-1.5 rounded-lg border border-hairline bg-surface-2 px-3.5 py-2 text-xs font-semibold text-ink-secondary hover:text-ink"
          >
            <Download size={14} strokeWidth={2.4} aria-hidden />
            Download template
          </button>
          {!dataset.isSample && (
            <button
              onClick={resetToSample}
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
        <h3 className="text-xs font-semibold text-ink">Columns the dashboard looks for</h3>
        <p className="mt-1 text-xs text-ink-secondary">
          Header names are matched loosely, so <code className="text-ink">Site Name</code>,{" "}
          <code className="text-ink">Project</code> and <code className="text-ink">Location</code>{" "}
          all land on <strong className="text-ink">Site</strong>.
        </p>
        <dl className="mt-3 grid gap-x-6 gap-y-2 text-xs sm:grid-cols-2">
          {[
            ["Date", "required — dd-mm-yyyy, yyyy-mm-dd or an Excel date"],
            ["Site", "required — site, project, location, tower, block"],
            ["Actual", "required — actual, deployed, present, attendance, strength"],
            ["Planned", "optional — planned, required, target, budgeted"],
            ["Contractor", "optional — contractor, subcontractor, vendor, agency"],
            ["Trade", "optional — trade, skill, designation, category"],
          ].map(([field, note]) => (
            <div key={field} className="flex gap-2">
              <dt className="min-w-[72px] font-medium text-ink">{field}</dt>
              <dd className="text-ink-secondary">{note}</dd>
            </div>
          ))}
        </dl>
      </div>

      {error && (
        <Notice tone="critical" title="Could not use that file">
          {error}
        </Notice>
      )}

      {warnings.length > 0 && (
        <Notice tone="warning" title={`Loaded with ${num(warnings.length)} note(s)`}>
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
  tone: "critical" | "warning";
  title: string;
  children: React.ReactNode;
}) {
  const color = tone === "critical" ? "var(--critical)" : "var(--warning)";
  return (
    <div className="flex gap-2.5 rounded-xl border border-hairline bg-surface-1 p-4">
      <TriangleAlert size={16} strokeWidth={2.2} style={{ color }} className="mt-0.5 shrink-0" aria-hidden />
      <div className="text-xs">
        <p className="font-semibold text-ink">{title}</p>
        <div className="mt-0.5 text-ink-secondary">{children}</div>
      </div>
    </div>
  );
}
