"use server";

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { generateWorkspaceInvoiceNumber } from "@/lib/invoices/numbering";
import { canWriteWorkspace, ensureActiveWorkspace, getWorkspaceMembership } from "@/lib/workspace";
import { z } from "zod";
import { isValidInvoiceDateOrder } from "@/lib/invoices/workflow-validation";

const saveInvoiceSchema = z.object({
  id: z.string().cuid().optional(),
  clientId: z.string().cuid().optional(),
  projectId: z.string().cuid().optional().nullable(),
  templateSlug: z.string().max(100).optional(),
  sections: z.any().optional(),
  number: z.string().max(100).optional(),
  issueDate: z.string().datetime().optional(),
  dueDate: z.string().datetime().optional(),
  currency: z.string().length(3).optional(),
  notes: z.string().max(5000).optional(),
  terms: z.string().max(5000).optional(),
  paymentMethod: z.string().max(100).optional(),
  paymentInstructions: z.string().max(5000).optional(),
  paymentLinkUrl: z.string().url().max(2048).optional().or(z.literal("")),
  allowPartialPayments: z.boolean().optional(),
  reminderTone: z.string().max(100).optional(),
  reminderCadence: z.any().optional(),
  fontFamily: z.string().max(100).optional(),
  primaryColor: z.string().max(20).optional(),
  accentColor: z.string().max(20).optional(),
  backgroundColor: z.string().max(20).optional(),
  gradientFrom: z.string().max(20).optional(),
  gradientTo: z.string().max(20).optional(),
  paymentTermOption: z.string().max(50).optional(),
  attachments: z.array(z.any()).max(20).optional(),
  items: z.array(z.any()).max(100).optional(),
  adjustments: z.array(z.any()).max(50).optional(),
  taxSettings: z.any().optional(),
  layoutDensity: z.string().max(20).optional(),
  showBorder: z.boolean().optional(),
});

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const workspace = await ensureActiveWorkspace(session.user.id, session.user.name);
  if (!workspace) return NextResponse.json({ error: "Workspace not found" }, { status: 404 });
  const membership = await getWorkspaceMembership(session.user.id, workspace.id);
  if (!membership) {
    return NextResponse.json({ error: "Workspace access denied" }, { status: 403 });
  }
  if (!canWriteWorkspace(membership.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const parsed = saveInvoiceSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request payload" }, { status: 422 });
  }
  const body = parsed.data;
  const {
    id,
    clientId: providedClientId,
    projectId,
    templateSlug,
    sections,
    number,
    issueDate,
    dueDate,
    currency,
    notes,
    terms,
    paymentMethod,
    paymentInstructions,
    paymentLinkUrl,
    allowPartialPayments,
    reminderTone,
    reminderCadence,
    fontFamily,
    primaryColor,
    accentColor,
    backgroundColor,
    gradientFrom,
    gradientTo,
    paymentTermOption,
    attachments = [],
    items = [],
    adjustments = [],
    taxSettings,
    layoutDensity,
    showBorder,
  } = body;

  // For drafts, we only require an invoice number (client can be added later)
  // Auto-generate invoice number if not provided
  const invoiceNumber = number || (await generateWorkspaceInvoiceNumber(workspace.id));

  if (!invoiceNumber) {
    return NextResponse.json({ error: "Invoice number is required" }, { status: 400 });
  }

  const issueDateObj = issueDate ? new Date(issueDate) : undefined;
  const dueDateObj = dueDate ? new Date(dueDate) : undefined;
  if (!isValidInvoiceDateOrder(issueDateObj, dueDateObj)) {
    return NextResponse.json(
      { error: "Due date cannot be earlier than issue date" },
      { status: 422 }
    );
  }

  const duplicateWhere = id
    ? {
        workspaceId: workspace.id,
        number: invoiceNumber,
        NOT: { id },
      }
    : {
        workspaceId: workspace.id,
        number: invoiceNumber,
      };
  const duplicateInvoice = await prisma.invoice.findFirst({
    where: duplicateWhere,
    select: { id: true },
  });
  if (duplicateInvoice) {
    return NextResponse.json(
      { error: "Invoice number already exists in this workspace" },
      { status: 409 }
    );
  }

  // Validate and resolve project/client references in the active workspace.
  const project = projectId
    ? await prisma.project.findFirst({
        where: { id: projectId, workspaceId: workspace.id },
        select: { id: true, clientId: true },
      })
    : null;
  if (projectId && !project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  if (providedClientId) {
    const client = await prisma.client.findFirst({
      where: { id: providedClientId, workspaceId: workspace.id },
      select: { id: true },
    });
    if (!client) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }
  }

  // If no client is provided, derive from project when possible; otherwise use placeholder.
  let clientId = providedClientId;
  if (!clientId && project?.clientId) {
    clientId = project.clientId;
  }
  if (!clientId) {
    // Try to find or create a default "Draft" client for the workspace
    const defaultClient = await prisma.client.findFirst({
      where: {
        workspaceId: workspace.id,
        name: "Draft Client",
      },
    });

    if (!defaultClient) {
      // Create a default client for drafts
      const newDefaultClient = await prisma.client.create({
        data: {
          workspaceId: workspace.id,
          name: "Draft Client",
          email: null,
          reliabilityScore: 100,
          averageDelayDays: 0,
          outstanding: 0,
        },
      });
      clientId = newDefaultClient.id;
    } else {
      clientId = defaultClient.id;
    }
  }
  if (project?.clientId && clientId && project.clientId !== clientId) {
    return NextResponse.json(
      { error: "Selected project does not belong to selected client" },
      { status: 422 }
    );
  }

  const template = templateSlug
    ? await prisma.invoiceTemplate.findFirst({
        where: { slug: templateSlug },
        select: { id: true },
      })
    : null;

  // Check if prices are tax-inclusive
  const isInclusive = taxSettings?.inclusive === true;

  // Calculate subtotal (before tax)
  const subtotalCalc = items.reduce((sum: number, item: any) => {
    const lineTotal = (item.quantity ?? 1) * (item.unitPrice ?? 0);
    const rate = item.taxRate ?? 0;

    if (isInclusive && rate > 0) {
      // Extract base from inclusive price: base = price / (1 + rate)
      return sum + lineTotal / (1 + rate / 100);
    }
    return sum + lineTotal;
  }, 0);

  // Calculate tax total
  const taxCalc = items.reduce((sum: number, item: any) => {
    const lineTotal = (item.quantity ?? 1) * (item.unitPrice ?? 0);
    const rate = item.taxRate ?? 0;

    if (isInclusive && rate > 0) {
      // Extract tax from inclusive price: tax = price - (price / (1 + rate))
      return sum + (lineTotal - lineTotal / (1 + rate / 100));
    }
    // Exclusive: tax = base * rate
    return sum + (lineTotal * rate) / 100;
  }, 0);

  // Calculate discounts and fees from adjustments (if provided)
  const discountTotal =
    adjustments
      ?.filter((a: any) => a.type === "discount")
      .reduce((sum: number, adj: any) => {
        const base = adj.mode === "percent" ? (adj.value / 100) * subtotalCalc : adj.value;
        return sum + base;
      }, 0) || 0;

  const feeTotal =
    adjustments
      ?.filter((a: any) => a.type === "fee")
      .reduce((sum: number, adj: any) => {
        const base = adj.mode === "percent" ? (adj.value / 100) * subtotalCalc : adj.value;
        return sum + base;
      }, 0) || 0;

  // Total calculation: subtotal + tax - discounts + fees
  const totalCalc = subtotalCalc + taxCalc - discountTotal + feeTotal;

  const data = {
    workspaceId: workspace.id,
    clientId, // Now guaranteed to have a value (either provided or default)
    projectId: project?.id || null,
    templateId: template?.id,
    number: invoiceNumber,
    status: "draft" as const,
    issueDate: issueDateObj,
    dueDate: dueDateObj,
    currency: currency || "INR",
    notes: notes || null,
    terms: terms || null,
    paymentMethod: paymentMethod || null,
    paymentInstructions: paymentInstructions || null,
    paymentLinkUrl: paymentLinkUrl || null,
    allowPartialPayments: allowPartialPayments ?? false,
    reminderTone: reminderTone || "Warm + Polite",
    subtotal: subtotalCalc,
    taxTotal: taxCalc,
    lateFee: feeTotal, // Store fees as lateFee (which exists in schema)
    total: totalCalc,
    // Store adjustments and sections in sendMeta for future reference
    sendMeta:
      (adjustments && adjustments.length > 0) ||
      sections ||
      reminderCadence ||
      attachments?.length ||
      taxSettings
        ? {
            adjustments,
            discountTotal,
            sections,
            reminderCadence,
            attachments,
            taxSettings,
            branding: {
              fontFamily,
              primaryColor,
              accentColor,
              backgroundColor,
              gradientFrom,
              gradientTo,
              layoutDensity,
              showBorder,
            },
            paymentTermOption,
          }
        : undefined,
  };

  let existingSendMeta: Record<string, any> | undefined;
  if (id) {
    const existingInvoice = await prisma.invoice.findUnique({
      where: { id },
      select: { sendMeta: true },
    });
    existingSendMeta = (existingInvoice?.sendMeta as Record<string, any>) || undefined;
  }

  if (existingSendMeta || data.sendMeta) {
    const merged = {
      ...(existingSendMeta || {}),
      ...(data.sendMeta || {}),
    };
    data.sendMeta = Object.keys(merged).length > 0 ? (merged as any) : undefined;
  }

  const itemCreates = items.map((item: any) => ({
    title: item.title,
    description: item.description,
    quantity: item.quantity ?? 1,
    unitPrice: item.unitPrice ?? 0,
    taxRate: item.taxRate ?? 0,
    total: item.total ?? 0,
  }));

  let upserted;
  try {
    if (id) {
      const existing = await prisma.invoice.findFirst({
        where: { id, workspaceId: workspace.id },
        select: { id: true },
      });
      if (!existing) {
        return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
      }

      upserted = await prisma.invoice.update({
        where: { id },
        data: {
          ...data,
          items: {
            deleteMany: {},
            create: itemCreates,
          },
        },
        include: { items: true },
      });
    } else {
      upserted = await prisma.invoice.create({
        data: {
          ...data,
          items: {
            create: itemCreates,
          },
        },
        include: { items: true },
      });
    }
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json(
        { error: "Invoice number already exists in this workspace" },
        { status: 409 }
      );
    }
    console.error("Failed to save invoice:", error);
    return NextResponse.json({ error: "Failed to save invoice" }, { status: 500 });
  }

  return NextResponse.json({ invoice: upserted });
}
