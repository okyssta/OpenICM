import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getOrgId } from "@/lib/org";
import {
  calculate,
  reconstructDeals,
  type PlanDefinition,
  type Period,
} from "@/engine";
import { toRawEvents } from "@/lib/events";
import { periodBounds } from "@/lib/calc";

type Params = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, { params }: Params) {
  const { id } = await params;
  const orgId = await getOrgId();
  const body = await req.json().catch(() => ({}));

  const plan = await db.plan.findFirst({
    where: { id, orgId },
    include: {
      versions: { orderBy: { version: "desc" }, take: 1 },
      assignments: { include: { payee: true } },
    },
  });
  if (!plan) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const version = plan.versions[0];
  if (!version) return NextResponse.json({ error: "No published version" }, { status: 400 });

  const definition = version.definition as PlanDefinition;
  const payeeByExternal = new Map(plan.assignments.map((a) => [a.payee.externalId, a.payee]));

  let start: Date;
  let end: Date;
  if (body.periodStart && body.periodEnd) {
    start = new Date(body.periodStart);
    end = new Date(body.periodEnd);
  } else {
    const period = (definition?.period ?? "quarterly") as Period;
    const bounds = periodBounds(period, body.refDate ? new Date(body.refDate) : new Date());
    start = bounds.start;
    end = bounds.end;
  }

  const events = await db.event.findMany({ where: { orgId } });
  const deals = reconstructDeals(toRawEvents(events)).filter((d) =>
    payeeByExternal.has(d.owner)
  );

  const result = calculate({
    definition,
    deals,
    periodStart: start.toISOString(),
    periodEnd: end.toISOString(),
  });

  // Build simulated statements without persisting
  const statements = Array.from(payeeByExternal.entries()).map(([extId, p]) => ({
    payee: { id: p.id, name: p.name, externalId: p.externalId, email: p.email },
    totalCommission: result.totalsByPayee[extId] ?? 0,
    dealsCount: result.dealsByPayee[extId] ?? 0,
    lines: result.lines.filter((l) => l.payee === extId),
  }));

  return NextResponse.json({
    simulation: true,
    periodStart: start.toISOString(),
    periodEnd: end.toISOString(),
    statements,
    totalLines: result.lines.length,
  });
}
