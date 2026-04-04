const bcrypt = require("bcryptjs");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

const templates = [
  {
    slug: "minimal-light",
    name: "Minimal Light",
    isPro: false,
    tags: "free,light,clean",
    accent: "from-slate-100 to-white",
    category: "Free",
  },
  {
    slug: "studio-bold",
    name: "Studio Bold",
    isPro: false,
    tags: "free,bold,light",
    accent: "from-amber-50 to-white",
    category: "Free",
  },
  {
    slug: "neat-receipt",
    name: "Neat Receipt",
    isPro: false,
    tags: "free,receipt,mono",
    accent: "from-emerald-50 to-white",
    category: "Free",
  },
  {
    slug: "duo-card",
    name: "Duo Card",
    isPro: false,
    tags: "free,split,qr",
    accent: "from-slate-50 to-white",
    category: "Free",
  },
  {
    slug: "classic-gray",
    name: "Classic Gray",
    isPro: false,
    tags: "free,corporate,gray",
    accent: "from-slate-100 to-white",
    category: "Free",
  },
  {
    slug: "soft-pastel",
    name: "Soft Pastel",
    isPro: false,
    tags: "free,pastel,rounded",
    accent: "from-rose-50 to-emerald-50",
    category: "Free",
  },
  {
    slug: "invoice-compact",
    name: "Invoice Compact",
    isPro: false,
    tags: "free,compact,mobile",
    accent: "from-slate-50 to-white",
    category: "Free",
  },
  {
    slug: "gradient-aura",
    name: "Gradient Aura",
    isPro: true,
    tags: "pro,gradient,light",
    accent: "from-emerald-100 via-primary/40 to-white",
    category: "Pro",
  },
  {
    slug: "neo-dark",
    name: "Neo Dark",
    isPro: true,
    tags: "pro,dark,fintech",
    accent: "from-slate-900 via-slate-900 to-slate-800",
    category: "Pro",
  },
  {
    slug: "folio-modern",
    name: "Folio Modern",
    isPro: true,
    tags: "pro,magazine,hero",
    accent: "from-rose-50 to-white",
    category: "Pro",
  },
  {
    slug: "luxe-gold",
    name: "Luxe Gold",
    isPro: true,
    tags: "pro,gold,premium",
    accent: "from-amber-50 to-amber-100",
    category: "Pro",
  },
  {
    slug: "edge-minimal-pro",
    name: "Edge Minimal Pro",
    isPro: true,
    tags: "pro,minimal,geometric",
    accent: "from-slate-50 to-white",
    category: "Pro",
  },
  {
    slug: "split-hero",
    name: "Split Hero",
    isPro: true,
    tags: "pro,hero,visual",
    accent: "from-slate-50 to-white",
    category: "Pro",
  },
  {
    slug: "essential-pro",
    name: "Essential Pro",
    isPro: true,
    tags: "pro,corporate,tax",
    accent: "from-slate-50 to-white",
    category: "Pro",
  },
  {
    slug: "multi-brand-dynamic",
    name: "Multi-Brand Dynamic",
    isPro: true,
    tags: "pro,dynamic,brand",
    accent: "from-primary/20 via-emerald-50 to-white",
    category: "Pro",
  },
];

const PLAN_DEFINITIONS = {
  FREE: {
    name: "Free",
    features: {
      invoices: true,
      estimates: true,
      clients: true,
      pdfExport: true,
      integrations: false,
      ai: false,
      reminders: false,
      automation: false,
      recurringPlans: false,
      approvalWorkflows: false,
      customBranding: false,
      teams: false,
      api: false,
    },
    limits: {
      invoicesPerMonth: 10,
      clients: 5,
      projects: 3,
      members: 1,
      templates: 1,
      aiCallsPerMonth: 0,
      reminderEmailsPerMonth: 0,
      automationRules: 0,
      recurringPlans: 0,
      integrationsMaxConnections: 0,
      integrationsImportsPerDay: 0,
      integrationsImportsPerMinute: 0,
      requestsPerMinute: 5,
      maxFileSizeBytes: 5 * 1024 * 1024,
      maxTokens: 10000,
    },
    prices: {
      INR: { month: 0, year: 0 },
      USD: { month: 0, year: 0 },
    },
  },
  PREMIUM: {
    name: "Premium",
    features: {
      invoices: true,
      estimates: true,
      clients: true,
      pdfExport: true,
      integrations: true,
      ai: true,
      reminders: true,
      automation: true,
      recurringPlans: true,
      approvalWorkflows: true,
      customBranding: true,
      teams: false,
      api: true,
    },
    limits: {
      invoicesPerMonth: 100,
      clients: 50,
      projects: 30,
      members: 1,
      templates: 25,
      aiCallsPerMonth: 100,
      reminderEmailsPerMonth: 500,
      automationRules: 10,
      recurringPlans: 10,
      integrationsMaxConnections: 5,
      integrationsImportsPerDay: 500,
      integrationsImportsPerMinute: 10,
      requestsPerMinute: 20,
      maxFileSizeBytes: 10 * 1024 * 1024,
      maxTokens: 32000,
    },
    prices: {
      INR: { month: 14900, year: 149000 },
      USD: { month: 900, year: 9000 },
    },
  },
  PREMIER: {
    name: "Premier",
    features: {
      invoices: true,
      estimates: true,
      clients: true,
      pdfExport: true,
      integrations: true,
      ai: true,
      reminders: true,
      automation: true,
      recurringPlans: true,
      approvalWorkflows: true,
      customBranding: true,
      teams: true,
      api: true,
    },
    limits: {
      invoicesPerMonth: -1,
      clients: -1,
      projects: -1,
      members: 5,
      templates: -1,
      aiCallsPerMonth: 500,
      reminderEmailsPerMonth: 5000,
      automationRules: 100,
      recurringPlans: 100,
      integrationsMaxConnections: 10,
      integrationsImportsPerDay: 5000,
      integrationsImportsPerMinute: 20,
      requestsPerMinute: 60,
      maxFileSizeBytes: 25 * 1024 * 1024,
      maxTokens: 100000,
    },
    prices: {
      INR: { month: 49900, year: 499000 },
      USD: { month: 2900, year: 29000 },
    },
  },
};

const FIXTURE_PASSWORD = process.env.TEST_USER_PASSWORD || "PaperChai123!";

const FIXTURES = [
  {
    email: "free-user@paperchai.test",
    name: "Free User",
    workspaceName: "Free User Workspace",
    workspaceSlug: "fixture-free-user",
    planCode: "FREE",
    primaryRole: "OWNER",
  },
  {
    email: "premium-user@paperchai.test",
    name: "Premium User",
    workspaceName: "Premium User Workspace",
    workspaceSlug: "fixture-premium-user",
    planCode: "PREMIUM",
    primaryRole: "OWNER",
  },
  {
    email: "premier-user@paperchai.test",
    name: "Premier User",
    workspaceName: "Premier User Workspace",
    workspaceSlug: "fixture-premier-user",
    planCode: "PREMIER",
    primaryRole: "OWNER",
  },
  {
    email: "free-admin@paperchai.test",
    name: "Free Admin",
    ownerEmail: "fixture-owner-free-admin@paperchai.test",
    ownerName: "Fixture Owner Free Admin",
    workspaceName: "Free Admin Workspace",
    workspaceSlug: "fixture-free-admin",
    planCode: "FREE",
    primaryRole: "ADMIN",
  },
  {
    email: "premium-admin@paperchai.test",
    name: "Premium Admin",
    ownerEmail: "fixture-owner-premium-admin@paperchai.test",
    ownerName: "Fixture Owner Premium Admin",
    workspaceName: "Premium Admin Workspace",
    workspaceSlug: "fixture-premium-admin",
    planCode: "PREMIUM",
    primaryRole: "ADMIN",
  },
  {
    email: "premier-admin@paperchai.test",
    name: "Premier Admin",
    ownerEmail: "fixture-owner-premier-admin@paperchai.test",
    ownerName: "Fixture Owner Premier Admin",
    workspaceName: "Premier Admin Workspace",
    workspaceSlug: "fixture-premier-admin",
    planCode: "PREMIER",
    primaryRole: "ADMIN",
  },
];

async function upsertInvoiceTemplates() {
  await Promise.all(
    templates.map((template) =>
      prisma.invoiceTemplate.upsert({
        where: { slug: template.slug },
        update: { ...template },
        create: { ...template },
      })
    )
  );
}

async function seedCanonicalPlans() {
  const proPlan = await prisma.subscriptionPlan.findUnique({ where: { code: "PRO" } });
  const studioPlan = await prisma.subscriptionPlan.findUnique({ where: { code: "STUDIO" } });

  const premiumPlan =
    proPlan && !(await prisma.subscriptionPlan.findUnique({ where: { code: "PREMIUM" } }))
      ? await prisma.subscriptionPlan.update({
          where: { id: proPlan.id },
          data: { code: "PREMIUM", name: PLAN_DEFINITIONS.PREMIUM.name },
        })
      : null;

  const premierPlan =
    studioPlan && !(await prisma.subscriptionPlan.findUnique({ where: { code: "PREMIER" } }))
      ? await prisma.subscriptionPlan.update({
          where: { id: studioPlan.id },
          data: { code: "PREMIER", name: PLAN_DEFINITIONS.PREMIER.name },
        })
      : null;

  for (const [code, definition] of Object.entries(PLAN_DEFINITIONS)) {
    const plan = await prisma.subscriptionPlan.upsert({
      where: { code },
      update: {
        name: definition.name,
        isActive: true,
        features: definition.features,
        limits: definition.limits,
      },
      create: {
        code,
        name: definition.name,
        isActive: true,
        features: definition.features,
        limits: definition.limits,
      },
    });

    for (const [currency, priceSet] of Object.entries(definition.prices)) {
      for (const [interval, amount] of Object.entries(priceSet)) {
        const existing = await prisma.planPrice.findFirst({
          where: {
            planId: plan.id,
            currency,
            interval,
            provider: "MANUAL",
          },
        });

        if (existing) {
          await prisma.planPrice.update({
            where: { id: existing.id },
            data: { amount, isActive: true },
          });
        } else {
          await prisma.planPrice.create({
            data: {
              planId: plan.id,
              currency,
              interval,
              amount,
              provider: "MANUAL",
              isActive: true,
            },
          });
        }
      }
    }
  }

  if (premiumPlan) {
    const canonical = await prisma.subscriptionPlan.findUnique({ where: { code: "PREMIUM" } });
    if (canonical) {
      await prisma.subscription.updateMany({
        where: { planId: premiumPlan.id },
        data: { planId: canonical.id },
      });
    }
  }

  if (premierPlan) {
    const canonical = await prisma.subscriptionPlan.findUnique({ where: { code: "PREMIER" } });
    if (canonical) {
      await prisma.subscription.updateMany({
        where: { planId: premierPlan.id },
        data: { planId: canonical.id },
      });
    }
  }
}

async function upsertUser(email, name, platformRole = "USER") {
  const passwordHash = await bcrypt.hash(FIXTURE_PASSWORD, 10);
  return prisma.user.upsert({
    where: { email },
    update: {
      name,
      password: passwordHash,
      emailVerified: new Date(),
      status: "ACTIVE",
      platformRole,
    },
    create: {
      email,
      name,
      password: passwordHash,
      emailVerified: new Date(),
      status: "ACTIVE",
      platformRole,
    },
  });
}

async function ensureWorkspaceFixture(fixture) {
  const owner =
    fixture.primaryRole === "OWNER"
      ? await upsertUser(fixture.email, fixture.name)
      : await upsertUser(fixture.ownerEmail, fixture.ownerName);

  const primaryUser =
    fixture.primaryRole === "OWNER" ? owner : await upsertUser(fixture.email, fixture.name);

  const workspace = await prisma.workspace.upsert({
    where: { slug: fixture.workspaceSlug },
    update: {
      name: fixture.workspaceName,
      createdById: owner.id,
      ownerId: owner.id,
      deletedAt: null,
    },
    create: {
      name: fixture.workspaceName,
      slug: fixture.workspaceSlug,
      createdById: owner.id,
      ownerId: owner.id,
    },
  });

  await prisma.workspaceSettings.upsert({
    where: { workspaceId: workspace.id },
    update: {
      currency: "INR",
      timezone: "Asia/Kolkata",
      businessType: "Freelancer",
    },
    create: {
      workspaceId: workspace.id,
      currency: "INR",
      timezone: "Asia/Kolkata",
      businessType: "Freelancer",
    },
  });

  await prisma.workspaceMember.upsert({
    where: {
      workspaceId_userId: {
        workspaceId: workspace.id,
        userId: owner.id,
      },
    },
    update: {
      role: "OWNER",
      removedAt: null,
    },
    create: {
      workspaceId: workspace.id,
      userId: owner.id,
      role: "OWNER",
    },
  });

  if (primaryUser.id !== owner.id) {
    await prisma.workspaceMember.upsert({
      where: {
        workspaceId_userId: {
          workspaceId: workspace.id,
          userId: primaryUser.id,
        },
      },
      update: {
        role: fixture.primaryRole,
        removedAt: null,
      },
      create: {
        workspaceId: workspace.id,
        userId: primaryUser.id,
        role: fixture.primaryRole,
      },
    });
  }

  await prisma.user.update({
    where: { id: primaryUser.id },
    data: { activeWorkspaceId: workspace.id },
  });

  const plan = await prisma.subscriptionPlan.findUnique({
    where: { code: fixture.planCode },
  });

  if (!plan) {
    throw new Error(`Missing subscription plan ${fixture.planCode}`);
  }

  const planPrice = await prisma.planPrice.findFirst({
    where: {
      planId: plan.id,
      currency: "INR",
      interval: "year",
      provider: "MANUAL",
      isActive: true,
    },
  });

  await prisma.subscription.upsert({
    where: { workspaceId: workspace.id },
    update: {
      planId: plan.id,
      priceId: planPrice?.id || null,
      status: "ACTIVE",
      provider: "MANUAL",
      seatsIncluded: fixture.planCode === "PREMIER" ? 5 : 1,
      featuresSnapshot: plan.features,
      limitsSnapshot: plan.limits,
    },
    create: {
      workspaceId: workspace.id,
      planId: plan.id,
      priceId: planPrice?.id || null,
      status: "ACTIVE",
      provider: "MANUAL",
      seatsIncluded: fixture.planCode === "PREMIER" ? 5 : 1,
      featuresSnapshot: plan.features,
      limitsSnapshot: plan.limits,
    },
  });

  const clientName = `${fixture.name} Client`;
  let client = await prisma.client.findFirst({
    where: {
      workspaceId: workspace.id,
      email: fixture.email,
    },
  });
  if (!client) {
    client = await prisma.client.create({
      data: {
        workspaceId: workspace.id,
        name: clientName,
        email: fixture.email,
        company: `${fixture.name} Co`,
      },
    });
  }

  let project = await prisma.project.findFirst({
    where: {
      workspaceId: workspace.id,
      name: `${fixture.name} Project`,
    },
  });
  if (!project) {
    project = await prisma.project.create({
      data: {
        workspaceId: workspace.id,
        clientId: client.id,
        name: `${fixture.name} Project`,
        currency: "INR",
        status: "ACTIVE",
      },
    });
  }

  const invoiceNumber = `${fixture.planCode.slice(0, 3)}-${fixture.primaryRole.slice(0, 3)}-001`;
  const existingInvoice = await prisma.invoice.findFirst({
    where: {
      workspaceId: workspace.id,
      number: invoiceNumber,
    },
  });

  if (!existingInvoice) {
    await prisma.invoice.create({
      data: {
        workspaceId: workspace.id,
        clientId: client.id,
        projectId: project.id,
        number: invoiceNumber,
        status: "draft",
        currency: "INR",
        subtotal: 14900,
        taxTotal: 0,
        total: 14900,
        issueDate: new Date(),
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        notes: `Fixture invoice for ${fixture.email}`,
        items: {
          create: [
            {
              title: "Fixture retainer",
              quantity: 1,
              unitPrice: 14900,
              taxRate: 0,
              total: 14900,
            },
          ],
        },
      },
    });
  }
}

async function seedFixtures() {
  for (const fixture of FIXTURES) {
    await ensureWorkspaceFixture(fixture);
  }

  await upsertUser("platform-admin@paperchai.test", "Platform Admin", "PLATFORM_ADMIN");
}

async function main() {
  await upsertInvoiceTemplates();
  await seedCanonicalPlans();
  await seedFixtures();
  console.log("Seeded invoice templates, pricing catalog, and entitlement fixtures");
  console.log(`Fixture password: ${FIXTURE_PASSWORD}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
