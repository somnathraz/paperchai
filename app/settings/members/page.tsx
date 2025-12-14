import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { SettingsLayout } from "@/components/settings/settings-layout";
import { prisma } from "@/lib/prisma";
import { WorkspaceMembersPanel } from "@/components/settings/workspace-members-panel";

export default async function MembersSettingsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email || !session.user.workspaceId) {
    redirect("/login?callbackUrl=/settings/members");
  }

  const workspace = await prisma.workspace.findUnique({
    where: { id: session.user.workspaceId },
    include: {
      members: { include: { user: true }, orderBy: { createdAt: "asc" } },
      invites: { orderBy: { createdAt: "desc" } },
    },
  });

  if (!workspace) {
    redirect("/dashboard");
  }

  const members = workspace.members.map((member) => ({
    id: member.id,
    name: member.user.name || member.user.email,
    email: member.user.email,
    role: member.role,
    status: "active",
    lastActive: new Intl.DateTimeFormat("en", { dateStyle: "medium" }).format(member.user.updatedAt || new Date()),
    twoFactor: Boolean(member.user.emailVerified),
    isOwner: member.userId === workspace.ownerId,
  }));

  const invites = workspace.invites.map((invite) => ({
    id: invite.id,
    email: invite.email,
    role: invite.role,
    status: invite.status,
    createdAt: invite.createdAt.toISOString(),
  }));

  return (
    <SettingsLayout current="/settings/members" title="Workspace members" description="Invite teammates, assign permissions, and transfer workspace control.">
      <WorkspaceMembersPanel
        members={members}
        invites={invites}
        plan="Pro"
        maxMembersLabel="Unlimited seats"
        isOwner={workspace.ownerId === session.user.id}
      />
    </SettingsLayout>
  );
}
