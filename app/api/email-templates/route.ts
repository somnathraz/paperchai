import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/email-templates - List all email templates for the workspace
export async function GET(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.email) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const user = await prisma.user.findUnique({
            where: { email: session.user.email },
            select: { activeWorkspaceId: true }
        });

        if (!user?.activeWorkspaceId) {
            return NextResponse.json({ error: "No active workspace" }, { status: 400 });
        }

        const templates = await prisma.emailTemplate.findMany({
            where: { workspaceId: user.activeWorkspaceId },
            orderBy: { createdAt: "desc" }
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
        if (!session?.user?.email) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const user = await prisma.user.findUnique({
            where: { email: session.user.email },
            select: { activeWorkspaceId: true }
        });

        if (!user?.activeWorkspaceId) {
            return NextResponse.json({ error: "No active workspace" }, { status: 400 });
        }

        const body = await req.json();
        const {
            slug,
            name,
            description,
            subject,
            body: templateBody,
            theme,
            brandColor,
            logoUrl,
            usedFor
        } = body;

        if (!slug || !name || !subject || !templateBody) {
            return NextResponse.json({
                error: "Missing required fields: slug, name, subject, body"
            }, { status: 400 });
        }

        // Upsert - create or update based on workspace+slug combination
        const template = await prisma.emailTemplate.upsert({
            where: {
                workspaceId_slug: {
                    workspaceId: user.activeWorkspaceId,
                    slug
                }
            },
            update: {
                name,
                description,
                subject,
                body: templateBody,
                theme: theme || "modern",
                brandColor: brandColor || "#0f172a",
                logoUrl,
                usedFor
            },
            create: {
                workspaceId: user.activeWorkspaceId,
                slug,
                name,
                description,
                subject,
                body: templateBody,
                theme: theme || "modern",
                brandColor: brandColor || "#0f172a",
                logoUrl,
                usedFor
            }
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
        if (!session?.user?.email) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const templateId = searchParams.get("id");

        if (!templateId) {
            return NextResponse.json({ error: "Template ID required" }, { status: 400 });
        }

        const user = await prisma.user.findUnique({
            where: { email: session.user.email },
            select: { activeWorkspaceId: true }
        });

        if (!user?.activeWorkspaceId) {
            return NextResponse.json({ error: "No active workspace" }, { status: 400 });
        }

        // Verify template belongs to workspace before deleting
        const template = await prisma.emailTemplate.findFirst({
            where: {
                id: templateId,
                workspaceId: user.activeWorkspaceId
            }
        });

        if (!template) {
            return NextResponse.json({ error: "Template not found" }, { status: 404 });
        }

        await prisma.emailTemplate.delete({
            where: { id: templateId }
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Error deleting email template:", error);
        return NextResponse.json({ error: "Failed to delete template" }, { status: 500 });
    }
}
