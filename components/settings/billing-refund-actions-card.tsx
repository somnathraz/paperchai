"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

type RefundCandidate = {
  id: string;
  createdAt: string;
  metadata: {
    refundableAmount?: number;
    refundStatus?: string;
    currency?: string;
  } | null;
};

export function BillingRefundActionsCard({
  events,
  razorpayReady,
}: {
  events: RefundCandidate[];
  razorpayReady: boolean;
}) {
  const pending = useMemo(
    () =>
      events.filter((event) => {
        const status = event.metadata?.refundStatus || "PENDING_MANUAL";
        return status === "PENDING_MANUAL" || status === "PROCESSING";
      }),
    [events]
  );

  const [selectedId, setSelectedId] = useState(pending[0]?.id || "");
  const [paymentId, setPaymentId] = useState("");
  const [loading, setLoading] = useState(false);

  if (pending.length === 0) return null;

  const processRefund = async () => {
    if (!selectedId || !paymentId.trim()) {
      toast.error("Select a billing event and enter Razorpay payment ID");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/billing/refunds/process", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          auditLogId: selectedId,
          paymentId: paymentId.trim(),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || "Failed to process refund");
      }
      toast.success("Refund request submitted to Razorpay");
      window.location.reload();
    } catch (error: any) {
      toast.error(error.message || "Failed to process refund");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-2xl border border-sky-200 bg-sky-50/70 p-6">
      <p className="text-xs uppercase tracking-[0.22em] text-sky-700">Provider refund</p>
      <p className="mt-2 text-lg font-semibold text-foreground">
        Razorpay refund automation is ready
      </p>
      <p className="mt-2 text-sm text-muted-foreground">
        Once Razorpay env is configured, enter the Razorpay payment ID for the cancelled
        subscription payment and process the refundable amount directly from PaperChai.
      </p>

      <div className="mt-4 space-y-3">
        <select
          value={selectedId}
          onChange={(e) => setSelectedId(e.target.value)}
          className="w-full rounded-xl border border-border/60 bg-white px-3 py-2 text-sm"
        >
          {pending.map((event) => (
            <option key={event.id} value={event.id}>
              {new Date(event.createdAt).toLocaleString("en-IN")} · Refund status{" "}
              {event.metadata?.refundStatus || "PENDING_MANUAL"}
            </option>
          ))}
        </select>

        <Input
          value={paymentId}
          onChange={(e) => setPaymentId(e.target.value)}
          placeholder="Razorpay payment ID (pay_...)"
        />

        <div className="flex items-center justify-between gap-3">
          <p className="text-xs text-muted-foreground">
            {razorpayReady
              ? "Razorpay env detected."
              : "Razorpay env not configured yet. Add env later and this action will become usable."}
          </p>
          <Button onClick={processRefund} disabled={!razorpayReady || loading}>
            {loading ? "Processing..." : "Process via Razorpay"}
          </Button>
        </div>
      </div>
    </div>
  );
}
