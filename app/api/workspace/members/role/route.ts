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
    return NextResponse.json({ error: "Only owners can update roles" }, { status: 403 });
  }

  const body = await req.json();
  const memberId = body?.memberId;
  const role = body?.role;

  if (!memberId || !role) {
    return NextResponse.json({ error: "Member and role are required" }, { status: 400 });
  }

  await prisma.workspaceMember.update({
    where: { id: memberId },
    data: { role },
  });

  return NextResponse.json({ success: true });
}
