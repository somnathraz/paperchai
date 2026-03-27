function formatMoney(amount: number, currency: string) {
  return new Intl.NumberFormat(currency === "INR" ? "en-IN" : "en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount / 100);
}

export function BillingRefundBanner({
  cancellation,
}: {
  cancellation: {
    cancelledAt: string;
    currency: string;
    refundableAmount: number;
    chargeForUsedPeriod: number;
    refundStatus: string;
  } | null;
}) {
  if (!cancellation) return null;

  const refundStatusLabel =
    cancellation.refundStatus === "PENDING_MANUAL"
      ? "Pending manual refund"
      : cancellation.refundStatus;

  return (
    <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-5">
      <p className="text-xs uppercase tracking-[0.22em] text-emerald-700">Latest cancellation</p>
      <p className="mt-2 text-lg font-semibold text-foreground">
        Refund status: {refundStatusLabel}
      </p>
      <p className="mt-2 text-sm text-muted-foreground">
        Cancelled on {new Date(cancellation.cancelledAt).toLocaleDateString("en-IN")}. Used amount{" "}
        {formatMoney(cancellation.chargeForUsedPeriod, cancellation.currency)}. Refundable amount{" "}
        {formatMoney(cancellation.refundableAmount, cancellation.currency)}.
      </p>
    </div>
  );
}
