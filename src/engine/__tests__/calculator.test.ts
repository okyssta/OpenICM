import { describe, it, expect } from "vitest";
import { calculate } from "../calculator";
import type { DealSnapshot, PlanDefinition } from "../types";

function deal(
  externalId: string,
  owner: string,
  closedAt: string,
  value: number,
  extra: Record<string, unknown> = {},
  split = 1
): DealSnapshot {
  return {
    externalId,
    owner,
    closedAt,
    split,
    deleted: false,
    fields: { owner, closed_at: closedAt, value, ...extra },
  };
}

const PERIOD = { periodStart: "2026-01-01", periodEnd: "2026-03-31" };

function def(components: PlanDefinition["components"]): PlanDefinition {
  return { period: "quarterly", currency: "USD", components };
}

describe("flat_rate", () => {
  it("computes a flat percentage of deal value", () => {
    const result = calculate({
      definition: def([
        { id: "c1", type: "flat_rate", name: "Base", rate: 0.1, basis: "value" },
      ]),
      deals: [deal("d1", "rep1", "2026-02-01", 10000)],
      ...PERIOD,
    });
    expect(result.totalsByPayee.rep1).toBe(1000);
  });

  it("respects split percentage", () => {
    const result = calculate({
      definition: def([
        { id: "c1", type: "flat_rate", name: "Base", rate: 0.1, basis: "value" },
      ]),
      deals: [deal("d1", "rep1", "2026-02-01", 10000, {}, 0.5)],
      ...PERIOD,
    });
    expect(result.totalsByPayee.rep1).toBe(500);
  });

  it("applies filters", () => {
    const result = calculate({
      definition: def([
        {
          id: "c1",
          type: "flat_rate",
          name: "NewBiz",
          rate: 0.1,
          basis: "value",
          filters: [{ field: "type", op: "eq", value: "new" }],
        },
      ]),
      deals: [
        deal("d1", "rep1", "2026-02-01", 10000, { type: "new" }),
        deal("d2", "rep1", "2026-02-02", 10000, { type: "renewal" }),
      ],
      ...PERIOD,
    });
    expect(result.totalsByPayee.rep1).toBe(1000);
  });
});

describe("tiered_rate marginal", () => {
  const tiers = [
    { upTo: 10000, rate: 0.05 },
    { upTo: 20000, rate: 0.1 },
    { upTo: null, rate: 0.15 },
  ];

  it("applies progressive rates across a single deal", () => {
    const result = calculate({
      definition: def([
        { id: "c1", type: "tiered_rate", name: "Tiered", basis: "value", mode: "marginal", tiers },
      ]),
      deals: [deal("d1", "rep1", "2026-02-01", 25000)],
      ...PERIOD,
    });
    // 10000*0.05 + 10000*0.10 + 5000*0.15 = 500 + 1000 + 750 = 2250
    expect(result.totalsByPayee.rep1).toBe(2250);
  });

  it("accumulates across multiple deals in time order", () => {
    const result = calculate({
      definition: def([
        { id: "c1", type: "tiered_rate", name: "Tiered", basis: "value", mode: "marginal", tiers },
      ]),
      deals: [
        deal("d1", "rep1", "2026-01-10", 10000),
        deal("d2", "rep1", "2026-02-10", 10000),
      ],
      ...PERIOD,
    });
    // d1: 10000*0.05=500 ; d2: 10000*0.10=1000 => 1500
    expect(result.totalsByPayee.rep1).toBe(1500);
  });
});

describe("tiered_rate retroactive", () => {
  it("applies the reached tier rate to the whole total", () => {
    const result = calculate({
      definition: def([
        {
          id: "c1",
          type: "tiered_rate",
          name: "Tiered",
          basis: "value",
          mode: "retroactive",
          tiers: [
            { upTo: 10000, rate: 0.05 },
            { upTo: null, rate: 0.12 },
          ],
        },
      ]),
      deals: [
        deal("d1", "rep1", "2026-01-10", 8000),
        deal("d2", "rep1", "2026-02-10", 8000),
      ],
      ...PERIOD,
    });
    // total 16000 > 10000 => 0.12 * 16000 = 1920
    expect(result.totalsByPayee.rep1).toBe(1920);
  });
});

describe("quota_attainment", () => {
  it("applies accelerator band when quota exceeded", () => {
    const result = calculate({
      definition: def([
        {
          id: "c1",
          type: "quota_attainment",
          name: "Quota",
          basis: "value",
          quota: 100000,
          bands: [
            { upTo: 1.0, rate: 0.08 },
            { upTo: null, rate: 0.12 },
          ],
        },
      ]),
      deals: [
        deal("d1", "rep1", "2026-01-10", 60000),
        deal("d2", "rep1", "2026-02-10", 60000),
      ],
      ...PERIOD,
    });
    // total 120000, attainment 1.2 => 0.12 * 120000 = 14400
    expect(result.totalsByPayee.rep1).toBe(14400);
  });

  it("uses base band below quota", () => {
    const result = calculate({
      definition: def([
        {
          id: "c1",
          type: "quota_attainment",
          name: "Quota",
          basis: "value",
          quota: 100000,
          bands: [
            { upTo: 1.0, rate: 0.08 },
            { upTo: null, rate: 0.12 },
          ],
        },
      ]),
      deals: [deal("d1", "rep1", "2026-01-10", 50000)],
      ...PERIOD,
    });
    // attainment 0.5 => 0.08 * 50000 = 4000
    expect(result.totalsByPayee.rep1).toBe(4000);
  });
});

describe("calculate orchestration", () => {
  it("excludes deleted deals and out-of-period deals", () => {
    const deleted = deal("d2", "rep1", "2026-02-01", 5000);
    deleted.deleted = true;
    const result = calculate({
      definition: def([
        { id: "c1", type: "flat_rate", name: "Base", rate: 0.1, basis: "value" },
      ]),
      deals: [
        deal("d1", "rep1", "2026-02-01", 10000),
        deleted,
        deal("d3", "rep1", "2025-12-01", 99999),
      ],
      ...PERIOD,
    });
    expect(result.totalsByPayee.rep1).toBe(1000);
    expect(result.dealsByPayee.rep1).toBe(1);
  });

  it("groups results per payee and sums multiple components", () => {
    const result = calculate({
      definition: def([
        { id: "c1", type: "flat_rate", name: "Base", rate: 0.1, basis: "value" },
        { id: "c2", type: "flat_rate", name: "Bonus", rate: 0.02, basis: "value" },
      ]),
      deals: [
        deal("d1", "rep1", "2026-02-01", 10000),
        deal("d2", "rep2", "2026-02-01", 20000),
      ],
      ...PERIOD,
    });
    expect(result.totalsByPayee.rep1).toBe(1200);
    expect(result.totalsByPayee.rep2).toBe(2400);
    expect(result.lines).toHaveLength(4);
  });

  it("line amounts reconcile to the payee total", () => {
    const result = calculate({
      definition: def([
        {
          id: "c1",
          type: "tiered_rate",
          name: "Tiered",
          basis: "value",
          mode: "retroactive",
          tiers: [
            { upTo: 10000, rate: 0.05 },
            { upTo: null, rate: 0.1 },
          ],
        },
      ]),
      deals: [
        deal("d1", "rep1", "2026-01-10", 7000),
        deal("d2", "rep1", "2026-02-10", 7000),
        deal("d3", "rep1", "2026-03-10", 7000),
      ],
      ...PERIOD,
    });
    const sum = result.lines.reduce((s, l) => s + l.amount, 0);
    expect(Math.round(sum * 100) / 100).toBe(result.totalsByPayee.rep1);
  });
});
