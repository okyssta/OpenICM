import type { CalcInput, CalculationLine, CalculationResult, DealSnapshot } from "./types";
import { groupByPayee, inPeriod, round2 } from "./helpers";
import { calcComponent } from "./rules";

/**
 * Expand deals: a deal with co-owners generates one synthetic deal per owner,
 * each with its own adjusted split.
 */
function expandCoOwners(deals: DealSnapshot[]): DealSnapshot[] {
  const expanded: DealSnapshot[] = [];
  for (const d of deals) {
    if (d.coOwners.length > 0) {
      // Primary owner gets remaining split
      const primaryShare = Math.max(0, 1 - d.coOwners.reduce((s, c) => s + c.split, 0));
      expanded.push({ ...d, split: primaryShare });
      for (const co of d.coOwners) {
        expanded.push({ ...d, owner: co.owner, split: co.split, coOwners: [] });
      }
    } else {
      expanded.push(d);
    }
  }
  return expanded;
}

export function calculate(input: CalcInput): CalculationResult {
  const { definition, deals, periodStart, periodEnd } = input;

  const active = deals.filter(
    (d) => !d.deleted && d.owner && inPeriod(d.closedAt, periodStart, periodEnd)
  );

  // Expand multi-payee splits before grouping
  const expanded = expandCoOwners(active);
  const byPayee = groupByPayee(expanded);
  const lines: CalculationLine[] = [];

  for (const [, payeeDeals] of byPayee) {
    for (const component of definition.components) {
      lines.push(...calcComponent(payeeDeals, component));
    }
  }

  const totalsByPayee: Record<string, number> = {};
  const dealsByPayee: Record<string, Set<string>> = {};
  for (const line of lines) {
    totalsByPayee[line.payee] = round2(
      (totalsByPayee[line.payee] ?? 0) + line.amount
    );
    (dealsByPayee[line.payee] ??= new Set()).add(line.dealExternalId);
  }

  const dealsCountByPayee: Record<string, number> = {};
  for (const [payee, set] of Object.entries(dealsByPayee)) {
    dealsCountByPayee[payee] = set.size;
  }

  return { lines, totalsByPayee, dealsByPayee: dealsCountByPayee };
}
