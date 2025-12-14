"use server";

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";

export async function DELETE(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: { activeWorkspace: true },
    });

    if (!user || !user.activeWorkspace) {
      return NextResponse.json({ error: "Workspace not found" }, { status: 404 });
    }

    const workspace = user.activeWorkspace;

    // Check if user is workspace owner
    if (workspace.ownerId !== user.id) {
      return NextResponse.json(
        { error: "Only workspace owner can delete workspace" },
        { status: 403 }
      );
    }

    // Check for confirmation
    const body = await req.json();
    if (!body.confirm || body.confirm !== workspace.name) {
      return NextResponse.json({ error: "Workspace name confirmation required" }, { status: 400 });
    }

    // Delete workspace (cascade will handle members)
    await prisma.workspace.delete({
      where: { id: workspace.id },
    });

    // Clear active workspace cookie
    const cookieStore = await cookies();
    cookieStore.delete("paperchai_workspace");

    // Update user's activeWorkspaceId if it was this workspace
    if (user.activeWorkspaceId === workspace.id) {
      // Find another workspace for the user
      const otherMembership = await prisma.workspaceMember.findFirst({
        where: { userId: user.id, workspaceId: { not: workspace.id } },
        include: { workspace: true },
      });

      if (otherMembership) {
        await prisma.user.update({
          where: { id: user.id },
          data: { activeWorkspaceId: otherMembership.workspaceId },
        });
        const cookieStore = await cookies();
        cookieStore.set("paperchai_workspace", otherMembership.workspaceId, {
          httpOnly: true,
          path: "/",
        });
      } else {
        await prisma.user.update({
          where: { id: user.id },
          data: { activeWorkspaceId: null },
        });
      }
    }

    return NextResponse.json({ success: true, message: "Workspace deleted successfully" });
  } catch (error) {
    console.error("Workspace delete error:", error);
    return NextResponse.json({ error: "Could not delete workspace" }, { status: 500 });
  }
}
