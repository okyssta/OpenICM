import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getOrgId } from "@/lib/org";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  const orgId = await getOrgId();
  const wh = await db.webhook.findFirst({ where: { id, orgId }, include: { deliveries: { orderBy: { createdAt: "desc" }, take: 20 } } });
  if (!wh) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ webhook: wh });
}

export async function PUT(req: NextRequest, { params }: Params) {
  const { id } = await params;
  const orgId = await getOrgId();
  const body = await req.json();
  const wh = await db.webhook.findFirst({ where: { id, orgId } });
  if (!wh) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const updated = await db.webhook.update({
    where: { id },
    data: {
      url: body.url ?? undefined,
      events: body.events ?? undefined,
      active: body.active ?? undefined,
      secret: body.secret ?? undefined,
    },
  });
  return NextResponse.json({ webhook: updated });
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  const orgId = await getOrgId();
  await db.webhook.deleteMany({ where: { id, orgId } });
  return NextResponse.json({ ok: true });
}
