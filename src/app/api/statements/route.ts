import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getOrgId } from "@/lib/org";

export async function GET(req: NextRequest) {
  const orgId = await getOrgId();
  const runId = req.nextUrl.searchParams.get("runId");
  const payeeId = req.nextUrl.searchParams.get("payeeId");

  const statements = await db.statement.findMany({
    where: {
      orgId,
      ...(runId ? { runId } : {}),
      ...(payeeId ? { payeeId } : {}),
    },
    orderBy: { createdAt: "desc" },
    include: {
      payee: true,
      run: { include: { plan: true } },
    },
  });
  return NextResponse.json({ statements });
}
