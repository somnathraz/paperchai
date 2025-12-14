import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { SettingsLayout } from "@/components/settings/settings-layout";
import { WorkspaceForm } from "@/components/settings/workspace-form";

export default async function WorkspaceSettingsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    redirect("/login?callbackUrl=/settings/workspace");
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    include: { activeWorkspace: true },
  });

  if (!user || !user.activeWorkspace) {
    redirect("/dashboard");
  }

  const workspace = user.activeWorkspace;

  return (
    <SettingsLayout
      current="/settings/workspace"
      title="Workspace settings"
      description="Identity used in your workspace."
    >
      <WorkspaceForm workspace={workspace} />
    </SettingsLayout>
  );
}
