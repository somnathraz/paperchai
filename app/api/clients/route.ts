"use server";

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ensureActiveWorkspace } from "@/lib/workspace";
import { z } from "zod";

const createClientSchema = z.object({
  name: z.string().min(1, "Name is required").max(255),
  email: z.email().optional().or(z.literal("")),
  company: z.string().max(255).optional(),
  phone: z.string().max(50).optional(),
  whatsapp: z.string().max(50).optional(),
  businessType: z.string().max(100).optional(),
  tags: z.array(z.string()).optional(),
  categoryTags: z.array(z.string()).optional(),
  preferredPaymentMethod: z.string().max(100).optional(),
  paymentTerms: z.string().max(100).optional(),
  taxId: z.string().max(100).optional(),
  lateFeeRules: z.any().optional(),
  reminderChannel: z.string().max(50).optional(),
  tonePreference: z.string().max(50).optional(),
  escalationRule: z.string().max(100).optional(),
  timezone: z.string().max(100).optional(),
  currency: z.string().length(3).optional(),
  preferredCurrency: z.string().length(3).optional(),
  addressLine1: z.string().max(255).optional(),
  addressLine2: z.string().max(255).optional(),
  city: z.string().max(100).optional(),
  state: z.string().max(100).optional(),
  country: z.string().max(100).optional(),
  postalCode: z.string().max(20).optional(),
  notes: z.string().max(5000).optional(),
  internalNotes: z.string().max(5000).optional(),
});

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
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: "insensitive" } },
              { email: { contains: search, mode: "insensitive" } },
              { company: { contains: search, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    orderBy: { createdAt: "desc" },
    include: {
      _count: {
        select: {
          projects: true,
          invoices: true,
        },
      },
      projects: {
        take: 1,
        orderBy: { updatedAt: "desc" },
        select: { updatedAt: true },
      },
    },
  });

  // Transform to include lastActivity
  const enhancedClients = clients.map((client) => ({
    ...client,
    projectsCount: client._count.projects,
    invoicesCount: client._count.invoices,
    lastActivity: client.projects[0]?.updatedAt || client.updatedAt,
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

  const raw = await req.json();
  const parsed = createClientSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const {
    name,
    email,
    company,
    phone,
    whatsapp,
    businessType,
    tags,
    categoryTags,
    preferredPaymentMethod,
    paymentTerms,
    taxId,
    lateFeeRules,
    reminderChannel,
    tonePreference,
    escalationRule,
    timezone,
    currency,
    preferredCurrency,
    addressLine1,
    addressLine2,
    city,
    state,
    country,
    postalCode,
    notes,
    internalNotes,
  } = parsed.data;

  const client = await prisma.client.create({
    data: {
      name,
      email,
      company,
      phone,
      whatsapp,
      businessType,
      tags,
      categoryTags,
      preferredPaymentMethod,
      paymentTerms,
      taxId,
      lateFeeRules,
      reminderChannel,
      tonePreference,
      escalationRule,
      timezone,
      currency,
      preferredCurrency,
      addressLine1,
      addressLine2,
      city,
      state,
      country,
      postalCode,
      notes,
      internalNotes,
      workspaceId: workspace.id,
    },
  });

  return NextResponse.json({ client });
}
