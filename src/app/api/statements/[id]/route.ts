import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getOrgId } from "@/lib/org";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  const orgId = await getOrgId();
  const statement = await db.statement.findFirst({
    where: { id, orgId },
    include: { payee: true, run: { include: { plan: true, planVersion: true } } },
  });
  if (!statement) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const lines = await db.calculationLine.findMany({
    where: { runId: statement.runId, payeeId: statement.payeeId },
    orderBy: { dealExternalId: "asc" },
  });

  return NextResponse.json({ statement, lines });
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const { id } = await params;
  const orgId = await getOrgId();
  const body = await req.json();
  const status = body.status;
  if (!["draft", "approved", "paid"].includes(status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }
  const statement = await db.statement.updateMany({
    where: { id, orgId },
    data: { status },
  });
  if (statement.count === 0) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
