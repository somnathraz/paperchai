"use server";

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ensureActiveWorkspace } from "@/lib/workspace";
import { z } from "zod";

const invoiceItemSchema = z.object({
  title: z.string().min(1).max(500),
  description: z.string().max(2000).optional(),
  quantity: z.number().positive().default(1),
  unitPrice: z.number().min(0).default(0),
  taxRate: z.number().min(0).max(100).default(0),
  total: z.number().min(0).default(0),
});

const createInvoiceSchema = z.object({
  clientId: z.string().min(1, "clientId is required"),
  number: z.string().min(1, "Invoice number is required").max(100),
  projectId: z.string().optional(),
  templateSlug: z.string().optional(),
  issueDate: z.string().datetime({ offset: true }).optional(),
  dueDate: z.string().datetime({ offset: true }).optional(),
  currency: z.string().length(3).optional(),
  notes: z.string().max(5000).optional(),
  terms: z.string().max(5000).optional(),
  reminderTone: z.string().optional(),
  items: z.array(invoiceItemSchema).default([]),
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

  const raw = await req.json();
  const parsed = createInvoiceSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

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
  } = parsed.data;

  const template = templateSlug
    ? await prisma.invoiceTemplate.findUnique({
        where: { slug: templateSlug },
        select: { id: true },
      })
    : null;

  const invoice = await prisma.invoice.create({
    data: {
      workspaceId: workspace.id,
      clientId,
      projectId,
      templateId: template?.id,
      number,
      status: "draft",
      issueDate: issueDate ? new Date(issueDate) : undefined,
      dueDate: dueDate ? new Date(dueDate) : undefined,
      currency,
      notes,
      terms,
      reminderTone,
      subtotal: 0,
      total: 0,
      items: {
        create: items.map((item) => ({
          title: item.title,
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          taxRate: item.taxRate,
          total: item.total,
        })),
      },
    },
    include: { items: true },
  });

  return NextResponse.json({ invoice });
}
