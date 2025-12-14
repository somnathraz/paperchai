"use server";

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ensureActiveWorkspace } from "@/lib/workspace";

export async function POST(req: Request) {
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
    items = [],
  } = body;

  if (!clientId || !number) {
    return NextResponse.json({ error: "Client and invoice number are required" }, { status: 400 });
  }

  const template = templateSlug
    ? await prisma.invoiceTemplate.findUnique({ where: { slug: templateSlug }, select: { id: true } })
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

  return NextResponse.json({ invoice });
}
