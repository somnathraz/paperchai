import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

import { ensureActiveWorkspace } from "@/lib/workspace";
import { ClientListWidget } from "@/features/clients/components/ClientListWidget";
import { DashboardLayout } from "@/components/dashboard/layout-shell";

export default async function ClientsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    redirect("/login?callbackUrl=/clients");
  }

  const workspace = await ensureActiveWorkspace(session.user.id, session.user.name);
  if (!workspace) {
    redirect("/login?callbackUrl=/clients");
  }

  return (
    <DashboardLayout userName={session.user.name} userEmail={session.user.email}>
      <ClientListWidget
        userName={session.user.name}
        userEmail={session.user.email}
      />
    </DashboardLayout>
  );
}
