import { prisma } from "./prisma";
import { slugify } from "./slugify";
import { provisionWorkspaceSubscription } from "@/lib/billing/subscriptions";

export const WORKSPACE_WRITE_ROLES = ["OWNER", "ADMIN", "MEMBER"] as const;
export type WorkspaceWriteRole = (typeof WORKSPACE_WRITE_ROLES)[number];

export async function getWorkspaceMembership(userId: string, workspaceId: string) {
  return prisma.workspaceMember.findFirst({
    where: {
      userId,
      workspaceId,
      removedAt: null,
      workspace: { deletedAt: null },
    },
    select: {
      id: true,
      role: true,
      workspaceId: true,
    },
  });
}

export function canWriteWorkspace(role: string | null | undefined): role is WorkspaceWriteRole {
  return role === "OWNER" || role === "ADMIN" || role === "MEMBER";
}

export async function ensureActiveWorkspace(userId: string, userName?: string | null) {
  // Always resolve workspace via active membership to prevent stale activeWorkspaceId access.
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      activeWorkspaceId: true,
      memberships: {
        where: { removedAt: null },
        include: { workspace: { include: { settings: true } } },
        orderBy: { joinedAt: "asc" },
      },
    },
  });

  if (!user) return null;

  // 1. Use active workspace only if the user is still an active member of it.
  if (user.activeWorkspaceId) {
    const activeMembership = user.memberships.find(
      (membership) =>
        membership.workspaceId === user.activeWorkspaceId && membership.workspace.deletedAt === null
    );
    if (activeMembership) {
      return activeMembership.workspace;
    }
  }

  // 2. Fallback to first active membership workspace.
  const existingMembership = user.memberships.find(
    (membership) => membership.workspace.deletedAt === null
  );
  if (existingMembership) {
    const workspace = existingMembership.workspace;
    if (user.activeWorkspaceId !== workspace.id) {
      await prisma.user.update({
        where: { id: user.id },
        data: { activeWorkspaceId: workspace.id },
      });
    }
    return workspace;
  }

  // 3. Create default workspace for first-time users with no memberships.
  const workspaceName = userName ? `${userName.split(" ")[0]}'s Workspace` : "My Workspace";
  const slugBase = slugify(workspaceName);
  let slug = slugBase;
  let count = 1;
  while (await prisma.workspace.findUnique({ where: { slug } })) {
    slug = `${slugBase}-${count++}`;
  }

  const workspace = await prisma.workspace.create({
    data: {
      name: workspaceName,
      slug,
      ownerId: user.id,
      members: {
        create: {
          role: "OWNER", // Correct enum case
          userId: user.id,
        },
      },
    },
    include: { settings: true },
  });

  await prisma.user.update({
    where: { id: user.id },
    data: { activeWorkspaceId: workspace.id },
  });

  await provisionWorkspaceSubscription(workspace.id, { planCode: "FREE" });

  return workspace;
}
