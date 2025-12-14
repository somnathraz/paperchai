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
    name,
    description,
    clientId,
    rateType,
    rateValue,
    defaultTax,
    defaultCurrency,
    startDate,
    endDate,
    attachments,
    billingMode,
    paymentSchedule,
    billableItems,
  } = body;

  if (!name) {
    return NextResponse.json({ error: "Project name is required" }, { status: 400 });
  }

  try {
    const project = await prisma.project.create({
      data: {
        name,
        description,
        clientId,
        rateType,
        rateValue,
        defaultTax,
        defaultCurrency,
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate ? new Date(endDate) : undefined,
        attachments,
        workspaceId: workspace.id,
        billingMode: billingMode || "single",
        paymentSchedule: Array.isArray(paymentSchedule)
          ? paymentSchedule
          : paymentSchedule
            ? String(paymentSchedule)
              .split("\n")
              .map((line: string) => line.trim())
              .filter(Boolean)
            : undefined,
        billableItems: billableItems || undefined,
      },
    });

    return NextResponse.json({ project });
  } catch (error: any) {
    console.error("Error creating project:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
