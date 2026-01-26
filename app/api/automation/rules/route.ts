import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ensureActiveWorkspace } from "@/lib/workspace";
import { z } from "zod";

const createAutomationSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  trigger: z.enum([
    "NOTION_STATUS_CHANGE",
    "MILESTONE_DUE",
    "INVOICE_OVERDUE",
    "PROJECT_STARTED",
    "SLACK_THREAD_TAG",
  ]),
  triggerConfig: z.record(z.string(), z.any()).optional(),
  scope: z
    .enum(["ALL_PROJECTS", "BY_TAG", "BY_RISK_LEVEL", "SPECIFIC_CLIENT", "SELECTED_CLIENTS"])
    .optional(),
  scopeValue: z.string().optional(),
  sequence: z.enum(["STANDARD", "AGGRESSIVE", "CUSTOM"]).optional(),
  channels: z.array(z.string()).min(1),
  status: z.enum(["PENDING", "ACTIVE", "PAUSED", "ARCHIVED"]).optional(),
  source: z.enum(["MANUAL", "NOTION_IMPORT", "SLACK_IMPORT", "AI_SUGGESTION"]).optional(),
  sourceImportId: z.string().optional(),
});

// GET /api/automation/rules - List all automation rules for workspace
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const workspace = await ensureActiveWorkspace(session.user.id, session.user.name);
    if (!workspace) {
      return NextResponse.json({ error: "No workspace found" }, { status: 404 });
    }

    // DEBUG: Check if automationRule exists on prisma client
    console.log(
      "[DEBUG] Prisma Keys:",
      Object.keys(prisma).filter((k) => !k.startsWith("_") && !k.startsWith("$"))
    );
    console.log("[DEBUG] Has automationRule?", !!(prisma as any).automationRule);

    const automations = await prisma.automationRule.findMany({
      where: {
        workspaceId: workspace.id,
        status: {
          not: "ARCHIVED", // Don't show archived automations
        },
      },
      orderBy: [
        { status: "asc" }, // PENDING first, then ACTIVE, then PAUSED
        { createdAt: "desc" },
      ],
    });

    return NextResponse.json({
      automations: automations.map((a) => ({
        id: a.id,
        name: a.name,
        description: a.description,
        trigger: a.trigger,
        scope: a.scope,
        scopeValue: a.scopeValue,
        sequence: a.sequence,
        channels: a.channels.split(","),
        status: a.status,
        source: a.source,
        lastRunAt: a.lastRunAt,
        nextRunAt: a.nextRunAt,
        runCount: a.runCount,
        createdAt: a.createdAt,
        updatedAt: a.updatedAt,
      })),
    });
  } catch (error) {
    console.error("[AUTOMATION_RULES_GET]", error);
    return NextResponse.json({ error: "Failed to fetch automation rules" }, { status: 500 });
  }
}

// POST /api/automation/rules - Create new automation rule
export async function POST(request: NextRequest) {
  try {
    console.log("[AUTOMATION_POST] Starting request processing");
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      console.log("[AUTOMATION_POST] Unauthorized: No session");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const workspace = await ensureActiveWorkspace(session.user.id, session.user.name);
    if (!workspace) {
      console.log("[AUTOMATION_POST] No workspace found");
      return NextResponse.json({ error: "No workspace found" }, { status: 404 });
    }

    const body = await request.json();
    console.log("[AUTOMATION_POST] Received body:", JSON.stringify(body, null, 2));

    const validated = createAutomationSchema.parse(body);
    console.log("[AUTOMATION_POST] Validation successful. Creating record...");

    // Create automation rule
    const automation = await prisma.automationRule.create({
      data: {
        workspaceId: workspace.id,
        name: validated.name,
        description: validated.description,
        trigger: validated.trigger,
        triggerConfig: validated.triggerConfig,
        scope: validated.scope || "ALL_PROJECTS",
        scopeValue: validated.scopeValue,
        sequence: validated.sequence || "STANDARD",
        channels: validated.channels.join(","),
        status: validated.status || "PENDING",
        source: validated.source || "MANUAL",
        sourceImportId: validated.sourceImportId,
      },
    });

    console.log("[AUTOMATION_POST] Created automation:", automation.id);

    return NextResponse.json({
      automation: {
        id: automation.id,
        name: automation.name,
        status: automation.status,
      },
      message:
        automation.status === "PENDING"
          ? "Automation created! Please approve to activate."
          : "Automation created successfully!",
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error("[AUTOMATION_POST] Validation Error:", JSON.stringify(error.issues, null, 2));
      return NextResponse.json(
        { error: "Invalid request data", details: error.issues },
        { status: 400 }
      );
    }
    console.error("[AUTOMATION_RULES_POST] Error:", error);
    return NextResponse.json({ error: "Failed to create automation rule" }, { status: 500 });
  }
}
