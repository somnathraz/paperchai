import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/reminders/settings
export async function GET() {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.email) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const user = await prisma.user.findUnique({
            where: { email: session.user.email },
            include: { activeWorkspace: true },
        });

        if (!user || !user.activeWorkspaceId) {
            return NextResponse.json({ error: "No active workspace" }, { status: 404 });
        }

        const settings = await prisma.reminderSettings.findUnique({
            where: { workspaceId: user.activeWorkspaceId },
        });

        // Return default if not exists
        if (!settings) {
            return NextResponse.json({
                enabled: true,
                timezone: user.activeWorkspace?.country === "India" ? "Asia/Kolkata" : "UTC",
            });
        }

        return NextResponse.json(settings);
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

        const user = await prisma.user.findUnique({
            where: { email: session.user.email },
        });

        if (!user || !user.activeWorkspaceId) {
            return NextResponse.json({ error: "No active workspace" }, { status: 404 });
        }

        const body = await req.json();
        const { enabled, timezone } = body;

        const settings = await prisma.reminderSettings.upsert({
            where: { workspaceId: user.activeWorkspaceId },
            update: {
                enabled,
                timezone,
            },
            create: {
                workspaceId: user.activeWorkspaceId,
                enabled: enabled ?? true,
                timezone: timezone ?? "Asia/Kolkata",
            },
        });

        return NextResponse.json(settings);
    } catch (error) {
        console.error("Error updating reminder settings:", error);
        return NextResponse.json({ error: "Failed to update settings" }, { status: 500 });
    }
}
