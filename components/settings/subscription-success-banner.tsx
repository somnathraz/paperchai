"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { notifyBillingUpgradeSuccess } from "@/components/settings/billing-upgrade-celebration";

export function SubscriptionSuccessBanner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [activating, setActivating] = useState(false);
  const attempted = useRef(false);

  useEffect(() => {
    const subscriptionParam = searchParams.get("subscription");
    if (subscriptionParam !== "success") return;
    if (attempted.current) return;
    attempted.current = true;

    const paymentId = searchParams.get("razorpay_payment_id");
    const paymentLinkId = searchParams.get("razorpay_payment_link_id");
    const referenceId = searchParams.get("razorpay_payment_link_reference_id");
    const status = searchParams.get("razorpay_payment_link_status");
    const signature = searchParams.get("razorpay_signature");

    // Clean URL params immediately
    const url = new URL(window.location.href);
    url.searchParams.delete("subscription");
    url.searchParams.delete("razorpay_payment_id");
    url.searchParams.delete("razorpay_payment_link_id");
    url.searchParams.delete("razorpay_payment_link_reference_id");
    url.searchParams.delete("razorpay_payment_link_status");
    url.searchParams.delete("razorpay_signature");
    window.history.replaceState({}, "", url.toString());

    if (paymentId && paymentLinkId && referenceId && status && signature) {
      setActivating(true);
      fetch("/api/billing/subscription/activate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          razorpay_payment_id: paymentId,
          razorpay_payment_link_id: paymentLinkId,
          razorpay_payment_link_reference_id: referenceId,
          razorpay_payment_link_status: status,
          razorpay_signature: signature,
        }),
      })
        .then((res) => res.json().catch(() => ({})))
        .then(
          (data: {
            ok?: boolean;
            alreadyActivated?: boolean;
            planCode?: string;
            error?: string;
          }) => {
            if (data.ok || data.alreadyActivated) {
              const code = data.planCode;
              if (code && code !== "UNKNOWN") {
                notifyBillingUpgradeSuccess(code);
              }
              toast.success("Plan upgraded! Your new features are active now.", {
                duration: 5000,
              });
              router.refresh();
            } else {
              toast.success("Payment received! Your plan will activate shortly.", {
                duration: 6000,
                description: data.error || "Refresh in a few seconds to see your new plan.",
              });
              router.refresh();
            }
          }
        )
        .catch(() => {
          toast.success("Payment received! Your plan will activate shortly.", {
            duration: 6000,
            description: "Refresh in a few seconds if your plan hasn't updated.",
          });
          router.refresh();
        })
        .finally(() => setActivating(false));
    } else {
      toast.success("Payment received! Your plan is being activated.", {
        duration: 6000,
        description: "It may take a few seconds for your plan to reflect here.",
      });
      router.refresh();
    }
  }, [searchParams, router]);

  if (!activating) return null;

  return (
    <div className="flex items-center gap-2 rounded-xl border border-primary/30 bg-primary/5 px-4 py-3 text-sm font-medium text-primary">
      <Loader2 className="h-4 w-4 animate-spin" />
      Activating your plan…
    </div>
  );
}
