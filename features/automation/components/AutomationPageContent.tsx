"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { toast } from "sonner";
import { AutopilotSummary } from "@/features/automation/components/AutopilotSummary";
import { ActiveAutomationsSection } from "@/features/automation/components/ActiveAutomationsSection";
import { AutomationDetailsDrawer } from "@/features/automation/components/AutomationDetailsDrawer";
import { DataSourcesSection } from "@/features/automation/components/DataSourcesSection";
import { RecipesSection } from "@/features/automation/components/RecipesSection";
import { SequencesSection } from "@/features/automation/components/SequencesSection";
import { RecentActivitySection } from "@/features/automation/components/RecentActivitySection";
import { TemplateEditorDrawer } from "@/features/automation/components/TemplateEditorDrawer";
import { AutomationWizard } from "@/features/automation/components/AutomationWizard";
import { AutomationSuggestions } from "@/features/automation/components/AutomationSuggestions";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useRouter } from "next/navigation";

// Mock recipes for wizard
const MOCK_RECIPES = [
  {
    id: "notion-invoice-draft",
    title: "Auto-create invoices from Notion 'Ready to Bill'",
    trigger: "Notion status = Ready to Bill",
    source: "notion" as const,
    actions: [
      "Create draft invoice in PaperChai",
      "Attach to client & project automatically",
      "Schedule reminders before due date",
    ],
  },
  {
    id: "slack-overdue-nudge",
    title: "Nudge overdue clients from Slack threads",
    trigger: "Slack thread tagged with 💸 or 'overdue'",
    source: "slack" as const,
    actions: [
      "Identify client from thread context",
      "Create reminder sequence: email + WhatsApp",
      "Post status update back to Slack",
    ],
  },
];

// Mock template for editor
const MOCK_TEMPLATE = {
  id: "t1",
  slug: "reminder-gentle",
  name: "Friendly Reminder",
  timing: "T-3d",
  channel: "email" as const,
  subject: "Friendly reminder: Invoice {{invoiceId}} due in 3 days",
  body: `Hi {{clientName}},

This is a friendly reminder that Invoice {{invoiceId}} for {{amount}} is due on {{dueDate}}.

You can view and pay your invoice here:
{{paymentLink}}

If you have any questions, please don't hesitate to reach out.

Best regards,
{{companyName}}`,
};

interface Prerequisites {
  hasClients: boolean;
  hasActiveProjects: boolean;
  clientCount: number;
  activeProjectCount: number;
}

type AutomationStep = {
  timing: string;
  channel: "email" | "whatsapp" | "slack";
  template: string;
  templateSlug?: string;
};

type AutomationInvoiceSummary = {
  id: string;
  number: string;
  clientName: string;
  status: string;
  amount: number;
  currency: string;
  createdAt: string | Date;
  approvalStatus?: string;
};

type EmailTemplate = {
  id: string;
  slug: string;
  name: string;
  subject: string;
  body: string;
  theme?: string;
  brandColor?: string;
  logoUrl?: string | null;
  description?: string | null;
  usedFor?: string | null;
};

type TemplateEditorTemplate = EmailTemplate & {
  timing?: string;
  channel: "email" | "whatsapp";
};

export function AutomationPageContent() {
  const router = useRouter();
  const activityRef = useRef<HTMLDivElement>(null);

  // Prerequisites state
  const [prerequisites, setPrerequisites] = useState<Prerequisites | null>(null);
  const [showPrerequisitesDialog, setShowPrerequisitesDialog] = useState(false);

  // Automation state
  const [automations, setAutomations] = useState<any[]>([]);
  const [isLoadingAutomations, setIsLoadingAutomations] = useState(false);

  // Automation details drawer state
  const [selectedAutomationId, setSelectedAutomationId] = useState<string | null>(null);
  const [generatedInvoices, setGeneratedInvoices] = useState<AutomationInvoiceSummary[]>([]);
  const [generatedInvoicesLoading, setGeneratedInvoicesLoading] = useState(false);

  // Template editor drawer state
  const [templateEditorOpen, setTemplateEditorOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateEditorTemplate | null>(
    MOCK_TEMPLATE
  );

  // Email templates state
  const [emailTemplates, setEmailTemplates] = useState<EmailTemplate[]>([]);
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(false);

  // Automation wizard state
  const [wizardOpen, setWizardOpen] = useState(false);
  const [selectedRecipe, setSelectedRecipe] = useState<(typeof MOCK_RECIPES)[0] | undefined>();

  const triggerLabels: Record<string, string> = {
    NOTION_STATUS_CHANGE: "Notion status change",
    MILESTONE_DUE: "Milestone due",
    INVOICE_OVERDUE: "Invoice overdue",
    PROJECT_STARTED: "Project created",
    SLACK_THREAD_TAG: "Slack thread tag",
  };

  const scopeLabels: Record<string, string> = {
    ALL_PROJECTS: "All projects",
    BY_TAG: "Project tag",
    BY_RISK_LEVEL: "Risk level",
    SPECIFIC_CLIENT: "Specific client",
    SELECTED_CLIENTS: "Selected clients",
  };

  const sequenceTemplates: Record<
    string,
    Array<{ timing: string; label: string; templateSlug?: string }>
  > = {
    STANDARD: [
      { timing: "T-3d", label: "Gentle Reminder", templateSlug: "reminder-gentle" },
      { timing: "T day", label: "Due Date Follow-up", templateSlug: "reminder-standard" },
      { timing: "T+7d", label: "Overdue Warning", templateSlug: "reminder-assertive" },
    ],
    AGGRESSIVE: [
      { timing: "T-5d", label: "Early Reminder", templateSlug: "reminder-gentle" },
      { timing: "T-1d", label: "Due Tomorrow", templateSlug: "reminder-standard" },
      { timing: "T day", label: "Due Today", templateSlug: "reminder-standard" },
      { timing: "T+2d", label: "Urgent Follow-up", templateSlug: "reminder-assertive" },
      { timing: "T+5d", label: "Final Notice", templateSlug: "reminder-assertive" },
    ],
    CUSTOM: [{ timing: "Custom", label: "Custom template" }],
  };

  const templateNameBySlug = useMemo(() => {
    const map = new Map<string, string>();
    emailTemplates.forEach((template) => {
      map.set(template.slug, template.name);
    });
    return map;
  }, [emailTemplates]);

  const buildSteps = (sequence: string, channels: string[] = []): AutomationStep[] => {
    const preferredChannel = (channels.find(
      (channel) => channel === "email" || channel === "whatsapp" || channel === "slack"
    ) || "email") as AutomationStep["channel"];
    const steps = sequenceTemplates[sequence] || sequenceTemplates.STANDARD;
    return steps.map((step) => {
      const templateName = step.templateSlug
        ? templateNameBySlug.get(step.templateSlug)
        : undefined;
      return {
        timing: step.timing,
        template: templateName || step.label,
        templateSlug: step.templateSlug,
        channel: preferredChannel,
      };
    });
  };

  const buildLinkedTemplates = (sequence: string) => {
    const steps = sequenceTemplates[sequence] || sequenceTemplates.STANDARD;
    const uniqueSlugs = Array.from(
      new Set(steps.map((step) => step.templateSlug).filter(Boolean))
    ) as string[];
    return uniqueSlugs.map((slug) => ({
      slug,
      name: templateNameBySlug.get(slug) || slug,
    }));
  };

  const formatScopeLabel = (scope: string, scopeValue?: string | null) => {
    const baseLabel = scopeLabels[scope] || scope;
    if (!scopeValue || scope === "ALL_PROJECTS") {
      return baseLabel;
    }
    return `${baseLabel}: ${scopeValue}`;
  };

  // Fetch automations
  const fetchAutomations = async () => {
    setIsLoadingAutomations(true);
    try {
      const response = await fetch("/api/automation/rules");
      if (response.ok) {
        const data = await response.json();
        const normalized = (data.automations || []).map((automation: any) => ({
          ...automation,
          lastRun: automation.lastRunAt || undefined,
          nextRun: automation.nextRunAt || undefined,
          triggerLabel: triggerLabels[automation.trigger] || automation.trigger,
          scopeLabel: formatScopeLabel(automation.scope, automation.scopeValue),
        }));
        setAutomations(normalized);
      }
    } catch (error) {
      console.error("Failed to fetch automations:", error);
    } finally {
      setIsLoadingAutomations(false);
    }
  };

  const fetchEmailTemplates = async () => {
    setIsLoadingTemplates(true);
    try {
      const response = await fetch("/api/email-templates");
      if (response.ok) {
        const data = await response.json();
        setEmailTemplates(data.templates || []);
      }
    } catch (error) {
      console.error("Failed to fetch email templates:", error);
    } finally {
      setIsLoadingTemplates(false);
    }
  };

  // Fetch prerequisites and automations on mount
  useEffect(() => {
    const fetchPrerequisites = async () => {
      try {
        const response = await fetch("/api/automation/prerequisites");
        if (response.ok) {
          const data = await response.json();
          setPrerequisites(data);
        }
      } catch (error) {
        console.error("Failed to fetch prerequisites:", error);
      }
    };
    fetchPrerequisites();
    fetchAutomations();
    fetchEmailTemplates();
  }, []);

  useEffect(() => {
    if (selectedAutomationId && !automations.find((a) => a.id === selectedAutomationId)) {
      setSelectedAutomationId(null);
    }
  }, [selectedAutomationId, automations]);

  useEffect(() => {
    if (!selectedAutomationId) {
      setGeneratedInvoices([]);
      return;
    }

    let active = true;
    const fetchGeneratedInvoices = async () => {
      setGeneratedInvoicesLoading(true);
      try {
        const response = await fetch(`/api/automation/rules/${selectedAutomationId}/invoices`);
        if (!response.ok) {
          throw new Error("Failed to load invoices");
        }
        const data = await response.json();
        if (active) {
          setGeneratedInvoices(data.invoices || []);
        }
      } catch (error) {
        console.error("Failed to fetch automation invoices:", error);
        if (active) {
          setGeneratedInvoices([]);
        }
      } finally {
        if (active) {
          setGeneratedInvoicesLoading(false);
        }
      }
    };

    fetchGeneratedInvoices();
    return () => {
      active = false;
    };
  }, [selectedAutomationId]);

  // Check prerequisites before allowing automation creation
  const handleCreateAutomation = () => {
    if (!prerequisites?.hasClients || !prerequisites?.hasActiveProjects) {
      setShowPrerequisitesDialog(true);
      return;
    }
    setWizardOpen(true);
  };

  // Handle edit copy click from sequences
  const handleEditCopy = (sequenceId: string) => {
    // In real implementation, fetch the template for this sequence
    setSelectedTemplate(MOCK_TEMPLATE);
    setTemplateEditorOpen(true);
  };

  const fetchTemplateBySlug = async (slug: string) => {
    const existing = emailTemplates.find((template) => template.slug === slug);
    if (existing) return existing;

    try {
      const response = await fetch("/api/email-templates");
      if (!response.ok) return undefined;
      const data = await response.json();
      const templates = data.templates || [];
      setEmailTemplates(templates);
      return templates.find((template: EmailTemplate) => template.slug === slug);
    } catch (error) {
      console.error("Failed to refresh email templates:", error);
      return undefined;
    }
  };

  const handleEditTemplate = async (slug: string) => {
    const template = await fetchTemplateBySlug(slug);
    if (!template) {
      toast.error("Template not found");
      return;
    }
    setSelectedTemplate({
      ...template,
      channel: "email",
    });
    setTemplateEditorOpen(true);
  };

  // Handle add & customize click from recipes
  const handleAddCustomize = (recipeId: string) => {
    const recipe = MOCK_RECIPES.find((r) => r.id === recipeId);
    setSelectedRecipe(recipe);
    setWizardOpen(true);
  };

  const handlePreviewRecipe = (recipeId: string) => {
    const recipe = MOCK_RECIPES.find((r) => r.id === recipeId);
    setSelectedRecipe(recipe);
    setWizardOpen(true);
  };

  const updateAutomationStatus = async (automationId: string, nextStatus: "ACTIVE" | "PAUSED") => {
    const automation = automations.find((a) => a.id === automationId);
    if (!automation) return;

    try {
      const response =
        automation.status === "PENDING" && nextStatus === "ACTIVE"
          ? await fetch(`/api/automation/rules/${automationId}/approve`, { method: "POST" })
          : await fetch(`/api/automation/rules/${automationId}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ status: nextStatus }),
            });

      if (!response.ok) {
        toast.error("Failed to update automation");
        return;
      }

      await fetchAutomations();
      const message =
        automation.status === "PENDING"
          ? "Automation approved"
          : `Automation ${nextStatus === "ACTIVE" ? "resumed" : "paused"}`;
      toast.success(message);
    } catch (error) {
      console.error("Failed to update status:", error);
      toast.error("Failed to update status");
    }
  };

  // Handle status toggle (Pause/Resume)
  const handleToggleStatus = async (automationId: string) => {
    const automation = automations.find((a) => a.id === automationId);
    if (!automation) return;

    const newStatus = automation.status === "ACTIVE" ? "PAUSED" : "ACTIVE";
    await updateAutomationStatus(automationId, newStatus);
  };

  // State for editing/duplicating
  const [editingConfig, setEditingConfig] = useState<any>(null);

  // Helpers to map backend enums to frontend values
  const mapBackendToFrontend = (automation: any) => {
    const scopeMap: Record<string, string> = {
      ALL_PROJECTS: "all",
      BY_TAG: "tag",
      BY_RISK_LEVEL: "risk",
      SPECIFIC_CLIENT: "selected_clients",
      SELECTED_CLIENTS: "selected_clients",
    };
    const sequenceMap: Record<string, string> = {
      STANDARD: "standard",
      AGGRESSIVE: "aggressive",
      CUSTOM: "custom",
    };
    const selectedClients = automation.scopeValue
      ? automation.scopeValue
          .split(",")
          .map((value: string) => value.trim())
          .filter(Boolean)
      : undefined;
    return {
      id: automation.id,
      name: automation.name,
      trigger: automation.trigger,
      scope: scopeMap[automation.scope] || "all",
      scopeValue: automation.scopeValue,
      selectedClients,
      sequence: sequenceMap[automation.sequence] || "standard",
      // Assuming selected clients are stored in scopeValue for SELECTED_CLIENTS?
      // The previous code stored it in scopeValue, so this is correct.
    };
  };

  const handleEdit = (id: string) => {
    const automation = automations.find((a) => a.id === id);
    if (automation) {
      setSelectedRecipe(undefined);
      setEditingConfig(mapBackendToFrontend(automation));
      setWizardOpen(true);
    }
  };

  const handleDuplicate = (id: string) => {
    const automation = automations.find((a) => a.id === id);
    if (automation) {
      const config = mapBackendToFrontend(automation);
      // Remove ID to create new, append Copy to name
      setEditingConfig({
        ...config,
        id: undefined,
        name: `${config.name} (Copy)`,
      });
      setSelectedRecipe(undefined);
      setWizardOpen(true);
    }
  };

  // Handle wizard completion - CREATE or UPDATE
  const handleWizardComplete = async (config: any) => {
    try {
      const automationId = config.id ?? editingConfig?.id;
      const isEdit = !!automationId;

      // Map recipe ID to trigger enum
      const triggerMap: Record<string, string> = {
        "notion-invoice-draft": "NOTION_STATUS_CHANGE",
        "slack-overdue-nudge": "SLACK_THREAD_TAG",
      };

      // Map scope to backend enum
      const scopeMap: Record<string, string> = {
        all: "ALL_PROJECTS",
        tag: "BY_TAG",
        risk: "BY_RISK_LEVEL",
        selected_clients: "SELECTED_CLIENTS",
      };

      // Map sequence to backend enum
      const sequenceMap: Record<string, string> = {
        standard: "STANDARD",
        aggressive: "AGGRESSIVE",
        custom: "CUSTOM",
      };

      const payload = {
        name: config.name || selectedRecipe?.title || "New Automation",
        scope: scopeMap[config.scope] || "ALL_PROJECTS",
        scopeValue: config.selectedClients?.length
          ? config.selectedClients.join(",")
          : config.scopeValue,
        sequence: sequenceMap[config.sequence] || "STANDARD",
        channels: ["email"],
      };

      const createPayload = {
        ...payload,
        trigger: triggerMap[config.recipeId] || config.trigger || "PROJECT_STARTED",
        status: "PENDING",
      };

      if (isEdit && !automationId) {
        toast.error("Missing automation ID");
        return;
      }

      const url = isEdit ? `/api/automation/rules/${automationId}` : "/api/automation/rules";
      const method = isEdit ? "PATCH" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(isEdit ? payload : createPayload),
      });

      if (!response.ok) {
        const errorPayload = await response.json().catch(() => ({}));
        const detail = errorPayload.details ? ` (${errorPayload.details})` : "";
        toast.error(`${errorPayload.error || "Failed to save automation"}${detail}`);
        return;
      }

      await fetchAutomations(); // Refresh list
      setWizardOpen(false);
      setSelectedRecipe(undefined);
      setEditingConfig(null);
      toast.success(`Automation ${isEdit ? "updated" : "created"} successfully!`, {
        description: isEdit
          ? "Changes have been saved."
          : "Pending approval. Activate it to start sending reminders.",
      });
    } catch (error) {
      console.error("Failed to save automation:", error);
      toast.error("Failed to save automation");
    }
  };

  // Close wizard handler
  const handleWizardClose = () => {
    setWizardOpen(false);
    setSelectedRecipe(undefined);
    setEditingConfig(null);
  };

  // Handle template save
  const handleTemplateSave = async (template: { subject?: string; body: string }) => {
    if (!selectedTemplate?.slug || !selectedTemplate?.name) {
      toast.error("Template information is missing");
      return;
    }
    if (selectedTemplate.channel === "email" && !template.subject?.trim()) {
      toast.error("Email subject is required");
      return;
    }
    if (!template.body?.trim()) {
      toast.error("Template body is required");
      return;
    }

    try {
      const response = await fetch("/api/email-templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug: selectedTemplate.slug,
          name: selectedTemplate.name,
          subject: template.subject ?? "",
          body: template.body,
          theme: selectedTemplate.theme ?? "modern",
          brandColor: selectedTemplate.brandColor ?? "#0f172a",
          logoUrl: selectedTemplate.logoUrl ?? null,
          description: selectedTemplate.description ?? undefined,
          usedFor: selectedTemplate.usedFor ?? undefined,
        }),
      });

      if (!response.ok) {
        const errorPayload = await response.json().catch(() => ({}));
        toast.error(errorPayload.error || "Failed to save template");
        return;
      }

      const data = await response.json();
      const saved = data.template;
      if (saved) {
        setEmailTemplates((prev) => {
          const filtered = prev.filter((item) => item.slug !== saved.slug);
          return [saved, ...filtered];
        });
        setSelectedTemplate((prev) => (prev ? { ...prev, ...saved } : prev));
      }
      toast.success("Template updated");
    } catch (error) {
      console.error("Failed to save template:", error);
      toast.error("Failed to save template");
    }
  };

  const selectedAutomation = automations.find((a) => a.id === selectedAutomationId);
  const isReminderAutomation = selectedAutomation?.trigger === "INVOICE_OVERDUE";
  const stepsNote =
    selectedAutomation && !isReminderAutomation
      ? "This automation creates draft invoices and waits for owner approval before sending."
      : undefined;
  const templatesNote =
    selectedAutomation && !isReminderAutomation
      ? "Reminder templates are only used for overdue invoice automations."
      : undefined;

  const automationDetails = selectedAutomation
    ? {
        id: selectedAutomation.id,
        name: selectedAutomation.name,
        status: selectedAutomation.status,
        trigger: selectedAutomation.triggerLabel ?? selectedAutomation.trigger,
        scope: selectedAutomation.scopeLabel ?? selectedAutomation.scope,
        channels: selectedAutomation.channels || [],
        createdBy: "You",
        createdAt: selectedAutomation.createdAt,
        steps: isReminderAutomation
          ? buildSteps(selectedAutomation.sequence, selectedAutomation.channels)
          : [],
        linkedTemplates: isReminderAutomation
          ? buildLinkedTemplates(selectedAutomation.sequence)
          : [],
        recentRuns: [],
      }
    : undefined;

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-8">
      {/* Section 1: Autopilot Summary */}
      <AutopilotSummary
        onCreateAutomation={handleCreateAutomation}
        onViewActivity={() =>
          activityRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
        }
      />

      {/* Section 2: Active Automations */}
      <ActiveAutomationsSection
        automations={automations}
        onCreateNew={handleCreateAutomation}
        onEdit={handleEdit}
        onPause={handleToggleStatus}
        onDuplicate={handleDuplicate}
        onDelete={async (id) => {
          try {
            await fetch(`/api/automation/rules/${id}`, { method: "DELETE" });
            await fetchAutomations();
            toast.success("Automation deleted");
          } catch (error) {
            console.error("Failed to delete automation:", error);
            toast.error("Failed to delete");
          }
        }}
        onViewDetails={(id) => setSelectedAutomationId(id)}
      />

      <AutomationSuggestions />

      <DataSourcesSection />

      <RecipesSection onAddCustomize={handleAddCustomize} onPreview={handlePreviewRecipe} />

      <SequencesSection onEditCopy={handleEditCopy} />

      <div ref={activityRef}>
        <RecentActivitySection />
      </div>

      {/* Automation Wizard */}
      <AutomationWizard
        open={wizardOpen}
        onClose={handleWizardClose}
        recipe={selectedRecipe}
        initialConfig={editingConfig}
        onComplete={handleWizardComplete}
      />

      <TemplateEditorDrawer
        open={templateEditorOpen}
        onClose={() => setTemplateEditorOpen(false)}
        template={selectedTemplate ?? undefined}
        onSave={handleTemplateSave}
      />

      <AutomationDetailsDrawer
        open={!!selectedAutomationId}
        onClose={() => setSelectedAutomationId(null)}
        automation={automationDetails}
        generatedInvoices={generatedInvoices}
        invoicesLoading={generatedInvoicesLoading}
        stepsNote={stepsNote}
        templatesNote={templatesNote}
        onToggleStatus={(id, enabled) => updateAutomationStatus(id, enabled ? "ACTIVE" : "PAUSED")}
        onEdit={handleEdit}
        onDuplicate={handleDuplicate}
        onEditTemplate={handleEditTemplate}
        onDelete={async (id) => {
          try {
            await fetch(`/api/automation/rules/${id}`, { method: "DELETE" });
            await fetchAutomations();
            toast.success("Automation deleted");
          } catch (error) {
            console.error("Failed to delete automation:", error);
            toast.error("Failed to delete");
          }
        }}
      />

      <AlertDialog open={showPrerequisitesDialog} onOpenChange={setShowPrerequisitesDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Set up basics first</AlertDialogTitle>
            <AlertDialogDescription>
              Automations need at least one client and an active project. You currently have{" "}
              {prerequisites?.clientCount ?? 0} client(s) and{" "}
              {prerequisites?.activeProjectCount ?? 0} active project(s).
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex flex-col sm:flex-row gap-2">
            <AlertDialogCancel>Not now</AlertDialogCancel>
            <AlertDialogAction onClick={() => router.push("/clients")}>
              Add clients
            </AlertDialogAction>
            <AlertDialogAction onClick={() => router.push("/projects")}>
              Create project
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
