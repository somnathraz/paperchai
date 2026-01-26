import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { DashboardLayout } from "@/components/dashboard/layout-shell";
import { InvoicesHome } from "@/components/invoices/invoices-home";
import { prisma } from "@/lib/prisma";
import { ensureActiveWorkspace } from "@/lib/workspace";

export default async function InvoicesPage() {
  const session = await getServerSession(authOptions);
  if (!session) {
    redirect("/login?callbackUrl=/invoices");
  }

  const workspace = await ensureActiveWorkspace(session.user.id, session.user.name);
  if (!workspace) {
    redirect("/login?callbackUrl=/invoices");
  }

  const firstName =
    session.user?.name?.split(" ")[0] ?? session.user?.email?.split("@")[0] ?? "there";
  const templates = await prisma.invoiceTemplate.findMany({
    orderBy: { name: "asc" },
    select: { slug: true, name: true, isPro: true, accent: true, tags: true, category: true },
  });

  const draftInvoices = await prisma.invoice.findMany({
    where: {
      workspaceId: workspace.id,
      status: "draft",
    },
    include: {
      client: { select: { name: true } },
    },
    orderBy: { updatedAt: "desc" },
    take: 20,
  });

  const automationRuleIds = Array.from(
    new Set(
      draftInvoices
        .map((invoice) => {
          const sendMeta = (invoice.sendMeta as Record<string, any>) || {};
          return sendMeta?.automation?.ruleId as string | undefined;
        })
        .filter(Boolean) as string[]
    )
  );

  const automationRules = automationRuleIds.length
    ? await prisma.automationRule.findMany({
        where: { id: { in: automationRuleIds }, workspaceId: workspace.id },
        select: { id: true, name: true },
      })
    : [];

  const automationNameById = new Map(automationRules.map((rule) => [rule.id, rule.name]));

  const draftSummaries = draftInvoices.map((invoice) => {
    const sendMeta = (invoice.sendMeta as Record<string, any>) || {};
    const automation = sendMeta.automation || {};
    const ruleId = automation.ruleId as string | undefined;
    const total = typeof invoice.total === "object" ? Number(invoice.total) : invoice.total;
    const amount = new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: invoice.currency || "INR",
      maximumFractionDigits: 0,
    }).format(Number(total || 0));

    return {
      id: invoice.id,
      number: invoice.number,
      clientName: invoice.client?.name || "Unknown",
      amount,
      updatedAt: invoice.updatedAt.toISOString(),
      automationName: ruleId ? automationNameById.get(ruleId) || "Automation" : null,
      approvalStatus: automation.approvalStatus || null,
    };
  });

  return (
    <DashboardLayout userName={session.user?.name} userEmail={session.user?.email}>
      <InvoicesHome firstName={firstName} templates={templates} drafts={draftSummaries} />
    </DashboardLayout>
  );
}
