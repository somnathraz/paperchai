import { createHmacSignature, verifyHmacSignature } from "@/lib/encryption";

type RazorpayPaymentLinkPayload = {
  amount: number;
  currency: string;
  description: string;
  reference_id: string;
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
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
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
