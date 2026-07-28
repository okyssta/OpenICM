import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getOrgId } from "@/lib/org";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  const orgId = await getOrgId();
  const statement = await db.statement.findFirst({ where: { id, orgId } });
  if (!statement) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const comments = await db.disputeComment.findMany({
    where: { statementId: id },
    orderBy: { createdAt: "asc" },
  });
  return NextResponse.json({ comments });
}

export async function POST(req: NextRequest, { params }: Params) {
  const { id } = await params;
  const orgId = await getOrgId();
  const statement = await db.statement.findFirst({ where: { id, orgId } });
  if (!statement) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json();
  const author = String(body.author ?? "unknown").trim();
  const text = String(body.body ?? "").trim();
  if (!text) return NextResponse.json({ error: "body is required" }, { status: 400 });

  const comment = await db.disputeComment.create({
    data: { statementId: id, author, body: text },
  });
  return NextResponse.json({ comment }, { status: 201 });
}
