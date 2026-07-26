import type { CalculationLine, DealSnapshot, QuotaAttainmentComponent, Tier } from "../types";
import { matchesFilters, numericBasis, round2 } from "../helpers";

function bandRate(attainment: number, bands: Tier[]): number {
  let prev = 0;
  for (const band of bands) {
    const cap = band.upTo ?? Infinity;
    if (attainment > prev && attainment <= cap) return band.rate;
    prev = cap;
  }
  return bands.length ? (bands[bands.length - 1].rate ?? 0) : 0;
}

export function calcQuotaAttainment(
  deals: DealSnapshot[],
  c: QuotaAttainmentComponent
): CalculationLine[] {
  const eligible = deals.filter((d) => matchesFilters(d, c.filters));
  const weighted = eligible.map((d) => ({
    deal: d,
    basis: numericBasis(d, c.basis) * d.split,
  }));
  const total = weighted.reduce((s, w) => s + w.basis, 0);
  if (total === 0 || c.quota <= 0) return [];

  const attainment = total / c.quota;
  const rate = bandRate(attainment, c.bands);
  const totalCommission = round2(total * rate);

  const parts = weighted.filter((w) => w.basis !== 0);
  let allocated = 0;
  return parts.map((w, i) => {
    const isLast = i === parts.length - 1;
    const amount = isLast
      ? round2(totalCommission - allocated)
      : round2((w.basis / total) * totalCommission);
    allocated += amount;
    return {
      payee: w.deal.owner,
      dealExternalId: w.deal.externalId,
      componentId: c.id,
      componentName: c.name,
      basis: round2(w.basis),
      rate,
      amount,
      detail: {
        type: c.type,
        quota: c.quota,
        attainment: round2(attainment),
        totalBasis: round2(total),
      },
    };
  });
}
