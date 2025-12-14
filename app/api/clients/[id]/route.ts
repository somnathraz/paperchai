import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ensureActiveWorkspace } from "@/lib/workspace";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const workspace = await ensureActiveWorkspace(session.user.id, session.user.name);
  if (!workspace) {
    return NextResponse.json({ error: "Workspace not found" }, { status: 404 });
  }

  const { id } = await params;

  const client = await prisma.client.findFirst({
    where: {
      id: id,
      workspaceId: workspace.id,
    },
    include: {
      documents: {
        orderBy: { createdAt: "desc" },
        take: 20
      },
      invoices: {
        orderBy: { createdAt: "desc" },
        take: 10,
        select: {
          id: true,
          number: true,
          status: true,
          total: true,
          dueDate: true,
          updatedAt: true,
          createdAt: true,
        },
      },
      projects: {
        orderBy: { updatedAt: "desc" },
        include: {
          milestones: true,
          _count: {
            select: {
              invoices: true,
            },
          },
        },
      },
    },
  });

  if (!client) {
    return NextResponse.json({ error: "Client not found" }, { status: 404 });
  }

  return NextResponse.json({ client });
}

// PATCH - Update client details
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const workspace = await ensureActiveWorkspace(session.user.id, session.user.name);
  if (!workspace) {
    return NextResponse.json({ error: "Workspace not found" }, { status: 404 });
  }

  const { id } = await params;
  const body = await req.json();

  // Only allow updating specific fields
  const allowedFields = [
    'name', 'email', 'phone', 'company', 'contactPerson',
    'addressLine1', 'addressLine2', 'city', 'state', 'postalCode', 'country',
    'taxId', 'notes', 'paymentTerms', 'reminderChannel', 'tonePreference'
  ];

  const updateData: Record<string, any> = {};
  for (const field of allowedFields) {
    if (body[field] !== undefined) {
      updateData[field] = body[field];
    }
  }

  try {
    const client = await prisma.client.update({
      where: {
        id: id,
        workspaceId: workspace.id,
      },
      data: updateData,
    });

    return NextResponse.json({ client });
  } catch (error) {
    console.error("Error updating client:", error);
    return NextResponse.json({ error: "Failed to update client" }, { status: 500 });
  }
}
