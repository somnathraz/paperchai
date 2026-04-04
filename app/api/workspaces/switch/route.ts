"use server";

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import { z } from "zod";

const switchWorkspaceSchema = z.object({
  workspaceId: z.string().cuid(),
});

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = switchWorkspaceSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "Valid workspace ID is required" }, { status: 422 });
  }
  const { workspaceId } = parsed.data;

  const membership = await prisma.workspaceMember.findFirst({
    where: {
      userId: session.user.id,
      workspaceId,
      removedAt: null,
      workspace: { deletedAt: null },
    },
  });

  if (!membership) {
    return NextResponse.json({ error: "Not a member of this workspace" }, { status: 403 });
  }

  await prisma.user.update({
    where: { id: session.user.id },
    data: { activeWorkspaceId: workspaceId },
  });

  const cookieStore = await cookies();
  cookieStore.set("paperchai_workspace", workspaceId, { httpOnly: true, path: "/" });

  return NextResponse.json({ success: true });
}
