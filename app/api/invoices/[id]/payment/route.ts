import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { checkRateLimitByProfile } from "@/lib/security/rate-limit-enhanced";
import { canWriteWorkspace, ensureActiveWorkspace, getWorkspaceMembership } from "@/lib/workspace";
import { recordInvoicePayment } from "@/lib/invoices/record-payment";

const paymentSchema = z.object({
  amount: z.number().positive(),
  paidAt: z.string().datetime().optional(),
  paymentMethod: z.string().max(100).optional(),
  paymentReference: z.string().max(255).optional(),
  paymentNote: z.string().max(5000).optional(),
});

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const workspace = await ensureActiveWorkspace(session.user.id, session.user.name);
  if (!workspace) {
    return NextResponse.json({ error: "Workspace not found" }, { status: 404 });
  }

  const membership = await getWorkspaceMembership(session.user.id, workspace.id);
  if (!membership || !canWriteWorkspace(membership.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const rateLimit = checkRateLimitByProfile(req, "general", `ws:${workspace.id}:invoice-payment`);
  if (!rateLimit.allowed) {
    return NextResponse.json({ error: rateLimit.error || "Rate limit exceeded" }, { status: 429 });
  }

  const { id } = await params;
  const parsed = paymentSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payment payload" }, { status: 422 });
  }

  try {
    const result = await recordInvoicePayment({
      invoiceId: id,
      workspaceId: workspace.id,
      amount: parsed.data.amount,
      paidAt: parsed.data.paidAt ? new Date(parsed.data.paidAt) : new Date(),
      paymentMethod: parsed.data.paymentMethod,
      paymentReference: parsed.data.paymentReference,
      paymentNote: parsed.data.paymentNote,
    });

    const updated = result.invoice as any;
    return NextResponse.json({
      invoice: {
        ...updated,
        total: updated.total.toString(),
        amountPaid: updated.amountPaid.toString(),
        balanceDue: result.balanceDue,
      },
      duplicate: result.duplicate,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to record payment";
    const status = message.includes("not found")
      ? 404
      : message.includes("Cannot record payment") || message.includes("disabled")
        ? 409
        : message.includes("exceeds")
          ? 422
          : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
