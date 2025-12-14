import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ensureActiveWorkspace } from "@/lib/workspace";
import { ClientsTableView } from "@/components/clients/clients-table-view";
import { DashboardLayout } from "@/components/dashboard/layout-shell";

type PageProps = {
  searchParams: {
    clientId?: string;
    wizard?: string;
  };
};

export default async function ClientsPage({ searchParams }: PageProps) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    redirect("/login?callbackUrl=/clients");
  }

  const workspace = await ensureActiveWorkspace(session.user.id, session.user.name);
  if (!workspace) {
    redirect("/login?callbackUrl=/clients");
  }

  const clientsRaw = await prisma.client.findMany({
    where: { workspaceId: workspace.id },
    orderBy: { updatedAt: "desc" },
    include: {
      _count: {
        select: { projects: true, invoices: true }
      }
    }
  });

  const clients = clientsRaw.map(client => ({
    id: client.id,
    name: client.name,
    email: client.email,
    company: client.company,
    tags: client.tags,
    reliabilityScore: client.reliabilityScore,
    averageDelayDays: client.averageDelayDays,
    outstanding: Number(client.outstanding),
    updatedAt: client.updatedAt,
    projectsCount: client._count.projects,
    invoicesCount: client._count.invoices,
  }));

  return (
    <DashboardLayout userName={session.user.name} userEmail={session.user.email}>
      <ClientsTableView
        clients={clients}
        userName={session.user.name}
        userEmail={session.user.email}
        showAiWizard={searchParams.wizard === "true"}
      />
    </DashboardLayout>
  );
}
