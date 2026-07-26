import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getOrgId } from "@/lib/org";

export async function GET() {
  const orgId = await getOrgId();
  const payees = await db.payee.findMany({
    where: { orgId },
    orderBy: { name: "asc" },
  });
  return NextResponse.json({ payees });
}

export async function POST(req: NextRequest) {
  const orgId = await getOrgId();
  const body = await req.json();
  const externalId = String(body.externalId ?? "").trim();
  const name = String(body.name ?? externalId).trim();
  if (!externalId) {
    return NextResponse.json({ error: "externalId is required" }, { status: 400 });
  }
  const payee = await db.payee.upsert({
    where: { orgId_externalId: { orgId, externalId } },
    update: {
      name,
      email: body.email ?? undefined,
      role: body.role ?? undefined,
    },
    create: {
      orgId,
      externalId,
      name,
      email: body.email ?? null,
      role: body.role ?? null,
    },
  });
  return NextResponse.json({ payee });
}
