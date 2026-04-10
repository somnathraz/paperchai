"use client";

import { useCallback, useEffect, useRef } from "react";

type RazorpaySuccessResponse = {
  razorpay_payment_id: string;
  razorpay_subscription_id: string;
  razorpay_signature: string;
};

type OpenCheckoutOptions = {
  subscriptionId: string;
  keyId: string;
  prefill?: { email?: string; name?: string };
  description?: string;
  onSuccess: (response: RazorpaySuccessResponse) => void;
  onFailure: () => void;
};

function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof window === "undefined") {
      resolve(false);
      return;
    }
    if ((window as any).Razorpay) {
      resolve(true);
      return;
    }
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

export function useRazorpaySubscriptionCheckout() {
  const scriptLoadedRef = useRef(false);

  useEffect(() => {
    // Pre-load the script eagerly
    loadRazorpayScript().then((loaded) => {
      scriptLoadedRef.current = loaded;
    });
  }, []);

  const openCheckout = useCallback(async (opts: OpenCheckoutOptions) => {
    // Ensure script is loaded
    const loaded = await loadRazorpayScript();
    if (!loaded || typeof (window as any).Razorpay === "undefined") {
      opts.onFailure();
      console.error("[Razorpay] Checkout script failed to load");
      return;
    }

    const rzp = new (window as any).Razorpay({
      key: opts.keyId,
      subscription_id: opts.subscriptionId,
      name: "PaperChai",
      description: opts.description || "Workspace Subscription",
      handler: (response: RazorpaySuccessResponse) => {
        opts.onSuccess(response);
      },
      modal: {
        ondismiss: () => {
          opts.onFailure();
        },
      },
      prefill: {
        email: opts.prefill?.email || "",
        name: opts.prefill?.name || "",
      },
      theme: {
        color: "#10b981",
      },
    });

    rzp.open();
  }, []);

  return { openCheckout };
}
