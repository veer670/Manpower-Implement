"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ClipboardList,
  HardHat,
  KeyRound,
  LayoutDashboard,
  LogIn,
  LogOut,
  MoreHorizontal,
  Users,
} from "lucide-react";
import ThemeToggle from "./ThemeToggle";
import AppGate from "./AppGate";
import * as auth from "@/lib/auth";
import { useAccess, useSession } from "@/lib/useAuth";
import { useStore } from "@/lib/store";
import { num } from "@/lib/format";

const ADMIN_NAV = [
  { href: "/", label: "Dashboard", Icon: LayoutDashboard },
  { href: "/entry", label: "Daily entry", Icon: ClipboardList },
  { href: "/roster", label: "Roster", Icon: Users },
  { href: "/users", label: "More", Icon: MoreHorizontal },
];

const CONTRACTOR_NAV = [{ href: "/entry", label: "My manpower", Icon: ClipboardList }];

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { data } = useStore();
  const session = useSession();

  const access = useAccess();
  // An admin login manages the roster but not the login list.
  const nav = access.canManageRoster
    ? ADMIN_NAV.filter((n) => n.href !== "/users" || access.canManageLogins)
    : CONTRACTOR_NAV;
  const contractor = session
    ? data.contractors.find((c) => c.id === session.contractorId)
    : undefined;

  // The sign-in page is its own thing — no shell chrome around it.
  if (pathname === "/login") {
    return (
      <div className="min-h-full">
        <div className="flex justify-end p-4">
          <ThemeToggle />
        </div>
        <main>{children}</main>
      </div>
    );
  }

  return (
    <div className="flex min-h-full">
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r border-hairline bg-surface-1 p-4 lg:flex">
        <div className="flex items-center gap-2 px-1 py-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent text-white">
            <HardHat size={17} strokeWidth={2.2} aria-hidden />
          </span>
          <div className="leading-tight">
            <p className="text-sm font-semibold text-ink">Manpower</p>
            <p className="text-[11px] text-ink-muted">Implementation</p>
          </div>
        </div>

        <nav className="mt-6 flex flex-col gap-0.5">
          {nav.map(({ href, label, Icon }) => {
            const active = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? "page" : undefined}
                className={`flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm transition-colors ${
                  active
                    ? "bg-surface-2 font-semibold text-ink"
                    : "text-ink-secondary hover:bg-surface-2 hover:text-ink"
                }`}
              >
                <Icon size={16} strokeWidth={2} aria-hidden />
                {label}
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto space-y-2">
          {session ? (
            <div className="rounded-lg border border-hairline bg-surface-2 p-3">
              <p className="text-[11px] font-medium text-ink-muted">Signed in</p>
              <p className="mt-1 truncate text-xs font-semibold text-ink">
                {session.role === "contractor"
                  ? (contractor?.name ?? session.username)
                  : session.username}
              </p>
              <p className="mt-0.5 truncate text-[11px] text-ink-secondary">
                {session.role === "office"
                  ? "Site office"
                  : session.role === "admin"
                    ? `Admin · ${session.category ?? "All categories"}`
                    : `${contractor?.category ?? ""} / ${contractor?.type ?? ""}`}
              </p>
              <button
                onClick={() => auth.signOut()}
                className="mt-2.5 flex w-full items-center justify-center gap-1.5 rounded-md border border-hairline bg-surface-1 px-2 py-1.5 text-xs font-semibold text-ink-secondary hover:text-ink"
              >
                <LogOut size={13} strokeWidth={2.3} aria-hidden />
                Sign out
              </button>
            </div>
          ) : (
            <>
              <div className="rounded-lg border border-hairline bg-surface-2 p-3">
                <p className="text-[11px] font-medium text-ink-muted">Roster</p>
                <p className="mt-1 truncate text-xs font-semibold text-ink" title={data.source}>
                  {data.source}
                </p>
                <p className="mt-0.5 text-[11px] text-ink-secondary">
                  {num(data.contractors.length)} contractors
                </p>
              </div>
              <Link
                href="/login"
                className="flex items-center justify-center gap-1.5 rounded-lg border border-hairline bg-surface-2 px-2 py-2 text-xs font-semibold text-ink-secondary hover:text-ink"
              >
                <LogIn size={13} strokeWidth={2.3} aria-hidden />
                Sign in
              </Link>
            </>
          )}
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-10 flex items-center justify-between gap-4 border-b border-hairline bg-plane/90 px-5 py-3 backdrop-blur">
          <nav className="flex items-center gap-1 lg:hidden">
            {nav.map(({ href, label, Icon }) => {
              const active = pathname === href;
              return (
                <Link
                  key={href}
                  href={href}
                  aria-current={active ? "page" : undefined}
                  aria-label={label}
                  title={label}
                  className={`flex h-8 w-8 items-center justify-center rounded-lg ${
                    active ? "bg-surface-2 text-ink" : "text-ink-muted"
                  }`}
                >
                  <Icon size={16} strokeWidth={2} aria-hidden />
                </Link>
              );
            })}
            {session ? (
              <button
                onClick={() => auth.signOut()}
                aria-label="Sign out"
                title="Sign out"
                className="flex h-8 w-8 items-center justify-center rounded-lg text-ink-muted"
              >
                <LogOut size={16} strokeWidth={2} aria-hidden />
              </button>
            ) : (
              <Link
                href="/login"
                aria-label="Sign in"
                title="Sign in"
                className="flex h-8 w-8 items-center justify-center rounded-lg text-ink-muted"
              >
                <KeyRound size={16} strokeWidth={2} aria-hidden />
              </Link>
            )}
          </nav>
          <div className="hidden lg:block" />
          <ThemeToggle />
        </header>

        <main className="min-w-0 flex-1 p-5">
          <AppGate>{children}</AppGate>
        </main>
      </div>
    </div>
  );
}
