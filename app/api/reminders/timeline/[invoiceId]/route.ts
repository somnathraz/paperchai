import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ensureActiveWorkspace } from "@/lib/workspace";
import { checkRateLimitByProfile } from "@/lib/security/rate-limit-enhanced";
import { z } from "zod";
import { assertWorkspaceFeature, serializeEntitlementError } from "@/lib/entitlements";

const paramsSchema = z.object({
  invoiceId: z.string().cuid(),
});

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ invoiceId: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const workspace = await ensureActiveWorkspace(session.user.id, session.user.name);
  if (!workspace) {
    return NextResponse.json({ error: "Workspace not found" }, { status: 404 });
  }

  try {
    await assertWorkspaceFeature(workspace.id, session.user.id, "reminders");
  } catch (error) {
    return NextResponse.json(serializeEntitlementError(error), {
      status: (error as any)?.statusCode || 403,
    });
  }

  const parsedParams = paramsSchema.safeParse(await params);
  if (!parsedParams.success) {
    return NextResponse.json({ error: "Invalid invoice id" }, { status: 422 });
  }
  const { invoiceId } = parsedParams.data;
  const rateCheck = checkRateLimitByProfile(req, "list", workspace.id);
  if (!rateCheck.allowed) {
    return NextResponse.json(
      { error: rateCheck.error || "Rate limit exceeded. Try again later." },
      { status: 429 }
    );
  }

  const invoice = await prisma.invoice.findFirst({
    where: { id: invoiceId, workspaceId: workspace.id },
    select: {
      id: true,
      number: true,
      createdAt: true,
      lastSentAt: true,
      dueDate: true,
      status: true,
      total: true,
      amountPaid: true,
      paidAt: true,
      paymentMethod: true,
      paymentReference: true,
      paymentNote: true,
      client: { select: { name: true } },
      reminderSchedule: {
        include: {
          steps: {
            orderBy: { index: "asc" },
            select: {
              id: true,
              sendAt: true,
              status: true,
              daysBeforeDue: true,
              daysAfterDue: true,
              lastError: true,
            },
          },
        },
      },
    },
  });

  if (!invoice) {
    return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
  }

  const history = await prisma.reminderHistory.findMany({
    where: {
      workspaceId: workspace.id,
      invoiceId,
    },
    orderBy: { createdAt: "asc" },
    take: 100,
  });

  const stepEvents = (invoice.reminderSchedule?.steps || []).map((step) => ({
    id: `step-${step.id}`,
    at: step.sendAt,
    title:
      step.daysBeforeDue && step.daysBeforeDue > 0
        ? `Reminder scheduled (${step.daysBeforeDue}d before due)`
        : step.daysAfterDue && step.daysAfterDue > 0
          ? `Reminder scheduled (${step.daysAfterDue}d after due)`
          : "Reminder scheduled (due date)",
    status: step.status.toLowerCase(),
    details: step.lastError || null,
    stepId: step.id,
  }));

  const historyEvents = history.map((entry) => ({
    id: `history-${entry.id}`,
    at: entry.createdAt,
    title:
      entry.kind === "reminder"
        ? "Reminder sent"
        : entry.kind === "send"
          ? "Invoice sent"
          : entry.kind === "payment"
            ? entry.status === "partial_paid"
              ? "Partial payment recorded"
              : "Payment recorded"
            : `Reminder ${entry.kind || "event"}`,
    status: (entry.status || "sent").toLowerCase(),
    details:
      entry.kind === "payment"
        ? [invoice.paymentMethod, invoice.paymentReference, invoice.paymentNote]
            .filter(Boolean)
            .join(" · ") || null
        : null,
  }));

  const events = [
    {
      id: `invoice-created-${invoice.id}`,
      at: invoice.createdAt,
      title: "Invoice created",
      status: "created",
      details: null as string | null,
    },
    ...(invoice.lastSentAt
      ? [
          {
            id: `invoice-sent-${invoice.id}`,
            at: invoice.lastSentAt,
            title: "Invoice sent",
            status: "sent",
            details: null as string | null,
          },
        ]
      : []),
    ...(invoice.paidAt
      ? [
          {
            id: `invoice-paid-${invoice.id}`,
            at: invoice.paidAt,
            title:
              Number(invoice.amountPaid || 0) > 0 &&
              Number(invoice.amountPaid || 0) < Number(invoice.total || 0)
                ? "Partial payment recorded"
                : "Invoice paid",
            status: "paid",
            details:
              [invoice.paymentMethod, invoice.paymentReference, invoice.paymentNote]
                .filter(Boolean)
                .join(" · ") || null,
          },
        ]
      : []),
    ...stepEvents,
    ...historyEvents,
  ].sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime());

  return NextResponse.json({
    invoice: {
      id: invoice.id,
      number: invoice.number,
      status: invoice.status,
      dueDate: invoice.dueDate,
      clientName: invoice.client.name,
    },
    events,
  });
}
