"use server";

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ensureActiveWorkspace } from "@/lib/workspace";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const workspace = await ensureActiveWorkspace(session.user.id, session.user.name);
  if (!workspace) {
    return NextResponse.json({ error: "Workspace not found" }, { status: 404 });
  }

  const projects = await prisma.project.findMany({
    where: { workspaceId: workspace.id },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      description: true,
      status: true,
      clientId: true,
      client: { select: { name: true } },
      rateType: true,
      rateValue: true,
      defaultCurrency: true,
      defaultTax: true,
      billableItems: true,
      milestones: {
        where: {
          status: 'READY_FOR_INVOICE',
          invoiceId: null,
        },
        select: {
          id: true,
          title: true,
          description: true,
          amount: true,
          currency: true,
        }
      }
    },
  });

  return NextResponse.json({ projects });
}
