import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ensureActiveWorkspace } from "@/lib/workspace";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const workspace = await ensureActiveWorkspace(session.user.id, session.user.name);
    if (!workspace) {
      return NextResponse.json({
        hasClients: false,
        hasActiveProjects: false,
        clientCount: 0,
        activeProjectCount: 0,
      });
    }

    const workspaceId = workspace.id;

    const [clientCount, activeProjectCount] = await Promise.all([
      prisma.client.count({
        where: { workspaceId },
      }),
      prisma.project.count({
        where: {
          workspaceId,
          status: {
            in: ["active", "ACTIVE"],
          },
        },
      }),
    ]);

    return NextResponse.json({
      hasClients: clientCount > 0,
      hasActiveProjects: activeProjectCount > 0,
      clientCount,
      activeProjectCount,
    });
  } catch (error) {
    console.error("[AUTOMATION_PREREQUISITES_GET]", error);
    return NextResponse.json({ error: "Failed to check prerequisites" }, { status: 500 });
  }
}
