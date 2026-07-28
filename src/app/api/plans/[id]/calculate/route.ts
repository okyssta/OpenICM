import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getOrgId } from "@/lib/org";
import { runCalculation, periodBounds } from "@/lib/calc";
import type { PlanDefinition, Period } from "@/engine";

type Params = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, { params }: Params) {
  const { id } = await params;
  const orgId = await getOrgId();
  const body = await req.json().catch(() => ({}));

  let start: Date;
  let end: Date;

  if (body.periodStart && body.periodEnd) {
    start = new Date(body.periodStart);
    end = new Date(body.periodEnd);
  } else {
    const plan = await db.plan.findFirst({
      where: { id, orgId },
      include: { versions: { orderBy: { version: "desc" }, take: 1 } },
    });
    const period = ((plan?.versions[0]?.definition as PlanDefinition | undefined)
      ?.period ?? "quarterly") as Period;
    const bounds = periodBounds(period, body.refDate ? new Date(body.refDate) : new Date());
    start = bounds.start;
    end = bounds.end;
  }

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return NextResponse.json({ error: "Invalid period dates" }, { status: 400 });
  }

  try {
    const run = await runCalculation(orgId, id, start, end);
    const statements = await db.statement.findMany({
      where: { runId: run.id },
      include: { payee: true },
    });

    // Fire webhook
    const { deliverWebhook } = await import("@/lib/webhooks/deliver");
    deliverWebhook(orgId, "calculation.completed", {
      runId: run.id,
      planId: id,
      periodStart: start.toISOString(),
      periodEnd: end.toISOString(),
      status: run.status,
      statementCount: statements.length,
    }).catch(() => {});

    return NextResponse.json({ run, statements });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Calculation failed" },
      { status: 400 }
    );
  }
}
