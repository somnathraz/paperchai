"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

function formatMoney(amount: number, currency: string) {
  return new Intl.NumberFormat(currency === "INR" ? "en-IN" : "en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount / 100);
}

export function SubscriptionCancelCard({
  canCancel,
  currency,
  periodStart,
  periodEnd,
  chargeForUsedPeriod,
  refundableAmount,
}: {
  canCancel: boolean;
  currency: string;
  periodStart: string | null;
  periodEnd: string | null;
  chargeForUsedPeriod: number;
  refundableAmount: number;
}) {
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [confirming, setConfirming] = useState(false);

  const cancelSubscription = async () => {
    if (!canCancel) return;

    setLoading(true);
    try {
      const res = await fetch("/api/billing/subscription/cancel", { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || "Failed to cancel subscription");
      }
      setDone(true);
      setConfirming(false);
      toast.success(data.message || "Subscription canceled");
      window.location.reload();
    } catch (error: any) {
      toast.error(error.message || "Failed to cancel subscription");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-5">
      <p className="text-xs uppercase tracking-[0.22em] text-amber-700">Cancellation</p>
      <p className="mt-2 text-lg font-semibold text-foreground">
        Cancel anytime with prorated refund handling
      </p>
      <p className="mt-2 text-sm text-muted-foreground">
        We charge only for the service used up to the cancellation date. The remaining unused
        prepaid amount is refundable.
      </p>

      {periodStart && periodEnd ? (
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-amber-200 bg-white/80 p-3">
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
              Current period
            </p>
            <p className="mt-1 text-sm font-medium text-foreground">
              {new Date(periodStart).toLocaleDateString("en-IN")} to{" "}
              {new Date(periodEnd).toLocaleDateString("en-IN")}
            </p>
          </div>
          <div className="rounded-xl border border-amber-200 bg-white/80 p-3">
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
              Proration preview
            </p>
            <p className="mt-1 text-sm text-foreground">
              Used: {formatMoney(chargeForUsedPeriod, currency)} · Refundable:{" "}
              {formatMoney(refundableAmount, currency)}
            </p>
          </div>
        </div>
      ) : null}

      <div className="mt-4 flex items-center justify-between gap-3">
        <p className="text-xs text-muted-foreground">
          This downgrades the workspace to the Free plan immediately.
        </p>
        {confirming ? (
          <div className="flex items-center gap-2">
            <p className="text-xs text-amber-800">Cancel the paid subscription and move to Free?</p>
            <Button
              variant="outline"
              size="sm"
              className="border-amber-300 text-amber-800 hover:bg-amber-100"
              onClick={cancelSubscription}
              disabled={loading}
            >
              {loading ? "Cancelling..." : "Yes, cancel"}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setConfirming(false)}
              disabled={loading}
            >
              Keep
            </Button>
          </div>
        ) : (
          <Button
            variant="outline"
            className="border-amber-300 text-amber-800 hover:bg-amber-100"
            onClick={() => setConfirming(true)}
            disabled={!canCancel || done}
          >
            {done ? "Cancelled" : "Cancel subscription"}
          </Button>
        )}
      </div>
    </div>
  );
}
