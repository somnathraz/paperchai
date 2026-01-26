import { prisma } from "./prisma";
import { slugify } from "./slugify";

export async function ensureActiveWorkspace(userId: string, userName?: string | null) {
  // Fetch user with membership info, but NOT activeWorkspace relation (it's gone)
  // Instead fetch activeWorkspaceId
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      activeWorkspaceId: true,
      memberships: { include: { workspace: true } },
    },
  });

  if (!user) return null;

  // 1. Try fetching via activeWorkspaceId
  if (user.activeWorkspaceId) {
    const ws = await prisma.workspace.findUnique({
      where: { id: user.activeWorkspaceId },
      include: { settings: true },
    });
    if (ws) return ws;
  }

  // 2. Fallback to first membership
  const existingMembership = user.memberships[0];
  if (existingMembership) {
    const workspace = existingMembership.workspace;
    await prisma.user.update({
      where: { id: user.id },
      data: { activeWorkspaceId: workspace.id },
    });
    return workspace;
  }

  // 3. Create Default Workspace
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

  return workspace;
}
