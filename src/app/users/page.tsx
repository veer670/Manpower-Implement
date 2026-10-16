"use client";

import Link from "next/link";
import { ShieldAlert } from "lucide-react";
import Card from "@/components/Card";
import UserCreate from "@/components/UserCreate";
import { useAccess } from "@/lib/useAuth";

export default function UsersPage() {
  const access = useAccess();

  // Logins are the site office's to issue, not an admin login's.
  if (!access.canManageLogins) {
    return (
      <div className="mx-auto max-w-[700px] py-16 text-center">
        <h1 className="text-xl font-semibold tracking-tight text-ink">Not available</h1>
        <p className="mt-2 text-sm text-ink-secondary">
          Logins are managed by the site office.
        </p>
        <Link
          href="/entry"
          className="mt-5 inline-block rounded-lg bg-accent px-4 py-2 text-xs font-semibold text-white"
        >
          Back to my manpower
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1000px] space-y-5">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-ink">More</h1>
        <p className="mt-1 text-sm text-ink-secondary">
          Logins and the link that goes with each one. Give someone their user ID,
          password and link, and they sign in to enter their own manpower — a contractor
          their own row, an admin their own department.
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
          <p className="font-semibold text-ink">The main link is still open to anyone</p>
          <p className="mt-0.5 text-ink-secondary">
            A login is checked on the server, and what it may read and change is enforced
            there — a contractor login can only save its own row. But this site is also
            set to let anyone who has the plain address in without signing in, as the site
            office. Set <code className="font-semibold">REQUIRE_LOGIN=1</code> in the
            deployment&rsquo;s environment variables to close that door, and these logins
            become the only way in.
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
