"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ClipboardList, HardHat, LayoutDashboard, Users } from "lucide-react";
import ThemeToggle from "./ThemeToggle";
import { useStore } from "@/lib/store";
import { num } from "@/lib/format";

const NAV = [
  { href: "/", label: "Dashboard", Icon: LayoutDashboard },
  { href: "/entry", label: "Daily entry", Icon: ClipboardList },
  { href: "/roster", label: "Roster", Icon: Users },
];

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { data } = useStore();

  return (
    <div className="flex min-h-full">
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r border-hairline bg-surface-1 p-4 lg:flex">
        <div className="flex items-center gap-2 px-1 py-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-series-1 text-white">
            <HardHat size={17} strokeWidth={2.2} aria-hidden />
          </span>
          <div className="leading-tight">
            <p className="text-sm font-semibold text-ink">Manpower</p>
            <p className="text-[11px] text-ink-muted">Implementation</p>
          </div>
        </div>

        <nav className="mt-6 flex flex-col gap-0.5">
          {NAV.map(({ href, label, Icon }) => {
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

        <div className="mt-auto rounded-lg border border-hairline bg-surface-2 p-3">
          <p className="text-[11px] font-medium text-ink-muted">Roster</p>
          <p className="mt-1 truncate text-xs font-semibold text-ink" title={data.source}>
            {data.source}
          </p>
          <p className="mt-0.5 text-[11px] text-ink-secondary">
            {num(data.contractors.length)} contractors
          </p>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-10 flex items-center justify-between gap-4 border-b border-hairline bg-plane/90 px-5 py-3 backdrop-blur">
          <nav className="flex items-center gap-1 lg:hidden">
            {NAV.map(({ href, label, Icon }) => {
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
          </nav>
          <div className="hidden lg:block" />
          <ThemeToggle />
        </header>

        <main className="min-w-0 flex-1 p-5">{children}</main>
      </div>
    </div>
  );
}
