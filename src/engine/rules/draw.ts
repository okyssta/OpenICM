import type { CalculationLine, DealSnapshot, DrawComponent } from "../types";
import { numericBasis, matchesFilters, round2 } from "../helpers";

/**
 * Draw/guarantee — ensures each payee receives a minimum commission
 * for the period. If their total commission (from other components)
 * is below the guarantee, a top-up line is added.
 *
 * ponytail: per-payee guarantee. Multi-tier guarantees or
 * recoverable draws when the business needs them.
 */
export function calcDraw(
  deals: DealSnapshot[],
  c: DrawComponent
): CalculationLine[] {
  const filtered = deals.filter((d) => matchesFilters(d, c.filters));

  // Calculate actual earnings from this basis field across all deals
  const totalBasis = filtered.reduce((sum, d) => sum + numericBasis(d, c.basis), 0);
  const guaranteeAmount = c.guarantee;

  // Draw is the shortfall, if any
  if (totalBasis >= guaranteeAmount) return [];

  const shortfall = round2(guaranteeAmount - totalBasis);

  // Distribute shortfall pro-rata across filtered deals
  return proRataShortfall(filtered, shortfall, c);
}

function proRataShortfall(
  deals: DealSnapshot[],
  shortfall: number,
  c: DrawComponent
): CalculationLine[] {
  if (deals.length === 0) {
    // No deals — create a standalone draw line
    return [
      {
        payee: "",
        dealExternalId: "",
        componentId: c.id,
        componentName: c.name,
        basis: 0,
        rate: 0,
        amount: shortfall,
        detail: { type: "draw", guarantee: c.guarantee, shortfall },
      },
    ];
  }

  const totalBasis = deals.reduce((sum, d) => sum + numericBasis(d, c.basis), 0) || 1;
  let allocated = 0;
  const lines: CalculationLine[] = [];

  for (let i = 0; i < deals.length; i++) {
    const d = deals[i];
    const share = i < deals.length - 1
      ? round2(shortfall * (numericBasis(d, c.basis) / totalBasis))
      : round2(shortfall - allocated); // last line absorbs residual

    allocated = round2(allocated + share);
    lines.push({
      payee: d.owner,
      dealExternalId: d.externalId,
      componentId: c.id,
      componentName: c.name,
      basis: numericBasis(d, c.basis),
      rate: round2(shortfall / totalBasis),
      amount: share,
      detail: { type: "draw", guarantee: c.guarantee, shortfall },
    });
  }

  return lines;
}
