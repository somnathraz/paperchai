import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ProfileForm } from "@/components/profile/profile-form";
import { SettingsLayout } from "@/components/settings/settings-layout";

export default async function ProfileSettingsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    redirect("/login?callbackUrl=/settings/profile");
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
  });

  if (!user) {
    redirect("/login");
  }

  const activeWorkspaceId =
    (session.user as any).activeWorkspaceId || (session.user as any).workspaceId || null;
  let workspaceRole = "MEMBER";
  if (activeWorkspaceId) {
    const [membership, workspace] = await Promise.all([
      prisma.workspaceMember.findFirst({
        where: { workspaceId: activeWorkspaceId, userId: session.user.id },
        select: { role: true },
      }),
      prisma.workspace.findUnique({
        where: { id: activeWorkspaceId },
        select: { ownerId: true },
      }),
    ]);
    if (membership?.role) {
      workspaceRole = membership.role;
    } else if (workspace?.ownerId === session.user.id) {
      workspaceRole = "OWNER";
    }
  }

  return (
    <SettingsLayout
      current="/settings/profile"
      title="Profile settings"
      description="Update yor profile settings."
    >
      <ProfileForm
        initialData={{
          name: user.name ?? "",
          role: workspaceRole,
          // Legacy fields removed from user, now on workspace.
          // We should ideally fetch workspace settings here or drop these from the form.
          // For now, providing defaults to satisfy the UI component prop types.
          timezone: "Asia/Kolkata",
          currency: "INR",
          reminderTone: "Warm + Polite",
          backupEmail: "",
        }}
      />
    </SettingsLayout>
  );
}
