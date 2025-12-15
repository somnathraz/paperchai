"use server";

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ensureActiveWorkspace } from "@/lib/workspace";
import { clientCreateSchema } from "@/lib/api-schemas";
import { z } from "zod";

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const workspace = await ensureActiveWorkspace(session.user.id, session.user.name);
  if (!workspace) {
    return NextResponse.json({ error: "Workspace not found" }, { status: 404 });
  }

  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search");

  const clients = await prisma.client.findMany({
    where: {
      workspaceId: workspace.id,
      ...(search ? {
        OR: [
          { name: { contains: search, mode: "insensitive" } },
          { email: { contains: search, mode: "insensitive" } },
          { company: { contains: search, mode: "insensitive" } },
        ]
      } : {})
    },
    orderBy: { createdAt: "desc" },
    include: {
      _count: {
        select: {
          projects: true,
          invoices: true
        }
      },
      projects: {
        take: 1,
        orderBy: { updatedAt: "desc" },
        select: { updatedAt: true }
      }
    }
  });

  // Transform to include lastActivity
  const enhancedClients = clients.map(client => ({
    ...client,
    projectsCount: client._count.projects,
    invoicesCount: client._count.invoices,
    lastActivity: client.projects[0]?.updatedAt || client.updatedAt
  }));

  return NextResponse.json({ clients: enhancedClients });
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const workspace = await ensureActiveWorkspace(session.user.id, session.user.name);
  if (!workspace) {
    return NextResponse.json({ error: "Workspace not found" }, { status: 404 });
  }

  // Validate input with Zod (sanitizes strings automatically)
  const body = await req.json();
  let validated;
  try {
    validated = clientCreateSchema.parse(body);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const firstError = error.issues[0];
      return NextResponse.json(
        { error: firstError.message, field: firstError.path[0] },
        { status: 422 }
      );
    }
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const client = await prisma.client.create({
    data: {
      ...validated,
      workspaceId: workspace.id,
    },
  });

  return NextResponse.json({ client });
}

