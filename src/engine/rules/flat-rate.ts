import type { CalculationLine, DealSnapshot, FlatRateComponent } from "../types";
import { matchesFilters, numericBasis, round2 } from "../helpers";

export function calcFlatRate(
  deals: DealSnapshot[],
  c: FlatRateComponent
): CalculationLine[] {
  const lines: CalculationLine[] = [];
  for (const deal of deals) {
    if (!matchesFilters(deal, c.filters)) continue;
    const basis = numericBasis(deal, c.basis) * deal.split;
    if (basis === 0) continue;
    const amount = round2(basis * c.rate);
    lines.push({
      payee: deal.owner,
      dealExternalId: deal.externalId,
      componentId: c.id,
      componentName: c.name,
      basis: round2(basis),
      rate: c.rate,
      amount,
      detail: { type: c.type, split: deal.split },
    });
  }
  return lines;
}
