import Link from "next/link";
import type { ReactNode } from "react";

import { ChartNoAxesColumn, CircleCheckBig, House, Wallet } from "lucide-react";

import { cn } from "@/lib/utils";

const navigation = [
  { href: "/dashboard", label: "Home", icon: House },
  { href: "/finance", label: "Finance", icon: Wallet },
  { href: "/chores", label: "Chores", icon: CircleCheckBig },
  { href: "/insights", label: "Insights", icon: ChartNoAxesColumn },
];

type AppShellProps = {
  children: ReactNode;
};

export function AppShell({ children }: AppShellProps) {
  return (
    <div className="mx-auto flex min-h-screen w-full max-w-md flex-col bg-[var(--color-surface)] shadow-[0_0_0_1px_rgba(15,23,42,0.06)] md:my-6 md:min-h-[calc(100vh-3rem)] md:overflow-hidden md:rounded-[32px]">
      <header className="border-b border-[var(--color-border)] px-5 py-4">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--color-muted)]">
          Phase 0 Foundation
        </p>
        <h1 className="mt-2 text-xl font-semibold text-[var(--color-foreground)]">
          Home Collaboration PWA
        </h1>
      </header>

      <main className="flex-1 overflow-y-auto px-5 py-6">{children}</main>

      <nav className="grid grid-cols-4 border-t border-[var(--color-border)] bg-white/90 px-2 py-3 backdrop-blur">
        {navigation.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex flex-col items-center gap-2 rounded-2xl px-2 py-3 text-[11px] font-medium text-[var(--color-muted)] transition hover:bg-[var(--color-panel)] hover:text-[var(--color-foreground)]",
            )}
          >
            <Icon className="size-4" strokeWidth={2.2} />
            <span>{label}</span>
          </Link>
        ))}
      </nav>
    </div>
  );
}
