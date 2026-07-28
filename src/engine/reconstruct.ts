import type { DealFieldValue, DealSnapshot } from "./types";

export type RawEvent = {
  type: "deal_created" | "deal_updated" | "deal_deleted";
  dealExternalId: string;
  payload: Record<string, unknown>;
  occurredAt: string;
  seq: number;
};

function toFieldValue(v: unknown): DealFieldValue {
  if (v === null || v === undefined) return null;
  if (typeof v === "string" || typeof v === "number" || typeof v === "boolean")
    return v;
  return String(v);
}

function parseCoOwners(raw: unknown): { owner: string; split: number }[] {
  if (typeof raw !== "string" || !raw) return [];
  return raw
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      const colon = part.lastIndexOf(":");
      if (colon === -1) return { owner: part, split: 0.5 };
      return {
        owner: part.slice(0, colon).trim(),
        split: Math.min(1, Math.max(0, Number(part.slice(colon + 1)) / 100)),
      };
    })
    .filter((c) => c.owner);
}

export function reconstructDeals(events: RawEvent[]): DealSnapshot[] {
  const byDeal = new Map<string, RawEvent[]>();
  for (const e of events) {
    const list = byDeal.get(e.dealExternalId) ?? [];
    list.push(e);
    byDeal.set(e.dealExternalId, list);
  }

  const deals: DealSnapshot[] = [];
  for (const [externalId, list] of byDeal) {
    list.sort((a, b) => {
      const t = new Date(a.occurredAt).getTime() - new Date(b.occurredAt).getTime();
      return t !== 0 ? t : a.seq - b.seq;
    });

    const fields: Record<string, DealFieldValue> = {};
    let deleted = false;

    for (const e of list) {
      if (e.type === "deal_deleted") {
        deleted = true;
        continue;
      }
      deleted = false;
      for (const [k, v] of Object.entries(e.payload)) {
        fields[k] = toFieldValue(v);
      }
    }

    const owner = String(fields["owner"] ?? "");
    const closedAt = String(fields["closed_at"] ?? fields["closedAt"] ?? "");
    const splitRaw = fields["split"];
    const splitPct =
      typeof splitRaw === "number" && Number.isFinite(splitRaw) ? splitRaw : 100;
    const coOwners = parseCoOwners(fields["co_owners"]);

    deals.push({
      externalId,
      owner,
      closedAt,
      split: splitPct / 100,
      coOwners,
      fields,
      deleted,
    });
  }

  return deals;
}
