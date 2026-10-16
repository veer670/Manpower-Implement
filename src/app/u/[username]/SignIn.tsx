"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { HardHat, LogIn } from "lucide-react";
import * as auth from "@/lib/auth";
import { useAccess, useAuthReady } from "@/lib/useAuth";

/**
 * One person's own sign-in link: /u/prajapati.
 *
 * The site office hands this out with the password. It is the same sign-in as
 * /login with the user ID already filled in — a link, not a key: it carries no
 * secret, and the password is still checked on the server. What it saves is a
 * contractor on a phone typing an ID they half-remember.
 */
export default function SignIn({ username: raw }: { username: string }) {
  const router = useRouter();
  const username = auth.normaliseUsername(decodeURIComponent(raw));

  const ready = useAuthReady();
  const access = useAccess();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // The open door signs nobody in, so it must not count as being signed in here.
  const signedInAs = access.session && !access.open ? access.session : null;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      // Signing in replaces whoever was signed in before, so a shared site
      // phone can pass from one contractor to the next.
      const next = await auth.signIn(username, password);
      router.push(next.role === "contractor" ? "/entry" : "/");
    } catch (err) {
      // One message for a wrong ID and a wrong password alike: naming which
      // was wrong tells an outsider which IDs exist.
      setError(err instanceof Error ? err.message : "Could not sign in.");
    } finally {
      setBusy(false);
    }
  }

  if (ready && signedInAs?.username === username) {
    return (
      <Frame>
        <p className="text-sm text-ink-secondary">
          Signed in as <span className="font-semibold text-ink">{username}</span>.
        </p>
        <Link
          href={signedInAs.role === "contractor" ? "/entry" : "/"}
          className="mt-4 inline-block rounded-lg bg-accent px-4 py-2 text-xs font-semibold text-white"
        >
          {signedInAs.role === "contractor" ? "Enter my manpower" : "Continue"}
        </Link>
      </Frame>
    );
  }

  return (
    <div className="mx-auto max-w-[380px] px-5 py-16">
      <div className="text-center">
        <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-accent text-white">
          <HardHat size={22} strokeWidth={2.1} aria-hidden />
        </span>
        <h1 className="mt-4 text-xl font-semibold tracking-tight text-ink">
          Sign in as {username}
        </h1>
        <p className="mt-1 text-sm text-ink-secondary">
          Enter the password the site office gave you, then fill in your manpower for the
          day.
        </p>
      </div>

      <form
        onSubmit={submit}
        className="mt-6 space-y-3 rounded-xl border border-hairline bg-surface-1 p-5"
      >
        {/* Shown, not typed — but still submitted, so a password manager can
            tell one contractor's login from another's. */}
        <label className="flex flex-col gap-1">
          <span className="text-[11px] font-medium text-ink-muted">User ID</span>
          <input
            value={username}
            readOnly
            autoComplete="username"
            className="rounded-md border border-hairline bg-surface-2 px-3 py-2 text-sm font-semibold text-ink"
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-[11px] font-medium text-ink-muted">Password</span>
          <input
            type="password"
            autoFocus
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            className="rounded-md border border-hairline bg-surface-2 px-3 py-2 text-sm text-ink focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
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

        {signedInAs && (
          <p className="text-center text-xs text-ink-muted">
            Signed in as {signedInAs.username} just now — signing in here takes over from
            that.
          </p>
        )}
      </form>

      <p className="mt-4 text-center text-xs text-ink-muted">
        Wrong link? <Link href="/login" className="underline">Sign in with another user ID</Link>
        . Lost your password? The site office can reset it.
      </p>
    </div>
  );
}

function Frame({ children }: { children: React.ReactNode }) {
  return <div className="mx-auto max-w-[420px] px-5 py-20 text-center">{children}</div>;
}
