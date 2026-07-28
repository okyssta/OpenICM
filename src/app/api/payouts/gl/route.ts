import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getOrgId } from "@/lib/org";
import type { PlanDefinition } from "@/engine";

/**
 * GL export — generates a general-ledger-ready CSV with account codes.
 * ponytail: uses a single "Commission Expense" account. Per-account mapping
 * when the business needs it.
 */
const GL_ACCOUNT = "5100"; // Commission Expense
const GL_DEPT = "SALES";

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

  const currency = ((run.planVersion.definition as PlanDefinition)?.currency) ?? "USD";

  // Build GL CSV rows: one debit per payee, one credit for the total
  const rows: string[] = [
    "account,dept,amount,currency,payee,period_start,period_end,description",
  ];

  let total = 0;
  for (const s of statements) {
    const amt = s.totalCommission.toFixed(2);
    total += s.totalCommission;
    rows.push(
      `${GL_ACCOUNT},${GL_DEPT},${amt},${currency},${s.payee.name},${run.periodStart.toISOString().slice(0, 10)},${run.periodEnd.toISOString().slice(0, 10)},"Commission - ${s.payee.name}"`
    );
  }

  rows.push(
    `,,${total.toFixed(2)},${currency},TOTAL,${run.periodStart.toISOString().slice(0, 10)},${run.periodEnd.toISOString().slice(0, 10)},"Commission expense - Plan ${run.planId.slice(0, 8)}"`
  );

  const csv = rows.join("\n");
  const fileName = `gl-commission-${run.periodStart.toISOString().slice(0, 10)}-${runId.slice(0, 8)}.csv`;

  await db.payoutExport.create({
    data: { orgId, runId, format: "gl_csv", rowCount: statements.length, fileName },
  });

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${fileName}"`,
    },
  });
}
