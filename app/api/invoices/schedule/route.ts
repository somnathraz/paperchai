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
  const { invoiceId, scheduledSendAt, channel = "email", templateSlug, reminderCadence } = body;

  if (!invoiceId || !scheduledSendAt) {
    return NextResponse.json({ error: "invoiceId and scheduledSendAt required" }, { status: 400 });
  }

  const invoice = await prisma.invoice.update({
    where: { id: invoiceId, workspaceId: workspace.id },
    data: {
      status: "scheduled",
      scheduledSendAt: new Date(scheduledSendAt),
      deliveryChannel: channel,
      sendMeta: { templateSlug, reminderCadence },
    },
  });

  await prisma.reminderHistory.create({
    data: {
      workspaceId: workspace.id,
      clientId: invoice.clientId,
      projectId: invoice.projectId,
      invoiceId: invoice.id,
      channel,
      kind: "schedule",
      status: "scheduled",
      previewToUser: true,
      tone: "Warm",
      sentAt: new Date(scheduledSendAt),
      // meta field removed - reminderCadence is stored in invoice.sendMeta
    },
  });

  return NextResponse.json({ ok: true, invoice });
}
