import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.workspaceId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const workspace = await prisma.workspace.findUnique({
    where: { id: session.user.workspaceId },
    select: { id: true, ownerId: true },
  });

  if (!workspace) {
    return NextResponse.json({ error: "Workspace not found" }, { status: 404 });
  }

  if (workspace.ownerId !== session.user.id) {
    return NextResponse.json({ error: "Only owners can modify members" }, { status: 403 });
  }

  const body = await req.json();
  const memberId = body?.memberId as string | undefined;
  const inviteId = body?.inviteId as string | undefined;

  if (!memberId && !inviteId) {
    return NextResponse.json({ error: "Provide a member or invite id" }, { status: 400 });
  }

  if (memberId) {
    await prisma.workspaceMember.delete({ where: { id: memberId } });
  }

  if (inviteId) {
    await prisma.workspaceInvite.delete({ where: { id: inviteId } });
  }

  return NextResponse.json({ success: true });
}
