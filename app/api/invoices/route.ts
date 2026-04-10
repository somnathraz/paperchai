import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canWriteWorkspace, ensureActiveWorkspace, getWorkspaceMembership } from "@/lib/workspace";
import { assertLimit, incrementUsage } from "@/lib/usage";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { isValidInvoiceDateOrder } from "@/lib/invoices/workflow-validation";
import { assertWorkspaceFeature, serializeEntitlementError } from "@/lib/entitlements";

const createInvoiceSchema = z.object({
  clientId: z.string().cuid(),
  projectId: z.string().cuid().optional().nullable(),
  templateSlug: z.string().max(100).optional(),
  number: z.string().max(100),
  issueDate: z.string().datetime().optional(),
  dueDate: z.string().datetime().optional(),
  currency: z.string().length(3).optional(),
  notes: z.string().max(5000).optional(),
  terms: z.string().max(5000).optional(),
  reminderTone: z.string().max(100).optional(),
  items: z.array(z.any()).max(100).optional(),
});

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const workspace = await ensureActiveWorkspace(session.user.id, session.user.name);
  if (!workspace) {
    return NextResponse.json({ error: "Workspace not found" }, { status: 404 });
  }
  const membership = await getWorkspaceMembership(session.user.id, workspace.id);
  if (!membership) {
    return NextResponse.json({ error: "Workspace access denied" }, { status: 403 });
  }
  if (!canWriteWorkspace(membership.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Check Limit
  try {
    await assertLimit(workspace.id, session.user.id, "invoicesPerMonth");
  } catch (error: any) {
    const serialized = serializeEntitlementError(error);
    if (serialized) {
      return NextResponse.json(serialized.body, { status: serialized.status });
    }
    return NextResponse.json({ error: error.message }, { status: 402 });
  }

  const parsed = createInvoiceSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request payload" }, { status: 422 });
  }
  const body = parsed.data;
  const {
    clientId,
    projectId,
    templateSlug,
    number,
    issueDate,
    dueDate,
    currency,
    notes,
    terms,
    reminderTone,
    items,
  } = body;

  const issueDateObj = issueDate ? new Date(issueDate) : undefined;
  const dueDateObj = dueDate ? new Date(dueDate) : undefined;
  if (!isValidInvoiceDateOrder(issueDateObj, dueDateObj)) {
    return NextResponse.json(
      { error: "Due date cannot be earlier than issue date" },
      { status: 422 }
    );
  }

  const duplicateInvoice = await prisma.invoice.findFirst({
    where: { workspaceId: workspace.id, number },
    select: { id: true },
  });
  if (duplicateInvoice) {
    return NextResponse.json(
      { error: "Invoice number already exists in this workspace" },
      { status: 409 }
    );
  }

  const client = await prisma.client.findFirst({
    where: { id: clientId, workspaceId: workspace.id },
    select: { id: true },
  });
  if (!client) {
    return NextResponse.json({ error: "Client not found" }, { status: 404 });
  }

  if (projectId) {
    const project = await prisma.project.findFirst({
      where: { id: projectId, workspaceId: workspace.id },
      select: { id: true },
    });
    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }
  }

  const template = templateSlug
    ? await prisma.invoiceTemplate.findFirst({
        where: { slug: templateSlug },
        select: { id: true, isPro: true },
      })
    : null;

  if (template?.isPro) {
    try {
      await assertWorkspaceFeature(workspace.id, session.user.id, "customBranding");
    } catch (error) {
      const serialized = serializeEntitlementError(error);
      if (serialized) {
        return NextResponse.json(serialized.body, { status: serialized.status });
      }
      throw error;
    }
  }

  let invoice;
  try {
    invoice = await prisma.invoice.create({
      data: {
        workspaceId: workspace.id,
        clientId,
        projectId,
        templateId: template?.id,
        number,
        status: "draft",
        issueDate: issueDateObj,
        dueDate: dueDateObj,
        currency,
        notes,
        terms,
        reminderTone,
        subtotal: 0,
        total: 0,
        items: {
          create: (items || []).map((item: any) => ({
            title: item.title,
            description: item.description,
            quantity: item.quantity ?? 1,
            unitPrice: item.unitPrice ?? 0,
            taxRate: item.taxRate ?? 0,
            total: item.total ?? 0,
          })),
        },
      },
      include: { items: true },
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json(
        { error: "Invoice number already exists in this workspace" },
        { status: 409 }
      );
    }
    throw error;
  }

  // Track Usage
  await incrementUsage(workspace.id, "invoicesPerMonth");

  return NextResponse.json({ invoice });
}
