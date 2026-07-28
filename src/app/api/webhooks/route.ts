import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getOrgId } from "@/lib/org";

export async function GET() {
  const orgId = await getOrgId();
  const webhooks = await db.webhook.findMany({ where: { orgId }, orderBy: { createdAt: "desc" } });
  return NextResponse.json({ webhooks });
}

export async function POST(req: NextRequest) {
  const orgId = await getOrgId();
  const body = await req.json();
  const url = String(body.url ?? "").trim();
  if (!url) return NextResponse.json({ error: "url is required" }, { status: 400 });

  const secret = body.secret || crypto.randomUUID();
  const events = String(body.events ?? "calculation.completed");

  const webhook = await db.webhook.create({
    data: { orgId, url, secret, events, active: body.active !== false },
  });
  return NextResponse.json({ webhook }, { status: 201 });
}
