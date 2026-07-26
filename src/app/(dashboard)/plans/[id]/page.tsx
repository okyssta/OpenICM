"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Play, Save, History } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PlanBuilder } from "@/components/plan-builder";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { PlanDefinition } from "@/engine";

type Payee = { id: string; externalId: string; name: string };
type Version = { id: string; version: number; note: string | null; createdAt: string };
type ResultStatement = {
  id: string;
  totalCommission: number;
  dealsCount: number;
  payee: { name: string };
};

export default function PlanDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = params.id;

  const [name, setName] = useState("");
  const [definition, setDefinition] = useState<PlanDefinition | null>(null);
  const [versions, setVersions] = useState<Version[]>([]);
  const [allPayees, setAllPayees] = useState<Payee[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [periodStart, setPeriodStart] = useState("");
  const [periodEnd, setPeriodEnd] = useState("");
  const [running, setRunning] = useState(false);
  const [saving, setSaving] = useState(false);
  const [results, setResults] = useState<ResultStatement[] | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  function load() {
    fetch(`/api/plans/${id}`)
      .then((r) => r.json())
      .then((d) => {
        const plan = d.plan;
        setName(plan.name);
        setVersions(plan.versions);
        const latest = plan.versions[0];
        if (latest) setDefinition(latest.definition as PlanDefinition);
        setSelected(new Set(plan.assignments.map((a: { payee: Payee }) => a.payee.externalId)));
      });
    fetch("/api/payees")
      .then((r) => r.json())
      .then((d) => setAllPayees(d.payees ?? []));
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  function toggle(ext: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(ext) ? next.delete(ext) : next.add(ext);
      return next;
    });
  }

  async function saveVersion() {
    setSaving(true);
    setMessage(null);
    const res = await fetch(`/api/plans/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        definition,
        assigneeExternalIds: [...selected],
        note: "Updated via plan builder",
      }),
    });
    setSaving(false);
    if (res.ok) {
      setMessage("Saved new plan version.");
      load();
    } else {
      const d = await res.json();
      setMessage(`Error: ${d.error ?? "save failed"}`);
    }
  }

  async function run() {
    setRunning(true);
    setMessage(null);
    setResults(null);
    const body: Record<string, string> = {};
    if (periodStart) body.periodStart = periodStart;
    if (periodEnd) body.periodEnd = periodEnd;
    const res = await fetch(`/api/plans/${id}/calculate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    setRunning(false);
    if (!res.ok) {
      setMessage(`Error: ${data.error ?? "calculation failed"}`);
      return;
    }
    setResults(data.statements ?? []);
    setMessage(`Calculation complete — ${data.statements?.length ?? 0} statement(s) generated.`);
  }

  if (!definition) {
    return <p className="p-8 text-sm text-muted-foreground">Loading…</p>;
  }

  return (
    <>
      <PageHeader
        title={name || "Plan"}
        description={`Latest version: v${versions[0]?.version ?? 0}`}
        actions={
          <Button onClick={saveVersion} disabled={saving}>
            <Save className="h-4 w-4" /> {saving ? "Saving…" : "Save new version"}
          </Button>
        }
      />
      <div className="grid gap-6 p-8 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <div className="space-y-1.5">
            <Label>Plan name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <PlanBuilder value={definition} onChange={setDefinition} />
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Play className="h-4 w-4" /> Run calculation
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-1.5">
                <Label>Period start</Label>
                <Input type="date" value={periodStart} onChange={(e) => setPeriodStart(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Period end</Label>
                <Input type="date" value={periodEnd} onChange={(e) => setPeriodEnd(e.target.value)} />
              </div>
              <p className="text-xs text-muted-foreground">
                Leave blank to use the current {definition.period} period.
              </p>
              <Button className="w-full" onClick={run} disabled={running}>
                {running ? "Calculating…" : "Calculate commissions"}
              </Button>
              {results && results.length > 0 && (
                <div className="space-y-1 border-t border-border pt-3">
                  {results.map((s) => (
                    <Link
                      key={s.id}
                      href={`/statements/${s.id}`}
                      className="flex justify-between text-sm hover:underline"
                    >
                      <span>{s.payee.name}</span>
                      <span className="font-medium">{formatCurrency(s.totalCommission)}</span>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Assign payees</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {allPayees.length === 0 ? (
                <p className="text-sm text-muted-foreground">No payees available.</p>
              ) : (
                allPayees.map((p) => (
                  <label key={p.id} className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={selected.has(p.externalId)}
                      onChange={() => toggle(p.externalId)}
                    />
                    {p.name}
                  </label>
                ))
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <History className="h-4 w-4" /> Version history
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {versions.map((v, i) => (
                <div key={v.id} className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2">
                    <Badge variant={i === 0 ? "default" : "outline"}>v{v.version}</Badge>
                    {v.note ?? "—"}
                  </span>
                  <span className="text-xs text-muted-foreground">{formatDate(v.createdAt)}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
      {message && (
        <div className="px-8 pb-8">
          <p className="rounded-md bg-muted px-3 py-2 text-sm text-muted-foreground">{message}</p>
        </div>
      )}
    </>
  );
}
