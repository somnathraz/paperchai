import { addMonths, addYears, differenceInMilliseconds } from "date-fns";

export function deriveSubscriptionPeriodEnd(
  start: Date | null | undefined,
  explicitEnd: Date | null | undefined,
  interval: "month" | "year"
) {
  if (explicitEnd) return explicitEnd;
  if (!start) return null;
  return interval === "year" ? addYears(start, 1) : addMonths(start, 1);
}

export function calculateProratedRefund({
  priceAmount,
  periodStart,
  periodEnd,
  cancelledAt,
}: {
  priceAmount: number;
  periodStart: Date;
  periodEnd: Date;
  cancelledAt: Date;
}) {
  const totalMs = Math.max(0, differenceInMilliseconds(periodEnd, periodStart));
  const remainingMs = Math.max(0, differenceInMilliseconds(periodEnd, cancelledAt));
  const usedMs = Math.max(0, totalMs - remainingMs);

  if (totalMs === 0 || priceAmount <= 0) {
    return {
      chargeForUsedPeriod: 0,
      refundableAmount: 0,
      usageRatio: 1,
      remainingRatio: 0,
    };
  }

  const usageRatio = Math.min(1, usedMs / totalMs);
  const remainingRatio = Math.min(1, remainingMs / totalMs);
  const chargeForUsedPeriod = Math.round(priceAmount * usageRatio);
  const refundableAmount = Math.max(0, priceAmount - chargeForUsedPeriod);

  return {
    chargeForUsedPeriod,
    refundableAmount,
    usageRatio,
    remainingRatio,
  };
}
