import { NextResponse, type NextRequest } from "next/server";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { getOrgId } from "@/lib/org";
import { planDefinitionSchema } from "@/lib/plan-schema";

export async function GET() {
  const orgId = await getOrgId();
  const plans = await db.plan.findMany({
    where: { orgId },
    orderBy: { createdAt: "desc" },
    include: {
      versions: { orderBy: { version: "desc" }, take: 1 },
      _count: { select: { assignments: true } },
    },
  });
  return NextResponse.json({
    plans: plans.map((p) => ({
      id: p.id,
      name: p.name,
      description: p.description,
      active: p.active,
      createdAt: p.createdAt,
      latestVersion: p.versions[0]?.version ?? 0,
      definition: p.versions[0]?.definition ?? null,
      assignmentCount: p._count.assignments,
    })),
  });
}

export async function POST(req: NextRequest) {
  const orgId = await getOrgId();
  const body = await req.json();
  const name = String(body.name ?? "").trim();
  if (!name) return NextResponse.json({ error: "name is required" }, { status: 400 });

  const parsed = planDefinitionSchema.safeParse(body.definition);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid plan definition", issues: parsed.error.issues },
      { status: 400 }
    );
  }

  const assigneeIds: string[] = Array.isArray(body.assigneeExternalIds)
    ? body.assigneeExternalIds
    : [];
  const payees = await db.payee.findMany({
    where: { orgId, externalId: { in: assigneeIds } },
  });

  const plan = await db.$transaction(async (tx) => {
    const created = await tx.plan.create({
      data: { orgId, name, description: body.description ?? null },
    });
    await tx.planVersion.create({
      data: {
        planId: created.id,
        version: 1,
        definition: parsed.data as Prisma.InputJsonValue,
        note: "Initial version",
      },
    });
    if (payees.length > 0) {
      await tx.planAssignment.createMany({
        data: payees.map((p) => ({
          planId: created.id,
          payeeId: p.id,
          startDate: new Date(),
        })),
      });
    }
    return created;
  });

  return NextResponse.json({ plan });
}
