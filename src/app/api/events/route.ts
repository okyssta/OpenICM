import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getOrgId } from "@/lib/org";

export async function GET(req: NextRequest) {
  const orgId = await getOrgId();
  const url = req.nextUrl;
  const skip = Math.max(0, Number(url.searchParams.get("skip")) || 0);
  const take = Math.min(200, Math.max(1, Number(url.searchParams.get("take")) || 50));

  const [events, total] = await Promise.all([
    db.event.findMany({
      where: { orgId },
      orderBy: { ingestedAt: "desc" },
      skip,
      take,
    }),
    db.event.count({ where: { orgId } }),
  ]);
  return NextResponse.json({ events, count: events.length, total, skip, take });
}
