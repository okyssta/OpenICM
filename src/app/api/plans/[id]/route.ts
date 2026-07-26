import { NextResponse, type NextRequest } from "next/server";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { getOrgId } from "@/lib/org";
import { planDefinitionSchema } from "@/lib/plan-schema";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  const orgId = await getOrgId();
  const plan = await db.plan.findFirst({
    where: { id, orgId },
    include: {
      versions: { orderBy: { version: "desc" } },
      assignments: { include: { payee: true } },
    },
  });
  if (!plan) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ plan });
}

export async function PUT(req: NextRequest, { params }: Params) {
  const { id } = await params;
  const orgId = await getOrgId();
  const body = await req.json();

  const plan = await db.plan.findFirst({ where: { id, orgId } });
  if (!plan) return NextResponse.json({ error: "Not found" }, { status: 404 });

  let definition: unknown;
  if (body.definition !== undefined) {
    const parsed = planDefinitionSchema.safeParse(body.definition);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid plan definition", issues: parsed.error.issues },
        { status: 400 }
      );
    }
    definition = parsed.data;
  }

  await db.$transaction(async (tx) => {
    await tx.plan.update({
      where: { id },
      data: {
        name: body.name ?? undefined,
        description: body.description ?? undefined,
        active: body.active ?? undefined,
      },
    });

    if (definition !== undefined) {
      const latest = await tx.planVersion.findFirst({
        where: { planId: id },
        orderBy: { version: "desc" },
      });
      await tx.planVersion.create({
        data: {
          planId: id,
          version: (latest?.version ?? 0) + 1,
          definition: definition as Prisma.InputJsonValue,
          note: body.note ?? null,
        },
      });
    }

    if (Array.isArray(body.assigneeExternalIds)) {
      const payees = await tx.payee.findMany({
        where: { orgId, externalId: { in: body.assigneeExternalIds } },
      });
      await tx.planAssignment.deleteMany({ where: { planId: id } });
      if (payees.length > 0) {
        await tx.planAssignment.createMany({
          data: payees.map((p) => ({
            planId: id,
            payeeId: p.id,
            startDate: new Date(),
          })),
        });
      }
    }
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  const orgId = await getOrgId();
  await db.plan.deleteMany({ where: { id, orgId } });
  return NextResponse.json({ ok: true });
}
