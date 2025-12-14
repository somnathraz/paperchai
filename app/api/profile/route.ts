"use server";

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: {
      name: true,
      email: true,
      role: true,
      timezone: true,
      currency: true,
      reminderTone: true,
      backupEmail: true,
      image: true,
      activeWorkspace: { select: { id: true, name: true } },
    },
  });

  if (!user) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({
    name: user.name,
    email: user.email,
    role: user.role,
    timezone: user.timezone,
    currency: user.currency,
    reminderTone: user.reminderTone,
    backupEmail: user.backupEmail,
    image: user.image,
    workspace: user.activeWorkspace,
  });
}

export async function PATCH(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { name, role, timezone, currency, reminderTone, backupEmail, image } = body;

    const updatedUser = await prisma.user.update({
      where: { email: session.user.email },
      data: {
        ...(name !== undefined && { name }),
        ...(role !== undefined && { role }),
        ...(timezone !== undefined && { timezone }),
        ...(currency !== undefined && { currency }),
        ...(reminderTone !== undefined && { reminderTone }),
        ...(backupEmail !== undefined && { backupEmail: backupEmail || null }),
        ...(image !== undefined && { image: image || null }),
      },
    });

    return NextResponse.json({
      success: true,
      user: {
        name: updatedUser.name,
        role: updatedUser.role,
        timezone: updatedUser.timezone,
        currency: updatedUser.currency,
        reminderTone: updatedUser.reminderTone,
        backupEmail: updatedUser.backupEmail,
        image: updatedUser.image,
      },
    });
  } catch (error) {
    console.error("Profile update error:", error);
    return NextResponse.json({ error: "Could not update profile" }, { status: 500 });
  }
}
