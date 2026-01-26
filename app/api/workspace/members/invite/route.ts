import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { assertLimit } from "@/lib/usage";
import crypto from "crypto";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  // Use activeWorkspaceId (Multi-tenancy Refactor)
  const workspaceId = session?.user?.activeWorkspaceId;

  if (!session?.user?.email || !workspaceId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const workspace = await prisma.workspace.findUnique({
    where: { id: workspaceId },
    select: { id: true, createdById: true }, // Changed ownerId to createdById (Schema Refactor)
  });

  if (!workspace) {
    return NextResponse.json({ error: "Workspace not found" }, { status: 404 });
  }

  // Permission check (using createdById as Owner proxy, or robust Permission helper)
  // Logic: Owner or Admin. For now, strict Owner check.
  // Note: Schema migration preserved ownerId in 'legacyOwnerWorkspaces' but new tracking is 'createdById' or Membership Role.
  // Ideally, check Membership Role:
  const membership = await prisma.workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId, userId: session.user.id } },
  });

  if (membership?.role !== "OWNER" && membership?.role !== "ADMIN") {
    return NextResponse.json({ error: "Only owners/admins can invite members" }, { status: 403 });
  }

  // Check Limit (Gating)
  try {
    await assertLimit(workspace.id, session.user.id, "members");
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 402 });
  }

  const body = await req.json();
  const email = body?.email?.toLowerCase().trim();
  const role = body?.role || "MEMBER"; // Default to MEMBER enum

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
      role: role.toUpperCase(), // Ensure Enum match if string passed
      tokenHash: token, // Schema expects tokenHash
      workspaceId: workspace.id,
      invitedById: session.user.id,
      expiresAt,
    },
  });

  return NextResponse.json({ success: true });
}
