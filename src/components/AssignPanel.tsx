"use client";

import { useMemo, useState } from "react";
import { Check, Copy, KeyRound, Trash2, X } from "lucide-react";
import * as auth from "@/lib/auth";
import { useUsers } from "@/lib/useAuth";

/**
 * Hands one level of the roster to someone.
 *
 * The scope comes from wherever it is opened — all categories, one category,
 * or one type within a category — so assigning is a property of the thing you
 * are looking at rather than a form you fill in from scratch.
 */
export default function AssignPanel({
  category,
  type,
  label,
  onClose,
}: {
  /** Null assigns every category. */
  category?: string | null;
  /** Null assigns the whole category. */
  type?: string | null;
  /** What is being handed over, for the wording. */
  label: string;
  onClose: () => void;
}) {
  const users = useUsers();
  const [username, setUsername] = useState(() =>
    auth.suggestUsername(`${type ?? category ?? "all"} admin`),
  );
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [issued, setIssued] = useState<{ username: string; password: string } | null>(null);
  const [copied, setCopied] = useState(false);

  /** Who already holds exactly this level. */
  const assigned = useMemo(
    () =>
      users.filter(
        (u) =>
          u.role === "admin" &&
          (u.category ?? null) === (category ?? null) &&
          (u.type ?? null) === (type ?? null),
      ),
    [users, category, type],
  );

  async function assign() {
    setError(null);
    const name = auth.normaliseUsername(username);
    if (name.length < 3) {
      setError("User ID needs at least 3 characters.");
      return;
    }
    setBusy(true);
    try {
      const result = await auth.createAdminUser(
        name,
        password.trim() || auth.generatePassword(),
        category ?? null,
        type ?? null,
      );
      setIssued(result);
      setPassword("");
      setCopied(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create that login.");
    } finally {
      setBusy(false);
    }
  }

  async function copy() {
    if (!issued) return;
    try {
      await navigator.clipboard.writeText(
        `User ID: ${issued.username}\nPassword: ${issued.password}`,
      );
      setCopied(true);
    } catch {
      // Clipboard can be blocked; the credentials are on screen either way.
    }
  }

  return (
    <div className="mb-4 rounded-xl border border-hairline bg-surface-2 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-xs font-semibold text-ink">Assign {label}</h3>
          <p className="mt-0.5 text-xs text-ink-secondary">
            Creates a login that sees and edits {label} and nothing else.
          </p>
        </div>
        <button
          onClick={onClose}
          aria-label="Close assign"
          className="rounded-md p-1 text-ink-muted hover:text-ink"
        >
          <X size={14} strokeWidth={2.4} aria-hidden />
        </button>
      </div>

      {issued ? (
        <div className="mt-3 rounded-lg border border-hairline bg-surface-1 p-3">
          <p className="flex items-center gap-1.5 text-xs font-semibold text-ink">
            <Check size={13} strokeWidth={2.6} style={{ color: "var(--good)" }} aria-hidden />
            Assigned — write this down now
          </p>
          <p className="mt-0.5 text-xs text-ink-secondary">
            The password is stored hashed and cannot be shown again.
          </p>
          <dl className="mt-2.5 flex flex-wrap gap-x-8 gap-y-2">
            <div>
              <dt className="text-[10px] font-semibold uppercase tracking-wider text-ink-muted">
                User ID
              </dt>
              <dd className="tnum mt-0.5 text-sm font-semibold text-ink">{issued.username}</dd>
            </div>
            <div>
              <dt className="text-[10px] font-semibold uppercase tracking-wider text-ink-muted">
                Password
              </dt>
              <dd className="tnum mt-0.5 text-sm font-semibold text-ink">{issued.password}</dd>
            </div>
          </dl>
          <div className="mt-3 flex items-center gap-2">
            <button
              onClick={copy}
              className="flex items-center gap-1.5 rounded-lg border border-hairline bg-surface-2 px-3 py-1.5 text-xs font-semibold text-ink-secondary hover:text-ink"
            >
              {copied ? (
                <Check size={13} strokeWidth={2.5} aria-hidden />
              ) : (
                <Copy size={13} strokeWidth={2.3} aria-hidden />
              )}
              {copied ? "Copied" : "Copy"}
            </button>
            <button
              onClick={() => setIssued(null)}
              className="rounded-lg px-3 py-1.5 text-xs font-semibold text-ink-secondary hover:text-ink"
            >
              Assign another
            </button>
          </div>
        </div>
      ) : (
        <div className="mt-3 flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1">
            <span className="text-[11px] font-medium text-ink-muted">User ID</span>
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className={`${field} w-48`}
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-[11px] font-medium text-ink-muted">
              Password <span className="font-normal">(optional)</span>
            </span>
            <input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="auto-generated"
              className={`${field} w-44`}
            />
          </label>
          <button
            onClick={assign}
            disabled={busy}
            className="flex items-center gap-1.5 rounded-lg bg-accent px-3.5 py-2 text-xs font-semibold text-white disabled:opacity-60"
          >
            <KeyRound size={14} strokeWidth={2.5} aria-hidden />
            {busy ? "Assigning…" : "Assign"}
          </button>
        </div>
      )}

      {error && <p className="mt-2 text-xs text-[var(--critical)]">{error}</p>}

      {assigned.length > 0 && (
        <div className="mt-3 border-t border-hairline pt-3">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-ink-muted">
            Already assigned
          </p>
          <ul className="mt-1.5 space-y-1">
            {assigned.map((u) => (
              <li key={u.username} className="flex items-center gap-2 text-xs text-ink-secondary">
                <span className="font-medium text-ink">{u.username}</span>
                <button
                  onClick={() => void auth.deleteUser(u.username)}
                  aria-label={`Remove ${u.username}`}
                  title={`Remove ${u.username}`}
                  className="rounded-md p-1 text-ink-muted hover:bg-surface-1 hover:text-[var(--critical)]"
                >
                  <Trash2 size={12} strokeWidth={2.2} aria-hidden />
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

const field =
  "rounded-md border border-hairline bg-surface-1 px-2.5 py-1.5 text-xs text-ink " +
  "placeholder:text-ink-muted focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent";
