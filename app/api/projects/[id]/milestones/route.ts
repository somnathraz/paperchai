"use server";

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ensureActiveWorkspace } from "@/lib/workspace";

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
  const projectId = id;

  // Verify project ownership
  const project = await prisma.project.findUnique({
    where: { id: projectId, workspaceId: workspace.id },
  });

  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  const body = await req.json();

  // Support both single milestone and bulk milestones array
  let milestones: any[];
  if (body.milestones && Array.isArray(body.milestones)) {
    milestones = body.milestones;
  } else if (body.title) {
    // Single milestone creation
    milestones = [body];
  } else {
    return NextResponse.json({ error: "Milestone data is required" }, { status: 400 });
  }

  try {
    // Determine the next order index
    const lastMilestone = await prisma.projectMilestone.findFirst({
      where: { projectId },
      orderBy: { orderIndex: "desc" },
      select: { orderIndex: true },
    });
    const startOrder = (lastMilestone?.orderIndex || -1) + 1;

    // Create milestones
    const created = await prisma.projectMilestone.createMany({
      data: milestones.map((m: any, idx: number) => ({
        projectId,
        title: m.title,
        description: m.description,
        amount: m.amount || 0,
        currency: m.currency || project.currency || "INR",
        expectedDate: m.expectedDate ? new Date(m.expectedDate) : undefined,
        dueDate: m.dueDate ? new Date(m.dueDate) : undefined,
        billingTrigger: m.billingTrigger || "ON_COMPLETION",
        status: m.status || "PLANNED",
        autoInvoiceEnabled: m.autoInvoiceEnabled ?? true,
        autoRemindersEnabled: m.autoRemindersEnabled ?? true,
        orderIndex: startOrder + idx,
      })),
    });

    return NextResponse.json({
      success: true,
      count: created.count,
    });
  } catch (error) {
    console.error("Error creating milestones:", error);
    return NextResponse.json({ error: "Failed to create milestones" }, { status: 500 });
  }
}
