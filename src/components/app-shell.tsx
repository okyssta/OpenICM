"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  LayoutDashboard,
  Handshake,
  ClipboardList,
  FileText,
  Wallet,
  ScrollText,
  Sun,
  Moon,
  Coins,
  LogOut,
  Webhook,
} from "lucide-react";
import { cn } from "@/lib/utils";

const nav = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/deals", label: "Deals", icon: Handshake },
  { href: "/events", label: "Events", icon: ScrollText },
  { href: "/plans", label: "Plans", icon: ClipboardList },
  { href: "/statements", label: "Statements", icon: FileText },
  { href: "/payouts", label: "Payouts", icon: Wallet },
  { href: "/webhooks", label: "Webhooks", icon: Webhook },
];

type PayeeSwitcherItem = {
  externalId: string;
  name: string;
  role: string;
};

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [dark, setDark] = useState(false);
  const [authEnabled, setAuthEnabled] = useState(true);
  const [payees, setPayees] = useState<PayeeSwitcherItem[]>([]);
  const [currentUser, setCurrentUser] = useState<string>("");

  useEffect(() => {
    setMounted(true);
    setDark(document.documentElement.classList.contains("dark"));
    fetch("/api/auth/me").catch(() => setAuthEnabled(false));
    // Load payees for switcher
    fetch("/api/payees/me")
      .then((r) => r.json())
      .then((d) => {
        if (d.payees) setPayees(d.payees);
        if (d.payee) setPayees([d.payee]);
      })
      .catch(() => {});
  }, []);

  function toggleTheme() {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    try { localStorage.setItem("theme", next ? "dark" : "light"); } catch {}
  }

  async function signOut() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  }

  return (
    <div className="flex min-h-screen">
      <aside className="sticky top-0 flex h-screen w-60 flex-col border-r border-border bg-card">
        <div className="flex h-16 items-center gap-2 border-b border-border px-6">
          <Coins className="h-6 w-6 text-primary" />
          <span className="text-lg font-bold tracking-tight">OpenICM</span>
        </div>
        <nav className="flex-1 space-y-1 p-3">
          {nav.map((item) => {
            const active = pathname?.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  active
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground"
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        {/* RBAC payee switcher */}
        {payees.length > 1 && (
          <div className="border-t border-border px-3 py-2">
            <label className="text-xs text-muted-foreground mb-1 block">View as</label>
            <select
              className="w-full rounded-md border border-input bg-card px-2 py-1.5 text-xs"
              value={currentUser}
              onChange={(e) => {
                const val = e.target.value;
                setCurrentUser(val);
                // Reload page with the X-User-External-Id header
                router.refresh();
              }}
            >
              <option value="">Admin (all)</option>
              {payees.map((p) => (
                <option key={p.externalId} value={p.externalId}>
                  {p.name} ({p.role})
                </option>
              ))}
            </select>
          </div>
        )}
        <div className="flex items-center justify-between border-t border-border p-4">
          <span className="text-xs text-muted-foreground">
            Open-source ICM<br />v0.2 — Stable
          </span>
          <div className="flex items-center gap-1">
            {mounted && authEnabled && (
              <button
                onClick={signOut}
                className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                aria-label="Sign out"
              >
                <LogOut className="h-4 w-4" />
              </button>
            )}
            {mounted && (
              <button
                onClick={toggleTheme}
                className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                aria-label="Toggle dark mode"
              >
                {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </button>
            )}
          </div>
        </div>
      </aside>
      <main className="flex-1 overflow-x-hidden">{children}</main>
    </div>
  );
}
