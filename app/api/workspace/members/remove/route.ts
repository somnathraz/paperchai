import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ensureActiveWorkspace } from "@/lib/workspace";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const workspace = await ensureActiveWorkspace(session.user.id, session.user.name);
  const workspaceId = workspace?.id;
  if (!workspaceId) {
    return NextResponse.json({ error: "Workspace not found" }, { status: 404 });
  }

  const membership = await prisma.workspaceMember.findFirst({
    where: { workspaceId, userId: session.user.id, removedAt: null },
    select: { role: true },
  });

  if (!membership || (membership.role !== "OWNER" && membership.role !== "ADMIN")) {
    return NextResponse.json({ error: "Only owners/admins can modify members" }, { status: 403 });
  }

  const body = await req.json();
  const memberId = body?.memberId as string | undefined;
  const inviteId = body?.inviteId as string | undefined;

  if (!memberId && !inviteId) {
    return NextResponse.json({ error: "Provide a member or invite id" }, { status: 400 });
  }

  if (memberId) {
    const target = await prisma.workspaceMember.findUnique({
      where: { id: memberId },
      select: { id: true, workspaceId: true, userId: true, removedAt: true },
    });
    if (!target || target.workspaceId !== workspaceId || target.removedAt) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 });
    }
    if (target.userId === session.user.id) {
      return NextResponse.json({ error: "Cannot remove yourself" }, { status: 422 });
    }
    await prisma.workspaceMember.delete({ where: { id: memberId } });
  }

  if (inviteId) {
    const invite = await prisma.workspaceInvite.findUnique({
      where: { id: inviteId },
      select: { id: true, workspaceId: true },
    });
    if (!invite || invite.workspaceId !== workspaceId) {
      return NextResponse.json({ error: "Invite not found" }, { status: 404 });
    }
    await prisma.workspaceInvite.delete({ where: { id: inviteId } });
  }

  return NextResponse.json({ success: true });
}
