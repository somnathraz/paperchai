"use server";

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ensureActiveWorkspace } from "@/lib/workspace";
import { isWorkspaceApprover } from "@/lib/invoices/approval-routing";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const workspace = await ensureActiveWorkspace(session.user.id, session.user.name);

    if (!workspace) {
      return NextResponse.json({ error: "Workspace not found" }, { status: 404 });
    }
    const canExport = await isWorkspaceApprover(workspace.id, session.user.id);
    if (!canExport) {
      return NextResponse.json(
        { error: "Only workspace owners/admins can export workspace data" },
        { status: 403 }
      );
    }

    // Fetch full workspace data for export
    const fullWorkspace = await prisma.workspace.findUnique({
      where: { id: workspace.id },
      include: {
        members: { include: { user: { select: { id: true, name: true, email: true } } } },
        clients: true,
        invoices: { include: { items: true } },
        projects: true,
        settings: true, // Include settings to capture migrated fields
      },
    });

    if (!fullWorkspace) return NextResponse.json({ error: "Export failed" }, { status: 500 });

    const ws = fullWorkspace as any; // Cast to any to allow access to legacy or potentially missing fields safely

    // Export workspace data
    const exportData = {
      workspace: {
        id: ws.id,
        name: ws.name,
        slug: ws.slug,
        logo: ws.logo || ws.settings?.logo, // Check both
        // Map other fields from root or settings
        taxGstNumber: ws.taxGstNumber || ws.settings?.taxId,
        pan: ws.pan, // Legacy or null
        registeredEmail: ws.registeredEmail,
        addressLine1:
          ws.addressLine1 || (ws.settings?.address ? ws.settings.address.split(",")[0] : null), // Approx
        addressLine2: ws.addressLine2,
        city: ws.city,
        state: ws.state,
        pin: ws.pin,
        country: ws.country || (ws.settings?.currency === "INR" ? "India" : null),
        createdAt: ws.createdAt,
        updatedAt: ws.updatedAt,
        settings: ws.settings, // Dump raw settings too
      },
      members: ws.members.map((member: any) => ({
        id: member.id,
        role: member.role,
        user: member.user,
        createdAt: member.createdAt,
      })),
      clients: ws.clients,
      invoices: ws.invoices,
      projects: ws.projects,
      exportedAt: new Date().toISOString(),
    };

    // Return as downloadable JSON
    return new NextResponse(JSON.stringify(exportData, null, 2), {
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="workspace-${ws.name}-${new Date().toISOString().split("T")[0]}.json"`,
      },
    });
  } catch (error) {
    console.error("Workspace export error:", error);
    return NextResponse.json({ error: "Could not export workspace data" }, { status: 500 });
  }
}
