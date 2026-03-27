import { prisma } from "@/lib/prisma";

export async function stopInvoiceRemindersOnFullPayment(invoiceId: string, workspaceId: string) {
  const schedule = await prisma.invoiceReminderSchedule.findFirst({
    where: {
      invoiceId,
      workspaceId,
    },
    select: { id: true },
  });

  await prisma.invoice.update({
    where: { id: invoiceId },
    data: {
      remindersEnabled: false,
    },
  });

  if (!schedule) return;

  await prisma.invoiceReminderSchedule.update({
    where: { id: schedule.id },
    data: {
      enabled: false,
      updatedAt: new Date(),
    },
  });

  await prisma.invoiceReminderStep.updateMany({
    where: {
      scheduleId: schedule.id,
      status: "PENDING",
    },
    data: {
      status: "CANCELLED",
      lastError: "Stopped automatically after full payment",
      updatedAt: new Date(),
    },
  });
}
