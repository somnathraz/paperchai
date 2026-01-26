import { prisma } from "@/lib/prisma";
import { isInternalUser } from "./entitlements";
import { startOfMonth } from "date-fns";

export type MetricKey = "invoices_per_month" | "clients" | "members";

export async function assertLimit(
  workspaceId: string,
  userId: string,
  metric: MetricKey,
  amountToAdd = 1
) {
  // 1. Internal Bypass
  if (await isInternalUser(userId)) return;

  // 2. Load Subscription Snapshot
  const subscription = await prisma.subscription.findUnique({
    where: { workspaceId },
    select: { limitsSnapshot: true },
  });

  if (!subscription) throw new Error("No subscription found");

  const limits = subscription.limitsSnapshot as Record<string, number>;
  const limit = limits[metric];

  // unlimited
  if (limit === -1 || limit === undefined) return;

  // 3. Check Usage
  let currentUsage = 0;

  if (metric === "invoices_per_month") {
    const periodStart = startOfMonth(new Date());
    const counter = await prisma.usageCounter.findUnique({
      where: {
        workspaceId_metric_periodStart: {
          workspaceId,
          metric,
          periodStart,
        },
      },
    });
    currentUsage = counter?.count || 0;
  } else if (metric === "clients") {
    // For absolute counts (clients, members), we query the table directly usually,
    // OR maintain UsageCounter.
    // User Schema includes UsageCounter for "clients"?
    // "metric": "clients".
    // Let's assume UsageCounter is the source of truth for caching,
    // or we count DB if critical.
    // User prompted: "Read UsageCounter for current month".
    // For "clients" (total), periodStart might be ignored or fixed epoch?
    // Or we count actual clients.
    // Strict limit usually implies DB count.
    // I'll count DB for accuracy for static resources like Clients/Members.
    currentUsage = await prisma.client.count({ where: { workspaceId } });
  } else if (metric === "members") {
    currentUsage = await prisma.workspaceMember.count({ where: { workspaceId } });
  }

  if (currentUsage + amountToAdd > limit) {
    throw new Error(`Limit reached for ${metric}. (${currentUsage}/${limit})`);
  }
}

export async function incrementUsage(workspaceId: string, metric: MetricKey, amount = 1) {
  if (metric === "invoices_per_month") {
    const periodStart = startOfMonth(new Date());
    await prisma.usageCounter.upsert({
      where: {
        workspaceId_metric_periodStart: {
          workspaceId,
          metric,
          periodStart,
        },
      },
      update: { count: { increment: amount } },
      create: {
        workspaceId,
        metric,
        periodStart,
        count: amount,
      },
    });
  }
  // For clients/members, we don't necessarily increment a counter if we count(*) on assert.
}
