"use server";

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ensureActiveWorkspace } from "@/lib/workspace";
import {
  ProjectType,
  BillingStrategy,
  MilestoneBillingTrigger,
  MilestoneStatus,
} from "@prisma/client";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const workspace = await ensureActiveWorkspace(session.user.id, session.user.name);
  if (!workspace) {
    return NextResponse.json({ error: "Workspace not found" }, { status: 404 });
  }

  const { id } = await params;
  const clientId = id;
  const body = await req.json();
  const {
    name,
    description,
    type, // ProjectType
    billingStrategy, // BillingStrategy
    totalBudget, // number (cents/paise)
    currency,
    startDate,
    endDate,
    autoInvoiceEnabled,
    autoRemindersEnabled,
    milestones, // Array of milestone objects
    billableItems, // Optional: for legacy-style predefined items
  } = body;

  if (!name) {
    return NextResponse.json({ error: "Project name is required" }, { status: 400 });
  }

  try {
    const project = await prisma.project.create({
      data: {
        workspaceId: workspace.id,
        clientId,
        name,
        description,
        type: type || "FIXED",
        billingStrategy: billingStrategy || "SINGLE_INVOICE",
        totalBudget,
        currency: currency || "INR",
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate ? new Date(endDate) : undefined,
        autoInvoiceEnabled: autoInvoiceEnabled || false,
        autoRemindersEnabled: autoRemindersEnabled || false,
        billableItems,

        // Create milestones if provided
        milestones:
          milestones && Array.isArray(milestones)
            ? {
                create: milestones.map((m: any, index: number) => ({
                  title: m.title,
                  description: m.description,
                  amount: m.amount || 0,
                  currency: m.currency || currency || "INR",
                  expectedDate: m.expectedDate ? new Date(m.expectedDate) : undefined,
                  dueDate: m.dueDate ? new Date(m.dueDate) : undefined,
                  billingTrigger: m.billingTrigger || "ON_COMPLETION",
                  status: m.status || "PLANNED",
                  autoInvoiceEnabled: m.autoInvoiceEnabled ?? true,
                  autoRemindersEnabled: m.autoRemindersEnabled ?? true,
                  orderIndex: m.orderIndex ?? index,
                })),
              }
            : undefined,
      },
      include: {
        milestones: true,
      },
    });

    // --- Auto-Invoice Logic ---
    console.log(
      `[CreateProject] AutoInvoice Check: Enabled=${project.autoInvoiceEnabled}, Milestones=${project.milestones?.length}`
    );
    if (project.autoInvoiceEnabled && project.milestones && project.milestones.length > 0) {
      let eligibleMilestones = project.milestones.filter(
        (m) => m.billingTrigger === "ON_CREATION" && m.autoInvoiceEnabled
      );

      console.log(
        `[CreateProject] Eligible 'ON_CREATION' Milestones: ${eligibleMilestones.length}`
      );

      // Fallback: If no "Immediate" milestones found but Auto-Invoice is ON,
      // assume the user wants the first milestone (e.g. Deposit) drafted immediately.
      if (eligibleMilestones.length === 0 && project.milestones.length > 0) {
        console.log(`[CreateProject] Fallback to first milestone for auto-invoice`);
        eligibleMilestones = [project.milestones[0]];
      }

      for (const m of eligibleMilestones) {
        console.log(`[CreateProject] Generating invoice for milestone: ${m.title} (${m.id})`);
        await generateInvoiceForMilestone(workspace.id, clientId, project.id, m);
      }
    }

    // --- Link Source Document (if any) ---
    if (body.sourceDocument) {
      try {
        await prisma.projectDocument.create({
          data: {
            workspaceId: workspace.id,
            clientId: clientId,
            projectId: project.id,
            fileKey: body.sourceDocument.fileKey,
            fileName: body.sourceDocument.fileName,
            mimeType: body.sourceDocument.mimeType,
            size: body.sourceDocument.size || 0,
            sourceType: "CONTRACT", // Assume contract/brief for initial upload
            aiStatus: "PROCESSED", // It was already processed by AI Wizard
            createdByUserId: session.user.id,
          },
        });
        console.log(`[CreateProject] Linked source document: ${body.sourceDocument.fileName}`);
      } catch (docError) {
        console.error("Failed to link source document:", docError);
        // Monitoring would catch this, but don't fail the project creation
      }
    }

    return NextResponse.json({ project });
  } catch (error) {
    console.error("Error creating project:", error);
    return NextResponse.json({ error: "Failed to create project" }, { status: 500 });
  }
}

// Helper to generate Invoice
async function generateInvoiceForMilestone(
  workspaceId: string,
  clientId: string,
  projectId: string,
  milestone: any
) {
  // Basic Invoice Generation
  try {
    await prisma.invoice.create({
      data: {
        workspaceId,
        clientId,
        projectId,
        number: `INV-${Date.now()}`, // Simple auto-generation
        issueDate: new Date(),
        dueDate: milestone.dueDate || new Date(), // Immediate due
        currency: milestone.currency,
        status: "draft", // Always draft first
        notes: `Auto-generated for milestone: ${milestone.title}`,
        subtotal: milestone.amount,
        total: milestone.amount, // Tax calculation would happen here ideally
        items: {
          create: [
            {
              title: milestone.title,
              description: milestone.description || `Milestone payment for ${milestone.title}`,
              quantity: 1,
              unitPrice: milestone.amount,
              total: milestone.amount,
            },
          ],
        },
      },
    });
    console.log(`Created auto-invoice for milestone ${milestone.id}`);
  } catch (e) {
    console.error("Failed to auto-generate invoice", e);
  }
}
