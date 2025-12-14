"use server";

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ensureActiveWorkspace } from "@/lib/workspace";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const workspace = await ensureActiveWorkspace(session.user.id, session.user.name);
  if (!workspace) return NextResponse.json({ error: "Workspace not found" }, { status: 404 });

  const body = await req.json();
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
  const invoiceNumber = number || `DRAFT-${Date.now()}`;

  if (!invoiceNumber) {
    return NextResponse.json({ error: "Invoice number is required" }, { status: 400 });
  }

  // If no client is provided, we need to create a placeholder or use a default
  let clientId = providedClientId;
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

  const template = templateSlug
    ? await prisma.invoiceTemplate.findUnique({ where: { slug: templateSlug }, select: { id: true } })
    : null;

  // Check if prices are tax-inclusive
  const isInclusive = taxSettings?.inclusive === true;

  // Calculate subtotal (before tax)
  const subtotalCalc = items.reduce(
    (sum: number, item: any) => {
      const lineTotal = (item.quantity ?? 1) * (item.unitPrice ?? 0);
      const rate = item.taxRate ?? 0;

      if (isInclusive && rate > 0) {
        // Extract base from inclusive price: base = price / (1 + rate)
        return sum + (lineTotal / (1 + rate / 100));
      }
      return sum + lineTotal;
    },
    0
  );

  // Calculate tax total
  const taxCalc = items.reduce(
    (sum: number, item: any) => {
      const lineTotal = (item.quantity ?? 1) * (item.unitPrice ?? 0);
      const rate = item.taxRate ?? 0;

      if (isInclusive && rate > 0) {
        // Extract tax from inclusive price: tax = price - (price / (1 + rate))
        return sum + (lineTotal - (lineTotal / (1 + rate / 100)));
      }
      // Exclusive: tax = base * rate
      return sum + ((lineTotal * rate) / 100);
    },
    0
  );

  // Calculate discounts and fees from adjustments (if provided)
  const discountTotal = adjustments
    ?.filter((a: any) => a.type === "discount")
    .reduce((sum: number, adj: any) => {
      const base = adj.mode === "percent" ? (adj.value / 100) * subtotalCalc : adj.value;
      return sum + base;
    }, 0) || 0;

  const feeTotal = adjustments
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
    projectId: projectId || null,
    templateId: template?.id,
    number: invoiceNumber,
    status: "draft" as const,
    issueDate: issueDate ? new Date(issueDate) : undefined,
    dueDate: dueDate ? new Date(dueDate) : undefined,
    currency: currency || "INR",
    notes: notes || null,
    terms: terms || null,
    reminderTone: reminderTone || "Warm + Polite",
    subtotal: subtotalCalc,
    taxTotal: taxCalc,
    lateFee: feeTotal, // Store fees as lateFee (which exists in schema)
    total: totalCalc,
    // Store adjustments and sections in sendMeta for future reference
    sendMeta:
      (adjustments && adjustments.length > 0) || sections || reminderCadence || attachments?.length || taxSettings
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

  const upserted = await prisma.invoice.upsert({
    where: { id: id || "" },
    update: {
      ...data,
      items: {
        deleteMany: {},
        create: items.map((item: any) => ({
          title: item.title,
          description: item.description,
          quantity: item.quantity ?? 1,
          unitPrice: item.unitPrice ?? 0,
          taxRate: item.taxRate ?? 0,
          total: item.total ?? 0,
        })),
      },
    },
    create: {
      ...data,
      items: {
        create: items.map((item: any) => ({
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

  return NextResponse.json({ invoice: upserted });
}
