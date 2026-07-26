"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCurrency, formatDate } from "@/lib/utils";

type Statement = {
  id: string;
  totalCommission: number;
  dealsCount: number;
  status: string;
  createdAt: string;
  payee: { name: string; externalId: string };
  run: { plan: { name: string }; periodStart: string; periodEnd: string };
};

const statusVariant = (s: string) =>
  s === "approved" ? "success" : s === "paid" ? "default" : "secondary";

export default function StatementsPage() {
  const [statements, setStatements] = useState<Statement[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/statements")
      .then((r) => r.json())
      .then((d) => setStatements(d.statements ?? []))
      .finally(() => setLoading(false));
  }, []);

  return (
    <>
      <PageHeader
        title="Statements"
        description="Per-rep breakdown of earned commissions"
      />
      <div className="p-8">
        <Card>
          <CardContent className="pt-6">
            {loading ? (
              <p className="py-8 text-center text-sm text-muted-foreground">Loading…</p>
            ) : statements.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                No statements yet. Run a calculation from a plan.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Payee</TableHead>
                    <TableHead>Plan</TableHead>
                    <TableHead>Period</TableHead>
                    <TableHead className="text-right">Deals</TableHead>
                    <TableHead className="text-right">Commission</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {statements.map((s) => (
                    <TableRow key={s.id}>
                      <TableCell>
                        <Link href={`/statements/${s.id}`} className="font-medium hover:underline">
                          {s.payee.name}
                        </Link>
                      </TableCell>
                      <TableCell>{s.run.plan.name}</TableCell>
                      <TableCell>
                        {formatDate(s.run.periodStart)} – {formatDate(s.run.periodEnd)}
                      </TableCell>
                      <TableCell className="text-right">{s.dealsCount}</TableCell>
                      <TableCell className="text-right font-semibold">
                        {formatCurrency(s.totalCommission)}
                      </TableCell>
                      <TableCell>
                        <Badge variant={statusVariant(s.status) as "success"}>{s.status}</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
