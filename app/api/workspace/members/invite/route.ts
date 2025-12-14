import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email || !session.user.workspaceId) {
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
    return NextResponse.json({ error: "Only owners can invite members" }, { status: 403 });
  }

  const body = await req.json();
  const email = body?.email?.toLowerCase().trim();
  const role = body?.role || "viewer";

  if (!email) {
    return NextResponse.json({ error: "Email is required" }, { status: 400 });
  }

  const existingMember = await prisma.workspaceMember.findFirst({
    where: { workspaceId: workspace.id, user: { email } },
    include: { user: true },
  });

  if (existingMember) {
    return NextResponse.json({ error: "User already a member" }, { status: 409 });
  }

  const existingInvite = await prisma.workspaceInvite.findFirst({
    where: { workspaceId: workspace.id, email, status: "pending" },
  });

  if (existingInvite) {
    return NextResponse.json({ error: "Invite already sent" }, { status: 409 });
  }

  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 7);

  await prisma.workspaceInvite.create({
    data: {
      email,
      role,
      token,
      workspaceId: workspace.id,
      invitedById: session.user.id,
      expiresAt,
    },
  });

  return NextResponse.json({ success: true });
}
