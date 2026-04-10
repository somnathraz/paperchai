import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ensureActiveWorkspace } from "@/lib/workspace";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const workspace = await ensureActiveWorkspace(session.user.id, session.user.name);
  if (!workspace) {
    return NextResponse.json({ error: "Workspace not found" }, { status: 404 });
  }

  try {
    // Fetch projects with milestones
    const projectsWithMilestones = await prisma.project.findMany({
      where: {
        workspaceId: workspace.id,
        billingStrategy: "PER_MILESTONE",
      },
      include: {
        milestones: true,
        client: {
          select: { name: true },
        },
      },
    });

    // Fetch invoices that might need reminders (sent/overdue status)
    const sentInvoices = await prisma.invoice.findMany({
      where: {
        workspaceId: workspace.id,
        status: { in: ["sent", "overdue"] },
      },
      take: 10,
    });

    // Fetch existing settings to intelligently filter suggestions
    const existingReminderSettings = await prisma.reminderSettings.findUnique({
      where: { workspaceId: workspace.id },
    });

    const activeSchedules = await prisma.invoiceReminderSchedule.count({
      where: { workspaceId: workspace.id, enabled: true },
    });

    const suggestions = [];

    // Suggestion 1: Enable auto-reminders for milestone projects
    const projectsNeedingReminders = projectsWithMilestones.filter((p) => !p.autoRemindersEnabled);
    if (projectsNeedingReminders.length > 0) {
      suggestions.push({
        id: "enable-milestone-reminders",
        title: `Enable Auto-Reminders for ${projectsNeedingReminders.length} Milestone Project${projectsNeedingReminders.length > 1 ? "s" : ""}`,
        description: `You have ${projectsNeedingReminders.length} project${projectsNeedingReminders.length > 1 ? "s" : ""} with milestones but no auto-reminders enabled. Set up automatic payment reminders to get paid on time.`,
        icon: "Bell",
        action: "/settings/reminders",
        actionLabel: "Set Up Reminders",
        priority: "high" as const,
      });
    }

    // Suggestion 2: Set up reminders for sent invoices
    // Only suggest if:
    // 1. There are sent invoices
    // 2. Reminder settings are NOT enabled globally OR no specific schedules exist
    const remindersAreSetUp = existingReminderSettings?.enabled || activeSchedules > 0;

    if (sentInvoices.length > 0 && !remindersAreSetUp) {
      suggestions.push({
        id: "setup-invoice-reminders",
        title: `${sentInvoices.length} Invoice${sentInvoices.length > 1 ? "s" : ""} Could Use Reminders`,
        description: `You have ${sentInvoices.length} sent/overdue invoice${sentInvoices.length > 1 ? "s" : ""}. Add reminder schedules to improve payment collection.`,
        icon: "FileText",
        action: "/reminders",
        actionLabel: "Add Reminders",
        priority: "medium" as const,
      });
    }

    // Suggestion 3: Enable auto-invoicing for projects
    // Only suggest if there are projects with milestones but no auto-invoice
    const projectsWithoutAutoInvoice = projectsWithMilestones.filter(
      (p) => !p.autoInvoiceEnabled && p.milestones.length > 0
    );
    if (projectsWithoutAutoInvoice.length > 0) {
      suggestions.push({
        id: "enable-auto-invoice",
        title: `Enable Auto-Invoicing for ${projectsWithoutAutoInvoice.length} Project${projectsWithoutAutoInvoice.length > 1 ? "s" : ""}`,
        description: `Automatically create draft invoices when milestones are completed. Save time and never miss a billing opportunity.`,
        icon: "Zap",
        action: "/projects",
        actionLabel: "Enable Auto-Invoice",
        priority: "medium" as const,
      });
    }

    // Edge case: If user has no projects yet, suggest creating one
    if (projectsWithMilestones.length === 0) {
      const totalProjects = await prisma.project.count({
        where: { workspaceId: workspace.id },
      });

      if (totalProjects === 0) {
        suggestions.push({
          id: "create-first-project",
          title: "Create Your First Project",
          description:
            "Start by creating a project with milestones to unlock automation features like auto-invoicing and payment reminders.",
          icon: "Sparkles",
          action: "/clients",
          actionLabel: "Create Project",
          priority: "high" as const,
        });
      }
    }

    return NextResponse.json({ suggestions });
  } catch (error) {
    console.error("Error fetching automation suggestions:", error);
    return NextResponse.json({ error: "Failed to fetch suggestions" }, { status: 500 });
  }
}
