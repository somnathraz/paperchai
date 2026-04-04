import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ensureActiveWorkspace } from "@/lib/workspace";
import { isWorkspaceApprover } from "@/lib/invoices/approval-routing";
import { z } from "zod";
import { assertWorkspaceFeature, serializeEntitlementError } from "@/lib/entitlements";

const reminderSettingsSchema = z.object({
  enabled: z.boolean().optional(),
  timezone: z
    .string()
    .trim()
    .min(1)
    .max(100)
    .optional()
    .refine((value) => !value || isValidTimeZone(value), "Invalid timezone"),
});

function isValidTimeZone(value: string): boolean {
  try {
    new Intl.DateTimeFormat(undefined, { timeZone: value });
    return true;
  } catch {
    return false;
  }
}

// GET /api/reminders/settings
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const workspace = await ensureActiveWorkspace(session.user.id, session.user.name);

    if (!workspace) {
      return NextResponse.json({ error: "No active workspace" }, { status: 404 });
    }

    try {
      await assertWorkspaceFeature(workspace.id, session.user.id, "reminders");
    } catch (error) {
      return NextResponse.json(serializeEntitlementError(error), {
        status: (error as any)?.statusCode || 403,
      });
    }

    const settings = await prisma.reminderSettings.findUnique({
      where: { workspaceId: workspace.id },
    });

    // Return default if not exists
    if (!settings) {
      const fallback = {
        enabled: true,
        timezone: workspace.country === "India" ? "Asia/Kolkata" : "UTC",
      };
      return NextResponse.json({
        ...fallback,
        settings: fallback,
      });
    }

    return NextResponse.json({
      ...settings,
      settings,
    });
  } catch (error) {
    console.error("Error fetching reminder settings:", error);
    return NextResponse.json({ error: "Failed to fetch settings" }, { status: 500 });
  }
}

// POST /api/reminders/settings
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const workspace = await ensureActiveWorkspace(session.user.id, session.user.name);

    if (!workspace) {
      return NextResponse.json({ error: "No active workspace" }, { status: 404 });
    }

    try {
      await assertWorkspaceFeature(workspace.id, session.user.id, "reminders");
    } catch (error) {
      return NextResponse.json(serializeEntitlementError(error), {
        status: (error as any)?.statusCode || 403,
      });
    }
    const canManage = await isWorkspaceApprover(workspace.id, session.user.id);
    if (!canManage) {
      return NextResponse.json(
        { error: "Only workspace owners/admins can update reminder settings" },
        { status: 403 }
      );
    }

    const parsed = reminderSettingsSchema.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Invalid request payload" },
        { status: 422 }
      );
    }
    const { enabled, timezone } = parsed.data;

    const settings = await prisma.reminderSettings.upsert({
      where: { workspaceId: workspace.id },
      update: {
        enabled,
        timezone,
      },
      create: {
        workspaceId: workspace.id,
        enabled: enabled ?? true,
        timezone: timezone ?? "Asia/Kolkata",
      },
    });

    return NextResponse.json({
      ...settings,
      settings,
    });
  } catch (error) {
    console.error("Error updating reminder settings:", error);
    return NextResponse.json({ error: "Failed to update settings" }, { status: 500 });
  }
}
