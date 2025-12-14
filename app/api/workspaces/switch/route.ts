"use server";

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { workspaceId } = await req.json();
  if (!workspaceId) {
    return NextResponse.json({ error: "Workspace ID is required" }, { status: 400 });
  }

  const membership = await prisma.workspaceMember.findFirst({
    where: { userId: session.user.id, workspaceId },
  });

  if (!membership) {
    return NextResponse.json({ error: "Not a member of this workspace" }, { status: 403 });
  }

  await prisma.user.update({
    where: { id: session.user.id },
    data: { activeWorkspaceId: workspaceId },
  });

  cookies().set("paperchai_workspace", workspaceId, { httpOnly: true, path: "/" });

  return NextResponse.json({ success: true });
}
