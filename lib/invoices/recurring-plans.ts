import { prisma } from "@/lib/prisma";

type RecurringPlanRecord = {
  id: string;
  workspaceId: string;
  clientId: string;
  projectId: string | null;
  sourceType: "FIXED_TEMPLATE" | "MILESTONES_READY" | "TIMESHEET_HOURS" | "MANUAL_REVIEW";
  fallbackPolicy: "SKIP_AND_NOTIFY" | "CREATE_ZERO_DRAFT" | "USE_MINIMUM_FEE";
  minimumFee: number | null;
  dueDaysAfterIssue: number;
  currency: string;
  snapshot: Record<string, any> | null;
};

type LoadedMilestone = {
  id: string;
  title: string;
  description: string | null;
  amount: number;
};

type DraftLineItem = {
  title: string;
  description?: string | null;
  quantity: number;
  unitPrice: number;
  taxRate?: number;
};

type BuildResult =
  | {
      kind: "invoice";
      invoiceId: string;
      amount: number;
      itemCount: number;
    }
  | {
      kind: "skipped";
      reason: string;
    };

export function computeNextRunAt(
  currentRunAt: Date,
  intervalUnit: "DAYS" | "WEEKS" | "MONTHS",
  intervalValue: number,
  monthlyDay?: number | null
): Date {
  const next = new Date(currentRunAt);
  if (intervalUnit === "DAYS") {
    next.setDate(next.getDate() + intervalValue);
    return next;
  }
  if (intervalUnit === "WEEKS") {
    next.setDate(next.getDate() + intervalValue * 7);
    return next;
  }

  next.setMonth(next.getMonth() + intervalValue);
  if (monthlyDay && monthlyDay >= 1 && monthlyDay <= 28) {
    next.setDate(monthlyDay);
  }
  return next;
}

function buildFallbackLineItems(plan: RecurringPlanRecord): DraftLineItem[] {
  if (plan.fallbackPolicy === "USE_MINIMUM_FEE") {
    return [
      {
        title: "Recurring service fee",
        description: "Auto-generated minimum recurring fee",
        quantity: 1,
        unitPrice: Number(plan.minimumFee || 0),
        taxRate: 0,
      },
    ];
  }

  if (plan.fallbackPolicy === "CREATE_ZERO_DRAFT") {
    return [
      {
        title: "Recurring invoice (no usage captured)",
        description: "Generated as zero-value draft for manual review",
        quantity: 1,
        unitPrice: 0,
        taxRate: 0,
      },
    ];
  }

  return [];
}

function parseFixedSnapshotItems(plan: RecurringPlanRecord): DraftLineItem[] {
  const rawItems = Array.isArray(plan.snapshot?.items) ? plan.snapshot?.items : [];
  return rawItems
    .map((item: any) => ({
      title: String(item?.title || item?.name || "").trim(),
      description: item?.description ? String(item.description) : undefined,
      quantity: Math.max(1, Number(item?.quantity || 1)),
      unitPrice: Math.max(0, Number(item?.unitPrice || item?.rate || 0)),
      taxRate: Number(item?.taxRate || 0),
    }))
    .filter((item: DraftLineItem) => !!item.title);
}

async function loadMilestoneItems(
  plan: RecurringPlanRecord
): Promise<{ items: DraftLineItem[]; milestoneIds: string[] }> {
  if (!plan.projectId) return { items: [], milestoneIds: [] };
  const now = new Date();

  const milestones = await prisma.projectMilestone.findMany({
    where: {
      projectId: plan.projectId,
      invoiceId: null,
      OR: [{ status: "READY_FOR_INVOICE" }, { dueDate: { lte: now } }],
      status: { notIn: ["CANCELLED", "PAID", "INVOICED"] },
    },
    orderBy: [{ dueDate: "asc" }, { orderIndex: "asc" }],
    take: 50,
  });

  const typedMilestones = milestones as LoadedMilestone[];
  return {
    items: typedMilestones.map((milestone) => ({
      title: milestone.title,
      description: milestone.description || "Milestone billing",
      quantity: 1,
      unitPrice: Number(milestone.amount || 0),
      taxRate: 0,
    })),
    milestoneIds: typedMilestones.map((milestone) => milestone.id),
  };
}

function calculateTotals(items: DraftLineItem[]) {
  let subtotal = 0;
  let taxTotal = 0;

  for (const item of items) {
    const lineBase = Number(item.quantity) * Number(item.unitPrice);
    const lineTax = lineBase * (Number(item.taxRate || 0) / 100);
    subtotal += lineBase;
    taxTotal += lineTax;
  }

  const total = subtotal + taxTotal;
  return { subtotal, taxTotal, total };
}

function generateRecurringInvoiceNumber() {
  return `RINV-${Date.now().toString(36).toUpperCase()}-${Math.floor(Math.random() * 900 + 100)}`;
}

export async function buildInvoiceFromRecurringPlan(
  plan: RecurringPlanRecord
): Promise<BuildResult> {
  let items: DraftLineItem[] = [];
  let milestoneIds: string[] = [];

  if (plan.sourceType === "MILESTONES_READY") {
    const milestoneResult = await loadMilestoneItems(plan);
    items = milestoneResult.items;
    milestoneIds = milestoneResult.milestoneIds;
  } else {
    items = parseFixedSnapshotItems(plan);
  }

  if (items.length === 0) {
    const fallback = buildFallbackLineItems(plan);
    if (fallback.length === 0) {
      return { kind: "skipped", reason: "No billable data for this cycle" };
    }
    items = fallback;
  }

  const { subtotal, taxTotal, total } = calculateTotals(items);
  const issueDate = new Date();
  const dueDate = new Date(issueDate);
  dueDate.setDate(dueDate.getDate() + Math.max(0, Number(plan.dueDaysAfterIssue || 0)));

  const invoiceNumber = generateRecurringInvoiceNumber();
  let templateId: string | undefined;
  if (typeof plan.snapshot?.templateSlug === "string" && plan.snapshot.templateSlug.trim()) {
    const template = await prisma.invoiceTemplate.findUnique({
      where: { slug: plan.snapshot.templateSlug.trim() },
      select: { id: true },
    });
    templateId = template?.id;
  }

  const invoice = await prisma.invoice.create({
    data: {
      workspaceId: plan.workspaceId,
      clientId: plan.clientId,
      projectId: plan.projectId || undefined,
      templateId,
      number: invoiceNumber,
      status: "draft",
      issueDate,
      dueDate,
      currency: plan.currency || "INR",
      subtotal,
      taxTotal,
      total,
      notes: typeof plan.snapshot?.notes === "string" ? plan.snapshot.notes : null,
      terms: typeof plan.snapshot?.terms === "string" ? plan.snapshot.terms : null,
      sendMeta: {
        recurring: {
          planId: plan.id,
          generatedAt: new Date().toISOString(),
          sourceType: plan.sourceType,
          templateSlug:
            typeof plan.snapshot?.templateSlug === "string"
              ? plan.snapshot.templateSlug
              : undefined,
        },
      },
      items: {
        create: items.map((item) => {
          const lineBase = Number(item.quantity) * Number(item.unitPrice);
          const lineTax = lineBase * (Number(item.taxRate || 0) / 100);
          return {
            title: item.title,
            description: item.description || null,
            quantity: Number(item.quantity),
            unitPrice: Number(item.unitPrice),
            taxRate: Number(item.taxRate || 0),
            total: lineBase + lineTax,
          };
        }),
      },
    },
    select: { id: true, total: true },
  });

  if (plan.sourceType === "MILESTONES_READY" && plan.projectId && milestoneIds.length > 0) {
    await prisma.projectMilestone.updateMany({
      where: {
        id: { in: milestoneIds },
        projectId: plan.projectId,
        invoiceId: null,
        status: { notIn: ["CANCELLED", "PAID", "INVOICED"] },
      },
      data: {
        invoiceId: invoice.id,
        status: "INVOICED",
      },
    });
  }

  return {
    kind: "invoice",
    invoiceId: invoice.id,
    amount: Number(invoice.total),
    itemCount: items.length,
  };
}
