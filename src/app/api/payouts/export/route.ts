import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getOrgId } from "@/lib/org";
import { statementsToCsv } from "@/lib/csv";
import type { PlanDefinition } from "@/engine";

export async function GET(req: NextRequest) {
  const orgId = await getOrgId();
  const runId = req.nextUrl.searchParams.get("runId");
  if (!runId) return NextResponse.json({ error: "runId is required" }, { status: 400 });

  const run = await db.calculationRun.findFirst({
    where: { id: runId, orgId },
    include: { planVersion: true },
  });
  if (!run) return NextResponse.json({ error: "Run not found" }, { status: 404 });

  const statements = await db.statement.findMany({
    where: { runId },
    include: { payee: true },
    orderBy: { payee: { name: "asc" } },
  });

  const currency = ((run.planVersion.definition as PlanDefinition).currency) ?? "USD";
  const csv = statementsToCsv(
    statements.map((s) => ({
      payee: s.payee.name,
      email: s.payee.email ?? "",
      periodStart: run.periodStart.toISOString().slice(0, 10),
      periodEnd: run.periodEnd.toISOString().slice(0, 10),
      dealsCount: s.dealsCount,
      totalCommission: s.totalCommission,
      currency,
      status: s.status,
    }))
  );

  const fileName = `payouts-${run.periodStart.toISOString().slice(0, 10)}-${run.id.slice(0, 8)}.csv`;
  await db.payoutExport.create({
    data: { orgId, runId, format: "csv", rowCount: statements.length, fileName },
  });

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${fileName}"`,
    },
  });
}
