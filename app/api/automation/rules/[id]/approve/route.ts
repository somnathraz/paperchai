import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ensureActiveWorkspace } from "@/lib/workspace";
import { isWorkspaceApprover } from "@/lib/invoices/approval-routing";
import { assertWorkspaceFeature, serializeEntitlementError } from "@/lib/entitlements";

const RUNNER_SUPPORTED_TRIGGERS = new Set(["MILESTONE_DUE", "INVOICE_OVERDUE"]);

// POST /api/automation/rules/[id]/approve - Approve pending automation
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const workspace = await ensureActiveWorkspace(session.user.id, session.user.name);
    if (!workspace) {
      return NextResponse.json(
        { error: "No workspace found", code: "WORKSPACE_NOT_READY" },
        { status: 409 }
      );
    }
    try {
      await assertWorkspaceFeature(workspace.id, session.user.id, "approvalWorkflows");
      await assertWorkspaceFeature(workspace.id, session.user.id, "automation");
    } catch (error) {
      const serialized = serializeEntitlementError(error);
      if (serialized) {
        return NextResponse.json(serialized.body, { status: serialized.status });
      }
      throw error;
    }
    const canManage = await isWorkspaceApprover(workspace.id, session.user.id);
    if (!canManage) {
      return NextResponse.json(
        { error: "Only workspace owners/admins can approve automation rules" },
        { status: 403 }
      );
    }

    const { id } = await params;

    const automation = await prisma.automationRule.findUnique({
      where: { id },
    });

    if (!automation || automation.workspaceId !== workspace.id) {
      return NextResponse.json({ error: "Automation not found" }, { status: 404 });
    }

    if (automation.status !== "PENDING") {
      return NextResponse.json(
        { error: "Only pending automations can be approved" },
        { status: 400 }
      );
    }

    if (!RUNNER_SUPPORTED_TRIGGERS.has(automation.trigger)) {
      return NextResponse.json(
        {
          error: "Trigger is not supported yet",
          details: `Supported triggers: ${Array.from(RUNNER_SUPPORTED_TRIGGERS).join(", ")}`,
        },
        { status: 422 }
      );
    }

    // Calculate next run time (for demonstration, set to 1 hour from now)
    const nextRunAt = new Date();
    nextRunAt.setHours(nextRunAt.getHours() + 1);

    const updated = await prisma.automationRule.update({
      where: { id },
      data: {
        status: "ACTIVE",
        approvedAt: new Date(),
        approvedBy: session.user.id,
        nextRunAt,
      },
    });

    // SIDE EFFECT: Trigger invoice generation for NOTION_STATUS_CHANGE automations
    let generatedInvoices: Array<{ id: string; number: string }> = [];

    if (updated.trigger === "NOTION_STATUS_CHANGE") {
      try {
        // Find pending Notion imports for this workspace that haven't been invoiced
        const pendingImports = await prisma.notionImport.findMany({
          where: {
            connection: {
              workspaceId: workspace.id,
            },
            status: "COMPLETED",
            importType: "INVOICE_DATA",
          },
          include: {
            connection: true,
          },
          take: 10, // Limit to prevent overwhelming
        });

        // For each pending import, create a draft invoice if not already exists
        for (const importRecord of pendingImports) {
          // Check if invoice already exists for this Notion page
          const existingInvoice = await prisma.invoice.findFirst({
            where: {
              workspaceId: workspace.id,
              notes: {
                contains: importRecord.notionPageId || "",
              },
            },
          });

          if (!existingInvoice && importRecord.clientId) {
            // Generate invoice number
            const invoiceCount = await prisma.invoice.count({
              where: { workspaceId: workspace.id },
            });
            const invoiceNumber = `INV-${String(invoiceCount + 1).padStart(4, "0")}`;

            // Create draft invoice
            const invoice = await prisma.invoice.create({
              data: {
                workspaceId: workspace.id,
                clientId: importRecord.clientId,
                number: invoiceNumber,
                status: "draft",
                currency: "INR",
                subtotal: 0,
                taxTotal: 0,
                total: 0,
                notes: `Auto-generated from Notion (Page: ${importRecord.notionPageId}). Automation: ${updated.name}`,
                issueDate: new Date(),
              },
            });

            generatedInvoices.push({ id: invoice.id, number: invoice.number });
          }
        }
      } catch (invoiceError) {
        console.error("[AUTOMATION_APPROVE] Invoice generation error:", invoiceError);
        // Don't fail the approval, just log the error
      }
    }

    return NextResponse.json({
      automation: {
        id: updated.id,
        name: updated.name,
        status: updated.status,
      },
      generatedInvoices,
      message:
        generatedInvoices.length > 0
          ? `Automation approved! Created ${generatedInvoices.length} draft invoice(s).`
          : "Automation approved and activated!",
    });
  } catch (error) {
    console.error("[AUTOMATION_APPROVE]", error);
    return NextResponse.json({ error: "Failed to approve automation" }, { status: 500 });
  }
}
