type RazorpayRefundResult = {
  id: string;
  amount: number;
  currency: string;
  payment_id: string;
  status: string;
  speed_processed?: string;
  created_at?: number;
};

function getRazorpayRefundConfig() {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  return {
    keyId,
    keySecret,
    isConfigured: Boolean(keyId && keySecret),
  };
}

function getRazorpayAuthHeader() {
  const { keyId, keySecret } = getRazorpayRefundConfig();
  if (!keyId || !keySecret) {
    throw new Error("Razorpay refund credentials are not configured");
  }
  return `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString("base64")}`;
}

export async function createRazorpayRefund({
  paymentId,
  amount,
  receipt,
  notes,
}: {
  paymentId: string;
  amount: number;
  receipt?: string;
  notes?: Record<string, string>;
}) {
  const response = await fetch(`https://api.razorpay.com/v1/payments/${paymentId}/refund`, {
    method: "POST",
    headers: {
      Authorization: getRazorpayAuthHeader(),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      amount,
      speed: "normal",
      receipt,
      notes,
    }),
    cache: "no-store",
  });

  const json = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(json?.error?.description || json?.error || "Failed to create Razorpay refund");
  }

  return json as RazorpayRefundResult;
}

export function getRefundProviderReadiness() {
  return {
    razorpayConfigured: getRazorpayRefundConfig().isConfigured,
  };
}
