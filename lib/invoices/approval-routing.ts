import { prisma } from "@/lib/prisma";

export type WorkspaceApprover = {
  userId: string;
  name: string;
  email: string;
  role: "OWNER" | "ADMIN";
};

export async function getWorkspaceApprovers(workspaceId: string): Promise<WorkspaceApprover[]> {
  const members = await prisma.workspaceMember.findMany({
    where: {
      workspaceId,
      removedAt: null,
      role: { in: ["OWNER", "ADMIN"] },
    },
    select: {
      userId: true,
      role: true,
      user: { select: { name: true, email: true } },
    },
    orderBy: [{ role: "asc" }, { joinedAt: "asc" }],
  });

  const approvers = members
    .filter((member) => !!member.user?.email)
    .map((member) => ({
      userId: member.userId,
      role: member.role as "OWNER" | "ADMIN",
      name: member.user?.name || member.user?.email || "Approver",
      email: member.user?.email || "",
    }));

  if (approvers.length > 0) return approvers;

  // Fallback for legacy workspaces that may only have owner relation populated.
  const workspace = await prisma.workspace.findUnique({
    where: { id: workspaceId },
    select: {
      ownerId: true,
      owner: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  });

  if (workspace?.owner?.email && workspace.ownerId) {
    return [
      {
        userId: workspace.ownerId,
        role: "OWNER",
        name: workspace.owner.name || workspace.owner.email,
        email: workspace.owner.email,
      },
    ];
  }

  return [];
}

export async function isWorkspaceApprover(workspaceId: string, userId: string): Promise<boolean> {
  const member = await prisma.workspaceMember.findFirst({
    where: {
      workspaceId,
      userId,
      removedAt: null,
      role: { in: ["OWNER", "ADMIN"] },
    },
    select: { userId: true },
  });

  if (member) return true;

  const workspace = await prisma.workspace.findUnique({
    where: { id: workspaceId },
    select: { ownerId: true },
  });

  return workspace?.ownerId === userId;
}
