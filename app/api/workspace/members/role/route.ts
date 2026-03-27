import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ensureActiveWorkspace } from "@/lib/workspace";

const VALID_ROLES = new Set(["OWNER", "ADMIN", "MEMBER", "VIEWER"]);

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
    return NextResponse.json({ error: "Only owners/admins can update roles" }, { status: 403 });
  }

  const body = await req.json();
  const memberId = body?.memberId;
  const role = typeof body?.role === "string" ? body.role.toUpperCase() : "";

  if (!memberId || !role || !VALID_ROLES.has(role)) {
    return NextResponse.json({ error: "Member and role are required" }, { status: 400 });
  }
  if (membership.role !== "OWNER" && role === "OWNER") {
    return NextResponse.json({ error: "Only owners can assign owner role" }, { status: 403 });
  }

  const target = await prisma.workspaceMember.findUnique({
    where: { id: memberId },
    select: { id: true, workspaceId: true, userId: true, role: true, removedAt: true },
  });
  if (!target || target.workspaceId !== workspaceId || target.removedAt) {
    return NextResponse.json({ error: "Member not found" }, { status: 404 });
  }
  if (target.userId === session.user.id && role !== target.role) {
    return NextResponse.json({ error: "Cannot change your own role" }, { status: 422 });
  }

  await prisma.workspaceMember.update({
    where: { id: memberId },
    data: { role: role as "OWNER" | "ADMIN" | "MEMBER" | "VIEWER" },
  });

  return NextResponse.json({ success: true });
}
