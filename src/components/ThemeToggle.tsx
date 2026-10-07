"use client";

import { useSyncExternalStore } from "react";
import { Monitor, Moon, Sun } from "lucide-react";
import * as theme from "@/lib/theme";

const OPTIONS: { mode: theme.ThemeMode; label: string; Icon: typeof Sun }[] = [
  { mode: "light", label: "Light", Icon: Sun },
  { mode: "dark", label: "Dark", Icon: Moon },
  { mode: "system", label: "System", Icon: Monitor },
];

export default function ThemeToggle() {
  const mode = useSyncExternalStore(
    theme.subscribe,
    theme.getSnapshot,
    theme.getServerSnapshot,
  );

  return (
    <div
      role="radiogroup"
      aria-label="Colour theme"
      className="flex items-center gap-0.5 rounded-lg border border-hairline bg-surface-2 p-0.5"
    >
      {OPTIONS.map(({ mode: m, label, Icon }) => (
        <button
          key={m}
          role="radio"
          aria-checked={mode === m}
          aria-label={label}
          title={label}
          onClick={() => theme.setMode(m)}
          className={`flex h-7 w-7 items-center justify-center rounded-md transition-colors ${
            mode === m
              ? "bg-surface-1 text-ink shadow-sm"
              : "text-ink-muted hover:text-ink-secondary"
          }`}
        >
          <Icon size={14} strokeWidth={2} aria-hidden />
        </button>
      ))}
    </div>
  );
}
