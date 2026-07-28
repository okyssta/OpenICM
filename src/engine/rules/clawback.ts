import type { CalculationLine, DealSnapshot, ClawbackComponent } from "../types";
import { matchesFilters, round2 } from "../helpers";

/**
 * Clawback — reverses commission from deals that churned within
 * the lookback window. Works as a post-process: identifies deals
 * that were previously paid but are now cancelled/refunded.
 *
 * ponytail: looks for deals with type=cancelled or type=refunded
 * within the lookback period. Multi-tier or conditional clawbacks
 * when the policy gets more nuanced.
 */
export function calcClawback(
  deals: DealSnapshot[],
  c: ClawbackComponent
): CalculationLine[] {
  const filtered = deals.filter((d) => matchesFilters(d, c.filters));
  if (filtered.length === 0) return [];

  const now = new Date();
  const lines: CalculationLine[] = [];

  for (const deal of filtered) {
    // Check if this is a churned deal
    const type = String(deal.fields["type"] ?? "").toLowerCase();
    if (type !== "cancelled" && type !== "refunded" && type !== "churned") continue;

    // Check if within lookback period
    const closedAt = new Date(deal.closedAt);
    const monthsAgo = (now.getFullYear() - closedAt.getFullYear()) * 12 +
      (now.getMonth() - closedAt.getMonth());
    if (monthsAgo > c.lookbackMonths) continue;

    // Reverse commission based on the deal value
    const dealValue = typeof deal.fields["value"] === "number"
      ? deal.fields["value"]
      : Number(deal.fields["value"] ?? 0);
    if (!dealValue || !Number.isFinite(dealValue)) continue;

    const reversalAmount = round2(dealValue * c.reversalRate * deal.split);

    lines.push({
      payee: deal.owner,
      dealExternalId: deal.externalId,
      componentId: c.id,
      componentName: c.name,
      basis: dealValue,
      rate: c.reversalRate,
      amount: -Math.abs(reversalAmount), // negative = clawback
      detail: {
        type: "clawback",
        lookbackMonths: c.lookbackMonths,
        dealClosedAt: deal.closedAt,
        reversalRate: c.reversalRate,
      },
    });
  }

  return lines;
}
