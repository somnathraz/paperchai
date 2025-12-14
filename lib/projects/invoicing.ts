
import { prisma } from "@/lib/prisma";
import { InvoiceStatus, MilestoneStatus } from "@prisma/client";

export async function generateInvoiceDraftFromMilestone(milestoneId: string) {
    // 1. Fetch milestone with project and client
    const milestone = await prisma.projectMilestone.findUnique({
        where: { id: milestoneId },
        include: {
            project: {
                include: {
                    client: true,
                    workspace: true
                }
            }
        }
    });

    if (!milestone) {
        throw new Error("Milestone not found");
    }

    // 2. Eligibility checks
    if (milestone.invoiceId) {
        throw new Error("Milestone already invoiced");
    }

    if (milestone.status === MilestoneStatus.INVOICED || milestone.status === MilestoneStatus.PAID) {
        throw new Error("Milestone status is already invoiced or paid");
    }

    const project = milestone.project;
    const client = project.client;

    if (!client) {
        throw new Error("Client not found for this project");
    }

    // 3. Create Invoice
    // Generate a temporary number or fetch next number (using existing logic if available, or placeholder)
    // For now, using a timestamp-based fallback if no numbering logic exposed.
    // Ideally, valid invoice number logic should be reused.
    // For drafts, empty or specific format is allowed?
    const invoiceNumber = `DRAFT-${Date.now().toString().slice(-6)}`;

    const description = `Milestone: ${milestone.title}` + (project.name ? ` - ${project.name}` : "");

    const invoice = await prisma.invoice.create({
        data: {
            workspaceId: project.workspaceId,
            clientId: client.id,
            projectId: project.id,
            number: invoiceNumber,
            status: InvoiceStatus.draft,
            issueDate: new Date(),
            dueDate: milestone.dueDate || new Date(), // Logic: milestone due date OR today
            currency: milestone.currency,

            // Calculate totals
            subtotal: milestone.amount, // assuming amount is "unit price * q=1" equivalent
            total: milestone.amount,    // tax calculation omitted for MVP automation, creates Draft for review

            // Line item
            items: {
                create: {
                    title: milestone.title,
                    description: milestone.description || `Milestone payment for ${project.name}`,
                    quantity: 1,
                    unitPrice: milestone.amount,
                    total: milestone.amount
                }
            },

            notes: `Generated from milestone: ${milestone.title}`
        }
    });

    // 4. Update Milestone
    await prisma.projectMilestone.update({
        where: { id: milestone.id },
        data: {
            status: MilestoneStatus.INVOICED,
            invoiceId: invoice.id
        }
    });

    return invoice;
}
