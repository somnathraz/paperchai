import { createHmacSignature, verifyHmacSignature } from "@/lib/encryption";

type RazorpayPaymentLinkPayload = {
  amount: number;
  currency: string;
  description: string;
  reference_id: string;
  expire_by?: number;
  customer?: {
    name?: string;
    email?: string;
    contact?: string;
  };
  notify?: {
    email?: boolean;
    sms?: boolean;
  };
  reminder_enable?: boolean;
  notes?: Record<string, string>;
  accept_partial?: boolean;
  first_min_partial_amount?: number;
  callback_url?: string;
  callback_method?: "get";
};

type RazorpayPaymentLinkResponse = {
  id: string;
  status: string;
  short_url: string;
  amount: number;
  amount_paid?: number;
  currency: string;
  reference_id?: string;
};

function getRazorpayConfig() {
  // Support multiple common env var naming conventions
  const keyId =
    process.env.RAZORPAY_KEY_ID ||
    process.env.RAZORPAY_API_KEY ||
    process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID ||
    process.env.NEXT_PUBLIC_RAZORPAY_API_KEY;
  const keySecret =
    process.env.RAZORPAY_KEY_SECRET || process.env.RAZORPAY_SECRET || process.env.RAZORPAY_SECRECT; // typo alias kept for backward compat
  const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;

  return {
    keyId,
    keySecret,
    webhookSecret,
    isConfigured: Boolean(keyId && keySecret),
    isWebhookConfigured: Boolean(webhookSecret),
  };
}

function getAuthHeader() {
  const { keyId, keySecret } = getRazorpayConfig();
  if (!keyId || !keySecret) {
    throw new Error("Razorpay is not configured");
  }

  return `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString("base64")}`;
}

export async function createRazorpayPaymentLink(payload: RazorpayPaymentLinkPayload) {
  const response = await fetch("https://api.razorpay.com/v1/payment_links", {
    method: "POST",
    headers: {
      Authorization: getAuthHeader(),
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
    cache: "no-store",
  });

  const json = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(
      json?.error?.description || json?.error || "Failed to create Razorpay payment link"
    );
  }

  return json as RazorpayPaymentLinkResponse;
}

export function verifyRazorpayWebhookSignature(payload: string, signature?: string | null) {
  const { webhookSecret } = getRazorpayConfig();
  if (!webhookSecret) {
    throw new Error("RAZORPAY_WEBHOOK_SECRET is not configured");
  }
  if (!signature) {
    return false;
  }
  return verifyHmacSignature(payload, signature, webhookSecret);
}

export function verifyRazorpayCheckoutSignature({
  orderId,
  paymentId,
  signature,
}: {
  orderId: string;
  paymentId: string;
  signature: string;
}) {
  const { keySecret } = getRazorpayConfig();
  if (!keySecret) {
    throw new Error("RAZORPAY_KEY_SECRET is not configured");
  }
  const expected = createHmacSignature(`${orderId}|${paymentId}`, keySecret);
  return expected === signature;
}

export function getRazorpayPublicConfig() {
  const { keyId, isConfigured, isWebhookConfigured } = getRazorpayConfig();
  return {
    keyId: keyId || "",
    isConfigured,
    isWebhookConfigured,
  };
}

export function getRazorpayKeyCredentials() {
  const { keyId, keySecret, isConfigured } = getRazorpayConfig();
  return { keyId: keyId || "", keySecret: keySecret || "", isConfigured };
}

// ---- Razorpay Subscriptions API ----

type RazorpayPlanResponse = {
  id: string;
  entity: string;
  interval: number;
  period: string;
  item: {
    id: string;
    active: boolean;
    amount: number;
    unit_amount: number;
    currency: string;
    name: string;
  };
};

type RazorpayCustomerResponse = {
  id: string;
  entity: string;
  name: string;
  email: string;
  contact: string;
};

type RazorpaySubscriptionResponse = {
  id: string;
  entity: string;
  plan_id: string;
  status: string;
  current_start: number | null;
  current_end: number | null;
  short_url: string;
  total_count: number;
  paid_count: number;
  remaining_count: number;
  notes: Record<string, string>;
};

export async function createRazorpayPlan(opts: {
  period: "monthly" | "yearly";
  amount: number;
  currency: string;
  name: string;
}): Promise<RazorpayPlanResponse> {
  const response = await fetch("https://api.razorpay.com/v1/plans", {
    method: "POST",
    headers: {
      Authorization: getAuthHeader(),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      period: opts.period,
      interval: 1,
      item: {
        name: opts.name,
        amount: opts.amount,
        currency: opts.currency,
        description: opts.name,
      },
    }),
    cache: "no-store",
  });

  const json = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(json?.error?.description || json?.error || "Failed to create Razorpay plan");
  }

  return json as RazorpayPlanResponse;
}

export async function createRazorpayCustomer(opts: {
  name?: string;
  email: string;
  contact?: string;
}): Promise<RazorpayCustomerResponse> {
  const response = await fetch("https://api.razorpay.com/v1/customers", {
    method: "POST",
    headers: {
      Authorization: getAuthHeader(),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name: opts.name || opts.email,
      email: opts.email,
      contact: opts.contact || undefined,
      fail_existing: 0, // return existing customer if email matches
    }),
    cache: "no-store",
  });

  const json = await response.json().catch(() => ({}));
  if (!response.ok) {
    const description: string = json?.error?.description || "";
    // Razorpay sometimes ignores fail_existing:0 and returns a 400.
    // If the customer already exists, fetch them by email instead.
    if (description.toLowerCase().includes("customer already exists")) {
      const searchRes = await fetch(
        `https://api.razorpay.com/v1/customers?email=${encodeURIComponent(opts.email)}&count=1`,
        { headers: { Authorization: getAuthHeader() }, cache: "no-store" }
      );
      const searchJson = await searchRes.json().catch(() => ({}));
      const existing = searchJson?.items?.[0];
      if (existing?.id) return existing as RazorpayCustomerResponse;
    }
    throw new Error(description || json?.error || "Failed to create Razorpay customer");
  }

  return json as RazorpayCustomerResponse;
}

/** Creates a Razorpay subscription server-side. `planId` is the Razorpay plan id (plan_…). */
export async function createRazorpaySubscription(opts: {
  planId: string;
  customerId?: string;
  totalCount?: number;
  notes?: Record<string, string>;
  notifyCustomer?: boolean;
}): Promise<RazorpaySubscriptionResponse> {
  const body: Record<string, unknown> = {
    plan_id: opts.planId,
    total_count: opts.totalCount ?? 60,
    quantity: 1,
    notify_info: {
      notify_email: opts.notifyCustomer ?? true,
    },
  };

  if (opts.customerId) {
    body.customer_id = opts.customerId;
  }

  if (opts.notes) {
    body.notes = opts.notes;
  }

  const response = await fetch("https://api.razorpay.com/v1/subscriptions", {
    method: "POST",
    headers: {
      Authorization: getAuthHeader(),
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
    cache: "no-store",
  });

  const json = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(
      json?.error?.description || json?.error || "Failed to create Razorpay subscription"
    );
  }

  return json as RazorpaySubscriptionResponse;
}

export async function cancelRazorpaySubscription(
  subscriptionId: string,
  cancelAtCycleEnd = false
): Promise<{ id: string; status: string }> {
  const response = await fetch(
    `https://api.razorpay.com/v1/subscriptions/${subscriptionId}/cancel`,
    {
      method: "POST",
      headers: {
        Authorization: getAuthHeader(),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ cancel_at_cycle_end: cancelAtCycleEnd ? 1 : 0 }),
      cache: "no-store",
    }
  );

  const json = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(
      json?.error?.description || json?.error || "Failed to cancel Razorpay subscription"
    );
  }

  return json as { id: string; status: string };
}

export async function getRazorpaySubscription(
  subscriptionId: string
): Promise<RazorpaySubscriptionResponse> {
  const response = await fetch(`https://api.razorpay.com/v1/subscriptions/${subscriptionId}`, {
    method: "GET",
    headers: {
      Authorization: getAuthHeader(),
    },
    cache: "no-store",
  });

  const json = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(
      json?.error?.description || json?.error || "Failed to get Razorpay subscription"
    );
  }

  return json as RazorpaySubscriptionResponse;
}

export function verifyRazorpaySubscriptionSignature({
  paymentId,
  subscriptionId,
  signature,
}: {
  paymentId: string;
  subscriptionId: string;
  signature: string;
}): boolean {
  const { keySecret } = getRazorpayConfig();
  if (!keySecret) {
    throw new Error("RAZORPAY_KEY_SECRET is not configured");
  }
  const message = `${paymentId}|${subscriptionId}`;
  const expected = createHmacSignature(message, keySecret);
  try {
    const a = Buffer.from(expected, "hex");
    const b = Buffer.from(signature, "hex");
    if (a.length !== b.length) return false;
    let diff = 0;
    for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
    return diff === 0;
  } catch {
    return expected === signature;
  }
}
