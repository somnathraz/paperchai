import { prisma } from "./prisma";
import { slugify } from "./slugify";

export async function ensureActiveWorkspace(userId: string, userName?: string | null) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { activeWorkspace: true, memberships: { include: { workspace: true } } },
  });

  if (!user) return null;

  if (user.activeWorkspace) {
    return user.activeWorkspace;
  }

  const existingMembership = user.memberships[0];
  if (existingMembership) {
    const workspace = existingMembership.workspace;
    await prisma.user.update({
      where: { id: user.id },
      data: { activeWorkspaceId: workspace.id },
    });
    return workspace;
  }

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
          role: "owner",
          userId: user.id,
        },
      },
    },
  });

  await prisma.user.update({
    where: { id: user.id },
    data: { activeWorkspaceId: workspace.id },
  });

  return workspace;
}
