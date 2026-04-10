/**
 * Subscription renewal reminder cron job.
 * Sends reminder emails 5 days and 1 day before a subscription renews.
 * Called daily by /api/internal/cron/daily.
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyCronSecret } from "@/lib/cron-auth";
import { sendSubscriptionRenewalReminderEmail } from "@/lib/billing/emails";

const REMINDER_DAYS = [5, 1] as const;

export async function POST(req: NextRequest) {
  const authError = verifyCronSecret(req);
  if (authError) return authError;

  const now = new Date();
  const results: { sent: number; skipped: number; errors: number; details: unknown[] } = {
    sent: 0,
    skipped: 0,
    errors: 0,
    details: [],
  };

  for (const days of REMINDER_DAYS) {
    // Find subscriptions whose currentPeriodEnd falls within [now+days-12h, now+days+12h]
    const windowStart = new Date(now);
    windowStart.setDate(windowStart.getDate() + days);
    windowStart.setHours(windowStart.getHours() - 12);

    const windowEnd = new Date(now);
    windowEnd.setDate(windowEnd.getDate() + days);
    windowEnd.setHours(windowEnd.getHours() + 12);

    const subscriptions = await prisma.subscription.findMany({
      where: {
        status: "ACTIVE",
        currentPeriodEnd: { gte: windowStart, lte: windowEnd },
        plan: { code: { not: "FREE" } },
      },
      include: {
        plan: true,
        workspace: {
          include: {
            members: {
              where: { role: "OWNER" },
              include: { user: { select: { id: true, email: true, name: true } } },
              take: 1,
            },
          },
        },
      },
    });

    for (const sub of subscriptions) {
      const owner = sub.workspace.members[0]?.user;
      if (!owner?.email) {
        results.skipped++;
        continue;
      }

      // Check if we already sent this reminder (idempotency)
      const reminderAction = `BILLING_RENEWAL_REMINDER_${days}D`;
      const alreadySent = await prisma.auditLog.findFirst({
        where: {
          workspaceId: sub.workspaceId,
          action: reminderAction,
          createdAt: { gte: new Date(now.getTime() - 20 * 60 * 60 * 1000) }, // within last 20h
        },
      });

      if (alreadySent) {
        results.skipped++;
        results.details.push({ workspaceId: sub.workspaceId, days, reason: "already_sent" });
        continue;
      }

      // Find the price for amount display
      const price = await prisma.planPrice.findFirst({
        where: {
          planId: sub.planId,
          isActive: true,
          ...(sub.priceId ? { id: sub.priceId } : {}),
        },
        orderBy: { amount: "desc" },
      });

      try {
        await sendSubscriptionRenewalReminderEmail({
          ownerEmail: owner.email,
          ownerName: owner.name || owner.email.split("@")[0],
          workspaceName: sub.workspace.name,
          planName: sub.plan.name,
          renewalDate: sub.currentPeriodEnd!,
          amount: price?.amount || 0,
          currency: price?.currency || "INR",
          daysUntilRenewal: days,
        });

        await prisma.auditLog.create({
          data: {
            userId: owner.id,
            workspaceId: sub.workspaceId,
            action: reminderAction,
            resourceType: "BILLING_SUBSCRIPTION",
            resourceId: sub.id,
            metadata: {
              planCode: sub.plan.code,
              planName: sub.plan.name,
              renewalDate: sub.currentPeriodEnd?.toISOString(),
              daysUntilRenewal: days,
              sentTo: owner.email,
            } as any,
          },
        });

        results.sent++;
        results.details.push({ workspaceId: sub.workspaceId, days, email: owner.email });
      } catch (err) {
        results.errors++;
        results.details.push({
          workspaceId: sub.workspaceId,
          days,
          error: err instanceof Error ? err.message : "unknown",
        });
      }
    }
  }

  return NextResponse.json({ ok: true, ...results });
}
