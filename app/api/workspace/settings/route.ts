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
      include: { activeWorkspace: true },
    });

    if (!user || !user.activeWorkspace) {
      return NextResponse.json({ error: "Workspace not found" }, { status: 404 });
    }

    const workspace = user.activeWorkspace;

    return NextResponse.json({
      id: workspace.id,
      name: workspace.name,
      slug: workspace.slug,
      logo: workspace.logo,
      businessType: workspace.businessType || "Freelancer",
      taxGstNumber: workspace.taxGstNumber || "",
      pan: workspace.pan || "",
      registeredEmail: workspace.registeredEmail || "",
      addressLine1: workspace.addressLine1 || "",
      addressLine2: workspace.addressLine2 || "",
      city: workspace.city || "",
      state: workspace.state || "",
      pin: workspace.pin || "",
      country: workspace.country || "India",
    });
  } catch (error) {
    console.error("Workspace settings fetch error:", error);
    return NextResponse.json({ error: "Could not fetch workspace settings" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: { activeWorkspace: true },
    });

    if (!user || !user.activeWorkspace) {
      return NextResponse.json({ error: "Workspace not found" }, { status: 404 });
    }

    // Check if user is workspace owner
    if (user.activeWorkspace.ownerId !== user.id) {
      return NextResponse.json({ error: "Only workspace owner can update settings" }, { status: 403 });
    }

    const body = await req.json();
    const {
      name,
      businessType,
      taxGstNumber,
      pan,
      registeredEmail,
      addressLine1,
      addressLine2,
      city,
      state,
      pin,
      country,
      logo,
    } = body;

    // Update workspace with all fields
    const updatedWorkspace = await prisma.workspace.update({
      where: { id: user.activeWorkspace.id },
      data: {
        ...(name && { name }),
        ...(businessType !== undefined && { businessType }),
        ...(taxGstNumber !== undefined && { taxGstNumber: taxGstNumber || null }),
        ...(pan !== undefined && { pan: pan || null }),
        ...(registeredEmail !== undefined && { registeredEmail: registeredEmail || null }),
        ...(addressLine1 !== undefined && { addressLine1: addressLine1 || null }),
        ...(addressLine2 !== undefined && { addressLine2: addressLine2 || null }),
        ...(city !== undefined && { city: city || null }),
        ...(state !== undefined && { state: state || null }),
        ...(pin !== undefined && { pin: pin || null }),
        ...(country !== undefined && { country: country || null }),
        ...(logo !== undefined && { logo: logo || null }),
      },
    });

    return NextResponse.json({
      success: true,
      workspace: {
        id: updatedWorkspace.id,
        name: updatedWorkspace.name,
        logo: updatedWorkspace.logo,
        businessType: updatedWorkspace.businessType,
        taxGstNumber: updatedWorkspace.taxGstNumber,
        pan: updatedWorkspace.pan,
        registeredEmail: updatedWorkspace.registeredEmail,
        addressLine1: updatedWorkspace.addressLine1,
        addressLine2: updatedWorkspace.addressLine2,
        city: updatedWorkspace.city,
        state: updatedWorkspace.state,
        pin: updatedWorkspace.pin,
        country: updatedWorkspace.country,
      },
    });
  } catch (error) {
    console.error("Workspace settings update error:", error);
    return NextResponse.json({ error: "Could not update workspace settings" }, { status: 500 });
  }
}
