import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { ArrowRight, FolderKanban } from "lucide-react";
import { authOptions } from "@/lib/auth";
import { ensureActiveWorkspace } from "@/lib/workspace";
import { prisma } from "@/lib/prisma";
import { DashboardLayout } from "@/components/dashboard/layout-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

function formatCurrency(amount: number, currency = "INR") {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

export default async function ProjectsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    redirect("/login?callbackUrl=/projects");
  }

  const workspace = await ensureActiveWorkspace(session.user.id, session.user.name);
  if (!workspace) {
    redirect("/dashboard");
  }

  const projects = await prisma.project.findMany({
    where: { workspaceId: workspace.id },
    select: {
      id: true,
      name: true,
      status: true,
      type: true,
      currency: true,
      totalBudget: true,
      nextInvoiceDate: true,
      clientId: true,
      client: { select: { name: true } },
      milestones: {
        select: {
          id: true,
          amount: true,
          status: true,
          dueDate: true,
          expectedDate: true,
          title: true,
        },
      },
    },
    orderBy: { updatedAt: "desc" },
  });

  const cards = projects.map((project) => {
    const readyAmount = project.milestones
      .filter((m) => m.status === "READY_FOR_INVOICE")
      .reduce((sum, m) => sum + m.amount, 0);
    const invoicedAmount = project.milestones
      .filter((m) => m.status === "INVOICED")
      .reduce((sum, m) => sum + m.amount, 0);
    const paidAmount = project.milestones
      .filter((m) => m.status === "PAID")
      .reduce((sum, m) => sum + m.amount, 0);
    const nextMilestone = project.milestones.find((m) =>
      ["PLANNED", "IN_PROGRESS", "READY_FOR_INVOICE"].includes(m.status)
    );

    return {
      ...project,
      readyAmount,
      invoicedAmount,
      paidAmount,
      nextMilestoneLabel: nextMilestone
        ? `${nextMilestone.title} · ${new Date(
            nextMilestone.dueDate || nextMilestone.expectedDate || new Date()
          ).toLocaleDateString("en-IN")}`
        : project.nextInvoiceDate
          ? `Next invoice · ${new Date(project.nextInvoiceDate).toLocaleDateString("en-IN")}`
          : "No milestone date set",
    };
  });

  return (
    <DashboardLayout userName={session.user.name} userEmail={session.user.email}>
      <div className="mx-auto w-full max-w-6xl space-y-6 px-4 py-6 lg:px-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Projects</p>
            <h1 className="text-3xl font-semibold text-foreground">Billing pipeline by project</h1>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
              Track which projects are ready to invoice, already billed, and fully collected.
            </p>
          </div>
          <Button asChild>
            <Link href="/dashboard?tab=clients">Create project from client</Link>
          </Button>
        </div>

        {cards.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-border/60 bg-muted/20 px-6 py-12 text-center">
            <FolderKanban className="mx-auto h-10 w-10 text-muted-foreground" />
            <p className="mt-4 text-lg font-medium text-foreground">No projects yet</p>
            <p className="mt-2 text-sm text-muted-foreground">
              Create a client and project to start tracking milestone billing and invoice readiness.
            </p>
          </div>
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {cards.map((project) => (
              <div
                key={project.id}
                className="rounded-3xl border border-border/60 bg-white p-5 shadow-sm"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <Link
                      href={`/projects/${project.id}`}
                      className="text-lg font-semibold text-foreground hover:text-primary"
                    >
                      {project.name}
                    </Link>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {project.client?.name || "No client linked"}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline" className="uppercase">
                      {project.status}
                    </Badge>
                    <Badge variant="outline">{project.type}</Badge>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-3 gap-3">
                  <div className="rounded-2xl border border-border/60 bg-muted/20 p-3">
                    <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                      Ready
                    </p>
                    <p className="mt-1 text-sm font-semibold">
                      {formatCurrency(project.readyAmount, project.currency)}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-border/60 bg-muted/20 p-3">
                    <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                      Invoiced
                    </p>
                    <p className="mt-1 text-sm font-semibold">
                      {formatCurrency(project.invoicedAmount, project.currency)}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-border/60 bg-muted/20 p-3">
                    <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                      Paid
                    </p>
                    <p className="mt-1 text-sm font-semibold">
                      {formatCurrency(project.paidAmount, project.currency)}
                    </p>
                  </div>
                </div>

                <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
                  <span>{project.nextMilestoneLabel}</span>
                  {project.totalBudget ? (
                    <span>
                      Total budget {formatCurrency(project.totalBudget / 100, project.currency)}
                    </span>
                  ) : null}
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  <Button asChild size="sm" variant="outline">
                    <Link href={`/projects/${project.id}`}>
                      Open project
                      <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                    </Link>
                  </Button>
                  {project.readyAmount > 0 ? (
                    <Button asChild size="sm">
                      <Link
                        href={`/invoices/new?projectId=${project.id}${project.clientId ? `&clientId=${project.clientId}` : ""}`}
                      >
                        Create invoice
                      </Link>
                    </Button>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
