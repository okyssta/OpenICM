import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getOrgId } from "@/lib/org";
import { toRawEvents } from "@/lib/events";
import { reconstructDeals } from "@/engine";

export async function GET() {
  const orgId = await getOrgId();
  const events = await db.event.findMany({ where: { orgId } });
  const deals = reconstructDeals(toRawEvents(events))
    .filter((d) => !d.deleted)
    .sort((a, b) => new Date(b.closedAt).getTime() - new Date(a.closedAt).getTime());
  return NextResponse.json({ deals, count: deals.length });
}
