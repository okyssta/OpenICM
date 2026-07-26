import { describe, it, expect } from "vitest";
import { reconstructDeals, type RawEvent } from "../reconstruct";

function ev(
  type: RawEvent["type"],
  dealExternalId: string,
  payload: Record<string, unknown>,
  occurredAt: string,
  seq: number
): RawEvent {
  return { type, dealExternalId, payload, occurredAt, seq };
}

describe("reconstructDeals", () => {
  it("builds a deal from a single created event", () => {
    const deals = reconstructDeals([
      ev("deal_created", "d1", { owner: "rep1", closed_at: "2026-01-15", value: 1000 }, "2026-01-15", 1),
    ]);
    expect(deals).toHaveLength(1);
    expect(deals[0].externalId).toBe("d1");
    expect(deals[0].owner).toBe("rep1");
    expect(deals[0].split).toBe(1);
    expect(deals[0].fields.value).toBe(1000);
    expect(deals[0].deleted).toBe(false);
  });

  it("applies updates on top of created, ordered by time", () => {
    const deals = reconstructDeals([
      ev("deal_updated", "d1", { value: 1500 }, "2026-01-20", 3),
      ev("deal_created", "d1", { owner: "rep1", closed_at: "2026-01-15", value: 1000 }, "2026-01-15", 1),
    ]);
    expect(deals[0].fields.value).toBe(1500);
    expect(deals[0].fields.owner).toBe("rep1");
  });

  it("uses seq to break time ties so updates win", () => {
    const deals = reconstructDeals([
      ev("deal_updated", "d1", { value: 2000 }, "2026-01-15", 2),
      ev("deal_created", "d1", { owner: "rep1", closed_at: "2026-01-15", value: 1000 }, "2026-01-15", 1),
    ]);
    expect(deals[0].fields.value).toBe(2000);
  });

  it("marks deleted deals", () => {
    const deals = reconstructDeals([
      ev("deal_created", "d1", { owner: "rep1", closed_at: "2026-01-15", value: 1000 }, "2026-01-15", 1),
      ev("deal_deleted", "d1", {}, "2026-01-20", 2),
    ]);
    expect(deals[0].deleted).toBe(true);
  });

  it("a later re-create after delete revives the deal", () => {
    const deals = reconstructDeals([
      ev("deal_created", "d1", { owner: "rep1", closed_at: "2026-01-15", value: 1000 }, "2026-01-15", 1),
      ev("deal_deleted", "d1", {}, "2026-01-20", 2),
      ev("deal_created", "d1", { owner: "rep1", closed_at: "2026-01-15", value: 1200 }, "2026-01-25", 3),
    ]);
    expect(deals[0].deleted).toBe(false);
    expect(deals[0].fields.value).toBe(1200);
  });

  it("parses split percentage into a fraction", () => {
    const deals = reconstructDeals([
      ev("deal_created", "d1", { owner: "rep1", closed_at: "2026-01-15", value: 1000, split: 50 }, "2026-01-15", 1),
    ]);
    expect(deals[0].split).toBe(0.5);
  });
});
