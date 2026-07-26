import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getOrgId } from "@/lib/org";

export async function GET() {
  const orgId = await getOrgId();
  const runs = await db.calculationRun.findMany({
    where: { orgId },
    orderBy: { createdAt: "desc" },
    include: {
      plan: true,
      _count: { select: { statements: true, lines: true } },
    },
  });
  return NextResponse.json({ runs });
}
