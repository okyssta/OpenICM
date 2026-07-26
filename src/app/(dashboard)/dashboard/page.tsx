"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Handshake, Users, ClipboardList, Wallet } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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

function Stat({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string | number;
  icon: React.ElementType;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
      </CardContent>
    </Card>
  );
}

export default function DashboardPage() {
  const [deals, setDeals] = useState(0);
  const [payees, setPayees] = useState(0);
  const [plans, setPlans] = useState(0);
  const [statements, setStatements] = useState<Statement[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/deals").then((r) => r.json()),
      fetch("/api/payees").then((r) => r.json()),
      fetch("/api/plans").then((r) => r.json()),
      fetch("/api/statements").then((r) => r.json()),
    ])
      .then(([d, p, pl, s]) => {
        setDeals(d.count ?? 0);
        setPayees(p.payees?.length ?? 0);
        setPlans(pl.plans?.length ?? 0);
        setStatements(s.statements?.slice(0, 8) ?? []);
      })
      .finally(() => setLoading(false));
  }, []);

  const totalPaid = statements.reduce((s, x) => s + x.totalCommission, 0);

  return (
    <>
      <PageHeader
        title="Dashboard"
        description="Overview of your compensation operation"
      />
      <div className="space-y-6 p-8">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Stat label="Deals ingested" value={loading ? "—" : deals} icon={Handshake} />
          <Stat label="Payees" value={loading ? "—" : payees} icon={Users} />
          <Stat label="Plans" value={loading ? "—" : plans} icon={ClipboardList} />
          <Stat
            label="Latest statements"
            value={loading ? "—" : formatCurrency(totalPaid)}
            icon={Wallet}
          />
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Recent statements</CardTitle>
          </CardHeader>
          <CardContent>
            {statements.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                No statements yet. Import deals, create a plan, and run a calculation.
              </p>
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
      </div>
    </>
  );
}
