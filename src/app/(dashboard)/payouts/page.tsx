"use client";

import { useEffect, useState } from "react";
import { Download, BookOpen } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDate } from "@/lib/utils";

type Run = {
  id: string;
  status: string;
  createdAt: string;
  periodStart: string;
  periodEnd: string;
  plan: { name: string };
  _count: { statements: number; lines: number };
};

export default function PayoutsPage() {
  const [runs, setRuns] = useState<Run[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/runs")
      .then((r) => r.json())
      .then((d) => setRuns(d.runs ?? []))
      .finally(() => setLoading(false));
  }, []);

  return (
    <>
      <PageHeader
        title="Payouts"
        description="Calculation runs and payroll export"
      />
      <div className="p-8">
        <Card>
          <CardContent className="pt-6">
            {loading ? (
              <p className="py-8 text-center text-sm text-muted-foreground">Loading…</p>
            ) : runs.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                No calculation runs yet. Run a calculation from a plan.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Plan</TableHead>
                    <TableHead>Period</TableHead>
                    <TableHead className="text-right">Payees</TableHead>
                    <TableHead className="text-right">Lines</TableHead>
                    <TableHead>Ran</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Export</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {runs.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="font-medium">{r.plan.name}</TableCell>
                      <TableCell>
                        {formatDate(r.periodStart)} – {formatDate(r.periodEnd)}
                      </TableCell>
                      <TableCell className="text-right">{r._count.statements}</TableCell>
                      <TableCell className="text-right">{r._count.lines}</TableCell>
                      <TableCell>{formatDate(r.createdAt)}</TableCell>
                      <TableCell>
                        <Badge variant={r.status === "completed" ? "success" : "secondary"}>
                          {r.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <a href={`/api/payouts/export?runId=${r.id}`} download>
                            <Button size="sm" variant="outline">
                              <Download className="h-4 w-4" />
                            </Button>
                          </a>
                          <a href={`/api/payouts/gl?runId=${r.id}`} download>
                            <Button size="sm" variant="outline">
                              <BookOpen className="h-4 w-4" />
                            </Button>
                          </a>
                        </div>
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
