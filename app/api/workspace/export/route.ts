"use server";

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: {
        activeWorkspace: {
          include: {
            members: {
              include: {
                user: {
                  select: {
                    id: true,
                    name: true,
                    email: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!user || !user.activeWorkspace) {
      return NextResponse.json({ error: "Workspace not found" }, { status: 404 });
    }

    const workspace = user.activeWorkspace;

    // Export workspace data
    const exportData = {
      workspace: {
        id: workspace.id,
        name: workspace.name,
        slug: workspace.slug,
        logo: workspace.logo,
        businessType: workspace.businessType,
        taxGstNumber: workspace.taxGstNumber,
        pan: workspace.pan,
        registeredEmail: workspace.registeredEmail,
        addressLine1: workspace.addressLine1,
        addressLine2: workspace.addressLine2,
        city: workspace.city,
        state: workspace.state,
        pin: workspace.pin,
        country: workspace.country,
        createdAt: workspace.createdAt,
        updatedAt: workspace.updatedAt,
      },
      members: workspace.members.map((member) => ({
        id: member.id,
        role: member.role,
        user: member.user,
        createdAt: member.createdAt,
      })),
      exportedAt: new Date().toISOString(),
    };

    // Return as downloadable JSON
    return new NextResponse(JSON.stringify(exportData, null, 2), {
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="workspace-${workspace.slug}-${new Date().toISOString().split("T")[0]}.json"`,
      },
    });
  } catch (error) {
    console.error("Workspace export error:", error);
    return NextResponse.json({ error: "Could not export workspace data" }, { status: 500 });
  }
}

