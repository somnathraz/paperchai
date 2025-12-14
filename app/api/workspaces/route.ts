"use server";

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/slugify";
import { cookies } from "next/headers";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const memberships = await prisma.workspaceMember.findMany({
    where: { userId: session.user.id },
    include: { workspace: true },
    orderBy: { createdAt: "asc" },
  });

  const activeWorkspaceId =
    cookies().get("paperchai_workspace")?.value || session.user.workspaceId || memberships[0]?.workspaceId;

  return NextResponse.json({
    workspaces: memberships.map((membership) => ({
      id: membership.workspace.id,
      name: membership.workspace.name,
      slug: membership.workspace.slug,
      role: membership.role,
      active: membership.workspace.id === activeWorkspaceId,
    })),
    activeWorkspaceId,
  });
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Verify user exists in database
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const { name } = await req.json();
    if (!name || typeof name !== "string") {
      return NextResponse.json({ error: "Workspace name is required" }, { status: 400 });
    }

    const slugBase = slugify(name);
    let slug = slugBase;
    let count = 1;
    while (await prisma.workspace.findUnique({ where: { slug } })) {
      slug = `${slugBase}-${count++}`;
    }

    const workspace = await prisma.workspace.create({
      data: {
        name,
        slug,
        ownerId: user.id,
        members: {
          create: {
            userId: user.id,
            role: "owner",
          },
        },
      },
    });

    await prisma.user.update({
      where: { id: user.id },
      data: { activeWorkspaceId: workspace.id },
    });

    cookies().set("paperchai_workspace", workspace.id, { httpOnly: true, path: "/" });

    return NextResponse.json({ success: true, workspace });
  } catch (error) {
    return NextResponse.json({ error: "Could not create workspace" }, { status: 500 });
  }
}
