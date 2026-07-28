import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getOrgId } from "@/lib/org";

export async function GET(req: NextRequest) {
  const orgId = await getOrgId();
  const url = req.nextUrl;
  const runId = url.searchParams.get("runId");
  const payeeId = url.searchParams.get("payeeId");
  const skip = Math.max(0, Number(url.searchParams.get("skip")) || 0);
  const take = Math.min(200, Math.max(1, Number(url.searchParams.get("take")) || 50));

  const where = {
    orgId,
    ...(runId ? { runId } : {}),
    ...(payeeId ? { payeeId } : {}),
  } as const;

  const [statements, total] = await Promise.all([
    db.statement.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take,
      include: {
        payee: true,
        run: { include: { plan: true } },
      },
    }),
    db.statement.count({ where }),
  ]);
  return NextResponse.json({ statements, total, skip, take });
}
