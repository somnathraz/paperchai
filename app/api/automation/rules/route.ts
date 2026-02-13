import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ensureActiveWorkspace } from "@/lib/workspace";
import { z } from "zod";

const RUNNER_SUPPORTED_TRIGGERS = new Set(["MILESTONE_DUE", "INVOICE_OVERDUE"]);

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
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const workspace = await ensureActiveWorkspace(session.user.id, session.user.name);
    if (!workspace) {
      return NextResponse.json({ error: "No workspace found" }, { status: 404 });
    }

    const validated = createAutomationSchema.parse(await request.json());

    if (!RUNNER_SUPPORTED_TRIGGERS.has(validated.trigger)) {
      return NextResponse.json(
        {
          error: "Trigger is not supported yet",
          details: `Supported triggers: ${Array.from(RUNNER_SUPPORTED_TRIGGERS).join(", ")}`,
        },
        { status: 422 }
      );
    }

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
      return NextResponse.json(
        { error: "Invalid request data", details: error.issues },
        { status: 400 }
      );
    }
    console.error("[AUTOMATION_RULES_POST] Error:", error);
    return NextResponse.json({ error: "Failed to create automation rule" }, { status: 500 });
  }
}
