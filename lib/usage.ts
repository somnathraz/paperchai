import { startOfMonth } from "date-fns";
import { prisma } from "@/lib/prisma";
import { EntitlementError, getWorkspaceEntitlement } from "./entitlements";

export type MetricKey =
  | "invoicesPerMonth"
  | "clients"
  | "projects"
  | "members"
  | "automationRules"
  | "recurringPlans";

function metricToCounterName(metric: MetricKey) {
  switch (metric) {
    case "invoicesPerMonth":
      return "invoices_per_month";
    case "clients":
      return "clients";
    case "projects":
      return "projects";
    case "members":
      return "members";
    case "automationRules":
      return "automation_rules";
    case "recurringPlans":
      return "recurring_plans";
  }
}

async function getCurrentUsage(workspaceId: string, metric: MetricKey) {
  if (metric === "invoicesPerMonth") {
    const periodStart = startOfMonth(new Date());
    const counter = await prisma.usageCounter.findUnique({
      where: {
        workspaceId_metric_periodStart: {
          workspaceId,
          metric: metricToCounterName(metric),
          periodStart,
        },
      },
    });
    return counter?.count || 0;
  }

  if (metric === "clients") {
    return prisma.client.count({ where: { workspaceId } });
  }

  if (metric === "projects") {
    return prisma.project.count({ where: { workspaceId } });
  }

  if (metric === "members") {
    return prisma.workspaceMember.count({ where: { workspaceId, removedAt: null } });
  }

  if (metric === "automationRules") {
    return prisma.automationRule.count({
      where: {
        workspaceId,
        status: { not: "ARCHIVED" },
      },
    });
  }

  return prisma.recurringInvoicePlan.count({
    where: {
      workspaceId,
      status: { not: "ARCHIVED" },
    },
  });
}

function limitErrorCode(metric: MetricKey) {
  return metric === "members" ? "SEAT_LIMIT_REACHED" : "PLAN_LIMIT_REACHED";
}

export async function assertLimit(
  workspaceId: string,
  userId: string,
  metric: MetricKey,
  amountToAdd = 1
) {
  const entitlement = await getWorkspaceEntitlement(workspaceId, userId);

  if (entitlement.platformBypass) return entitlement;

  if (!entitlement.subscriptionActive) {
    throw new EntitlementError(
      "SUBSCRIPTION_INACTIVE",
      "Subscription is not active. Update billing to continue.",
      403,
      { planCode: entitlement.planCode, subscriptionStatus: entitlement.subscriptionStatus }
    );
  }

  const limit = entitlement.limits[metric];
  if (limit === -1 || limit === undefined) return entitlement;

  const currentUsage = await getCurrentUsage(workspaceId, metric);
  if (currentUsage + amountToAdd > limit) {
    throw new EntitlementError(
      limitErrorCode(metric),
      `Limit reached for ${metric}. (${currentUsage}/${limit})`,
      409,
      { planCode: entitlement.planCode, metric, limit, currentUsage }
    );
  }

  return entitlement;
}

export async function incrementUsage(workspaceId: string, metric: MetricKey, amount = 1) {
  if (metric !== "invoicesPerMonth") return;

  const periodStart = startOfMonth(new Date());
  await prisma.usageCounter.upsert({
    where: {
      workspaceId_metric_periodStart: {
        workspaceId,
        metric: metricToCounterName(metric),
        periodStart,
      },
    },
    update: { count: { increment: amount } },
    create: {
      workspaceId,
      metric: metricToCounterName(metric),
      periodStart,
      count: amount,
    },
  });
}
