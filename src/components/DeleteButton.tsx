"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";

/**
 * A row-level delete that asks first. Deleting a contractor takes their saved
 * manpower with it, so a mis-click should not be enough — but a full dialog
 * for one row is heavier than the action deserves, hence the inline confirm.
 */
export default function DeleteButton({
  label,
  onConfirm,
}: {
  /** What is being deleted, for the accessible name and the prompt. */
  label: string;
  onConfirm: () => void;
}) {
  const [confirming, setConfirming] = useState(false);

  if (confirming) {
    return (
      <span className="flex items-center justify-end gap-1 whitespace-nowrap">
        <button
          onClick={onConfirm}
          className="rounded-md bg-[var(--critical)] px-2 py-1 text-xs font-semibold text-white"
        >
          Delete
        </button>
        <button
          onClick={() => setConfirming(false)}
          className="rounded-md px-2 py-1 text-xs font-medium text-ink-secondary hover:text-ink"
        >
          Cancel
        </button>
      </span>
    );
  }

  return (
    <button
      onClick={() => setConfirming(true)}
      aria-label={`Delete ${label}`}
      title={`Delete ${label}`}
      className="rounded-md p-1.5 text-ink-muted hover:bg-surface-2 hover:text-[var(--critical)]"
    >
      <Trash2 size={14} strokeWidth={2.2} aria-hidden />
    </button>
  );
}
