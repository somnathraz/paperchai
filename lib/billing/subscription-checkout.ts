import { prisma } from "@/lib/prisma";
import { sendSubscriptionUpgradedEmail } from "@/lib/billing/emails";
import { provisionWorkspaceSubscription } from "@/lib/billing/subscriptions";
import {
  BILLING_CURRENCIES,
  BILLING_INTERVALS,
  PlanCode,
  getPlanDefinition,
  normalizePlanCode,
} from "@/lib/billing/plans";

export type WorkspaceSubscriptionNotes = {
  purpose: string;
  workspaceId: string;
  planCode: string;
  billingInterval: (typeof BILLING_INTERVALS)[number];
  billingCurrency: (typeof BILLING_CURRENCIES)[number];
};

export function parseRazorpayNotesEntity(entity: unknown): Record<string, string> {
  const n =
    entity && typeof entity === "object" && "notes" in entity ? (entity as any).notes : null;
  if (!n || typeof n !== "object") return {};
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(n as Record<string, unknown>)) {
    if (v != null && v !== "") out[k] = String(v);
  }
  return out;
}

export function mergeSubscriptionNotesFromPayload(
  paymentLinkEntity: unknown,
  paymentEntity: unknown
): Record<string, string> {
  return {
    ...parseRazorpayNotesEntity(paymentEntity),
    ...parseRazorpayNotesEntity(paymentLinkEntity),
  };
}

export function parseWorkspaceSubscriptionNotes(
  merged: Record<string, string>
): WorkspaceSubscriptionNotes | null {
  if (merged.purpose !== "workspace_subscription") return null;
  const workspaceId = merged.workspaceId;
  const planCode = merged.planCode;
  const billingInterval = merged.billingInterval;
  const billingCurrency = merged.billingCurrency;
  if (!workspaceId || !planCode) return null;
  if (billingInterval !== "month" && billingInterval !== "year") return null;
  if (billingCurrency !== "INR" && billingCurrency !== "USD") return null;
  return {
    purpose: merged.purpose,
    workspaceId,
    planCode,
    billingInterval,
    billingCurrency,
  };
}

export function getExpectedSubscriptionAmountPaise(
  planCode: PlanCode,
  currency: (typeof BILLING_CURRENCIES)[number],
  interval: (typeof BILLING_INTERVALS)[number]
): number {
  const def = getPlanDefinition(planCode);
  if (def.code === "FREE") return 0;
  return interval === "year" ? def.pricing[currency].yearly : def.pricing[currency].monthly;
}

export async function applyWorkspaceSubscriptionFromPayment(opts: {
  workspaceId: string;
  planCode: PlanCode;
  currency: (typeof BILLING_CURRENCIES)[number];
  interval: (typeof BILLING_INTERVALS)[number];
  expectedAmountPaise: number;
  paidAmountPaise: number;
  paymentId: string | null;
  linkId: string | null;
  webhookEventId: string;
}) {
  if (opts.expectedAmountPaise <= 0) {
    throw new Error("invalid_subscription_amount");
  }
  if (opts.paidAmountPaise !== opts.expectedAmountPaise) {
    throw new Error("subscription_payment_amount_mismatch");
  }

  const normalized = normalizePlanCode(opts.planCode);
  if (normalized === "FREE") {
    throw new Error("invalid_subscription_plan");
  }

  await provisionWorkspaceSubscription(opts.workspaceId, {
    planCode: normalized,
    currency: opts.currency,
    interval: opts.interval,
  });

  await prisma.auditLog.create({
    data: {
      userId: "SYSTEM",
      workspaceId: opts.workspaceId,
      action: "BILLING_SUBSCRIPTION_UPGRADED",
      resourceType: "BILLING_SUBSCRIPTION",
      resourceId: opts.workspaceId,
      metadata: {
        planCode: normalized,
        currency: opts.currency,
        interval: opts.interval,
        paymentId: opts.paymentId,
        linkId: opts.linkId,
        amountPaise: opts.paidAmountPaise,
        webhookEventId: opts.webhookEventId,
      },
    },
  });

  const workspace = await prisma.workspace.findUnique({
    where: { id: opts.workspaceId },
    include: {
      members: {
        where: { role: "OWNER", removedAt: null },
        take: 1,
        include: { user: { select: { email: true, name: true } } },
      },
    },
  });

  const owner = workspace?.members[0]?.user;
  if (owner?.email) {
    await sendSubscriptionUpgradedEmail({
      ownerEmail: owner.email,
      ownerName: owner.name || owner.email.split("@")[0],
      workspaceName: workspace?.name || "Your workspace",
      newPlan: getPlanDefinition(normalized).name,
      billingInterval: opts.interval,
      amount: opts.paidAmountPaise,
      currency: opts.currency,
    }).catch((err) => console.error("[Subscription webhook] Upgrade email failed:", err));
  }

  return { planCode: normalized };
}
