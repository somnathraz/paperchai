import { BillingProvider, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  BILLING_CURRENCIES,
  BILLING_INTERVALS,
  PlanCode,
  getPlanDefinition,
} from "@/lib/billing/plans";

type ProvisionWorkspaceSubscriptionOptions = {
  planCode?: PlanCode;
  currency?: (typeof BILLING_CURRENCIES)[number];
  interval?: (typeof BILLING_INTERVALS)[number];
  seatsIncluded?: number;
};

export async function ensurePlanCatalog(planCode: PlanCode) {
  const plan = getPlanDefinition(planCode);

  const dbPlan = await prisma.subscriptionPlan.upsert({
    where: { code: plan.code },
    update: {
      name: plan.name,
      isActive: true,
      features: plan.features as Prisma.JsonObject,
      limits: plan.limits as Prisma.JsonObject,
    },
    create: {
      code: plan.code,
      name: plan.name,
      isActive: true,
      features: plan.features as Prisma.JsonObject,
      limits: plan.limits as Prisma.JsonObject,
    },
  });

  for (const currency of BILLING_CURRENCIES) {
    for (const interval of BILLING_INTERVALS) {
      const amount =
        interval === "year" ? plan.pricing[currency].yearly : plan.pricing[currency].monthly;

      await prisma.planPrice.upsert({
        where: { id: `${plan.code}_${currency}_${interval}`.toLowerCase() },
        update: {
          planId: dbPlan.id,
          currency,
          interval,
          amount,
          provider: BillingProvider.MANUAL,
          isActive: true,
        },
        create: {
          id: `${plan.code}_${currency}_${interval}`.toLowerCase(),
          planId: dbPlan.id,
          currency,
          interval,
          amount,
          provider: BillingProvider.MANUAL,
          isActive: true,
        },
      });
    }
  }

  return dbPlan;
}

export async function provisionWorkspaceSubscription(
  workspaceId: string,
  options: ProvisionWorkspaceSubscriptionOptions = {}
) {
  const planCode = options.planCode || "FREE";
  const currency = options.currency || "INR";
  const interval = options.interval || "month";
  const plan = getPlanDefinition(planCode);
  const dbPlan = await ensurePlanCatalog(planCode);

  const price = await prisma.planPrice.findFirst({
    where: {
      planId: dbPlan.id,
      currency,
      interval,
      isActive: true,
    },
  });

  return prisma.subscription.upsert({
    where: { workspaceId },
    update: {
      planId: dbPlan.id,
      priceId: price?.id || null,
      provider: BillingProvider.MANUAL,
      status: "ACTIVE",
      seatsIncluded: options.seatsIncluded ?? plan.limits.members,
      featuresSnapshot: plan.features as Prisma.JsonObject,
      limitsSnapshot: plan.limits as Prisma.JsonObject,
      currentPeriodStart: new Date(),
      currentPeriodEnd: null,
      cancelAtPeriodEnd: false,
    },
    create: {
      workspaceId,
      planId: dbPlan.id,
      priceId: price?.id || null,
      provider: BillingProvider.MANUAL,
      status: "ACTIVE",
      seatsIncluded: options.seatsIncluded ?? plan.limits.members,
      featuresSnapshot: plan.features as Prisma.JsonObject,
      limitsSnapshot: plan.limits as Prisma.JsonObject,
      currentPeriodStart: new Date(),
      currentPeriodEnd: null,
      cancelAtPeriodEnd: false,
    },
  });
}
