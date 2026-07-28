export type Period = "monthly" | "quarterly" | "annual";

export type RuleOp = "eq" | "neq" | "gt" | "gte" | "lt" | "lte" | "in";

export type RuleFilter = {
  field: string;
  op: RuleOp;
  value: unknown;
};

export type FlatRateComponent = {
  id: string;
  type: "flat_rate";
  name: string;
  rate: number;
  basis: string;
  filters?: RuleFilter[];
};

export type Tier = {
  upTo: number | null;
  rate: number;
};

export type TieredRateComponent = {
  id: string;
  type: "tiered_rate";
  name: string;
  basis: string;
  mode: "marginal" | "retroactive";
  tiers: Tier[];
  filters?: RuleFilter[];
};

export type QuotaAttainmentComponent = {
  id: string;
  type: "quota_attainment";
  name: string;
  basis: string;
  quota: number;
  bands: Tier[];
  filters?: RuleFilter[];
};

export type DrawComponent = {
  id: string;
  type: "draw";
  name: string;
  guarantee: number; // minimum commission per period
  basis: string; // field used to calculate against (or "flat")
  filters?: RuleFilter[];
};

export type ClawbackComponent = {
  id: string;
  type: "clawback";
  name: string;
  lookbackMonths: number; // how many months back to check for churn
  basis: string;
  reversalRate: number; // % of commission to reverse (1 = 100%)
  filters?: RuleFilter[];
};

export type PlanComponent =
  | FlatRateComponent
  | TieredRateComponent
  | QuotaAttainmentComponent
  | DrawComponent
  | ClawbackComponent;

export type PlanDefinition = {
  period: Period;
  currency: string;
  components: PlanComponent[];
};

export type DealFieldValue = string | number | boolean | null;

export type DealSnapshot = {
  externalId: string;
  owner: string;
  closedAt: string;
  split: number;
  /** Multi-payee co-owners: comma-separated "owner:pct" pairs, e.g. "sarah:30,bob:20" */
  coOwners: { owner: string; split: number }[];
  fields: Record<string, DealFieldValue>;
  deleted: boolean;
};

export type CalculationLine = {
  payee: string;
  dealExternalId: string;
  componentId: string;
  componentName: string;
  basis: number;
  rate: number;
  amount: number;
  detail: Record<string, unknown>;
};

export type CalculationResult = {
  lines: CalculationLine[];
  totalsByPayee: Record<string, number>;
  dealsByPayee: Record<string, number>;
};

export type CalcInput = {
  definition: PlanDefinition;
  deals: DealSnapshot[];
  periodStart: string;
  periodEnd: string;
};
