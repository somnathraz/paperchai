"use server";

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/profile
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: {
      name: true,
      email: true,
      image: true,
      platformRole: true,
    },
  });

  if (!user) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Fetch workspace and active membership role using session workspace ID
  let workspace = null;
  let workspaceRole: string | null = null;
  const workspaceId = (session.user as any).activeWorkspaceId;
  if (workspaceId) {
    const [workspaceRecord, membership] = await Promise.all([
      prisma.workspace.findUnique({
        where: { id: workspaceId },
        select: { id: true, name: true, ownerId: true },
      }),
      prisma.workspaceMember.findFirst({
        where: { workspaceId, userId: session.user.id },
        select: { role: true },
      }),
    ]);

    workspace = workspaceRecord ? { id: workspaceRecord.id, name: workspaceRecord.name } : null;
    if (membership?.role) {
      workspaceRole = membership.role;
    } else if (workspaceRecord?.ownerId === session.user.id) {
      workspaceRole = "OWNER";
    }
  }

  return NextResponse.json({
    name: user.name,
    email: user.email,
    role: workspaceRole || user.platformRole,
    platformRole: user.platformRole,
    image: user.image,
    workspace: workspace,
    // Defaults for legacy fields
    timezone: null,
    currency: null,
    reminderTone: null,
  });
}

export async function PATCH(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { name, image } = body;
    // Ignore updates to legacy fields (timezone/currency) as they are now in WorkspaceSettings

    const updatedUser = await prisma.user.update({
      where: { email: session.user.email },
      data: {
        ...(name !== undefined && { name }),
        ...(image !== undefined && { image: image || null }),
      },
    });

    return NextResponse.json({
      success: true,
      user: {
        name: updatedUser.name,
        image: updatedUser.image,
        role: updatedUser.platformRole,
        email: updatedUser.email,
      },
    });
  } catch (error) {
    console.error("Profile update error:", error);
    return NextResponse.json({ error: "Could not update profile" }, { status: 500 });
  }
}
