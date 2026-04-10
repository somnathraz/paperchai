import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canWriteWorkspace, ensureActiveWorkspace, getWorkspaceMembership } from "@/lib/workspace";
import { z } from "zod";
import {
  canScheduleInvoiceStatus,
  isValidInvoiceDateOrder,
} from "@/lib/invoices/workflow-validation";

const scheduleSchema = z.object({
  invoiceId: z.string().cuid(),
  scheduledSendAt: z.string().datetime(),
  channel: z.enum(["email", "whatsapp", "both"]).optional().default("email"),
  templateSlug: z.string().max(100).optional(),
  reminderCadence: z.any().optional(),
});

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const workspace = await ensureActiveWorkspace(session.user.id, session.user.name);
  if (!workspace) return NextResponse.json({ error: "Workspace not found" }, { status: 404 });
  const membership = await getWorkspaceMembership(session.user.id, workspace.id);
  if (!membership) {
    return NextResponse.json({ error: "Workspace access denied" }, { status: 403 });
  }
  if (!canWriteWorkspace(membership.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let invoiceId: string;
  let scheduledSendAt: string;
  let channel: "email" | "whatsapp" | "both";
  let templateSlug: string | undefined;
  let reminderCadence: any;
  try {
    const parsed = scheduleSchema.parse(await req.json());
    invoiceId = parsed.invoiceId;
    scheduledSendAt = parsed.scheduledSendAt;
    channel = parsed.channel;
    templateSlug = parsed.templateSlug;
    reminderCadence = parsed.reminderCadence;
  } catch {
    return NextResponse.json({ error: "Invalid request payload" }, { status: 422 });
  }

  const scheduledAt = new Date(scheduledSendAt);
  if (Number.isNaN(scheduledAt.getTime()) || scheduledAt.getTime() <= Date.now()) {
    return NextResponse.json(
      { error: "scheduledSendAt must be a future datetime" },
      { status: 400 }
    );
  }

  const existingInvoice = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    select: {
      sendMeta: true,
      workspaceId: true,
      status: true,
      issueDate: true,
      dueDate: true,
      scheduledSendAt: true,
      deliveryChannel: true,
      client: {
        select: { email: true },
      },
    },
  });
  if (!existingInvoice || existingInvoice.workspaceId !== workspace.id) {
    return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
  }
  if (!canScheduleInvoiceStatus(existingInvoice.status)) {
    return NextResponse.json(
      { error: `Cannot schedule invoice in '${existingInvoice.status}' status` },
      { status: 409 }
    );
  }
  if (!existingInvoice.dueDate) {
    return NextResponse.json({ error: "Due date is required before scheduling" }, { status: 422 });
  }
  if (!isValidInvoiceDateOrder(existingInvoice.issueDate, existingInvoice.dueDate)) {
    return NextResponse.json(
      { error: "Due date cannot be earlier than issue date" },
      { status: 422 }
    );
  }
  if (channel !== "whatsapp" && !existingInvoice.client?.email) {
    return NextResponse.json(
      { error: "Client email is required for email scheduling" },
      { status: 422 }
    );
  }
  if (
    existingInvoice.status === "scheduled" &&
    existingInvoice.scheduledSendAt &&
    existingInvoice.scheduledSendAt.getTime() === scheduledAt.getTime() &&
    existingInvoice.deliveryChannel === channel
  ) {
    return NextResponse.json({ ok: true, alreadyScheduled: true });
  }
  const existingSendMeta = (existingInvoice?.sendMeta as Record<string, any>) || {};
  const mergedSendMeta = {
    ...existingSendMeta,
    templateSlug,
    reminderCadence,
  };

  try {
    const invoice = await prisma.invoice.update({
      where: { id: invoiceId },
      data: {
        status: "scheduled",
        scheduledSendAt: scheduledAt,
        deliveryChannel: channel,
        sendMeta: mergedSendMeta,
      },
    });

    await prisma.reminderHistory.create({
      data: {
        workspaceId: workspace.id,
        clientId: invoice.clientId,
        projectId: invoice.projectId,
        invoiceId: invoice.id,
        channel,
        kind: "schedule",
        status: "scheduled",
        previewToUser: true,
        tone: "Warm",
        sentAt: scheduledAt,
        // meta field removed - reminderCadence is stored in invoice.sendMeta
      },
    });

    return NextResponse.json({ ok: true, invoice });
  } catch (error) {
    console.error("[invoices/schedule] Error:", error);
    return NextResponse.json({ error: "Failed to schedule invoice" }, { status: 500 });
  }
}
