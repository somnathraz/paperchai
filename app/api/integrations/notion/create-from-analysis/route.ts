import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { resolveIntegrationWorkspace, requireIntegrationManager } from "@/lib/integrations/access";

// Schema for creating from analysis
const createSchema = z.object({
  entityType: z.enum(["project", "client", "task", "invoice"]),
  data: z.record(z.string(), z.any()),
  notionPageId: z.string(),
  notionDatabaseId: z.string(),
  notionPageTitle: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const workspace = await resolveIntegrationWorkspace(session.user.id, session.user.name);
    if (!workspace) {
      return NextResponse.json({ error: "No active workspace" }, { status: 400 });
    }
    const canManage = await requireIntegrationManager(session.user.id, workspace.id);
    if (!canManage) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const validated = createSchema.safeParse(body);

    if (!validated.success) {
      return NextResponse.json(
        { error: "Invalid input", details: validated.error.issues },
        { status: 400 }
      );
    }

    const { entityType, data, notionPageId, notionDatabaseId, notionPageTitle } = validated.data;
    const workspaceId = workspace.id;

    // Get connection to link
    const connection = await prisma.integrationConnection.findUnique({
      where: {
        workspaceId_provider: {
          workspaceId,
          provider: "NOTION",
        },
      },
    });

    if (!connection) {
      // Should not happen if we got here, but handle it
      return NextResponse.json({ error: "Notion connection not found" }, { status: 400 });
    }

    // Create the entity
    let entityId: string | null = null;
    let createdEntity: any = null;

    if (entityType === "project") {
      // Check for client first
      let clientId: string | null = null;

      // Handle client data - can be a string or an object from analyze endpoint
      const clientInfo = data.client;
      if (clientInfo) {
        // Extract client name (handle both string and object formats)
        const clientName =
          typeof clientInfo === "string" ? clientInfo : clientInfo.name || clientInfo.company;

        if (clientName) {
          // Try to find existing client by name
          const existingClient = await prisma.client.findFirst({
            where: {
              workspaceId,
              name: { contains: clientName, mode: "insensitive" },
            },
          });

          if (existingClient) {
            clientId = existingClient.id;
          } else {
            // Create new client with full details from object or just name from string
            const newClient = await prisma.client.create({
              data: {
                workspaceId,
                name: clientName,
                company:
                  typeof clientInfo === "object" ? clientInfo.company || clientName : clientName,
                email: typeof clientInfo === "object" ? clientInfo.email : undefined,
                phone: typeof clientInfo === "object" ? clientInfo.phone : undefined,
                contactPerson:
                  typeof clientInfo === "object" ? clientInfo.contactPerson : undefined,
                addressLine1: typeof clientInfo === "object" ? clientInfo.address : undefined,
              },
            });
            clientId = newClient.id;
          }
        }
      }

      // Extract project data - handle both flat and nested formats from analyze
      const projectData = data.project || data; // Analyze sends data.project, legacy sends data directly

      createdEntity = await prisma.project.create({
        data: {
          workspaceId,
          name: projectData.name || data.name || "Untitled Project",
          description: projectData.description || data.description || "",
          clientId: clientId,
          status: "ACTIVE",
          type: (projectData.type || data.type || "MILESTONE") as any,
          billingStrategy: (projectData.billingStrategy || data.billingStrategy) as any,
          totalBudget:
            projectData.totalBudget || projectData.budget || data.budget
              ? parseFloat(String(projectData.totalBudget || projectData.budget || data.budget))
              : null,
          currency: projectData.currency || data.currency || "INR",
          startDate:
            projectData.startDate || data.startDate
              ? new Date(projectData.startDate || data.startDate)
              : null,
          endDate:
            projectData.endDate || data.endDate
              ? new Date(projectData.endDate || data.endDate)
              : null,
          billableItems: data.billableItems ? JSON.stringify(data.billableItems) : undefined,
          // 🚀 ENABLE AUTOMATIONS for Notion imports!
          autoInvoiceEnabled: true, // Auto-create invoices when milestones complete
          autoRemindersEnabled: true, // Auto-send payment reminders
          notes: `Imported from Notion Page: ${notionPageTitle || notionPageId}`,
        },
        include: { client: true }, // Include client in response
      });
      entityId = createdEntity.id;

      // Create milestones if provided
      if (data.milestones && Array.isArray(data.milestones) && entityId) {
        for (const milestone of data.milestones) {
          await prisma.projectMilestone.create({
            data: {
              projectId: entityId,
              title: milestone.title || "Untitled Milestone",
              description: milestone.description || "",
              amount: milestone.amount || 0,
              status: "PLANNED",
              expectedDate: milestone.expectedDate ? new Date(milestone.expectedDate) : undefined,
              dueDate: milestone.dueDate ? new Date(milestone.dueDate) : undefined,
              orderIndex: milestone.orderIndex ?? 0,
            },
          });
        }
      }
    } else if (entityType === "client") {
      createdEntity = await prisma.client.create({
        data: {
          workspaceId,
          name: data.name || "Untitled Client",
          company: data.company || data.name,
          contactPerson: data.contactPerson,
          email: data.email,
          phone: data.phone,
          addressLine1: data.address, // Mapped to addressLine1
          notes: data.notes || `Imported from Notion Page: ${notionPageTitle || notionPageId}`,
        },
      });
      entityId = createdEntity.id;
    }

    if (entityId) {
      // Determine valid importType enum
      let dbImportType = entityType.toUpperCase();
      if (entityType === "invoice") dbImportType = "INVOICE_DATA";

      // Create Import Record
      const notionImport = await prisma.notionImport.create({
        data: {
          connectionId: connection.id,
          notionDatabaseId,
          notionPageId,
          notionPageTitle: notionPageTitle || "Untitled",
          importType: dbImportType as any,
          status: "COMPLETED",
          projectId: entityType === "project" ? entityId : undefined,
          clientId: entityType === "client" ? entityId : undefined,
          extractedData: data,
        },
      });

      // 🚀 Suggest Automations for projects
      let suggestedAutomations = 0;
      if (entityType === "project" && createdEntity) {
        const projectName = createdEntity.name;

        // Suggestion 1: Auto-invoice when milestones are due
        try {
          await prisma.automationRule.create({
            data: {
              workspaceId,
              name: `Auto-invoice milestones for "${projectName}"`,
              description: "Automatically create invoices when project milestones are completed",
              trigger: "MILESTONE_DUE",
              scope: "ALL_PROJECTS",
              sequence: "STANDARD",
              channels: "email",
              status: "PENDING",
              source: "NOTION_IMPORT",
              sourceImportId: notionImport.id,
            },
          });
          suggestedAutomations++;
        } catch (e) {
          console.error("Failed to create milestone automation:", e);
        }

        // Suggestion 2: Payment reminders for this project
        try {
          await prisma.automationRule.create({
            data: {
              workspaceId,
              name: `Payment reminders for "${projectName}"`,
              description: "Send payment reminders when invoices are overdue",
              trigger: "INVOICE_OVERDUE",
              scope: "ALL_PROJECTS",
              sequence: "STANDARD",
              channels: "email,whatsapp",
              status: "PENDING",
              source: "NOTION_IMPORT",
              sourceImportId: notionImport.id,
            },
          });
          suggestedAutomations++;
        } catch (e) {
          console.error("Failed to create reminder automation:", e);
        }
      }

      return NextResponse.json({
        success: true,
        entityId,
        entityType,
        suggestedAutomations,
      });
    }

    return NextResponse.json(
      { error: "Unsupported entity type or creation failed" },
      { status: 400 }
    );
  } catch (error) {
    console.error("Create from analysis error:", error);
    return NextResponse.json({ error: "Failed to create entity" }, { status: 500 });
  }
}
