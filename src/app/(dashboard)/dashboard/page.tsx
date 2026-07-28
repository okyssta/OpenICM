"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Handshake, Users, ClipboardList, Wallet, Plus, Play, TrendingUp } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CardSkeleton, TableSkeleton } from "@/components/ui/skeleton";
import { formatCurrency, formatDate } from "@/lib/utils";

type Statement = {
  id: string;
  totalCommission: number;
  dealsCount: number;
  status: string;
  createdAt: string;
  payee: { name: string };
  run: { plan: { name: string }; periodStart: string; periodEnd: string };
};

type Run = {
  id: string;
  periodStart: string;
  periodEnd: string;
  plan: { name: string };
  _count: { statements: number };
};

type Stats = {
  deals: number;
  payees: number;
  plans: number;
  statements: number;
};

function Stat({ label, value, icon: Icon, loading }: { label: string; value: string | number; icon: React.ElementType; loading?: boolean }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="h-8 w-24 animate-pulse rounded bg-muted" />
        ) : (
          <div className="text-2xl font-bold">{value}</div>
        )}
      </CardContent>
    </Card>
  );
}

export default function DashboardPage() {
  const [deals, setDeals] = useState(0);
  const [payees, setPayees] = useState(0);
  const [plans, setPlans] = useState(0);
  const [statements, setStatements] = useState<Statement[]>([]);
  const [runs, setRuns] = useState<Run[]>([]);
  const [loading, setLoading] = useState(true);
  const [runsLoading, setRunsLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/deals").then((r) => r.json()),
      fetch("/api/payees").then((r) => r.json()),
      fetch("/api/plans").then((r) => r.json()),
      fetch("/api/statements").then((r) => r.json()),
      fetch("/api/runs").then((r) => r.json()),
    ])
      .then(([d, p, pl, s, r]) => {
        setDeals(d.count ?? 0);
        setPayees(p.payees?.length ?? 0);
        setPlans(pl.plans?.length ?? 0);
        setStatements(s.statements?.slice(0, 8) ?? []);
        setRuns(r.runs ?? []);
      })
      .finally(() => setLoading(false));
  }, []);

  const totalPaid = statements.reduce((s, x) => s + x.totalCommission, 0);
  const hasData = deals > 0 || payees > 0 || plans > 0;

  return (
    <>
      <PageHeader
        title="Dashboard"
        description="Overview of your compensation operation"
      />
      <div className="space-y-6 p-8">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Stat label="Deals ingested" value={loading ? "—" : deals} icon={Handshake} loading={loading} />
          <Stat label="Payees" value={loading ? "—" : payees} icon={Users} loading={loading} />
          <Stat label="Plans" value={loading ? "—" : plans} icon={ClipboardList} loading={loading} />
          <Stat
            label="Latest statements"
            value={loading ? "—" : formatCurrency(totalPaid)}
            icon={Wallet}
            loading={loading}
          />
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Recent statements</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <TableSkeleton rows={3} />
            ) : statements.length === 0 ? (
              <div className="py-8 text-center">
                <p className="text-sm text-muted-foreground mb-4">
                  No statements yet. Import deals, create a plan, and run a calculation.
                </p>
                <div className="flex items-center justify-center gap-3">
                  <Link href="/deals">
                    <Button variant="outline" size="sm">
                      <Plus className="h-4 w-4" /> Import deals
                    </Button>
                  </Link>
                  <Link href="/plans/new">
                    <Button variant="outline" size="sm">
                      <ClipboardList className="h-4 w-4" /> Create plan
                    </Button>
                  </Link>
                  {plans > 0 && (
                    <Link href="/plans">
                      <Button size="sm">
                        <Play className="h-4 w-4" /> Run calculation
                      </Button>
                    </Link>
                  )}
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                {statements.map((s) => (
                  <Link
                    key={s.id}
                    href={`/statements/${s.id}`}
                    className="flex items-center justify-between rounded-md border border-border px-4 py-3 transition-colors hover:bg-muted/50"
                  >
                    <div>
                      <div className="font-medium">{s.payee.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {s.run.plan.name} · {formatDate(s.run.periodStart)} –{" "}
                        {formatDate(s.run.periodEnd)} · {s.dealsCount} deals
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-semibold">
                        {formatCurrency(s.totalCommission)}
                      </span>
                      <Badge variant={s.status === "approved" ? "success" : "secondary"}>
                        {s.status}
                      </Badge>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Forecast / trend card */}
        {runs.length > 1 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4" /> Commission trend
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {runs.slice(0, 6).map((r) => (
                  <Link
                    key={r.id}
                    href="/payouts"
                    className="flex items-center justify-between rounded-md border border-border px-4 py-2 text-sm transition-colors hover:bg-muted/50"
                  >
                    <span className="text-muted-foreground">
                      {formatDate(r.periodStart)} – {formatDate(r.periodEnd)}
                    </span>
                    <span className="font-medium">{r.plan.name}</span>
                    <span className="text-xs text-muted-foreground">{r._count.statements} payee(s)</span>
                  </Link>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </>
  );
}
