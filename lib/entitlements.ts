import { PlatformRole, SubscriptionStatus, WorkspaceRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  PlanFeatureKey,
  PlanLimits,
  PlanFeatures,
  PlanCode,
  getPlanDefinition,
} from "@/lib/billing/plans";

export type FeatureKey = PlanFeatureKey;
export type LimitKey =
  | "invoicesPerMonth"
  | "clients"
  | "projects"
  | "members"
  | "templates"
  | "aiCallsPerMonth"
  | "reminderEmailsPerMonth"
  | "automationRules"
  | "recurringPlans"
  | "integrationsMaxConnections"
  | "integrationsImportsPerDay"
  | "integrationsImportsPerMinute"
  | "requestsPerMinute";

const PLATFORM_BYPASS_ROLES: PlatformRole[] = [
  PlatformRole.INTERNAL_OWNER,
  PlatformRole.INTERNAL_DEV,
  PlatformRole.PLATFORM_ADMIN,
];

export class EntitlementError extends Error {
  code:
    | "FEATURE_NOT_AVAILABLE"
    | "PLAN_LIMIT_REACHED"
    | "SEAT_LIMIT_REACHED"
    | "SUBSCRIPTION_INACTIVE";
  status: number;
  details?: Record<string, unknown>;

  constructor(
    code: EntitlementError["code"],
    message: string,
    status: number,
    details?: Record<string, unknown>
  ) {
    super(message);
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

export type WorkspaceEntitlement = {
  workspaceId: string;
  planCode: PlanCode;
  features: PlanFeatures;
  limits: PlanLimits;
  workspaceRole: WorkspaceRole | null;
  platformBypass: boolean;
  subscriptionActive: boolean;
  subscriptionStatus: SubscriptionStatus | "MISSING";
};

function isSubscriptionActive(status: SubscriptionStatus | "MISSING") {
  return (
    status === SubscriptionStatus.ACTIVE ||
    status === SubscriptionStatus.TRIALING ||
    status === "MISSING"
  );
}

function getSnapshotFeatures(raw: unknown, fallbackPlan: PlanCode): PlanFeatures {
  const base = { ...getPlanDefinition(fallbackPlan).features };
  if (!raw || typeof raw !== "object") return base;
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    if (key in base) {
      (base as Record<string, boolean>)[key] = value === true;
    }
  }
  return base;
}

function getSnapshotLimits(raw: unknown, fallbackPlan: PlanCode): PlanLimits {
  const base = { ...getPlanDefinition(fallbackPlan).limits };
  if (!raw || typeof raw !== "object") return base;
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    if (key in base && typeof value === "number") {
      (base as Record<string, number>)[key] = value;
    }
  }
  return base;
}

export async function isPlatformBypass(userId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { platformRole: true },
  });

  if (!user) return false;
  return PLATFORM_BYPASS_ROLES.includes(user.platformRole);
}

export async function isInternalUser(userId: string): Promise<boolean> {
  return isPlatformBypass(userId);
}

export async function getWorkspaceEntitlement(
  workspaceId: string,
  userId: string
): Promise<WorkspaceEntitlement> {
  const [user, membership, subscription] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: { platformRole: true },
    }),
    prisma.workspaceMember.findFirst({
      where: {
        workspaceId,
        userId,
        removedAt: null,
      },
      select: { role: true },
    }),
    prisma.subscription.findUnique({
      where: { workspaceId },
      include: {
        plan: {
          select: { code: true },
        },
      },
    }),
  ]);

  const platformBypass = Boolean(user && PLATFORM_BYPASS_ROLES.includes(user.platformRole));
  const planCode = getPlanDefinition(subscription?.plan?.code).code;
  const subscriptionStatus = subscription?.status || "MISSING";

  return {
    workspaceId,
    planCode,
    features: getSnapshotFeatures(subscription?.featuresSnapshot, planCode),
    limits: getSnapshotLimits(subscription?.limitsSnapshot, planCode),
    workspaceRole: membership?.role || null,
    platformBypass,
    subscriptionActive: platformBypass || isSubscriptionActive(subscriptionStatus),
    subscriptionStatus,
  };
}

export async function assertWorkspaceFeature(
  workspaceId: string,
  userId: string,
  feature: FeatureKey
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

  if (!entitlement.features[feature]) {
    throw new EntitlementError(
      "FEATURE_NOT_AVAILABLE",
      `Your ${entitlement.planCode} plan does not include ${feature}.`,
      403,
      { planCode: entitlement.planCode, feature }
    );
  }

  return entitlement;
}

export function serializeEntitlementError(error: unknown) {
  if (!(error instanceof EntitlementError)) return null;
  return {
    status: error.status,
    body: {
      error: error.message,
      code: error.code,
      ...error.details,
      upgradeUrl: "/settings/billing",
    },
  };
}
