import type { CalculationLine, DealSnapshot, PlanComponent } from "../types";
import { calcFlatRate } from "./flat-rate";
import { calcTieredRate } from "./tiered-rate";
import { calcQuotaAttainment } from "./quota-attainment";

export function calcComponent(
  deals: DealSnapshot[],
  c: PlanComponent
): CalculationLine[] {
  switch (c.type) {
    case "flat_rate":
      return calcFlatRate(deals, c);
    case "tiered_rate":
      return calcTieredRate(deals, c);
    case "quota_attainment":
      return calcQuotaAttainment(deals, c);
    default: {
      const _exhaustive: never = c;
      throw new Error(`Unknown component type: ${JSON.stringify(_exhaustive)}`);
    }
  }
}
