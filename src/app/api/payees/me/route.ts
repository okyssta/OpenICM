import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getOrgId } from "@/lib/org";
import { getUserContext } from "@/lib/rbac";

export async function GET(req: NextRequest) {
  const orgId = await getOrgId();
  const userExtId = req.headers.get("x-user-external-id");
  const ctx = await getUserContext(orgId, userExtId);

  if (ctx.asPayee) {
    const payee = await db.payee.findUnique({ where: { id: ctx.asPayee.id } });
    return NextResponse.json({ payee, role: ctx.asPayee.role, isAdmin: ctx.isAdmin });
  }

  const payees = await db.payee.findMany({ where: { orgId, active: true }, orderBy: { name: "asc" } });
  return NextResponse.json({ payees, role: "admin", isAdmin: true });
}
