import type { CalcInput, CalculationLine, CalculationResult } from "./types";
import { groupByPayee, inPeriod, round2 } from "./helpers";
import { calcComponent } from "./rules";

export function calculate(input: CalcInput): CalculationResult {
  const { definition, deals, periodStart, periodEnd } = input;

  const active = deals.filter(
    (d) => !d.deleted && d.owner && inPeriod(d.closedAt, periodStart, periodEnd)
  );

  const byPayee = groupByPayee(active);
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
