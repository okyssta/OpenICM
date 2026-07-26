"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus, ChevronRight } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";

type Plan = {
  id: string;
  name: string;
  description: string | null;
  active: boolean;
  createdAt: string;
  latestVersion: number;
  assignmentCount: number;
  definition: { period: string; components: unknown[] } | null;
};

export default function PlansPage() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/plans")
      .then((r) => r.json())
      .then((d) => setPlans(d.plans ?? []))
      .finally(() => setLoading(false));
  }, []);

  return (
    <>
      <PageHeader
        title="Plans"
        description="Compensation plans and their rule versions"
        actions={
          <Link href="/plans/new">
            <Button>
              <Plus className="h-4 w-4" /> New plan
            </Button>
          </Link>
        }
      />
      <div className="p-8">
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : plans.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-sm text-muted-foreground">
              No plans yet. Create your first compensation plan.
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {plans.map((p) => (
              <Link key={p.id} href={`/plans/${p.id}`}>
                <Card className="transition-colors hover:bg-muted/40">
                  <CardContent className="flex items-center justify-between py-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">{p.name}</span>
                        <Badge variant="outline">v{p.latestVersion}</Badge>
                        {!p.active && <Badge variant="secondary">inactive</Badge>}
                      </div>
                      <div className="mt-1 text-xs text-muted-foreground">
                        {p.definition?.period ?? "—"} · {p.definition?.components.length ?? 0}{" "}
                        component(s) · {p.assignmentCount} payee(s) · created{" "}
                        {formatDate(p.createdAt)}
                      </div>
                    </div>
                    <ChevronRight className="h-5 w-5 text-muted-foreground" />
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
