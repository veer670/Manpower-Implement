"use client";

import Link from "next/link";
import { ShieldAlert } from "lucide-react";
import Card from "@/components/Card";
import UserCreate from "@/components/UserCreate";
import { useSession } from "@/lib/useAuth";

export default function UsersPage() {
  const session = useSession();

  // A signed-in contractor has no business here.
  if (session) {
    return (
      <div className="mx-auto max-w-[700px] py-16 text-center">
        <h1 className="text-xl font-semibold tracking-tight text-ink">Not available</h1>
        <p className="mt-2 text-sm text-ink-secondary">
          Logins are managed by the site office.
        </p>
        <Link
          href="/entry"
          className="mt-5 inline-block rounded-lg bg-series-1 px-4 py-2 text-xs font-semibold text-white"
        >
          Back to my manpower
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1000px] space-y-5">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-ink">User create</h1>
        <p className="mt-1 text-sm text-ink-secondary">
          Give a contractor a user ID and password. They can then sign in and enter their
          own manpower — and only their own.
        </p>
      </div>

      <div className="flex gap-2.5 rounded-xl border border-hairline bg-surface-1 p-4">
        <ShieldAlert
          size={16}
          strokeWidth={2.2}
          style={{ color: "var(--warning)" }}
          className="mt-0.5 shrink-0"
          aria-hidden
        />
        <div className="text-xs">
          <p className="font-semibold text-ink">These logins separate roles, not data</p>
          <p className="mt-0.5 text-ink-secondary">
            Everything runs in the browser, with no server to check a password against.
            A login controls what someone sees and can edit, which is real and useful —
            but anyone with access to this machine&rsquo;s browser can still read the
            underlying data. Passwords are stored hashed, never in plain text. Proper
            protection needs a backend.
          </p>
        </div>
      </div>

      <Card
        title="Logins"
        subtitle="One per contractor. Passwords are shown once, at the moment they are issued."
      >
        <UserCreate />
      </Card>
    </div>
  );
}
