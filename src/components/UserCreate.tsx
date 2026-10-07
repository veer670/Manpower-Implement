"use client";

import { useMemo, useState } from "react";
import { Check, Copy, KeyRound, RefreshCw, ShieldCheck, Trash2, UserPlus } from "lucide-react";
import * as auth from "@/lib/auth";
import { useUsers } from "@/lib/useAuth";
import { useStore } from "@/lib/store";
import { longDate } from "@/lib/format";
import { categoriesOf } from "@/lib/metrics";

type Kind = "contractor" | "admin";

/**
 * Admin screen: issue a login.
 *
 *  - A contractor login enters its own row and nothing else.
 *  - An admin login oversees a whole category — every type and contractor
 *    under it — or all categories when left unscoped.
 */
export default function UserCreate() {
  const { data } = useStore();
  const users = useUsers();
  const categories = useMemo(() => categoriesOf(data).map((c) => c.name), [data]);

  const [kind, setKind] = useState<Kind>("contractor");
  const [contractorId, setContractorId] = useState("");
  const [category, setCategory] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [touchedName, setTouchedName] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  /** Shown once after creating or resetting — it cannot be read back later. */
  const [issued, setIssued] = useState<{ username: string; password: string } | null>(null);

  const withLogin = useMemo(
    () => new Set(users.filter((u) => u.role === "contractor").map((u) => u.contractorId)),
    [users],
  );
  const available = data.contractors.filter((c) => !withLogin.has(c.id));
  const chosen = data.contractors.find((c) => c.id === contractorId);
  const nameFor = (id?: string) => data.contractors.find((c) => c.id === id);

  function switchKind(next: Kind) {
    setKind(next);
    setError(null);
    setUsername("");
    setTouchedName(false);
    setContractorId("");
    setCategory("");
  }

  function pickContractor(id: string) {
    setContractorId(id);
    setError(null);
    const c = data.contractors.find((x) => x.id === id);
    // The username follows the contractor name until it is edited.
    if (c && !touchedName) setUsername(auth.suggestUsername(c.name));
  }

  function pickCategory(value: string) {
    setCategory(value);
    setError(null);
    if (!touchedName) setUsername(auth.suggestUsername(value ? `${value} admin` : "admin"));
  }

  async function create() {
    setError(null);
    if (kind === "contractor" && (!contractorId || !chosen)) {
      setError("Pick a contractor first.");
      return;
    }
    const name = auth.normaliseUsername(username);
    if (name.length < 3) {
      setError("User ID needs at least 3 characters.");
      return;
    }
    if (auth.usernameTaken(name)) {
      setError(`User ID "${name}" is already taken.`);
      return;
    }
    const pw = password.trim() || auth.generatePassword();
    if (pw.length < 6) {
      setError("Password needs at least 6 characters.");
      return;
    }

    setBusy(true);
    try {
      if (kind === "contractor") await auth.createContractorUser(name, pw, contractorId);
      else await auth.createAdminUser(name, pw, category || null);
      setIssued({ username: name, password: pw });
      setContractorId("");
      setCategory("");
      setUsername("");
      setPassword("");
      setTouchedName(false);
    } finally {
      setBusy(false);
    }
  }

  async function reset(user: auth.User) {
    const pw = auth.generatePassword();
    setBusy(true);
    try {
      await auth.resetPassword(user.username, pw);
      setIssued({ username: user.username, password: pw });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-5">
      {issued && <Issued {...issued} onDismiss={() => setIssued(null)} />}

      <div className="rounded-xl border border-hairline bg-surface-2 p-4">
        <h3 className="text-xs font-semibold text-ink">Create a login</h3>

        <div
          role="radiogroup"
          aria-label="Kind of login"
          className="mt-3 inline-flex rounded-lg border border-hairline bg-surface-1 p-0.5"
        >
          {(
            [
              ["contractor", "Contractor", UserPlus],
              ["admin", "Admin", ShieldCheck],
            ] as const
          ).map(([k, label, Icon]) => (
            <button
              key={k}
              role="radio"
              aria-checked={kind === k}
              onClick={() => switchKind(k)}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
                kind === k ? "bg-accent text-white" : "text-ink-secondary hover:text-ink"
              }`}
            >
              <Icon size={13} strokeWidth={2.4} aria-hidden />
              {label}
            </button>
          ))}
        </div>

        <p className="mt-2 text-xs text-ink-secondary">
          {kind === "contractor"
            ? "Enters its own row and nothing else. The user ID is suggested from the contractor name."
            : "Sees and enters every type and contractor in one category. Leave the category empty for all of them."}
        </p>

        <div className="mt-3 flex flex-wrap items-end gap-3">
          {kind === "contractor" ? (
            <label className="flex flex-col gap-1">
              <span className="text-[11px] font-medium text-ink-muted">Contractor</span>
              <select
                value={contractorId}
                onChange={(e) => pickContractor(e.target.value)}
                className={`${field} min-w-[240px]`}
              >
                <option value="">Choose a contractor…</option>
                {available.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} — {c.category} / {c.type}
                  </option>
                ))}
              </select>
            </label>
          ) : (
            <label className="flex flex-col gap-1">
              <span className="text-[11px] font-medium text-ink-muted">Category</span>
              <select
                value={category}
                onChange={(e) => pickCategory(e.target.value)}
                className={`${field} min-w-[200px]`}
              >
                <option value="">All categories</option>
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </label>
          )}

          <label className="flex flex-col gap-1">
            <span className="text-[11px] font-medium text-ink-muted">User ID</span>
            <input
              value={username}
              onChange={(e) => {
                setTouchedName(true);
                setUsername(e.target.value);
              }}
              placeholder={kind === "admin" ? "mep.admin" : "prajapati"}
              className={`${field} w-44`}
            />
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-[11px] font-medium text-ink-muted">
              Password <span className="font-normal">(optional)</span>
            </span>
            <div className="flex items-center gap-1">
              <input
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="auto-generated"
                className={`${field} w-44`}
              />
              <button
                type="button"
                onClick={() => setPassword(auth.generatePassword())}
                aria-label="Generate a password"
                title="Generate a password"
                className="rounded-md border border-hairline bg-surface-1 p-2 text-ink-muted hover:text-ink"
              >
                <RefreshCw size={13} strokeWidth={2.4} aria-hidden />
              </button>
            </div>
          </label>

          <button
            onClick={create}
            disabled={busy}
            className="flex items-center gap-1.5 rounded-lg bg-accent px-3.5 py-2 text-xs font-semibold text-white disabled:opacity-60"
          >
            <UserPlus size={14} strokeWidth={2.5} aria-hidden />
            {busy ? "Creating…" : "Create login"}
          </button>
        </div>

        {error && <p className="mt-2 text-xs text-[var(--critical)]">{error}</p>}
        {kind === "contractor" && available.length === 0 && data.contractors.length > 0 && (
          <p className="mt-2 text-xs text-ink-muted">
            Every contractor on the roster already has a login.
          </p>
        )}
        {data.contractors.length === 0 && (
          <p className="mt-2 text-xs text-ink-muted">
            Add contractors to the roster first — a login is tied to one.
          </p>
        )}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-sm">
          <thead>
            <tr className="border-b border-hairline text-left">
              <Th>User ID</Th>
              <Th>Role</Th>
              <Th>Sees</Th>
              <Th>Created</Th>
              <Th align="right">
                <span className="sr-only">Actions</span>
              </Th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => {
              const c = nameFor(u.contractorId);
              return (
                <tr key={u.username} className="border-b border-hairline/60">
                  <td className="py-2.5 pr-4 font-medium text-ink">{u.username}</td>
                  <td className="py-2.5 pr-4">
                    <span
                      className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium text-ink-secondary"
                      style={{
                        background:
                          u.role === "admin"
                            ? "color-mix(in srgb, var(--accent) 16%, transparent)"
                            : "var(--surface-2)",
                      }}
                    >
                      {u.role === "admin" ? (
                        <ShieldCheck size={12} strokeWidth={2.4} aria-hidden />
                      ) : (
                        <UserPlus size={12} strokeWidth={2.4} aria-hidden />
                      )}
                      {u.role === "admin" ? "Admin" : "Contractor"}
                    </span>
                  </td>
                  <td className="py-2.5 pr-4 text-ink-secondary">
                    {u.role === "admin"
                      ? (u.category ?? "All categories")
                      : c
                        ? `${c.name} — ${c.category} / ${c.type}`
                        : "—"}
                  </td>
                  <td className="py-2.5 pr-4 text-ink-secondary">
                    {longDate(u.createdAt.slice(0, 10))}
                  </td>
                  <td className="py-2.5 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => void reset(u)}
                        disabled={busy}
                        className="flex items-center gap-1 rounded-md px-2 py-1.5 text-xs font-medium text-ink-secondary hover:bg-surface-2 hover:text-ink disabled:opacity-50"
                      >
                        <KeyRound size={13} strokeWidth={2.3} aria-hidden />
                        Reset password
                      </button>
                      <button
                        onClick={() => auth.deleteUser(u.username)}
                        aria-label={`Delete the login ${u.username}`}
                        title={`Delete ${u.username}`}
                        className="rounded-md p-1.5 text-ink-muted hover:bg-surface-2 hover:text-[var(--critical)]"
                      >
                        <Trash2 size={14} strokeWidth={2.2} aria-hidden />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {users.length === 0 && (
              <tr>
                <td colSpan={5} className="py-8 text-center text-sm text-ink-muted">
                  No logins yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/** The one moment the password is visible. After this it exists only as a hash. */
function Issued({
  username,
  password,
  onDismiss,
}: {
  username: string;
  password: string;
  onDismiss: () => void;
}) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(`User ID: ${username}\nPassword: ${password}`);
      setCopied(true);
    } catch {
      // Clipboard can be blocked; the credentials are on screen either way.
    }
  }

  return (
    <div className="rounded-xl border border-hairline bg-surface-1 p-4">
      <div className="flex items-start gap-2.5">
        <Check
          size={16}
          strokeWidth={2.4}
          style={{ color: "var(--good)" }}
          className="mt-0.5 shrink-0"
          aria-hidden
        />
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold text-ink">Login ready — write this down now</p>
          <p className="mt-0.5 text-xs text-ink-secondary">
            The password is stored hashed, so it cannot be shown again. If it is lost, reset
            it to get a new one.
          </p>
          <dl className="mt-3 flex flex-wrap gap-x-8 gap-y-2">
            <div>
              <dt className="text-[11px] font-medium text-ink-muted">User ID</dt>
              <dd className="tnum mt-0.5 text-sm font-semibold text-ink">{username}</dd>
            </div>
            <div>
              <dt className="text-[11px] font-medium text-ink-muted">Password</dt>
              <dd className="tnum mt-0.5 text-sm font-semibold text-ink">{password}</dd>
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
              onClick={onDismiss}
              className="rounded-lg px-3 py-1.5 text-xs font-semibold text-ink-secondary hover:text-ink"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Th({
  children,
  align = "left",
}: {
  children: React.ReactNode;
  align?: "left" | "right";
}) {
  return (
    <th
      scope="col"
      className={`pb-2 pr-4 text-[11px] font-semibold uppercase tracking-wider text-ink-muted ${
        align === "right" ? "text-right" : "text-left"
      }`}
    >
      {children}
    </th>
  );
}

const field =
  "rounded-md border border-hairline bg-surface-1 px-2.5 py-1.5 text-xs text-ink " +
  "placeholder:text-ink-muted focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent";
