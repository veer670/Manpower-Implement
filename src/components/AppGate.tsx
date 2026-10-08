"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Database, HardHat, LogIn } from "lucide-react";
import type { ReactNode } from "react";
import { useStore } from "@/lib/store";
import { useAccess, useAuthReady } from "@/lib/useAuth";

/**
 * Stands in front of every screen.
 *
 * The roster now lives on a server, so there are three states the app can be
 * in before it has anything to show: still asking who you are, nobody signed
 * in, and reachable-but-unusable. The last one is almost always a deployment
 * whose database has not been attached, and saying so beats a blank page.
 */
export default function AppGate({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const ready = useAuthReady();
  const access = useAccess();
  const { status } = useStore();

  // The login page is the way out of being signed out; never gate it.
  if (pathname === "/login") return <>{children}</>;

  if (!ready) return <Splash>Loading…</Splash>;

  if (!access.session) {
    return (
      <Splash
        icon={<LogIn size={22} strokeWidth={2.1} aria-hidden />}
        title="Sign in to continue"
        action={{ href: "/login", label: "Go to sign in" }}
      >
        Use the user ID and password the site office gave you.
      </Splash>
    );
  }

  if (status.kind === "error") {
    return (
      <Splash
        icon={<Database size={22} strokeWidth={2.1} aria-hidden />}
        title="The roster is not available"
      >
        {status.message}
      </Splash>
    );
  }

  if (status.kind === "loading") return <Splash>Loading the roster…</Splash>;

  return <>{children}</>;
}

function Splash({
  icon,
  title,
  action,
  children,
}: {
  icon?: ReactNode;
  title?: string;
  action?: { href: string; label: string };
  children: ReactNode;
}) {
  return (
    <div className="mx-auto flex max-w-[420px] flex-col items-center px-5 py-24 text-center">
      <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent text-white">
        {icon ?? <HardHat size={22} strokeWidth={2.1} aria-hidden />}
      </span>
      {title && (
        <h1 className="mt-4 text-xl font-semibold tracking-tight text-ink">{title}</h1>
      )}
      <p className="mt-2 text-sm text-ink-secondary">{children}</p>
      {action && (
        <Link
          href={action.href}
          className="mt-5 rounded-lg bg-accent px-4 py-2 text-xs font-semibold text-white"
        >
          {action.label}
        </Link>
      )}
    </div>
  );
}
