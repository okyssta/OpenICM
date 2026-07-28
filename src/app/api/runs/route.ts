import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getOrgId } from "@/lib/org";

export async function GET(req: NextRequest) {
  const orgId = await getOrgId();
  const url = req.nextUrl;
  const skip = Math.max(0, Number(url.searchParams.get("skip")) || 0);
  const take = Math.min(200, Math.max(1, Number(url.searchParams.get("take")) || 50));

  const [runs, total] = await Promise.all([
    db.calculationRun.findMany({
      where: { orgId },
      orderBy: { createdAt: "desc" },
      skip,
      take,
      include: {
        plan: true,
        _count: { select: { statements: true, lines: true } },
      },
    }),
    db.calculationRun.count({ where: { orgId } }),
  ]);
  return NextResponse.json({ runs, total, skip, take });
}
