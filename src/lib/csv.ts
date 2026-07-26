import Papa from "papaparse";
import type { EventType } from "@prisma/client";

export type ParsedRow = Record<string, string>;

export type DealEventInput = {
  type: EventType;
  dealExternalId: string;
  payload: Record<string, unknown>;
  occurredAt: Date;
  idempotencyKey: string;
};

export type ImportResult = {
  events: DealEventInput[];
  errors: { row: number; message: string }[];
};

const REQUIRED = ["deal_id", "owner", "closed_at", "value"];

export function parseCsv(text: string): ParsedRow[] {
  const result = Papa.parse<ParsedRow>(text.trim(), {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim().toLowerCase().replace(/\s+/g, "_"),
  });
  return result.data;
}

function coerceValue(v: string): unknown {
  const trimmed = v.trim();
  if (trimmed === "") return null;
  const n = Number(trimmed.replace(/[$,]/g, ""));
  if (trimmed !== "" && Number.isFinite(n) && /^[\d$.,\s-]+$/.test(trimmed)) {
    return n;
  }
  return trimmed;
}

export function buildDealEvents(
  rows: ParsedRow[],
  existingDealIds: Set<string>,
  source: string
): ImportResult {
  const events: DealEventInput[] = [];
  const errors: { row: number; message: string }[] = [];

  rows.forEach((row, index) => {
    const rowNum = index + 2;
    const missing = REQUIRED.filter((k) => !row[k] || row[k].trim() === "");
    if (missing.length > 0) {
      errors.push({ row: rowNum, message: `Missing required field(s): ${missing.join(", ")}` });
      return;
    }

    const closedAt = new Date(row.closed_at);
    if (Number.isNaN(closedAt.getTime())) {
      errors.push({ row: rowNum, message: `Invalid closed_at date: ${row.closed_at}` });
      return;
    }

    const dealId = row.deal_id.trim();
    const payload: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(row)) {
      if (val === undefined) continue;
      payload[key] = coerceValue(val);
    }
    payload.deal_id = dealId;

    const type: EventType = existingDealIds.has(dealId) ? "deal_updated" : "deal_created";
    existingDealIds.add(dealId);

    events.push({
      type,
      dealExternalId: dealId,
      payload,
      occurredAt: closedAt,
      idempotencyKey: `${source}:${dealId}:${JSON.stringify(payload)}`,
    });
  });

  return { events, errors };
}

export function statementsToCsv(
  rows: {
    payee: string;
    email: string;
    periodStart: string;
    periodEnd: string;
    dealsCount: number;
    totalCommission: number;
    currency: string;
    status: string;
  }[]
): string {
  return Papa.unparse(
    rows.map((r) => ({
      payee: r.payee,
      email: r.email,
      period_start: r.periodStart,
      period_end: r.periodEnd,
      deals: r.dealsCount,
      commission: r.totalCommission.toFixed(2),
      currency: r.currency,
      status: r.status,
    }))
  );
}
