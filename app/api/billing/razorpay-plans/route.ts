import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { BillingProvider } from "@prisma/client";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/admin-auth";
import { createRazorpayPlan } from "@/lib/payments/razorpay";
import { BILLING_CURRENCIES, BILLING_INTERVALS, getPlanDefinition } from "@/lib/billing/plans";

const PAID_PLAN_CODES = ["PREMIUM", "PREMIER"] as const;

// Map billing interval to Razorpay period
function toRazorpayPeriod(interval: string): "monthly" | "yearly" {
  return interval === "year" ? "yearly" : "monthly";
}

// Total count for subscriptions: monthly→60 (5 years), yearly→5
function getTotalCount(interval: string): number {
  return interval === "year" ? 5 : 60;
}

export async function GET(_req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!isAdmin(session)) {
    return NextResponse.json({ error: "Unauthorized: Admin access required" }, { status: 401 });
  }

  const prices = await prisma.planPrice.findMany({
    where: { provider: BillingProvider.RAZORPAY },
    include: { plan: { select: { code: true, name: true } } },
    orderBy: [{ plan: { code: "asc" } }, { currency: "asc" }, { interval: "asc" }],
  });

  // Group by plan code
  const grouped: Record<string, typeof prices> = {};
  for (const price of prices) {
    const code = price.plan.code;
    if (!grouped[code]) grouped[code] = [];
    grouped[code].push(price);
  }

  return NextResponse.json({ ok: true, plans: grouped, total: prices.length });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!isAdmin(session)) {
    return NextResponse.json({ error: "Unauthorized: Admin access required" }, { status: 401 });
  }

  let body: { dryRun?: boolean } = {};
  try {
    body = await req.json().catch(() => ({}));
  } catch {
    body = {};
  }

  const dryRun = body.dryRun === true;
  const results: Array<{
    planCode: string;
    currency: string;
    interval: string;
    razorpayPlanId: string | null;
    amount: number;
    action: string;
    error?: string;
  }> = [];

  for (const planCode of PAID_PLAN_CODES) {
    const planDef = getPlanDefinition(planCode);

    // Ensure plan exists in DB
    const dbPlan = await prisma.subscriptionPlan.upsert({
      where: { code: planCode },
      update: { name: planDef.name, isActive: true },
      create: {
        code: planCode,
        name: planDef.name,
        isActive: true,
        features: planDef.features as any,
        limits: planDef.limits as any,
      },
    });

    for (const currency of BILLING_CURRENCIES) {
      for (const interval of BILLING_INTERVALS) {
        const amount =
          interval === "year"
            ? planDef.pricing[currency].yearly
            : planDef.pricing[currency].monthly;

        if (amount <= 0) {
          results.push({
            planCode,
            currency,
            interval,
            razorpayPlanId: null,
            amount,
            action: "skipped_zero_amount",
          });
          continue;
        }

        const planName = `PaperChai ${planDef.name} (${interval === "year" ? "Yearly" : "Monthly"}) ${currency}`;

        // Check if we already have a Razorpay price for this combination
        const existingPrice = await prisma.planPrice.findFirst({
          where: {
            planId: dbPlan.id,
            currency,
            interval,
            provider: BillingProvider.RAZORPAY,
            isActive: true,
          },
        });

        if (existingPrice?.providerPriceId) {
          results.push({
            planCode,
            currency,
            interval,
            razorpayPlanId: existingPrice.providerPriceId,
            amount,
            action: "already_exists",
          });
          continue;
        }

        if (dryRun) {
          results.push({
            planCode,
            currency,
            interval,
            razorpayPlanId: null,
            amount,
            action: "dry_run_would_create",
          });
          continue;
        }

        try {
          const rzpPlan = await createRazorpayPlan({
            period: toRazorpayPeriod(interval),
            amount,
            currency,
            name: planName,
          });

          // Upsert PlanPrice with provider = RAZORPAY
          if (existingPrice) {
            await prisma.planPrice.update({
              where: { id: existingPrice.id },
              data: { providerPriceId: rzpPlan.id },
            });
          } else {
            await prisma.planPrice.create({
              data: {
                planId: dbPlan.id,
                currency,
                interval,
                amount,
                provider: BillingProvider.RAZORPAY,
                providerPriceId: rzpPlan.id,
                isActive: true,
              },
            });
          }

          results.push({
            planCode,
            currency,
            interval,
            razorpayPlanId: rzpPlan.id,
            amount,
            action: "created",
          });
        } catch (err) {
          const errMsg = err instanceof Error ? err.message : "Unknown error";
          results.push({
            planCode,
            currency,
            interval,
            razorpayPlanId: null,
            amount,
            action: "error",
            error: errMsg,
          });
        }
      }
    }
  }

  return NextResponse.json({ ok: true, dryRun, results });
}
