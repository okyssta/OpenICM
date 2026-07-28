import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getOrgId } from "@/lib/org";
import { toRawEvents } from "@/lib/events";
import { reconstructDeals } from "@/engine";

export async function GET(req: NextRequest) {
  const orgId = await getOrgId();
  const url = req.nextUrl;
  const skip = Math.max(0, Number(url.searchParams.get("skip")) || 0);
  const take = Math.min(200, Math.max(1, Number(url.searchParams.get("take")) || 100));

  const events = await db.event.findMany({ where: { orgId } });
  const all = reconstructDeals(toRawEvents(events))
    .filter((d) => !d.deleted)
    .sort((a, b) => new Date(b.closedAt).getTime() - new Date(a.closedAt).getTime());
  const deals = all.slice(skip, skip + take);

  return NextResponse.json({ deals, count: all.length, skip, take });
}
