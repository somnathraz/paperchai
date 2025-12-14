import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { ModernEditor } from "@/components/invoices/modern-editor";
import { prisma } from "@/lib/prisma";
import { ensureActiveWorkspace } from "@/lib/workspace";

type PageProps = {
  searchParams: {
    template?: string;
    id?: string;
  };
};

export default async function NewInvoicePage({ searchParams }: PageProps) {
  const session = await getServerSession(authOptions);
  if (!session) {
    redirect("/login?callbackUrl=/invoices/new");
  }
  const workspace = await ensureActiveWorkspace(session.user.id, session.user.name);
  if (!workspace) {
    redirect("/login?callbackUrl=/invoices/new");
  }

  const firstName = session.user?.name?.split(" ")[0] ?? session.user?.email?.split("@")[0] ?? "there";
  const templateSlug = typeof searchParams.template === "string" ? searchParams.template : "classic-gray";
  const invoiceId = typeof searchParams.id === "string" ? searchParams.id : undefined;

  // If editing an existing invoice, hydrate initial data including sections from sendMeta
  let initialFormState = null;
  let derivedTemplateSlug = templateSlug;

  if (invoiceId) {
    const invoice = await prisma.invoice.findFirst({
      where: { id: invoiceId, workspaceId: workspace.id },
      include: {
        items: true,
        template: { select: { slug: true, name: true, tags: true } },
      },
    });

    if (invoice) {
      derivedTemplateSlug = invoice.template?.slug || invoice.templateId || templateSlug;
      const sendMeta = (invoice.sendMeta as any) || {};
      initialFormState = {
        clientId: invoice.clientId || undefined,
        projectId: invoice.projectId || undefined,
        businessName: undefined,
        logoUrl: undefined,
        number: invoice.number,
        dueDate: invoice.dueDate ? invoice.dueDate.toISOString().slice(0, 10) : "",
        currency: invoice.currency || "INR",
        subtotalLabel: undefined,
        taxLabel: undefined,
        totalLabel: undefined,
        extraSummaryLabel: undefined,
        extraSummaryValue: undefined,
        notes: invoice.notes || "",
        terms: invoice.terms || "",
        reminderTone: invoice.reminderTone || "Warm + Polite",
        items: invoice.items.map((item) => ({
          title: item.title,
          description: item.description || "",
          quantity: typeof item.quantity === 'object' ? Number(item.quantity) : item.quantity,
          unitPrice: typeof item.unitPrice === 'object' ? Number(item.unitPrice) : item.unitPrice,
          taxRate: item.taxRate ? (typeof item.taxRate === 'object' ? Number(item.taxRate) : item.taxRate) : 0,
          total: item.total ? (typeof item.total === 'object' ? Number(item.total) : item.total) : 0,
        })),
        adjustments: sendMeta.adjustments || [],
        sections: sendMeta.sections || undefined,
        paymentTermOption: sendMeta.paymentTermOption || "immediate",
        fontFamily: sendMeta.branding?.fontFamily,
        primaryColor: sendMeta.branding?.primaryColor,
        accentColor: sendMeta.branding?.accentColor,
        backgroundColor: sendMeta.branding?.backgroundColor,
        gradientFrom: sendMeta.branding?.gradientFrom,
        gradientTo: sendMeta.branding?.gradientTo,
      };
    }
  }

  const template = await prisma.invoiceTemplate.findUnique({
    where: { slug: derivedTemplateSlug },
    select: { slug: true, name: true, isPro: true, accent: true, tags: true },
  });

  // If we support editing existing invoices later, hydrate initial state including sections from sendMeta.
  // For now, we only pass template info; sections will default in the editor.

  return (
    <ModernEditor
      firstName={firstName}
      selectedTemplate={template?.slug || derivedTemplateSlug}
      selectedTemplateName={template?.name}
      selectedTemplateTags={template?.tags ?? undefined}
      initialFormState={initialFormState || undefined}
    />
  );
}
