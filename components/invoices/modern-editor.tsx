"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import dynamic from "next/dynamic";
import { TemplateSidebar } from "./modern-editor/template-sidebar";
import { CanvasPreview } from "./modern-editor/canvas-preview";
import { EditorHeader } from "./modern-editor/editor-header";
import { CreateClientModal, CreateProjectModal } from "./modern-editor/panels";
import { InvoiceFormState } from "./invoice-form";
import { InvoiceSection } from "./modern-editor/types";
import type { AIReviewResult, ReviewIssue, ReviewSuggestion } from "@/lib/ai-review";
import {
  PropertiesPanelSkeleton,
  SendModalSkeleton,
  AIReviewPanelSkeleton,
  AIPanelSkeleton,
} from "./modern-editor/loading-skeletons";

// Dynamic imports for heavy components - reduces initial bundle by ~200KB
const PropertiesPanel = dynamic(
  () => import("./modern-editor/properties-panel").then((m) => m.PropertiesPanel),
  {
    loading: () => <PropertiesPanelSkeleton />,
    ssr: false,
  }
);

const SendInvoiceModal = dynamic(
  () => import("./modern-editor/SendInvoiceModal").then((m) => m.SendInvoiceModal),
  {
    loading: () => null, // Modal renders conditionally, no skeleton needed when closed
    ssr: false,
  }
);

const AIReviewPanel = dynamic(
  () => import("./modern-editor/AIReviewPanel").then((m) => m.AIReviewPanel),
  {
    loading: () => <AIReviewPanelSkeleton />,
    ssr: false,
  }
);

const AIPanel = dynamic(
  () => import("./modern-editor/ai-panel").then((m) => m.AIPanel),
  {
    loading: () => <AIPanelSkeleton />,
    ssr: false,
  }
);


type ModernEditorProps = {
  firstName: string;
  selectedTemplate?: string;
  selectedTemplateName?: string | null;
  selectedTemplateTags?: string | undefined;
  initialFormState?: InvoiceFormState;
};

export function ModernEditor({
  firstName,
  selectedTemplate,
  selectedTemplateName,
  selectedTemplateTags,
  initialFormState,
}: ModernEditorProps) {
  // Only classic-gray is available for now, default to it if another template is selected
  const availableTemplate = selectedTemplate === "classic-gray" ? "classic-gray" : "classic-gray";
  const [currentTemplate, setCurrentTemplate] = useState(availableTemplate);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState(600);
  const [templateDrawerOpen, setTemplateDrawerOpen] = useState(false);
  const [zoom, setZoom] = useState(100);
  const [previewMode, setPreviewMode] = useState<"a4" | "mobile" | "full">("a4");
  const [darkMode, setDarkMode] = useState(false);
  const [aiPanelOpen, setAiPanelOpen] = useState(false);
  const [savedInvoiceId, setSavedInvoiceId] = useState<string | undefined>(undefined);
  const [invoiceStatus, setInvoiceStatus] = useState<string | undefined>(undefined);
  const [lastSentAt, setLastSentAt] = useState<string | undefined>(undefined);
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // AI Review state
  const [aiReviewOpen, setAiReviewOpen] = useState(false);
  const [aiReviewLoading, setAiReviewLoading] = useState(false);
  const [aiReviewResult, setAiReviewResult] = useState<AIReviewResult | null>(null);

  const [formState, setFormState] = useState<InvoiceFormState>(
    initialFormState || {
      number: "INV-2024-001",
      currency: "INR",
      reminderTone: "Warm + Polite",
      items: [{ title: "", quantity: 1, unitPrice: 0, taxRate: 0 }],
    }
  );
  const [sections, setSections] = useState<InvoiceSection[]>(
    // hydrate sections if they come from initial form state or sendMeta (edit flow)
    ((initialFormState as any)?.sections as InvoiceSection[] | undefined) ||
    ((initialFormState as any)?.sendMeta?.sections as InvoiceSection[] | undefined) || [
      { id: "header", title: "Header", visible: true },
      { id: "from", title: "From Business", visible: true },
      { id: "bill_to", title: "Bill To", visible: true },
      { id: "items", title: "Items Table", visible: true },
      { id: "discounts", title: "Discounts & Fees", visible: false },
      { id: "summary", title: "Summary", visible: true },
      { id: "notes", title: "Notes", visible: true },
      { id: "payment", title: "Payment Instructions", visible: true },
    ]
  );
  const [clients, setClients] = useState<{
    id: string;
    name: string;
    email?: string | null;
    phone?: string | null;
    company?: string | null;
    addressLine1?: string | null;
    addressLine2?: string | null;
    city?: string | null;
    state?: string | null;
    postalCode?: string | null;
    country?: string | null;
    address?: string | null;
  }[]>([]);
  const [projects, setProjects] = useState<{
    id: string;
    name: string;
    description?: string | null;
    status?: string | null;
    clientId?: string | null;
    billableItems?: Array<{ title: string; quantity: number; unitPrice: number }> | null;
    milestones?: Array<{ id: string; title: string; description?: string | null; amount: number; currency: string }> | null;
  }[]>([]);

  // Modal states
  const [createClientOpen, setCreateClientOpen] = useState(false);
  const [createProjectOpen, setCreateProjectOpen] = useState(false);
  const [projectToEdit, setProjectToEdit] = useState<any>(null);
  const [sendModalOpen, setSendModalOpen] = useState(false);

  useEffect(() => {
    const load = async () => {
      const [cRes, pRes, settingsRes] = await Promise.all([
        fetch("/api/clients/list"),
        fetch("/api/projects/list"),
        fetch("/api/user/settings"),
      ]);
      if (cRes.ok) {
        const data = await cRes.json();
        setClients(data.clients || []);
      }
      if (pRes.ok) {
        const data = await pRes.json();
        setProjects(data.projects || []);
      }
      // Apply user settings as defaults (only if no initial form state)
      if (settingsRes.ok && !initialFormState) {
        const { settings } = await settingsRes.json();
        if (settings) {
          setFormState(prev => ({
            ...prev,
            currency: settings.defaultCurrency || prev.currency,
            notes: settings.defaultNotes || prev.notes,
            terms: settings.defaultTerms || prev.terms,
            taxSettings: {
              inclusive: settings.taxInclusive ?? false,
              automatic: false,
              defaultRate: settings.defaultTaxRate ?? 18,
            },
            // Apply default tax rate to first item if no tax rate set
            items: prev.items.map(item => ({
              ...item,
              taxRate: item.taxRate || settings.defaultTaxRate || 0,
            })),
          }));
        }
      }
    };
    load();
  }, [initialFormState]);

  // Refresh clients list
  const refreshClients = useCallback(async () => {
    const res = await fetch("/api/clients/list");
    if (res.ok) {
      const data = await res.json();
      setClients(data.clients || []);
    }
  }, []);

  // Refresh projects list
  const refreshProjects = useCallback(async () => {
    const res = await fetch("/api/projects/list");
    if (res.ok) {
      const data = await res.json();
      setProjects(data.projects || []);
    }
  }, []);

  const showToast = useCallback((type: "success" | "error", message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3000);
  }, []);

  // Helper to populate invoice items from a project
  const populateItemsFromProject = useCallback((project: any) => {
    const newItems: any[] = [];

    // 1. Billable Items (Fixed/Retainer items)
    if (project.billableItems && project.billableItems.length > 0) {
      newItems.push(...project.billableItems.map((item: any) => ({
        title: item.title,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        taxRate: 0 // Default, will be overridden by tax settings
      })));
    }

    // 2. Unbilled Milestones (Ready for Invoice)
    if (project.milestones && project.milestones.length > 0) {
      newItems.push(...project.milestones.map((m: any) => ({
        title: `Milestone: ${m.title}`,
        description: m.description || undefined,
        quantity: 1,
        unitPrice: m.amount / 100, // Convert cents to base unit
        taxRate: 0
      })));
    }

    if (newItems.length > 0) {
      setFormState(prev => ({
        ...prev,
        items: newItems,
      }));
      showToast("success", `Loaded ${newItems.length} item(s) from project`);
    } else {
      showToast("error", "No billable items or ready milestones found in this project.");
    }
  }, [showToast]);

  const handleClientUpdate = useCallback(async (
    clientId: string,
    data: Partial<{ email: string; phone: string; addressLine1: string; addressLine2: string; city: string; state: string; postalCode: string; country: string }>
  ) => {
    const res = await fetch(`/api/clients/${clientId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (res.ok) {
      // Update local clients state with the new data
      setClients(prevClients =>
        prevClients.map(c => c.id === clientId ? { ...c, ...data } : c)
      );
    } else {
      throw new Error("Failed to update client");
    }
  }, []);

  const handleAIReview = useCallback(async () => {
    setAiReviewOpen(true);
    setAiReviewLoading(true);
    try {
      const res = await fetch("/api/ai-review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formState,
          items: formState.items,
          taxSettings: formState.taxSettings,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setAiReviewResult(data);
      } else {
        showToast("error", "Failed to analyze invoice");
      }
    } catch (error) {
      console.error("AI Review error:", error);
      showToast("error", "Failed to analyze invoice");
    } finally {
      setAiReviewLoading(false);
    }
  }, [formState, showToast]);

  const handleSaveDraft = useCallback(async () => {
    if (!formState.clientId) {
      showToast("error", "Select a client before saving.");
      return;
    }
    // Auto-generate invoice number if not provided
    const invoiceData = {
      ...formState,
      number: formState.number || `DRAFT-${Date.now()}`,
      templateSlug: currentTemplate,
      sections,
      reminderCadence: formState.reminderCadence,
      attachments: formState.attachments,
    };

    const res = await fetch("/api/invoices/save", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(invoiceData),
    });

    if (res.ok) {
      const data = await res.json();
      const savedId = data.invoice.id;

      setSavedInvoiceId(savedId);
      setInvoiceStatus(data.invoice.status);
      setLastSentAt(data.invoice.lastSentAt);

      // Save reminder settings
      if (formState.remindersEnabled !== undefined) {
        try {
          await fetch(`/api/invoices/${savedId}/reminders`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              enabled: formState.remindersEnabled,
              useDefaults: formState.reminderSchedule?.useDefaults,
              steps: formState.reminderSchedule?.steps,
            }),
          });
        } catch (err) {
          console.error("Failed to save reminders", err);
        }
      }

      // Update form state with the generated number if it was auto-generated
      if (!formState.number) {
        setFormState(prev => ({ ...prev, number: invoiceData.number }));
      }
      showToast("success", "Draft saved successfully");
    } else {
      const error = await res.json();
      showToast("error", error.error || "Failed to save draft");
    }
  }, [formState, currentTemplate, sections, showToast]);

  const handleSchedule = useCallback(async (payload: any) => {
    if (!formState.clientId) {
      showToast("error", "Select a client before scheduling.");
      return;
    }
    // Auto-generate invoice number if not provided
    const invoiceData = {
      ...formState,
      number: formState.number || `DRAFT-${Date.now()}`,
      templateSlug: currentTemplate,
      sections,
      reminderCadence: formState.reminderCadence,
      attachments: formState.attachments,
    };

    let invoiceId = savedInvoiceId;
    if (!invoiceId) {
      // Save the invoice first if not already saved
      const res = await fetch("/api/invoices/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(invoiceData),
      });
      if (res.ok) {
        const data = await res.json();
        console.log("Save response data:", data);
        invoiceId = data.invoice?.id;
        if (!invoiceId) {
          console.error("Save response missing invoice ID:", data);
          showToast("error", "Failed to get invoice ID after saving.");
          return;
        }
        console.log("Invoice ID obtained:", invoiceId);
        setSavedInvoiceId(invoiceId);
        // Update form state with the generated number if it was auto-generated
        if (!formState.number) {
          setFormState(prev => ({ ...prev, number: invoiceData.number }));
        }
      } else {
        const errorText = await res.text();
        let error;
        try {
          error = JSON.parse(errorText);
        } catch {
          error = { error: errorText || "Unknown error" };
        }
        console.error("Save error:", error);
        showToast("error", error.error || "Failed to save invoice before scheduling.");
        return;
      }
    }

    // Ensure we have an invoiceId before scheduling
    if (!invoiceId) {
      showToast("error", "Invoice ID is missing. Please save the invoice first.");
      return;
    }

    // Validate that we have all required fields
    if (!payload.when) {
      showToast("error", "Select a date and time for scheduling.");
      return;
    }

    // Now schedule the invoice
    const schedulePayload = {
      invoiceId,
      scheduledSendAt: payload.when,
      channel: payload.channel || "email",
      templateSlug: currentTemplate,
      reminderCadence: formState.reminderCadence,
    };

    console.log("Scheduling with payload:", schedulePayload);

    const scheduleRes = await fetch("/api/invoices/schedule", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(schedulePayload),
    });

    if (scheduleRes.ok) {
      showToast("success", "Invoice scheduled successfully");
    } else {
      const error = await scheduleRes.json();
      showToast("error", error.error || "Failed to schedule invoice.");
    }
  }, [formState, currentTemplate, sections, savedInvoiceId, showToast]);

  const handleSend = useCallback(async (payload: any) => {
    if (!formState.clientId) {
      showToast("error", "Select a client before sending.");
      return;
    }
    let invoiceId = savedInvoiceId;
    if (!invoiceId) {
      const res = await fetch("/api/invoices/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formState),
      });
      if (res.ok) {
        const data = await res.json();
        invoiceId = data.invoice.id;
        setSavedInvoiceId(invoiceId);
      } else {
        showToast("error", "Failed to save invoice before sending.");
        return;
      }
    }
    const sendRes = await fetch("/api/invoices/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ invoiceId, channel: payload.channel }),
    });

    if (sendRes.ok) {
      const data = await sendRes.json();
      if (data.invoice) {
        setInvoiceStatus(data.invoice.status);
        setLastSentAt(data.invoice.lastSentAt);
      }
      showToast("success", "Invoice sent");
    } else {
      showToast("error", "Failed to send invoice");
    }
  }, [formState, savedInvoiceId, showToast]);

  const handleOpenSendModal = useCallback(() => {
    if (!formState.clientId) {
      showToast("error", "Please select a client before sending.");
      return;
    }
    setSendModalOpen(true);
  }, [formState.clientId, showToast]);

  const handleFormStateChange = useCallback((newState: InvoiceFormState) => {
    // Logic to reset sent status if key fields change (creating a new invoice context)
    if (lastSentAt || invoiceStatus === "sent") {
      if (newState.clientId !== formState.clientId || newState.projectId !== formState.projectId) {
        setSavedInvoiceId(undefined);
        setInvoiceStatus(undefined);
        setLastSentAt(undefined);
        showToast("success", "Started new invoice");
      }
    }
    setFormState(newState);
  }, [formState.clientId, formState.projectId, lastSentAt, invoiceStatus, showToast]);

  const handleSendInvoiceFromModal = useCallback(async (options: any) => {
    if (!formState.clientId) {
      showToast("error", "Select a client before sending.");
      return;
    }
    let invoiceId = savedInvoiceId;
    if (!invoiceId) {
      const res = await fetch("/api/invoices/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formState),
      });
      if (res.ok) {
        const data = await res.json();
        invoiceId = data.invoice.id;
        setSavedInvoiceId(invoiceId);
      } else {
        showToast("error", "Failed to save invoice before sending.");
        return;
      }
    }

    // Send the invoice
    const sendRes = await fetch("/api/invoices/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        invoiceId,
        channel: options.channel,
        automationEnabled: options.automationEnabled,
        reminderSettings: options.reminderSettings,
      }),
    });

    if (sendRes.ok) {
      const data = await sendRes.json();
      if (data.invoice) {
        setInvoiceStatus(data.invoice.status);
        setLastSentAt(data.invoice.lastSentAt);
      }
      showToast("success", "Invoice sent successfully!");
    } else {
      showToast("error", "Failed to send invoice.");
    }
  }, [formState, savedInvoiceId, showToast]);

  const handleAIReviewApplyFix = useCallback((issue: ReviewIssue) => {
    console.log("Applying fix:", issue);
    if (issue.autoFix) {
      const { field, value } = issue.autoFix;
      console.log("Fix field:", field, "Value:", value);

      if (field === "taxRate") {
        // Apply tax rate to all items
        setFormState(prev => ({
          ...prev,
          items: prev.items.map(item => ({ ...item, taxRate: value })),
        }));
      } else if (field === "notes") {
        setFormState(prev => ({ ...prev, notes: value }));
      } else if (field === "terms") {
        setFormState(prev => ({ ...prev, terms: value }));
      } else if (field === "dueDate") {
        setFormState(prev => ({ ...prev, dueDate: value }));
      } else if (field === "currency") {
        setFormState(prev => ({ ...prev, currency: value }));
      } else {
        // Generic field update
        setFormState(prev => ({ ...prev, [field]: value }));
      }
      showToast("success", `✓ Applied: ${issue.autoFix.label}`);
    }
  }, [showToast]);

  const handleAIReviewApplySuggestion = useCallback((suggestion: ReviewSuggestion) => {
    console.log("Applying suggestion:", suggestion);
    if (suggestion.type === "description") {
      setFormState(prev => ({
        ...prev,
        items: prev.items.map(item =>
          item.title?.toLowerCase().trim() === suggestion.original.toLowerCase().trim()
            ? { ...item, title: suggestion.improved }
            : item
        ),
      }));
      showToast("success", `Updated: "${suggestion.original}" → "${suggestion.improved}"`);
    }
  }, [showToast]);

  const handleAIReviewApplyAllFixes = useCallback(() => {
    console.log("Applying all fixes");
    if (aiReviewResult) {
      let fixCount = 0;
      const updates: Partial<InvoiceFormState> = {};
      let itemsUpdated = false;
      let newTaxRate: number | undefined;

      aiReviewResult.issues.forEach(issue => {
        if (issue.autoFix) {
          const { field, value } = issue.autoFix;
          fixCount++;

          if (field === "taxRate") {
            newTaxRate = value;
            itemsUpdated = true;
          } else if (field === "notes") {
            updates.notes = value;
          } else if (field === "terms") {
            updates.terms = value;
          } else if (field === "dueDate") {
            updates.dueDate = value;
          } else if (field === "currency") {
            updates.currency = value;
          }
        }
      });

      // Apply all updates in one state change
      setFormState(prev => {
        const newState = { ...prev, ...updates };
        if (itemsUpdated && newTaxRate !== undefined) {
          newState.items = prev.items.map(item => ({ ...item, taxRate: newTaxRate }));
        }
        return newState;
      });

      showToast("success", `✓ Applied ${fixCount} fixes`);
    }
  }, [aiReviewResult, showToast]);

  const invoiceTotals = useMemo(() => {
    const subtotal = formState.items.reduce((sum, item) => sum + (item.quantity || 1) * (item.unitPrice || 0), 0);
    const taxRate = formState.taxSettings?.defaultRate || 0;
    const tax = subtotal * (taxRate / 100);
    const total = subtotal + tax;
    return { subtotal, tax, total };
  }, [formState.items, formState.taxSettings?.defaultRate]);

  return (
    <div className="flex h-screen w-full flex-col overflow-hidden bg-white">
      {/* Header */}
      <EditorHeader
        invoiceId={savedInvoiceId}
        invoiceStatus={invoiceStatus}
        lastSentAt={lastSentAt}
        hasAutomation={!!(formState.remindersEnabled && formState.reminderSchedule?.steps?.length)}
        templateName={selectedTemplateName || "Classic Gray"}
        onAIReview={handleAIReview}
        aiReviewIssueCount={aiReviewResult?.issues.length}
        onSaveDraft={handleSaveDraft}
        onSchedule={handleSchedule}
        onSend={handleSend}
        onOpenSendModal={handleOpenSendModal}
      />

      {/* Main layout: Left Properties | Center Canvas | Right Templates Drawer */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left: Properties Panel (320px, collapsible) */}
        <PropertiesPanel
          formState={formState}
          onFormStateChange={handleFormStateChange}
          clients={clients}
          projects={projects}
          sections={sections}
          onSectionsChange={setSections}
          collapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
          onWidthChange={setSidebarWidth}
          onClientUpdate={handleClientUpdate}
          onCreateClient={() => setCreateClientOpen(true)}
          onCreateProject={() => setCreateProjectOpen(true)}
          onProjectSelect={(project) => populateItemsFromProject(project)}
          onEditProject={(project) => {
            setProjectToEdit(project);
            setCreateProjectOpen(true);
          }}
        />

        {/* Center: Large Canvas Preview (Hero) */}
        <div className="flex-1 overflow-hidden">
          <CanvasPreview
            templateSlug={currentTemplate}
            formState={formState}
            zoom={zoom}
            previewMode={previewMode}
            darkMode={darkMode}
            onZoomChange={setZoom}
            onModeChange={setPreviewMode}
            onDarkModeToggle={() => setDarkMode(!darkMode)}
            templateTags={selectedTemplateTags}
            currentTemplateName={selectedTemplateName || "Classic Gray"}
            onOpenTemplates={() => setTemplateDrawerOpen(true)}
            sidebarCollapsed={sidebarCollapsed}
            sidebarWidth={sidebarWidth}
            sections={sections}
            selectedClient={formState.clientId ? clients.find(c => c.id === formState.clientId) : undefined}
            selectedProject={formState.projectId ? projects.find(p => p.id === formState.projectId) : undefined}
          />
        </div>

        {/* Right: Template Drawer (collapsible, opens on click) */}
        <TemplateSidebar
          currentTemplate={currentTemplate}
          onTemplateChange={(slug) => {
            setCurrentTemplate(slug);
            setTemplateDrawerOpen(false);
          }}
          open={templateDrawerOpen}
          onClose={() => setTemplateDrawerOpen(false)}
        />
      </div>

      {/* AI Panel (Bottom) */}
      {aiPanelOpen && (
        <AIPanel
          onClose={() => setAiPanelOpen(false)}
          onGenerate={(data) => {
            setFormState((prev) => ({ ...prev, ...data }));
            setAiPanelOpen(false);
          }}
        />
      )}

      {/* AI Button (Floating) */}
      {!aiPanelOpen && (
        <button
          onClick={() => setAiPanelOpen(true)}
          className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-full bg-gradient-to-r from-primary via-emerald-500 to-primary px-6 py-3 text-sm font-semibold text-white shadow-[0_8px_24px_rgba(16,185,129,0.4)] transition hover:shadow-[0_12px_32px_rgba(16,185,129,0.5)]"
        >
          <span className="text-lg">🧠</span>
          PaperChai AI
        </button>
      )}

      {toast && (
        <div
          className={`fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-full px-4 py-2 text-sm font-semibold text-white shadow-lg ${toast.type === "success" ? "bg-emerald-500" : "bg-rose-500"
            }`}
        >
          {toast.message}
        </div>
      )}

      {/* Client/Project Creation Modals */}
      <CreateClientModal
        open={createClientOpen}
        onOpenChange={setCreateClientOpen}
        onClientCreated={(client) => {
          refreshClients();
          setFormState(prev => ({ ...prev, clientId: client.id }));
        }}
      />
      <CreateProjectModal
        open={createProjectOpen}
        onOpenChange={(open) => {
          setCreateProjectOpen(open);
          if (!open) setProjectToEdit(null);
        }}
        clients={clients}
        preselectedClientId={formState.clientId}
        projectToEdit={projectToEdit}
        onProjectCreated={(project) => {
          refreshProjects();
          const isEdit = !!projectToEdit;
          const isCurrent = formState.projectId === project.id;
          if (!isEdit) {
            setFormState(prev => ({ ...prev, projectId: project.id }));
            populateItemsFromProject(project);
          } else if (isCurrent) {
            populateItemsFromProject(project);
          }
        }}
      />

      {/* Send Invoice Modal */}
      <SendInvoiceModal
        open={sendModalOpen}
        onOpenChange={setSendModalOpen}
        invoice={{
          number: formState.number || "Draft",
          total: invoiceTotals.total,
          subtotal: invoiceTotals.subtotal,
          tax: invoiceTotals.tax,
          dueDate: formState.dueDate ? new Date(formState.dueDate).toISOString() : undefined,
          items: formState.items.map(item => ({
            name: item.title,
            quantity: item.quantity || 1,
            rate: item.unitPrice || 0,
            amount: (item.quantity || 1) * (item.unitPrice || 0),
          })),
          currency: formState.currency || "INR",
        }}
        client={clients.find(c => c.id === formState.clientId)}
        project={projects.find(p => p.id === formState.projectId)}
        templateName={selectedTemplateName || "Classic Gray"}
        initialAutomationEnabled={!!(formState.remindersEnabled && formState.reminderSchedule?.steps?.length)}
        onSend={handleSendInvoiceFromModal}
      />

      {/* AI Review Panel */}
      <AIReviewPanel
        isOpen={aiReviewOpen}
        onClose={() => setAiReviewOpen(false)}
        reviewResult={aiReviewResult}
        isLoading={aiReviewLoading}
        onApplyFix={handleAIReviewApplyFix}
        onApplySuggestion={handleAIReviewApplySuggestion}
        onApplyAllFixes={handleAIReviewApplyAllFixes}
      />
    </div>
  );
}
