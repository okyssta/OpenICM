import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getOrgId } from "@/lib/org";

export async function GET() {
  const orgId = await getOrgId();
  const events = await db.event.findMany({
    where: { orgId },
    orderBy: { ingestedAt: "desc" },
    take: 200,
  });
  return NextResponse.json({ events, count: events.length });
}
