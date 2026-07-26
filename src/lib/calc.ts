import { Prisma } from "@prisma/client";
import { db } from "./db";
import { toRawEvents } from "./events";
import {
  calculate,
  reconstructDeals,
  type PlanDefinition,
  type Period,
} from "@/engine";

export function periodBounds(period: Period, ref: Date = new Date()): { start: Date; end: Date } {
  const y = ref.getUTCFullYear();
  const m = ref.getUTCMonth();
  if (period === "monthly") {
    return {
      start: new Date(Date.UTC(y, m, 1)),
      end: new Date(Date.UTC(y, m + 1, 0, 23, 59, 59)),
    };
  }
  if (period === "quarterly") {
    const q = Math.floor(m / 3);
    return {
      start: new Date(Date.UTC(y, q * 3, 1)),
      end: new Date(Date.UTC(y, q * 3 + 3, 0, 23, 59, 59)),
    };
  }
  return {
    start: new Date(Date.UTC(y, 0, 1)),
    end: new Date(Date.UTC(y, 11, 31, 23, 59, 59)),
  };
}

export async function runCalculation(
  orgId: string,
  planId: string,
  periodStart: Date,
  periodEnd: Date
) {
  const plan = await db.plan.findUnique({
    where: { id: planId },
    include: {
      versions: { orderBy: { version: "desc" }, take: 1 },
      assignments: { include: { payee: true } },
    },
  });
  if (!plan) throw new Error("Plan not found");
  const version = plan.versions[0];
  if (!version) throw new Error("Plan has no published version");

  const definition = version.definition as PlanDefinition;
  const payeeByExternal = new Map(
    plan.assignments.map((a) => [a.payee.externalId, a.payee])
  );

  const events = await db.event.findMany({ where: { orgId } });
  const deals = reconstructDeals(toRawEvents(events)).filter((d) =>
    payeeByExternal.has(d.owner)
  );

  const result = calculate({
    definition,
    deals,
    periodStart: periodStart.toISOString(),
    periodEnd: periodEnd.toISOString(),
  });

  return db.$transaction(async (tx) => {
    const run = await tx.calculationRun.create({
      data: {
        orgId,
        planId,
        planVersionId: version.id,
        periodStart,
        periodEnd,
        status: "completed",
      },
    });

    if (result.lines.length > 0) {
      await tx.calculationLine.createMany({
        data: result.lines.map((l) => ({
          runId: run.id,
          payeeId: payeeByExternal.get(l.payee)!.id,
          dealExternalId: l.dealExternalId,
          componentId: l.componentId,
          componentName: l.componentName,
          basis: l.basis,
          rate: l.rate,
          amount: l.amount,
          detail: l.detail as Prisma.InputJsonValue,
        })),
      });
    }

    for (const [externalId, total] of Object.entries(result.totalsByPayee)) {
      const payee = payeeByExternal.get(externalId);
      if (!payee) continue;
      await tx.statement.create({
        data: {
          orgId,
          runId: run.id,
          payeeId: payee.id,
          periodStart,
          periodEnd,
          totalCommission: total,
          dealsCount: result.dealsByPayee[externalId] ?? 0,
          status: "draft",
        },
      });
    }

    return run;
  });
}
