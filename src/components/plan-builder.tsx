"use client";

import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type {
  PlanDefinition,
  PlanComponent,
  Tier,
  RuleFilter,
  RuleOp,
} from "@/engine";

function uid() {
  return typeof crypto !== "undefined" ? crypto.randomUUID() : Math.random().toString(36).slice(2);
}

type Props = {
  value: PlanDefinition;
  onChange: (def: PlanDefinition) => void;
};

const OPS: RuleOp[] = ["eq", "neq", "gt", "gte", "lt", "lte", "in"];

function pct(rate: number): string {
  return String(Math.round(rate * 10000) / 100);
}

export function PlanBuilder({ value, onChange }: Props) {
  function patch(p: Partial<PlanDefinition>) {
    onChange({ ...value, ...p });
  }

  function updateComponent(id: string, c: PlanComponent) {
    patch({ components: value.components.map((x) => (x.id === id ? c : x)) });
  }

  function removeComponent(id: string) {
    patch({ components: value.components.filter((x) => x.id !== id) });
  }

  function addComponent(type: PlanComponent["type"]) {
    const base = { id: uid(), name: "New component", basis: "value" };
    let c: PlanComponent;
    if (type === "flat_rate") c = { ...base, type, rate: 0.1 };
    else if (type === "tiered_rate")
      c = { ...base, type, mode: "marginal", tiers: [{ upTo: null, rate: 0.1 }] };
    else c = { ...base, type, quota: 100000, bands: [{ upTo: 1, rate: 0.08 }, { upTo: null, rate: 0.12 }] };
    patch({ components: [...value.components, c] });
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Plan settings</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>Period</Label>
            <Select
              value={value.period}
              onChange={(e) => patch({ period: e.target.value as PlanDefinition["period"] })}
            >
              <option value="monthly">Monthly</option>
              <option value="quarterly">Quarterly</option>
              <option value="annual">Annual</option>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Currency</Label>
            <Input
              value={value.currency}
              onChange={(e) => patch({ currency: e.target.value.toUpperCase() })}
            />
          </div>
        </CardContent>
      </Card>

      {value.components.map((c) => (
        <ComponentEditor
          key={c.id}
          component={c}
          onChange={(next) => updateComponent(c.id, next)}
          onRemove={() => removeComponent(c.id)}
        />
      ))}

      <div className="flex flex-wrap gap-2">
        <Button variant="outline" size="sm" onClick={() => addComponent("flat_rate")}>
          <Plus className="h-4 w-4" /> Flat rate
        </Button>
        <Button variant="outline" size="sm" onClick={() => addComponent("tiered_rate")}>
          <Plus className="h-4 w-4" /> Tiered rate
        </Button>
        <Button variant="outline" size="sm" onClick={() => addComponent("quota_attainment")}>
          <Plus className="h-4 w-4" /> Quota attainment
        </Button>
      </div>
    </div>
  );
}

function ComponentEditor({
  component: c,
  onChange,
  onRemove,
}: {
  component: PlanComponent;
  onChange: (c: PlanComponent) => void;
  onRemove: () => void;
}) {
  const typeLabel =
    c.type === "flat_rate" ? "Flat rate" : c.type === "tiered_rate" ? "Tiered rate" : "Quota attainment";

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-base">{typeLabel}</CardTitle>
        <Button variant="ghost" size="icon" onClick={onRemove}>
          <Trash2 className="h-4 w-4 text-destructive" />
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>Name</Label>
            <Input value={c.name} onChange={(e) => onChange({ ...c, name: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label>Basis field</Label>
            <Input value={c.basis} onChange={(e) => onChange({ ...c, basis: e.target.value })} />
          </div>
        </div>

        {c.type === "flat_rate" && (
          <div className="space-y-1.5 sm:w-1/2">
            <Label>Rate (%)</Label>
            <Input
              type="number"
              step="0.01"
              value={pct(c.rate)}
              onChange={(e) => onChange({ ...c, rate: Number(e.target.value) / 100 })}
            />
          </div>
        )}

        {c.type === "tiered_rate" && (
          <>
            <div className="sm:w-1/2 space-y-1.5">
              <Label>Mode</Label>
              <Select
                value={c.mode}
                onChange={(e) => onChange({ ...c, mode: e.target.value as "marginal" | "retroactive" })}
              >
                <option value="marginal">Marginal (progressive)</option>
                <option value="retroactive">Retroactive (whole total)</option>
              </Select>
            </div>
            <TierEditor
              label="Tiers (cumulative basis)"
              upToLabel="Up to"
              tiers={c.tiers}
              onChange={(tiers) => onChange({ ...c, tiers })}
            />
          </>
        )}

        {c.type === "quota_attainment" && (
          <>
            <div className="sm:w-1/2 space-y-1.5">
              <Label>Quota</Label>
              <Input
                type="number"
                value={c.quota}
                onChange={(e) => onChange({ ...c, quota: Number(e.target.value) })}
              />
            </div>
            <TierEditor
              label="Bands (attainment ratio, e.g. 1 = 100%)"
              upToLabel="Up to ratio"
              tiers={c.bands}
              onChange={(bands) => onChange({ ...c, bands })}
            />
          </>
        )}

        <FilterEditor
          filters={c.filters ?? []}
          onChange={(filters) => onChange({ ...c, filters })}
        />
      </CardContent>
    </Card>
  );
}

function TierEditor({
  label,
  upToLabel,
  tiers,
  onChange,
}: {
  label: string;
  upToLabel: string;
  tiers: Tier[];
  onChange: (tiers: Tier[]) => void;
}) {
  function update(i: number, t: Tier) {
    onChange(tiers.map((x, idx) => (idx === i ? t : x)));
  }
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="space-y-2">
        {tiers.map((t, i) => (
          <div key={i} className="flex items-center gap-2">
            <Input
              className="flex-1"
              type="number"
              placeholder="∞ (no cap)"
              value={t.upTo ?? ""}
              onChange={(e) =>
                update(i, { ...t, upTo: e.target.value === "" ? null : Number(e.target.value) })
              }
            />
            <span className="text-xs text-muted-foreground">{upToLabel}</span>
            <Input
              className="w-32"
              type="number"
              step="0.01"
              value={pct(t.rate)}
              onChange={(e) => update(i, { ...t, rate: Number(e.target.value) / 100 })}
            />
            <span className="text-xs text-muted-foreground">%</span>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onChange(tiers.filter((_, idx) => idx !== i))}
              disabled={tiers.length === 1}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </div>
      <Button
        variant="outline"
        size="sm"
        onClick={() => onChange([...tiers, { upTo: null, rate: 0.1 }])}
      >
        <Plus className="h-4 w-4" /> Add tier
      </Button>
    </div>
  );
}

function FilterEditor({
  filters,
  onChange,
}: {
  filters: RuleFilter[];
  onChange: (f: RuleFilter[]) => void;
}) {
  function update(i: number, f: RuleFilter) {
    onChange(filters.map((x, idx) => (idx === i ? f : x)));
  }
  return (
    <div className="space-y-2 rounded-md border border-dashed border-border p-3">
      <Label className="text-xs uppercase text-muted-foreground">Filters (optional)</Label>
      {filters.map((f, i) => (
        <div key={i} className="flex items-center gap-2">
          <Input
            className="flex-1"
            placeholder="field"
            value={f.field}
            onChange={(e) => update(i, { ...f, field: e.target.value })}
          />
          <Select
            className="w-24"
            value={f.op}
            onChange={(e) => update(i, { ...f, op: e.target.value as RuleOp })}
          >
            {OPS.map((op) => (
              <option key={op} value={op}>
                {op}
              </option>
            ))}
          </Select>
          <Input
            className="flex-1"
            placeholder="value"
            value={String(f.value ?? "")}
            onChange={(e) => {
              const raw = e.target.value;
              const n = Number(raw);
              update(i, { ...f, value: raw !== "" && Number.isFinite(n) && /^-?\d+(\.\d+)?$/.test(raw) ? n : raw });
            }}
          />
          <Button variant="ghost" size="icon" onClick={() => onChange(filters.filter((_, idx) => idx !== i))}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ))}
      <Button
        variant="outline"
        size="sm"
        onClick={() => onChange([...filters, { field: "type", op: "eq", value: "new" }])}
      >
        <Plus className="h-4 w-4" /> Add filter
      </Button>
    </div>
  );
}
