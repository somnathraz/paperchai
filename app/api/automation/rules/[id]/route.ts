import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ensureActiveWorkspace } from "@/lib/workspace";
import { z } from "zod";
import { isWorkspaceApprover } from "@/lib/invoices/approval-routing";
import { assertWorkspaceFeature, serializeEntitlementError } from "@/lib/entitlements";

const updateAutomationSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().optional(),
  scope: z
    .enum(["ALL_PROJECTS", "BY_TAG", "BY_RISK_LEVEL", "SPECIFIC_CLIENT", "SELECTED_CLIENTS"])
    .optional(),
  scopeValue: z.string().optional(),
  sequence: z.enum(["STANDARD", "AGGRESSIVE", "CUSTOM"]).optional(),
  channels: z.array(z.string()).optional(),
  status: z.enum(["PENDING", "ACTIVE", "PAUSED", "ARCHIVED"]).optional(),
});

// GET /api/automation/rules/[id] - Get single automation rule
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const workspace = await ensureActiveWorkspace(session.user.id, session.user.name);
    if (!workspace) {
      return NextResponse.json({
        automation: null,
        workspaceReady: false,
        error: "No workspace found",
      });
    }
    try {
      await assertWorkspaceFeature(workspace.id, session.user.id, "automation");
    } catch (error) {
      const serialized = serializeEntitlementError(error);
      if (serialized) {
        return NextResponse.json(serialized.body, { status: serialized.status });
      }
      throw error;
    }

    const { id } = await params;

    const automation = await prisma.automationRule.findUnique({
      where: {
        id,
      },
    });

    if (!automation || automation.workspaceId !== workspace.id) {
      return NextResponse.json({ error: "Automation not found" }, { status: 404 });
    }

    return NextResponse.json({
      automation: {
        ...automation,
        channels: automation.channels.split(","),
      },
    });
  } catch (error) {
    console.error("[AUTOMATION_RULE_GET]", error);
    return NextResponse.json({ error: "Failed to fetch automation rule" }, { status: 500 });
  }
}

// PATCH /api/automation/rules/[id] - Update automation rule
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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
        { error: "Only workspace owners/admins can manage automation rules" },
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

    const body = await request.json();
    const validated = updateAutomationSchema.parse(body);

    if (
      (validated.scope === "SELECTED_CLIENTS" || validated.scope === "SPECIFIC_CLIENT") &&
      validated.scopeValue !== undefined &&
      validated.scopeValue !== ""
    ) {
      const clientIds = validated.scopeValue
        .split(",")
        .map((id) => id.trim())
        .filter(Boolean);
      if (clientIds.length > 0) {
        const clientsInWorkspace = await prisma.client.count({
          where: {
            id: { in: clientIds },
            workspaceId: workspace.id,
          },
        });
        if (clientsInWorkspace !== clientIds.length) {
          return NextResponse.json(
            { error: "Some selected clients are not in this workspace" },
            { status: 400 }
          );
        }
      }
    }

    const updated = await prisma.automationRule.update({
      where: { id },
      data: {
        ...(validated.name && { name: validated.name }),
        ...(validated.description !== undefined && { description: validated.description }),
        ...(validated.scope && { scope: validated.scope }),
        ...(validated.scopeValue !== undefined && { scopeValue: validated.scopeValue }),
        ...(validated.sequence && { sequence: validated.sequence }),
        ...(validated.channels && { channels: validated.channels.join(",") }),
        ...(validated.status && { status: validated.status }),
      },
    });

    return NextResponse.json({
      automation: {
        ...updated,
        channels: updated.channels.split(","),
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request data", details: error.issues },
        { status: 400 }
      );
    }
    console.error("[AUTOMATION_RULE_PATCH]", error);
    const details = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: "Failed to update automation rule", details },
      { status: 500 }
    );
  }
}

// DELETE /api/automation/rules/[id] - Delete (archive) automation rule
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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
        { error: "Only workspace owners/admins can manage automation rules" },
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

    // Soft delete by setting status to ARCHIVED
    await prisma.automationRule.update({
      where: { id },
      data: { status: "ARCHIVED" },
    });

    return NextResponse.json({ message: "Automation deleted successfully" });
  } catch (error) {
    console.error("[AUTOMATION_RULE_DELETE]", error);
    return NextResponse.json({ error: "Failed to delete automation rule" }, { status: 500 });
  }
}
