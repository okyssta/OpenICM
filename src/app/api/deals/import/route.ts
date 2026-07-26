import { NextResponse, type NextRequest } from "next/server";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { getOrgId } from "@/lib/org";
import { parseCsv, buildDealEvents } from "@/lib/csv";

export async function POST(req: NextRequest) {
  const orgId = await getOrgId();
  const contentType = req.headers.get("content-type") ?? "";

  let csvText: string;
  let source = "csv";
  if (contentType.includes("application/json")) {
    const body = await req.json();
    csvText = String(body.csv ?? "");
    source = String(body.source ?? "csv");
  } else {
    csvText = await req.text();
  }

  if (!csvText.trim()) {
    return NextResponse.json({ error: "Empty CSV body" }, { status: 400 });
  }

  const rows = parseCsv(csvText);
  const existing = await db.event.findMany({
    where: { orgId },
    select: { dealExternalId: true },
    distinct: ["dealExternalId"],
  });
  const existingIds = new Set(existing.map((e) => e.dealExternalId));

  const { events, errors } = buildDealEvents(rows, existingIds, source);

  let imported = 0;
  if (events.length > 0) {
    const result = await db.event.createMany({
      data: events.map((e) => ({
        orgId,
        type: e.type,
        dealExternalId: e.dealExternalId,
        payload: e.payload as Prisma.InputJsonValue,
        source,
        idempotencyKey: e.idempotencyKey,
        occurredAt: e.occurredAt,
      })),
      skipDuplicates: true,
    });
    imported = result.count;
  }

  const dealIds = [...new Set(events.map((e) => e.dealExternalId))];
  await upsertPayeesFromDeals(orgId, dealIds);

  return NextResponse.json({
    imported,
    duplicatesSkipped: events.length - imported,
    rowErrors: errors,
  });
}

async function upsertPayeesFromDeals(orgId: string, dealIds: string[]) {
  const events = await db.event.findMany({
    where: { orgId, dealExternalId: { in: dealIds } },
    orderBy: { ingestedAt: "asc" },
  });
  const owners = new Map<string, string>();
  for (const e of events) {
    const payload = e.payload as Record<string, unknown>;
    const owner = payload.owner ? String(payload.owner) : "";
    if (owner) owners.set(owner, owner);
  }
  for (const externalId of owners.keys()) {
    await db.payee.upsert({
      where: { orgId_externalId: { orgId, externalId } },
      update: {},
      create: { orgId, externalId, name: externalId },
    });
  }
}
