import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/slugify";
import { cookies } from "next/headers";
import { provisionWorkspaceSubscription } from "@/lib/billing/subscriptions";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const memberships = await prisma.workspaceMember.findMany({
    where: {
      userId: session.user.id,
      removedAt: null,
      workspace: { deletedAt: null },
    },
    include: { workspace: true },
    orderBy: { joinedAt: "asc" },
  });

  if (memberships.length === 0) {
    return NextResponse.json({ workspaces: [], activeWorkspaceId: null });
  }

  const cookieStore = await cookies();
  const requestedActiveWorkspaceId =
    cookieStore.get("paperchai_workspace")?.value ||
    session.user.activeWorkspaceId ||
    session.user.workspaceId ||
    null;
  const activeWorkspaceId = memberships.some(
    (membership) => membership.workspaceId === requestedActiveWorkspaceId
  )
    ? requestedActiveWorkspaceId
    : memberships[0]?.workspaceId;

  if (activeWorkspaceId && activeWorkspaceId !== requestedActiveWorkspaceId) {
    await prisma.user.update({
      where: { id: session.user.id },
      data: { activeWorkspaceId },
    });
    cookieStore.set("paperchai_workspace", activeWorkspaceId, { httpOnly: true, path: "/" });
  }

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

    const body = await req.json();
    const name = typeof body?.name === "string" ? body.name.trim() : "";
    if (!name) {
      return NextResponse.json({ error: "Workspace name is required" }, { status: 400 });
    }
    if (name.length > 120) {
      return NextResponse.json({ error: "Workspace name is too long" }, { status: 422 });
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
            role: "OWNER",
          },
        },
      },
    });

    await prisma.user.update({
      where: { id: user.id },
      data: { activeWorkspaceId: workspace.id },
    });

    await provisionWorkspaceSubscription(workspace.id, { planCode: "FREE" });

    const cookieStore = await cookies();
    cookieStore.set("paperchai_workspace", workspace.id, { httpOnly: true, path: "/" });

    return NextResponse.json({ success: true, workspace });
  } catch (error) {
    return NextResponse.json({ error: "Could not create workspace" }, { status: 500 });
  }
}
