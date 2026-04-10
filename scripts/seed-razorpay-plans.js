/**
 * One-time script: seeds Razorpay plan IDs from the dashboard into PlanPrice records.
 * Run: node scripts/seed-razorpay-plans.js
 */
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

// Razorpay plan IDs from the Razorpay dashboard (test mode)
const RAZORPAY_PLANS = [
  { planCode: "PREMIUM", currency: "INR", interval: "month", razorpayPlanId: "plan_SbitHQBxq9mmh9" },
  { planCode: "PREMIUM", currency: "INR", interval: "year",  razorpayPlanId: "plan_Sbiw40fpHd0gaG" },
  { planCode: "PREMIER", currency: "INR", interval: "month", razorpayPlanId: "plan_SbiuS1ASbdZiqN" },
  { planCode: "PREMIER", currency: "INR", interval: "year",  razorpayPlanId: "plan_SbiuwC5d3RCgEI" },
];

async function main() {
  console.log("Seeding Razorpay plan IDs into PlanPrice table...\n");

  for (const entry of RAZORPAY_PLANS) {
    const plan = await prisma.subscriptionPlan.findUnique({ where: { code: entry.planCode } });
    if (!plan) {
      console.warn(`  ⚠️  SubscriptionPlan not found for code=${entry.planCode} — run prisma db seed first`);
      continue;
    }

    // Look for existing RAZORPAY price record for this plan+currency+interval
    const existing = await prisma.planPrice.findFirst({
      where: {
        planId: plan.id,
        currency: entry.currency,
        interval: entry.interval,
        provider: "RAZORPAY",
      },
    });

    // Also get the MANUAL price to copy the amount
    const manualPrice = await prisma.planPrice.findFirst({
      where: {
        planId: plan.id,
        currency: entry.currency,
        interval: entry.interval,
        provider: "MANUAL",
        isActive: true,
      },
    });

    if (!manualPrice) {
      console.warn(`  ⚠️  No MANUAL price found for ${entry.planCode} ${entry.currency} ${entry.interval} — skipping`);
      continue;
    }

    if (existing) {
      await prisma.planPrice.update({
        where: { id: existing.id },
        data: { providerPriceId: entry.razorpayPlanId, isActive: true },
      });
      console.log(`  ✅  Updated  ${entry.planCode} ${entry.currency}/${entry.interval} → ${entry.razorpayPlanId}`);
    } else {
      await prisma.planPrice.create({
        data: {
          planId: plan.id,
          currency: entry.currency,
          interval: entry.interval,
          amount: manualPrice.amount,
          provider: "RAZORPAY",
          providerPriceId: entry.razorpayPlanId,
          isActive: true,
        },
      });
      console.log(`  ✅  Created  ${entry.planCode} ${entry.currency}/${entry.interval} → ${entry.razorpayPlanId}`);
    }
  }

  console.log("\nDone. Razorpay plan IDs are now stored.");
  console.log("The checkout route will now use the Subscriptions API automatically.\n");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
