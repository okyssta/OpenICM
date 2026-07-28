import { z } from "zod";

const filterSchema = z.object({
  field: z.string().min(1),
  op: z.enum(["eq", "neq", "gt", "gte", "lt", "lte", "in"]),
  value: z.unknown(),
});

const tierSchema = z.object({
  upTo: z.number().positive().nullable(),
  rate: z.number().min(0),
});

const flatRate = z.object({
  id: z.string().min(1),
  type: z.literal("flat_rate"),
  name: z.string().min(1),
  rate: z.number().min(0),
  basis: z.string().min(1),
  filters: z.array(filterSchema).optional(),
});

const tieredRate = z.object({
  id: z.string().min(1),
  type: z.literal("tiered_rate"),
  name: z.string().min(1),
  basis: z.string().min(1),
  mode: z.enum(["marginal", "retroactive"]),
  tiers: z.array(tierSchema).min(1),
  filters: z.array(filterSchema).optional(),
});

const quotaAttainment = z.object({
  id: z.string().min(1),
  type: z.literal("quota_attainment"),
  name: z.string().min(1),
  basis: z.string().min(1),
  quota: z.number().positive(),
  bands: z.array(tierSchema).min(1),
  filters: z.array(filterSchema).optional(),
});

const draw = z.object({
  id: z.string().min(1),
  type: z.literal("draw"),
  name: z.string().min(1),
  guarantee: z.number().min(0),
  basis: z.string().min(1),
  filters: z.array(filterSchema).optional(),
});

const clawback = z.object({
  id: z.string().min(1),
  type: z.literal("clawback"),
  name: z.string().min(1),
  lookbackMonths: z.number().int().min(1).max(36),
  basis: z.string().min(1),
  reversalRate: z.number().min(0).max(1),
  filters: z.array(filterSchema).optional(),
});

export const planDefinitionSchema = z.object({
  period: z.enum(["monthly", "quarterly", "annual"]),
  currency: z.string().min(1).default("USD"),
  components: z.array(z.discriminatedUnion("type", [flatRate, tieredRate, quotaAttainment, draw, clawback])),
});

export type PlanDefinitionInput = z.infer<typeof planDefinitionSchema>;
