import type { DealSnapshot, RuleFilter } from "./types";

export function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

export function numericBasis(deal: DealSnapshot, field: string): number {
  const raw = deal.fields[field];
  const n = typeof raw === "number" ? raw : Number(raw);
  return Number.isFinite(n) ? n : 0;
}

export function matchesFilters(
  deal: DealSnapshot,
  filters: RuleFilter[] | undefined
): boolean {
  if (!filters || filters.length === 0) return true;
  return filters.every((f) => matchFilter(deal, f));
}

function matchFilter(deal: DealSnapshot, f: RuleFilter): boolean {
  const actual = deal.fields[f.field];
  switch (f.op) {
    case "eq":
      return actual === f.value;
    case "neq":
      return actual !== f.value;
    case "in":
      return Array.isArray(f.value) && f.value.includes(actual);
    case "gt":
      return num(actual) > num(f.value);
    case "gte":
      return num(actual) >= num(f.value);
    case "lt":
      return num(actual) < num(f.value);
    case "lte":
      return num(actual) <= num(f.value);
    default:
      return false;
  }
}

function num(v: unknown): number {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : NaN;
}

export function inPeriod(
  closedAt: string,
  periodStart: string,
  periodEnd: string
): boolean {
  const t = new Date(closedAt).getTime();
  return (
    t >= new Date(periodStart).getTime() && t <= new Date(periodEnd).getTime()
  );
}

export function groupByPayee(deals: DealSnapshot[]): Map<string, DealSnapshot[]> {
  const map = new Map<string, DealSnapshot[]>();
  for (const deal of deals) {
    const list = map.get(deal.owner) ?? [];
    list.push(deal);
    map.set(deal.owner, list);
  }
  for (const list of map.values()) {
    list.sort(
      (a, b) => new Date(a.closedAt).getTime() - new Date(b.closedAt).getTime()
    );
  }
  return map;
}
