import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canWriteWorkspace, ensureActiveWorkspace, getWorkspaceMembership } from "@/lib/workspace";

const templateUpsertSchema = z.object({
  slug: z
    .string()
    .trim()
    .min(1)
    .max(100)
    .regex(/^[a-z0-9-]+$/, "Slug can contain lowercase letters, numbers and hyphens only"),
  name: z.string().trim().min(1).max(120),
  description: z.string().trim().max(500).optional().nullable(),
  subject: z.string().trim().min(1).max(300),
  body: z.string().min(1).max(50000),
  theme: z.string().trim().max(50).optional().nullable(),
  brandColor: z.string().trim().max(30).optional().nullable(),
  logoUrl: z
    .union([z.string().url().max(2000), z.literal("")])
    .optional()
    .nullable(),
  usedFor: z.string().trim().max(120).optional().nullable(),
});

async function resolveTemplateWorkspace(userId: string, userName?: string | null) {
  const workspace = await ensureActiveWorkspace(userId, userName);
  if (!workspace) return null;

  const membership = await getWorkspaceMembership(userId, workspace.id);
  if (!membership) return null;

  return { workspace, membership };
}

// GET /api/email-templates - List all email templates for the active workspace
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const context = await resolveTemplateWorkspace(session.user.id, session.user.name);
    if (!context) {
      return NextResponse.json({ error: "No active workspace" }, { status: 400 });
    }

    const templates = await prisma.emailTemplate.findMany({
      where: { workspaceId: context.workspace.id },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ templates });
  } catch (error) {
    console.error("Error fetching email templates:", error);
    return NextResponse.json({ error: "Failed to fetch templates" }, { status: 500 });
  }
}

// POST /api/email-templates - Create or update an email template
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const context = await resolveTemplateWorkspace(session.user.id, session.user.name);
    if (!context) {
      return NextResponse.json({ error: "No active workspace" }, { status: 400 });
    }
    if (!canWriteWorkspace(context.membership.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const parsed = templateUpsertSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Invalid request payload" },
        { status: 422 }
      );
    }

    const payload = parsed.data;
    const template = await prisma.emailTemplate.upsert({
      where: {
        workspaceId_slug: {
          workspaceId: context.workspace.id,
          slug: payload.slug,
        },
      },
      update: {
        name: payload.name,
        description: payload.description || null,
        subject: payload.subject,
        body: payload.body,
        theme: payload.theme || "modern",
        brandColor: payload.brandColor || "#0f172a",
        logoUrl: payload.logoUrl || null,
        usedFor: payload.usedFor || null,
      },
      create: {
        workspaceId: context.workspace.id,
        slug: payload.slug,
        name: payload.name,
        description: payload.description || null,
        subject: payload.subject,
        body: payload.body,
        theme: payload.theme || "modern",
        brandColor: payload.brandColor || "#0f172a",
        logoUrl: payload.logoUrl || null,
        usedFor: payload.usedFor || null,
      },
    });

    return NextResponse.json({ template });
  } catch (error) {
    console.error("Error saving email template:", error);
    return NextResponse.json({ error: "Failed to save template" }, { status: 500 });
  }
}

// DELETE /api/email-templates?id=xxx - Delete an email template
export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const context = await resolveTemplateWorkspace(session.user.id, session.user.name);
    if (!context) {
      return NextResponse.json({ error: "No active workspace" }, { status: 400 });
    }
    if (!canWriteWorkspace(context.membership.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const templateId = searchParams.get("id");
    if (!templateId) {
      return NextResponse.json({ error: "Template ID required" }, { status: 400 });
    }

    const deleted = await prisma.emailTemplate.deleteMany({
      where: {
        id: templateId,
        workspaceId: context.workspace.id,
      },
    });
    if (deleted.count === 0) {
      return NextResponse.json({ error: "Template not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting email template:", error);
    return NextResponse.json({ error: "Failed to delete template" }, { status: 500 });
  }
}
