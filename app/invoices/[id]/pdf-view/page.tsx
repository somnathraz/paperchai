import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { renderTemplate } from "@/components/invoices/templates/registry";
import { InvoiceSection } from "@/components/invoices/modern-editor/types";
import { ensureActiveWorkspace } from "@/lib/workspace";

// Force dynamic to ensure fresh data fetch
export const dynamic = "force-dynamic";

type PageProps = {
    params: {
        id: string;
    };
};

export default async function InvoicePdfViewPage({ params }: PageProps) {
    const session = await getServerSession(authOptions);

    if (!session) {
        redirect("/login");
    }

    const workspace = await ensureActiveWorkspace(session.user.id, session.user.name);
    if (!workspace) {
        return <div>Unauthorized workspace access</div>;
    }

    const invoice = await prisma.invoice.findFirst({
        where: { id: params.id, workspaceId: workspace.id },
        include: {
            items: true,
            template: true,
            client: true,
        },
    });

    if (!invoice) {
        return <div>Invoice not found</div>;
    }

    // Parse sendMeta for styling and sections
    const sendMeta = (invoice.sendMeta as any) || {};
    const sections = sendMeta.sections as InvoiceSection[] | undefined;

    // Format dates
    const formatDate = (date: Date | null | undefined) => {
        if (!date) return "";
        return new Date(date).toLocaleDateString("en-US", {
            year: "numeric",
            month: "long",
            day: "numeric",
        });
    };

    // Map to TemplateProps mockData structure
    const mockData = {
        businessName: workspace.name, // Or from settings if available
        invoiceNumber: invoice.number,
        logoUrl: session.user.image || undefined, // Or workspace logo
        clientName: invoice.client?.name || "Client Name",
        clientEmail: invoice.client?.email || "",
        clientAddress: "", // Should fetch if available

        // Financials
        subtotal: `${invoice.currency} ${invoice.subtotal.toFixed(2)}`,
        tax: `${invoice.currency} ${invoice.taxTotal.toFixed(2)}`,
        discount: sendMeta.discountTotal ? `${invoice.currency} ${sendMeta.discountTotal.toFixed(2)}` : undefined,
        fee: invoice.lateFee ? `${invoice.currency} ${invoice.lateFee.toFixed(2)}` : undefined,
        total: `${invoice.currency} ${invoice.total.toFixed(2)}`,

        // Labels
        subtotalLabel: "Subtotal",
        taxLabel: "Tax",
        totalLabel: "Total",

        // Content
        notes: invoice.notes || "",
        paymentTerms: invoice.terms || "",
        issueDate: formatDate(invoice.issueDate),
        dueDate: formatDate(invoice.dueDate),

        // Items
        items: invoice.items.map(item => ({
            name: item.title,
            description: item.description || "",
            quantity: item.quantity,
            price: `${invoice.currency} ${item.unitPrice.toFixed(2)}`,
            amount: `${invoice.currency} ${item.total.toFixed(2)}`
        })),

        // Branding
        fontFamily: sendMeta.branding?.fontFamily,
        primaryColor: sendMeta.branding?.primaryColor,
        accentColor: sendMeta.branding?.accentColor,
        backgroundColor: sendMeta.branding?.backgroundColor,
        gradientFrom: sendMeta.branding?.gradientFrom,
        gradientTo: sendMeta.branding?.gradientTo,

        // Signature
        signatureUrl: sendMeta.signatureUrl,
    };

    const templateSlug = invoice.template?.slug || "classic-gray";

    return (
        <div className="pdf-view-container absolute inset-0 bg-white print:bg-white min-h-screen">
            {renderTemplate(templateSlug, {
                mockData,
                sections, // Pass user-defined sections order
            })}
        </div>
    );
}

