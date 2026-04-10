"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { AlertTriangle, CheckCircle2, Clock, XCircle } from "lucide-react";

const CANCEL_WINDOW_DAYS = 7;

function formatMoney(amount: number, currency: string) {
  return new Intl.NumberFormat(currency === "INR" ? "en-IN" : "en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount / 100);
}

function fmtDate(d: string | Date) {
  return new Date(d).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
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
  const [apiError, setApiError] = useState<string | null>(null);

  // Compute 7-day cancellation window
  const windowInfo = useMemo(() => {
    if (!periodStart) return null;
    const start = new Date(periodStart);
    const windowEnd = new Date(start);
    windowEnd.setDate(windowEnd.getDate() + CANCEL_WINDOW_DAYS);
    const now = new Date();
    const isOpen = now <= windowEnd;
    const daysRemaining = Math.max(
      0,
      Math.ceil((windowEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    );
    return { windowEnd, isOpen, daysRemaining };
  }, [periodStart]);

  const windowOpen = windowInfo?.isOpen ?? false;
  const canActuallyCancel = canCancel && windowOpen && !done;

  const cancelSubscription = async () => {
    if (!canActuallyCancel) return;
    setLoading(true);
    setApiError(null);
    try {
      const res = await fetch("/api/billing/subscription/cancel", { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || "Failed to cancel subscription");
      }
      setDone(true);
      setConfirming(false);
      toast.success("Subscription cancelled. Your workspace is now on the Free plan.");
      setTimeout(() => window.location.reload(), 1500);
    } catch (error: any) {
      setApiError(error.message || "Failed to cancel subscription");
      toast.error(error.message || "Failed to cancel subscription");
    } finally {
      setLoading(false);
    }
  };

  // Not on a paid plan — don't render
  if (!canCancel) return null;

  return (
    <div
      id="subscription-cancellation"
      className="scroll-mt-24 rounded-2xl border border-amber-200 bg-amber-50/60 p-6"
    >
      <p className="text-xs font-medium uppercase tracking-[0.22em] text-amber-700">Cancellation</p>
      <p className="mt-2 text-lg font-semibold text-foreground">Cancel subscription</p>
      <p className="mt-1 text-sm text-muted-foreground leading-relaxed">
        Cancellations are allowed within <strong>{CANCEL_WINDOW_DAYS} days</strong> of purchase. You
        are charged only for the time used — the remaining prepaid amount is refundable.
      </p>

      {/* 7-day window status */}
      {windowInfo && (
        <div
          className={`mt-4 flex items-start gap-3 rounded-xl border p-3 ${
            windowInfo.isOpen ? "border-emerald-200 bg-emerald-50" : "border-red-200 bg-red-50"
          }`}
        >
          {windowInfo.isOpen ? (
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
          ) : (
            <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
          )}
          <div>
            {windowInfo.isOpen ? (
              <>
                <p className="text-sm font-medium text-emerald-800">
                  Cancellation window open · {windowInfo.daysRemaining} day
                  {windowInfo.daysRemaining !== 1 ? "s" : ""} remaining
                </p>
                <p className="text-xs text-emerald-700 mt-0.5">
                  Window closes on {fmtDate(windowInfo.windowEnd)}
                </p>
              </>
            ) : (
              <>
                <p className="text-sm font-medium text-red-700">Cancellation window closed</p>
                <p className="text-xs text-red-600 mt-0.5">
                  The 7-day window expired on {fmtDate(windowInfo.windowEnd)}. Your current billing
                  period runs until {periodEnd ? fmtDate(periodEnd) : "end of period"} and is
                  non-refundable.
                </p>
              </>
            )}
          </div>
        </div>
      )}

      {/* Proration preview — only useful if window open */}
      {windowOpen && periodStart && periodEnd && (
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-amber-200 bg-white/80 p-3">
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Period</p>
            <p className="mt-1 text-xs font-medium text-foreground">
              {fmtDate(periodStart)} → {fmtDate(periodEnd)}
            </p>
          </div>
          <div className="rounded-xl border border-amber-200 bg-white/80 p-3">
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
              Used (charged)
            </p>
            <p className="mt-1 text-sm font-semibold text-foreground">
              {formatMoney(chargeForUsedPeriod, currency)}
            </p>
          </div>
          <div className="rounded-xl border border-emerald-200 bg-emerald-50/80 p-3">
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Refundable</p>
            <p className="mt-1 text-sm font-semibold text-emerald-700">
              {formatMoney(refundableAmount, currency)}
            </p>
          </div>
        </div>
      )}

      {/* Action */}
      <div className="mt-5">
        {done ? (
          <div className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-3">
            <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" />
            <div>
              <p className="text-sm font-semibold text-emerald-800">Subscription cancelled</p>
              <p className="text-xs text-emerald-700">
                Your workspace is now on the Free plan.{" "}
                <Link href="#workspace-plans" className="underline underline-offset-2">
                  Upgrade again anytime.
                </Link>
              </p>
            </div>
          </div>
        ) : !windowOpen ? (
          <div className="flex items-start gap-2 rounded-xl border border-border/60 bg-white/60 p-3">
            <Clock className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
            <p className="text-xs text-muted-foreground">
              The cancellation window has passed. Your plan remains active until the end of the
              current billing period. You can{" "}
              <Link href="#workspace-plans" className="underline underline-offset-2">
                upgrade to a higher plan
              </Link>{" "}
              at any time.
            </p>
          </div>
        ) : confirming ? (
          <div className="flex flex-col gap-3 rounded-xl border border-amber-300 bg-amber-100/60 p-4">
            <div className="flex items-start gap-2">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" />
              <div>
                <p className="text-sm font-semibold text-amber-900">Confirm cancellation</p>
                <p className="text-xs text-amber-800 mt-0.5">
                  Your workspace will move to the <strong>Free plan immediately</strong>.
                  {refundableAmount > 0 && (
                    <>
                      {" "}
                      A refund of <strong>{formatMoney(refundableAmount, currency)}</strong> will be
                      processed within 5–7 business days.
                    </>
                  )}
                </p>
                {apiError && <p className="mt-2 text-xs text-red-600">{apiError}</p>}
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setConfirming(false);
                  setApiError(null);
                }}
                disabled={loading}
              >
                Keep subscription
              </Button>
              <Button
                size="sm"
                className="bg-red-600 text-white hover:bg-red-700"
                onClick={cancelSubscription}
                disabled={loading}
              >
                {loading ? "Cancelling..." : "Yes, cancel now"}
              </Button>
            </div>
          </div>
        ) : (
          <Button
            variant="outline"
            className="border-amber-300 text-amber-800 hover:bg-amber-100"
            onClick={() => setConfirming(true)}
          >
            Cancel subscription
          </Button>
        )}
      </div>
    </div>
  );
}
