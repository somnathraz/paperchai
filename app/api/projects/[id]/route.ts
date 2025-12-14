"use server";

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ensureActiveWorkspace } from "@/lib/workspace";

export async function GET(
    req: Request,
    { params }: { params: { id: string } }
) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const workspace = await ensureActiveWorkspace(session.user.id, session.user.name);
    if (!workspace) {
        return NextResponse.json({ error: "Workspace not found" }, { status: 404 });
    }

    try {
        const project = await prisma.project.findUnique({
            where: {
                id: params.id,
                workspaceId: workspace.id
            },
            include: {
                client: true,
                milestones: {
                    orderBy: { orderIndex: "asc" }
                },
                aiDocuments: {
                    orderBy: { createdAt: "desc" }
                },
                invoices: {
                    orderBy: { createdAt: "desc" },
                    take: 10
                },
            }
        });

        if (!project) {
            return NextResponse.json({ error: "Project not found" }, { status: 404 });
        }

        return NextResponse.json({ project });
    } catch (error) {
        console.error("Error fetching project:", error);
        return NextResponse.json({ error: "Failed to fetch project" }, { status: 500 });
    }
}

export async function PATCH(
    req: Request,
    { params }: { params: { id: string } }
) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const workspace = await ensureActiveWorkspace(session.user.id, session.user.name);
    if (!workspace) {
        return NextResponse.json({ error: "Workspace not found" }, { status: 404 });
    }

    const body = await req.json();
    const {
        name,
        description,
        status,
        type,
        billingStrategy,
        totalBudget,
        startDate,
        endDate,
        autoInvoiceEnabled,
        autoRemindersEnabled,
        billingMode,
        clientId,
        billableItems
    } = body;

    try {
        // Step 1: If milestones are being updated, handle draft invoices
        let deletedDraftInvoices = 0;
        if (body.milestones && Array.isArray(body.milestones)) {
            // Find and delete all draft invoices for this project
            // (They will be regenerated if autoInvoiceEnabled)
            const draftInvoices = await prisma.invoice.findMany({
                where: {
                    projectId: params.id,
                    status: "draft"
                },
                select: { id: true }
            });

            if (draftInvoices.length > 0) {
                await prisma.invoice.deleteMany({
                    where: {
                        id: { in: draftInvoices.map(i => i.id) }
                    }
                });
                deletedDraftInvoices = draftInvoices.length;
            }
        }

        // Step 2: Update the project
        const project = await prisma.project.update({
            where: {
                id: params.id,
                workspaceId: workspace.id
            },
            data: {
                name,
                description,
                status,
                type,
                billingStrategy,
                totalBudget,
                startDate: startDate ? new Date(startDate) : undefined,
                endDate: endDate ? new Date(endDate) : undefined,
                autoInvoiceEnabled,
                autoRemindersEnabled,
                billingMode,
                clientId: clientId || undefined,
                billableItems: billableItems || undefined,

                // If milestones provided, replace them
                milestones: body.milestones && Array.isArray(body.milestones) ? {
                    deleteMany: {}, // Clear existing
                    create: body.milestones.map((m: any, index: number) => ({
                        title: m.title,
                        description: m.description,
                        amount: m.amount || 0,
                        currency: m.currency || "INR",
                        expectedDate: m.expectedDate ? new Date(m.expectedDate) : undefined,
                        dueDate: m.dueDate ? new Date(m.dueDate) : undefined,
                        billingTrigger: m.billingTrigger || "ON_COMPLETION",
                        status: m.status || "PLANNED",
                        autoInvoiceEnabled: m.autoInvoiceEnabled ?? true,
                        autoRemindersEnabled: m.autoRemindersEnabled ?? true,
                        orderIndex: m.orderIndex ?? index
                    }))
                } : undefined
            },
            include: {
                milestones: true,
                client: true
            }
        });

        // Step 3: Regenerate draft invoices for eligible milestones if autoInvoice is on
        let createdDraftInvoices = 0;
        if (project.autoInvoiceEnabled && body.milestones && project.client && project.clientId) {
            const eligibleMilestones = project.milestones.filter(
                m => m.billingTrigger === "ON_CREATION" || m.status === "READY_FOR_INVOICE"
            );

            for (const milestone of eligibleMilestones) {
                await prisma.invoice.create({
                    data: {
                        workspaceId: workspace.id,
                        clientId: project.clientId,
                        projectId: project.id,
                        number: `INV-${Date.now().toString(36).toUpperCase()}`,
                        status: "draft",
                        total: milestone.amount,
                        subtotal: milestone.amount,
                        currency: milestone.currency || "INR",
                        dueDate: milestone.dueDate || new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days
                        notes: `Auto-generated for milestone: ${milestone.title}`,
                        items: {
                            create: {
                                title: milestone.title,
                                quantity: 1,
                                unitPrice: milestone.amount,
                                total: milestone.amount,
                            }
                        }
                    }
                });
                createdDraftInvoices++;
            }
        }

        return NextResponse.json({
            project,
            invoiceSync: {
                deletedDrafts: deletedDraftInvoices,
                createdDrafts: createdDraftInvoices
            }
        });
    } catch (error) {
        console.error("Error updating project:", error);
        return NextResponse.json({ error: "Failed to update project" }, { status: 500 });
    }
}

export async function DELETE(
    req: Request,
    { params }: { params: { id: string } }
) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const workspace = await ensureActiveWorkspace(session.user.id, session.user.name);
    if (!workspace) {
        return NextResponse.json({ error: "Workspace not found" }, { status: 404 });
    }

    try {
        // Step 1: Check for existing invoices
        const projectWithInvoices = await prisma.project.findUnique({
            where: {
                id: params.id,
                workspaceId: workspace.id
            },
            include: {
                invoices: {
                    select: { id: true, status: true }
                }
            }
        });

        if (!projectWithInvoices) {
            return NextResponse.json({ error: "Project not found" }, { status: 404 });
        }

        const invoices = projectWithInvoices.invoices || [];
        const nonDraftInvoices = invoices.filter(inv => inv.status !== "draft");
        const draftInvoices = invoices.filter(inv => inv.status === "draft");

        // Step 2: Block deletion if non-draft invoices exist
        if (nonDraftInvoices.length > 0) {
            return NextResponse.json({
                error: "Cannot delete project",
                reason: `This project has ${nonDraftInvoices.length} sent/paid invoice(s). Please archive instead or handle invoices first.`,
                invoiceCounts: {
                    sent: nonDraftInvoices.filter(i => i.status === "sent").length,
                    paid: nonDraftInvoices.filter(i => i.status === "paid").length,
                    overdue: nonDraftInvoices.filter(i => i.status === "overdue").length,
                }
            }, { status: 409 }); // Conflict
        }

        // Step 3: Cascade delete draft invoices (safe to remove)
        if (draftInvoices.length > 0) {
            await prisma.invoice.deleteMany({
                where: {
                    id: { in: draftInvoices.map(i => i.id) }
                }
            });
        }

        // Step 4: Delete milestones (if not cascaded by schema)
        await prisma.projectMilestone.deleteMany({
            where: { projectId: params.id }
        });

        // Step 5: Delete the project
        await prisma.project.delete({
            where: {
                id: params.id,
                workspaceId: workspace.id
            }
        });

        return NextResponse.json({
            success: true,
            deletedDraftInvoices: draftInvoices.length
        });
    } catch (error) {
        console.error("Error deleting project:", error);
        return NextResponse.json({ error: "Failed to delete project" }, { status: 500 });
    }
}
