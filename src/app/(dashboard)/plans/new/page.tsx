"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Save } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PlanBuilder } from "@/components/plan-builder";
import type { PlanDefinition } from "@/engine";

type Payee = { id: string; externalId: string; name: string };

const EMPTY: PlanDefinition = {
  period: "quarterly",
  currency: "USD",
  components: [
    { id: "c1", type: "flat_rate", name: "Base commission", rate: 0.1, basis: "value" },
  ],
};

export default function NewPlanPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [definition, setDefinition] = useState<PlanDefinition>(EMPTY);
  const [payees, setPayees] = useState<Payee[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/payees")
      .then((r) => r.json())
      .then((d) => setPayees(d.payees ?? []));
  }, []);

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  async function save() {
    setSaving(true);
    setError(null);
    const res = await fetch("/api/plans", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        description,
        definition,
        assigneeExternalIds: [...selected],
      }),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) {
      setError(data.error ?? "Failed to create plan");
      return;
    }
    router.push(`/plans/${data.plan.id}`);
  }

  return (
    <>
      <PageHeader
        title="New plan"
        description="Define compensation rules and assign payees"
        actions={
          <Button onClick={save} disabled={saving || !name.trim()}>
            <Save className="h-4 w-4" /> {saving ? "Saving…" : "Create plan"}
          </Button>
        }
      />
      <div className="grid gap-6 p-8 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label>Plan name</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. 2026 AE Plan" />
              </div>
              <div className="space-y-1.5">
                <Label>Description</Label>
                <Input
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Optional"
                />
              </div>
            </CardContent>
          </Card>
          <PlanBuilder value={definition} onChange={setDefinition} />
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Assign payees</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {payees.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No payees yet. Import deals first — payees are created automatically.
                </p>
              ) : (
                payees.map((p) => (
                  <label key={p.id} className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={selected.has(p.externalId)}
                      onChange={() => toggle(p.externalId)}
                    />
                    {p.name}
                    <span className="text-xs text-muted-foreground">({p.externalId})</span>
                  </label>
                ))
              )}
            </CardContent>
          </Card>
          {error && (
            <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>
          )}
        </div>
      </div>
    </>
  );
}
