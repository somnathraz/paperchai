"use server";

import { prisma } from "@/lib/prisma";

export type DashboardStage =
  | "NO_INVOICE_YET" // State A
  | "INVOICE_CREATED_BUT_NOT_SENT" // State B
  | "SENT_WAITING_FOR_PAYMENT" // State C
  | "OVERDUE_EXISTS" // State D
  | "FIRST_PAYMENT_RECEIVED" // State E
  | "MATURE_USER"; // State F

export type DashboardState = {
  stage: DashboardStage;
  meta: {
    // Counts
    totalInvoices: number;
    draftCount: number;
    sentCount: number;
    unpaidCount: number;
    overdueCount: number;
    paidCount: number;

    // Amounts
    totalUnpaidAmount: number;
    totalOverdueAmount: number;

    // Latest Invoice
    latestInvoice: {
      id: string;
      number: string;
      clientName: string;
      amount: number;
      currency: string;
      status: string;
      dueDate: Date | null;
      sentAt: Date | null;
      viewedAt: Date | null; // Optional per spec
    } | null;

    // Autopilot
    remindersEnabled: boolean;
    nextReminderAt: Date | null;

    // Setup
    brandingCompleted: boolean;
    hasLogo: boolean;
  };
};

export async function getDashboardState(userId: string): Promise<DashboardState> {
  if (!userId) {
    throw new Error("User ID is required");
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { activeWorkspaceId: true },
  });

  // Default "Zero" state if no workspace
  const emptyState: DashboardState = {
    stage: "NO_INVOICE_YET",
    meta: {
      totalInvoices: 0,
      draftCount: 0,
      sentCount: 0,
      unpaidCount: 0,
      overdueCount: 0,
      paidCount: 0,
      totalUnpaidAmount: 0,
      totalOverdueAmount: 0,
      latestInvoice: null,
      remindersEnabled: false,
      nextReminderAt: null,
      brandingCompleted: false,
      hasLogo: false,
    },
  };

  if (!user?.activeWorkspaceId) return emptyState;

  const workspaceId = user.activeWorkspaceId;

  // 1. Fetch Invoice Stats (GroupBy)
  const invoiceStats = await prisma.invoice.groupBy({
    by: ["status"],
    where: { workspaceId },
    _count: { _all: true },
    _sum: { total: true },
  });

  const statsMap = invoiceStats.reduce(
    (acc, curr) => {
      acc[curr.status] = {
        count: curr._count._all,
        amount: Number(curr._sum.total || 0),
      };
      return acc;
    },
    {} as Record<string, { count: number; amount: number }>
  );

  const draftCount = statsMap["draft"]?.count || 0;
  const sentCount = (statsMap["sent"]?.count || 0) + (statsMap["scheduled"]?.count || 0); // Include scheduled as "in process"
  const paidCount = statsMap["paid"]?.count || 0;
  const overdueCount = statsMap["overdue"]?.count || 0;
  // Note: 'cancelled' might exist but spec focuses on active lifecycle.

  // Total includes all valid statuses
  const totalInvoices =
    draftCount + sentCount + paidCount + overdueCount + (statsMap["cancelled"]?.count || 0);

  // Unpaid = sent + overdue (waiting for payment)
  const unpaidCount = sentCount + overdueCount;

  const totalOverdueAmount = statsMap["overdue"]?.amount || 0;
  const totalUnpaidAmount =
    (statsMap["sent"]?.amount || 0) + (statsMap["scheduled"]?.amount || 0) + totalOverdueAmount;

  // 2. Fetch Latest Invoice
  // We want the most relevant one. Usually "last modified" or "last sent".
  // Spec says: id, status, amount, clientName, dueDate, sentAt...
  const latestInvoiceRaw = await prisma.invoice.findFirst({
    where: { workspaceId },
    orderBy: { updatedAt: "desc" },
    include: { client: { select: { name: true } } },
  });

  const latestInvoice = latestInvoiceRaw
    ? {
        id: latestInvoiceRaw.id,
        number: latestInvoiceRaw.number,
        clientName: latestInvoiceRaw.client?.name || "Unknown Client",
        amount: Number(latestInvoiceRaw.total),
        currency: latestInvoiceRaw.currency,
        status: latestInvoiceRaw.status,
        dueDate: latestInvoiceRaw.dueDate,
        sentAt: latestInvoiceRaw.lastSentAt || latestInvoiceRaw.createdAt, // Fallback if never sent but crucial to show date
        viewedAt: null, // Schema doesn't seem to track viewedAt on Invoice directly? Maybe activity log. Leaving null for now.
      }
    : null;

  // 3. Fetch Autopilot/Reminders Info
  const reminderSettings = await prisma.reminderSettings.findUnique({
    where: { workspaceId },
  });

  // Check for ANY active invoice schedules
  const activeSchedulesCount = await prisma.invoiceReminderSchedule.count({
    where: {
      workspaceId,
      enabled: true,
    },
  });

  // Reminders are "Enabled" if global setting works OR if individual items are active
  const remindersEnabled = (reminderSettings?.enabled ?? false) || activeSchedulesCount > 0;

  // Find next scheduled reminder
  const nextReminder = await prisma.invoiceReminderStep.findFirst({
    where: {
      schedule: {
        workspaceId,
        enabled: true,
      },
      status: "PENDING",
      sendAt: { gt: new Date() },
    },
    orderBy: { sendAt: "asc" },
    select: { sendAt: true },
  });

  // 4. Fetch Branding/Setup Info
  const workspace = await prisma.workspace.findUnique({
    where: { id: workspaceId },
    include: { settings: true }, // Fetch settings
  });

  const hasLogo = (workspace as any)?.logo || (workspace?.settings as any)?.logo ? true : false;
  // Branding check logic: if logo exists or currency is set (from settings)
  const brandingCompleted = hasLogo || !!workspace?.settings?.currency;

  // 5. Determine State (Strict Priority)
  // Priority:
  // 1. NO_INVOICE_YET (A)
  // 2. INVOICE_CREATED_BUT_NOT_SENT (B) -> Draft > 0, Sent = 0
  // 3. OVERDUE_EXISTS (D) -> Overdue > 0 (High priority intervention)
  // 4. FIRST_PAYMENT_RECEIVED (E) -> Paid >= 1 (AND not Mature)
  // 5. SENT_WAITING_FOR_PAYMENT (C) -> Sent > 0, Paid = 0
  // 6. MATURE_USER (F) -> Total >= 6 OR Paid >= 3

  let stage: DashboardStage = "NO_INVOICE_YET";

  if (totalInvoices === 0) {
    stage = "NO_INVOICE_YET"; // A
  } else if (draftCount > 0 && sentCount === 0 && paidCount === 0 && overdueCount === 0) {
    // Only drafts exist.
    stage = "INVOICE_CREATED_BUT_NOT_SENT"; // B
  } else if (overdueCount > 0) {
    // Overdue takes precedence over waiting or early recognition, to prompt action.
    stage = "OVERDUE_EXISTS"; // D
  } else if (paidCount >= 3 || totalInvoices >= 6) {
    // Mature user takes precedence if they have enough history
    stage = "MATURE_USER"; // F
  } else if (paidCount >= 1) {
    // Has at least one payment, but not mature yet.
    // And no overdue items (handled above).
    stage = "FIRST_PAYMENT_RECEIVED"; // E
  } else if (sentCount > 0 && paidCount === 0) {
    // Has sent items, no payments yet, no overdue (handled above).
    stage = "SENT_WAITING_FOR_PAYMENT"; // C
  } else {
    // Fallback for edge cases (e.g. only cancelled invoices? or mixed states not covered?)
    // If they have any useful data, default to Waiting or Action?
    // Let's default to waiting if anything is outstanding, else setup.
    if (unpaidCount > 0) stage = "SENT_WAITING_FOR_PAYMENT";
    else stage = "NO_INVOICE_YET";
  }

  return {
    stage,
    meta: {
      totalInvoices,
      draftCount,
      sentCount,
      unpaidCount,
      overdueCount,
      paidCount,
      totalUnpaidAmount,
      totalOverdueAmount,
      latestInvoice,
      remindersEnabled,
      nextReminderAt: nextReminder?.sendAt || null,
      brandingCompleted,
      hasLogo,
    },
  };
}
