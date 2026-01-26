import {
  PrismaClient,
  BillingProvider,
  SubscriptionStatus,
  PlatformRole,
  WorkspaceRole,
} from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🚀 Starting Multi-tenancy Migration...");

  // 1. Setup Subscription Plans
  console.log("📦 Seeding Subscription Plans...");
  const plans = [
    {
      code: "FREE",
      name: "Free Plan",
      features: {
        invoices: true,
        estimates: true,
        clients: true,
        reminders: false,
        api: false,
        teams: false,
        automation_limit: 1,
      },
      limits: {
        invoices_per_month: 20,
        clients: 5,
        members: 1,
      },
    },
    {
      code: "PRO",
      name: "Pro Plan",
      features: {
        invoices: true,
        estimates: true,
        clients: true,
        reminders: true,
        api: true,
        teams: false,
        automation_limit: 10,
      },
      limits: {
        invoices_per_month: 100,
        clients: 50,
        members: 1,
      },
    },
    {
      code: "STUDIO",
      name: "Studio Plan",
      features: {
        invoices: true,
        estimates: true,
        clients: true,
        reminders: true,
        api: true,
        teams: true,
        automation_limit: 100,
      },
      limits: {
        invoices_per_month: -1, // unlimited
        clients: -1,
        members: 10, // seats included
      },
    },
  ];

  for (const p of plans) {
    await prisma.subscriptionPlan.upsert({
      where: { code: p.code },
      update: { features: p.features, limits: p.limits },
      create: {
        code: p.code,
        name: p.name,
        features: p.features,
        limits: p.limits,
      },
    });
  }

  const freePlan = await prisma.subscriptionPlan.findUnique({ where: { code: "FREE" } });
  if (!freePlan) throw new Error("Failed to create FREE plan");

  // 2. Iterate Workspaces to Backfill
  console.log("🏢 Backfilling Workspaces...");
  const workspaces = await prisma.workspace.findMany({
    include: { settings: true, subscription: true },
  });

  for (const ws of workspaces) {
    console.log(`Processing workspace: ${ws.name} (${ws.id})`);

    // A. Backfill WorkspaceSettings
    if (!ws.settings) {
      // Construct address from legacy fields if available
      const addressParts = [
        ws.addressLine1,
        ws.addressLine2,
        ws.city,
        ws.state,
        ws.pin,
        ws.country,
      ].filter(Boolean);

      const fullAddress = addressParts.join(", ");

      await prisma.workspaceSettings.create({
        data: {
          workspaceId: ws.id,
          currency: "INR", // Default
          timezone: "Asia/Kolkata", // Default
          taxId: ws.taxGstNumber || ws.pan || null,
          // Store old pan if GST missing? Mapping loosely.
          address: fullAddress || null,
          businessType: (ws as any).businessType || null, // Might be dropped but maybe in 'any' typed raw? No, generated types dropped it.
          // Wait, if column dropped, I can't read it from `ws`.
          // `ws` comes from findMany. Only current columns exist.
          // `businessType` was dropped. So I can't backfill it unless I read raw.
          // But I accepted data loss. So I assume defaults for dropped columns.
          // `taxGstNumber` was PRESERVED as legacy field.
          // `addressLine1` etc preserved.
        },
      });
    }

    // B. Fix Owner Member Role
    if (ws.ownerId) {
      // ownerId was preserved.
      // Ensure this user is a MEMBER with role OWNER
      await prisma.workspaceMember.upsert({
        where: {
          workspaceId_userId: {
            workspaceId: ws.id,
            userId: ws.ownerId,
          },
        },
        update: { role: WorkspaceRole.OWNER },
        create: {
          workspaceId: ws.id,
          userId: ws.ownerId,
          role: WorkspaceRole.OWNER,
        },
      });

      // Update createdById if missing
      if (!ws.createdById) {
        await prisma.workspace.update({
          where: { id: ws.id },
          data: { createdById: ws.ownerId },
        });
      }
    }

    // C. Create Subscription (Free)
    if (!ws.subscription) {
      await prisma.subscription.create({
        data: {
          workspaceId: ws.id,
          planId: freePlan.id,
          status: SubscriptionStatus.ACTIVE,
          provider: BillingProvider.MANUAL,
          featuresSnapshot: freePlan.features || {},
          limitsSnapshot: freePlan.limits || {},
        },
      });
    }
  }

  // 3. Set Internal Owner
  const adminEmail = process.env.ADMIN_EMAIL;
  if (adminEmail) {
    console.log(`👑 Setting Internal Owner: ${adminEmail}`);
    const user = await prisma.user.findUnique({ where: { email: adminEmail } });
    if (user) {
      await prisma.user.update({
        where: { id: user.id },
        data: { platformRole: PlatformRole.INTERNAL_OWNER },
      });
      console.log(`✅ User ${adminEmail} promoted to INTERNAL_OWNER`);
    } else {
      console.warn(`⚠️  Admin email ${adminEmail} not found in database.`);
    }
  } else {
    console.warn("⚠️  ADMIN_EMAIL env var not set. Skipping Internal Owner promotion.");
  }

  console.log("✨ Migration Complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
