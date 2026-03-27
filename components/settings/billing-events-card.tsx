function formatMoney(amount: number, currency: string) {
  return new Intl.NumberFormat(currency === "INR" ? "en-IN" : "en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount / 100);
}

type BillingEvent = {
  id: string;
  action: string;
  createdAt: string;
  metadata: {
    previousPlanCode?: string;
    nextPlanCode?: string;
    currency?: string;
    refundableAmount?: number;
    chargeForUsedPeriod?: number;
    refundStatus?: string;
    refundProvider?: string;
    refundId?: string;
  } | null;
};

export function BillingEventsCard({ events }: { events: BillingEvent[] }) {
  return (
    <div className="rounded-2xl border border-white/20 bg-white/70 p-6 shadow-[0_18px_60px_-40px_rgba(0,0,0,0.45)]">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">
            Billing history
          </p>
          <p className="text-lg font-semibold text-foreground">Cancellation and refund decisions</p>
        </div>
      </div>

      <div className="mt-4 space-y-3">
        {events.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border/60 bg-muted/20 px-4 py-6 text-sm text-muted-foreground">
            No billing events recorded yet.
          </div>
        ) : (
          events.map((event) => (
            <div
              key={event.id}
              className="rounded-xl border border-border/60 bg-white/80 px-4 py-3"
            >
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-semibold text-foreground">
                    {event.action === "BILLING_SUBSCRIPTION_CANCELED"
                      ? "Subscription canceled"
                      : event.action}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(event.createdAt).toLocaleString("en-IN")}
                  </p>
                </div>
                <div className="text-xs text-muted-foreground">
                  {event.metadata?.refundStatus || "—"}
                </div>
              </div>
              <div className="mt-2 text-xs text-muted-foreground">
                {event.metadata?.previousPlanCode ? `From ${event.metadata.previousPlanCode}` : ""}
                {event.metadata?.nextPlanCode ? ` to ${event.metadata.nextPlanCode}` : ""}
                {event.metadata?.currency
                  ? ` · Used ${formatMoney(
                      Number(event.metadata.chargeForUsedPeriod || 0),
                      event.metadata.currency
                    )} · Refundable ${formatMoney(
                      Number(event.metadata.refundableAmount || 0),
                      event.metadata.currency
                    )}`
                  : ""}
                {event.metadata?.refundProvider ? ` · ${event.metadata.refundProvider}` : ""}
                {event.metadata?.refundId ? ` · Refund ID ${event.metadata.refundId}` : ""}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
