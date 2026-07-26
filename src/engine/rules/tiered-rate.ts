import type { CalculationLine, DealSnapshot, Tier, TieredRateComponent } from "../types";
import { matchesFilters, numericBasis, round2 } from "../helpers";

function marginalOnSlice(from: number, to: number, tiers: Tier[]): number {
  let prev = 0;
  let total = 0;
  for (const tier of tiers) {
    const cap = tier.upTo ?? Infinity;
    const start = Math.max(from, prev);
    const end = Math.min(to, cap);
    if (end > start) total += (end - start) * tier.rate;
    prev = cap;
    if (prev >= to) break;
  }
  return total;
}

function rateForTotal(total: number, tiers: Tier[]): number {
  let prev = 0;
  for (const tier of tiers) {
    const cap = tier.upTo ?? Infinity;
    if (total > prev && total <= cap) return tier.rate;
    prev = cap;
  }
  return tiers.length ? (tiers[tiers.length - 1].rate ?? 0) : 0;
}

export function calcTieredRate(
  deals: DealSnapshot[],
  c: TieredRateComponent
): CalculationLine[] {
  const eligible = deals.filter((d) => matchesFilters(d, c.filters));
  if (eligible.length === 0) return [];

  if (c.mode === "marginal") {
    const lines: CalculationLine[] = [];
    let cumulative = 0;
    for (const deal of eligible) {
      const basis = numericBasis(deal, c.basis) * deal.split;
      if (basis === 0) continue;
      const from = cumulative;
      const to = cumulative + basis;
      const amount = round2(marginalOnSlice(from, to, c.tiers));
      cumulative = to;
      lines.push({
        payee: deal.owner,
        dealExternalId: deal.externalId,
        componentId: c.id,
        componentName: c.name,
        basis: round2(basis),
        rate: amount / basis,
        amount,
        detail: { type: c.type, mode: c.mode, cumulativeTo: round2(to) },
      });
    }
    return lines;
  }

  const weighted = eligible.map((d) => ({
    deal: d,
    basis: numericBasis(d, c.basis) * d.split,
  }));
  const total = weighted.reduce((s, w) => s + w.basis, 0);
  if (total === 0) return [];
  const rate = rateForTotal(total, c.tiers);
  const totalCommission = round2(total * rate);

  return weighted
    .filter((w) => w.basis !== 0)
    .map((w, i, arr) => {
      const isLast = i === arr.length - 1;
      const share = isLast
        ? round2(totalCommission - arr.slice(0, i).reduce(
            (s, x) => s + round2((x.basis / total) * totalCommission), 0))
        : round2((w.basis / total) * totalCommission);
      return {
        payee: w.deal.owner,
        dealExternalId: w.deal.externalId,
        componentId: c.id,
        componentName: c.name,
        basis: round2(w.basis),
        rate,
        amount: share,
        detail: { type: c.type, mode: c.mode, totalBasis: round2(total) },
      };
    });
}
