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

// Singleton so multiple callers share the same in-flight load promise
let _razorpayLoadPromise: Promise<boolean> | null = null;

function loadRazorpayScript(): Promise<boolean> {
  if (typeof window === "undefined") return Promise.resolve(false);

  // Already loaded
  if (typeof (window as any).Razorpay !== "undefined") return Promise.resolve(true);

  // Already loading — reuse the in-flight promise
  if (_razorpayLoadPromise) return _razorpayLoadPromise;

  _razorpayLoadPromise = new Promise((resolve) => {
    const existing = document.querySelector(
      'script[src="https://checkout.razorpay.com/v1/checkout.js"]'
    );
    if (existing) {
      // Script tag exists but Razorpay not yet on window — wait for it
      existing.addEventListener("load", () => resolve(true));
      existing.addEventListener("error", () => resolve(false));
      return;
    }
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => {
      _razorpayLoadPromise = null; // allow retry next time
      resolve(false);
    };
    document.body.appendChild(script);
  });

  return _razorpayLoadPromise;
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

    // Subscriptions Standard Checkout: `subscription_id` must be sub_… from Razorpay
    // (created via POST /v1/subscriptions with plan_id plan_…). Never pass plan_… here.
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
