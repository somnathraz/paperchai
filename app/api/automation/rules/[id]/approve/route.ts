import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ensureActiveWorkspace } from "@/lib/workspace";

// POST /api/automation/rules/[id]/approve - Approve pending automation
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const workspace = await ensureActiveWorkspace(session.user.id, session.user.name);
    if (!workspace) {
      return NextResponse.json({ error: "No workspace found" }, { status: 404 });
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

    return NextResponse.json({
      automation: {
        id: updated.id,
        name: updated.name,
        status: updated.status,
      },
      message: "Automation approved and activated!",
    });
  } catch (error) {
    console.error("[AUTOMATION_APPROVE]", error);
    return NextResponse.json({ error: "Failed to approve automation" }, { status: 500 });
  }
}
