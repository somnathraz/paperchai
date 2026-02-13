import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ensureActiveWorkspace } from "@/lib/workspace";
import { z } from "zod";

const statusPatchSchema = z.object({
  status: z.enum(["draft", "sent", "paid", "overdue", "cancelled", "scheduled", "void"]),
});

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const workspace = await ensureActiveWorkspace(session.user.id, session.user.name);
  if (!workspace) {
    return NextResponse.json({ error: "Workspace not found" }, { status: 404 });
  }

  const { id } = await params;
  let status: "draft" | "sent" | "paid" | "overdue" | "cancelled" | "scheduled";
  try {
    const parsedStatus = statusPatchSchema.parse(await req.json()).status;
    status = parsedStatus === "void" ? "cancelled" : parsedStatus;
  } catch {
    return NextResponse.json({ error: "Invalid status" }, { status: 422 });
  }

  try {
    const invoice = await prisma.invoice.findFirst({
      where: { id, workspaceId: workspace.id },
    });

    if (!invoice) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    const updatedInvoice = await prisma.invoice.update({
      where: { id },
      data: { status },
    });

    // Handle side effects (e.g., updating client reliability if marked as paid)
    if (status === "paid") {
      // Logic could be added here to update client stats
    }

    return NextResponse.json({ invoice: updatedInvoice });
  } catch (error) {
    console.error("Failed to update invoice status:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
