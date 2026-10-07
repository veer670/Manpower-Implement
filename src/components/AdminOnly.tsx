"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useAccess } from "@/lib/useAuth";

/**
 * Keeps a signed-in contractor out of the site-office screens. This is a
 * routing guard, not a security boundary — there is no server to enforce one.
 */
export default function AdminOnly({ children }: { children: ReactNode }) {
  const access = useAccess();
  if (access.canManageRoster) return <>{children}</>;

  return (
    <div className="mx-auto max-w-[700px] py-16 text-center">
      <h1 className="text-xl font-semibold tracking-tight text-ink">Not available</h1>
      <p className="mt-2 text-sm text-ink-secondary">
        This screen belongs to the site office. You can enter your own manpower instead.
      </p>
      <Link
        href="/entry"
        className="mt-5 inline-block rounded-lg bg-accent px-4 py-2 text-xs font-semibold text-white"
      >
        Go to my manpower
      </Link>
    </div>
  );
}
