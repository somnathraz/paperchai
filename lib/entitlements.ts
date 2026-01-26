import { prisma } from "@/lib/prisma";
import { PlatformRole } from "@prisma/client";

export type FeatureKey = "invoices" | "estimates" | "clients" | "reminders" | "api" | "teams";
// Add other feature keys as per SubscriptionPlan.features JSON structure

export async function assertFeature(workspaceId: string, userId: string, feature: FeatureKey) {
  // 1. Internal Bypass
  if (await isInternalUser(userId)) return;

  // 2. Load Subscription Snapshot
  const subscription = await prisma.subscription.findUnique({
    where: { workspaceId },
    select: { featuresSnapshot: true, status: true },
  });

  if (!subscription || (subscription.status !== "ACTIVE" && subscription.status !== "TRIALING")) {
    // Allow nothing if no active sub? Or assume FREE defaults if missing?
    // User says "If none -> fallback FREE plan config".
    // But Migration ensured subscription exists.
    // If status is not active, block?
    throw new Error("Subscription not active. Please upgrade.");
  }

  const features = subscription.featuresSnapshot as Record<string, boolean>;

  if (features[feature] !== true) {
    throw new Error(`Upgrade required to access ${feature}`);
  }
}

export async function isInternalUser(userId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { platformRole: true },
  });

  if (!user) return false;

  return [
    PlatformRole.INTERNAL_OWNER,
    PlatformRole.INTERNAL_DEV,
    PlatformRole.PLATFORM_ADMIN,
  ].includes(user.platformRole as any);
}
