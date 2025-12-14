"use server";

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ensureActiveWorkspace } from "@/lib/workspace";
import { generateInvoiceDraftFromMilestone } from "@/lib/projects/invoicing";
import { MilestoneStatus } from "@prisma/client";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const workspace = await ensureActiveWorkspace(session.user.id, session.user.name);
  if (!workspace) {
    return NextResponse.json({ error: "Workspace not found" }, { status: 404 });
  }

  const { id } = await params;

  const body = await req.json();
  const { status, amount, title, expectedDate, dueDate, billingTrigger } = body;

  try {
    const existingMilestone = await prisma.projectMilestone.findFirst({
      where: {
        id: id,
        project: { workspaceId: workspace.id }, // Ensure ownership via relation
      },
      include: { project: true },
    });

    if (!existingMilestone) {
      return NextResponse.json({ error: "Milestone not found" }, { status: 404 });
    }

    // Update the milestone
    const updatedMilestone = await prisma.projectMilestone.update({
      where: { id: id },
      data: {
        status,
        amount: amount !== undefined ? amount : undefined,
        title: title !== undefined ? title : undefined,
        expectedDate: expectedDate ? new Date(expectedDate) : undefined,
        dueDate: dueDate ? new Date(dueDate) : undefined,
        billingTrigger: billingTrigger !== undefined ? billingTrigger : undefined,
      },
      include: { project: true },
    });

    let generatedInvoice = null;

    // Automation Check
    if (
      status === "READY_FOR_INVOICE" &&
      existingMilestone.status !== "READY_FOR_INVOICE" && // Only on transition
      // And not already invoiced
      !existingMilestone.invoiceId
    ) {
      if (updatedMilestone.project.autoInvoiceEnabled && updatedMilestone.autoInvoiceEnabled) {
        console.log("Triggering auto-invoice for milestone:", id);
        try {
          generatedInvoice = await generateInvoiceDraftFromMilestone(id);
        } catch (e) {
          console.error("Auto-invoice generation failed", e);
          // We don't fail the request, but we could warn
        }
      }
    }

    return NextResponse.json({
      milestone: updatedMilestone,
      invoiceGenerated: !!generatedInvoice,
      invoiceId: generatedInvoice?.id,
    });
  } catch (error) {
    console.error("Error updating milestone:", error);
    return NextResponse.json({ error: "Failed to update milestone" }, { status: 500 });
  }
}
