import { PrismaClient, Prisma } from "@prisma/client";
import type { PlanDefinition } from "../src/engine/types";

const db = new PrismaClient();

function quarterBounds(ref = new Date()) {
  const y = ref.getUTCFullYear();
  const q = Math.floor(ref.getUTCMonth() / 3);
  return {
    start: new Date(Date.UTC(y, q * 3, 1)),
    end: new Date(Date.UTC(y, q * 3 + 3, 0, 23, 59, 59)),
  };
}

function iso(d: Date, day: number) {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), day)).toISOString();
}

const planDefinition: PlanDefinition = {
  period: "quarterly",
  currency: "USD",
  components: [
    {
      id: "base",
      type: "flat_rate",
      name: "Base commission",
      rate: 0.08,
      basis: "value",
    },
    {
      id: "accel",
      type: "quota_attainment",
      name: "Accelerator above quota",
      basis: "value",
      quota: 100000,
      bands: [
        { upTo: 1.0, rate: 0 },
        { upTo: null, rate: 0.04 },
      ],
    },
  ],
};

async function main() {
  const org = await db.organization.upsert({
    where: { id: "seed-org" },
    update: {},
    create: { id: "seed-org", name: "Acme Inc" },
  });
  console.log(`Org: ${org.name} (${org.id})`);

  const reps = [
    { externalId: "alice", name: "Alice Nguyen", email: "alice@acme.test", role: "AE" },
    { externalId: "bob", name: "Bob Martinez", email: "bob@acme.test", role: "AE" },
    { externalId: "carol", name: "Carol Smith", email: "carol@acme.test", role: "SDR" },
  ];
  const payees = [];
  for (const r of reps) {
    payees.push(
      await db.payee.upsert({
        where: { orgId_externalId: { orgId: org.id, externalId: r.externalId } },
        update: r,
        create: { orgId: org.id, ...r },
      })
    );
  }
  console.log(`Payees: ${payees.map((p) => p.externalId).join(", ")}`);

  const existingPlan = await db.plan.findFirst({ where: { orgId: org.id, name: "2026 Sales Plan" } });
  const plan =
    existingPlan ??
    (await db.plan.create({
      data: { orgId: org.id, name: "2026 Sales Plan", description: "8% base + 4% accelerator above $100k quota" },
    }));
  if (!existingPlan) {
    await db.planVersion.create({
      data: {
        planId: plan.id,
        version: 1,
        definition: planDefinition as unknown as Prisma.InputJsonValue,
        note: "Initial version",
      },
    });
    await db.planAssignment.createMany({
      data: payees.map((p) => ({ planId: plan.id, payeeId: p.id, startDate: new Date() })),
    });
  }
  console.log(`Plan: ${plan.name}`);

  const { start } = quarterBounds();
  const deals = [
    { deal_id: "D-1001", owner: "alice", day: 8, value: 42000, type: "new" },
    { deal_id: "D-1002", owner: "alice", day: 15, value: 65000, type: "new" },
    { deal_id: "D-1003", owner: "bob", day: 10, value: 30000, type: "renewal" },
    { deal_id: "D-1004", owner: "bob", day: 18, value: 28000, type: "new" },
    { deal_id: "D-1005", owner: "carol", day: 12, value: 15000, type: "new", split: 50 },
  ];

  for (const d of deals) {
    const closedAt = iso(start, d.day);
    const payload = {
      deal_id: d.deal_id,
      owner: d.owner,
      closed_at: closedAt,
      value: d.value,
      type: d.type,
      ...(d.split ? { split: d.split } : {}),
    };
    await db.event.upsert({
      where: { orgId_idempotencyKey: { orgId: org.id, idempotencyKey: `seed:${d.deal_id}` } },
      update: {},
      create: {
        orgId: org.id,
        type: "deal_created",
        dealExternalId: d.deal_id,
        payload,
        source: "seed",
        idempotencyKey: `seed:${d.deal_id}`,
        occurredAt: new Date(closedAt),
      },
    });
  }
  console.log(`Seeded ${deals.length} deals in the current quarter.`);
  console.log(`\nSet ORG_ID=${org.id} in your .env (or leave blank to auto-select).`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
