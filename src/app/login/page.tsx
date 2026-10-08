"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { HardHat, LogIn } from "lucide-react";
import * as auth from "@/lib/auth";
import { useSession } from "@/lib/useAuth";

export default function LoginPage() {
  const router = useRouter();
  const session = useSession();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const next = await auth.signIn(username, password);
      // The office and an admin land on the dashboard; a contractor has only
      // their own row to fill in.
      router.push(next.role === "contractor" ? "/entry" : "/");
    } catch (err) {
      // The server returns one message for a wrong ID and a wrong password
      // alike — naming which was wrong tells an outsider which IDs exist.
      setError(err instanceof Error ? err.message : "Could not sign in.");
    } finally {
      setBusy(false);
    }
  }

  if (session) {
    return (
      <div className="mx-auto max-w-[420px] py-20 text-center">
        <p className="text-sm text-ink-secondary">
          Signed in as <span className="font-semibold text-ink">{session.username}</span>.
        </p>
        <Link
          href={session.role === "contractor" ? "/entry" : "/"}
          className="mt-4 inline-block rounded-lg bg-accent px-4 py-2 text-xs font-semibold text-white"
        >
          Continue
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[380px] py-16">
      <div className="text-center">
        <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-accent text-white">
          <HardHat size={22} strokeWidth={2.1} aria-hidden />
        </span>
        <h1 className="mt-4 text-xl font-semibold tracking-tight text-ink">Sign in</h1>
        <p className="mt-1 text-sm text-ink-secondary">
          Use the user ID and password the site office gave you — whether you run the site,
          manage a category, or report for one contractor.
        </p>
      </div>

      <form
        onSubmit={submit}
        className="mt-6 space-y-3 rounded-xl border border-hairline bg-surface-1 p-5"
      >
        <label className="flex flex-col gap-1">
          <span className="text-[11px] font-medium text-ink-muted">User ID</span>
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoComplete="username"
            autoCapitalize="none"
            spellCheck={false}
            className={field}
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-[11px] font-medium text-ink-muted">Password</span>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            className={field}
          />
        </label>

        {error && <p className="text-xs text-[var(--critical)]">{error}</p>}

        <button
          type="submit"
          disabled={busy}
          className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-accent px-4 py-2.5 text-xs font-semibold text-white disabled:opacity-60"
        >
          <LogIn size={14} strokeWidth={2.5} aria-hidden />
          {busy ? "Checking…" : "Sign in"}
        </button>
      </form>

      <p className="mt-4 text-center text-xs text-ink-muted">
        Lost your password? The site office can reset it under More.
      </p>
    </div>
  );
}

const field =
  "rounded-md border border-hairline bg-surface-2 px-3 py-2 text-sm text-ink " +
  "focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent";
