"use client";

import { useEffect, useMemo, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import {
  RefreshCw,
  Pause,
  Play,
  Plus,
  Clock3,
  AlertTriangle,
  CheckCircle2,
  Pencil,
  History,
  PlayCircle,
  FileText,
  Loader2,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";

type RecurringPlan = {
  id: string;
  name: string;
  status: "ACTIVE" | "PAUSED" | "ARCHIVED";
  sourceType: "FIXED_TEMPLATE" | "MILESTONES_READY" | "TIMESHEET_HOURS" | "MANUAL_REVIEW";
  intervalUnit: "DAYS" | "WEEKS" | "MONTHS";
  intervalValue: number;
  monthlyDay?: number | null;
  nextRunAt: string;
  lastRunAt?: string | null;
  lastSuccessAt?: string | null;
  lastError?: string | null;
  autoSend: boolean;
  approvalRequired: boolean;
  fallbackPolicy: "SKIP_AND_NOTIFY" | "CREATE_ZERO_DRAFT" | "USE_MINIMUM_FEE";
  dueDaysAfterIssue: number;
  minimumFee?: number | null;
  channel: string;
  currency: string;
  runCount: number;
  failureCount: number;
  snapshot?: Record<string, any> | null;
  client: { id: string; name: string; email?: string | null };
  project?: { id: string; name: string } | null;
  latestRun?: { status: string; message?: string | null; createdAt: string } | null;
};

type RecurringRun = {
  id: string;
  runKey: string;
  status: "PROCESSING" | "SUCCESS" | "SKIPPED" | "FAILED";
  message?: string | null;
  invoiceId?: string | null;
  createdAt: string;
};

type ClientOption = { id: string; name: string };
type ProjectOption = { id: string; name: string; clientId?: string | null };
type InvoiceTemplateOption = { slug: string; name: string; isPro?: boolean };

type Props = {
  compact?: boolean;
};

type InvoiceOption = {
  id: string;
  number: string;
  clientName?: string;
  total?: string;
  currency?: string;
};
type PlanFormState = {
  id?: string;
  name: string;
  clientId: string;
  projectId: string;
  sourceType: "FIXED_TEMPLATE" | "MILESTONES_READY" | "TIMESHEET_HOURS" | "MANUAL_REVIEW";
  intervalUnit: "DAYS" | "WEEKS" | "MONTHS";
  intervalValue: number;
  fallbackPolicy: "SKIP_AND_NOTIFY" | "CREATE_ZERO_DRAFT" | "USE_MINIMUM_FEE";
  autoSend: boolean;
  approvalRequired: boolean;
  dueDaysAfterIssue: number;
  minimumFee: number;
  currency: string;
  templateSlug: string;
  lineItemTitle: string;
  lineItemAmount: number;
  /** When user picks "Copy from invoice", we store full snapshot (items + templateSlug) here */
  snapshotFromInvoice?: {
    items: Array<{
      title: string;
      description?: string;
      quantity: number;
      unitPrice: number;
      taxRate?: number;
    }>;
    templateSlug?: string;
  } | null;
  copiedFromInvoiceId?: string | null;
  copiedFromInvoiceNumber?: string | null;
};

const SOURCE_LABELS: Record<RecurringPlan["sourceType"], string> = {
  FIXED_TEMPLATE: "Fixed template",
  MILESTONES_READY: "Milestones ready",
  TIMESHEET_HOURS: "Timesheet hours",
  MANUAL_REVIEW: "Manual review",
};

const INTERVAL_LABELS: Record<RecurringPlan["intervalUnit"], string> = {
  DAYS: "day",
  WEEKS: "week",
  MONTHS: "month",
};

function defaultFormState(): PlanFormState {
  return {
    name: "Monthly retainer",
    clientId: "",
    projectId: "",
    sourceType: "FIXED_TEMPLATE",
    intervalUnit: "MONTHS",
    intervalValue: 1,
    fallbackPolicy: "SKIP_AND_NOTIFY",
    autoSend: false,
    approvalRequired: true,
    dueDaysAfterIssue: 7,
    minimumFee: 0,
    currency: "INR",
    templateSlug: "classic-gray",
    lineItemTitle: "Retainer fee",
    lineItemAmount: 0,
    snapshotFromInvoice: null,
    copiedFromInvoiceId: null,
    copiedFromInvoiceNumber: null,
  };
}

function mapPlanToForm(plan: RecurringPlan): PlanFormState {
  const items = Array.isArray(plan.snapshot?.items) ? plan.snapshot.items : [];
  const firstItem = items[0];
  return {
    id: plan.id,
    name: plan.name,
    clientId: plan.client.id,
    projectId: plan.project?.id || "",
    sourceType: plan.sourceType,
    intervalUnit: plan.intervalUnit,
    intervalValue: plan.intervalValue,
    fallbackPolicy: plan.fallbackPolicy,
    autoSend: plan.autoSend,
    approvalRequired: plan.approvalRequired,
    dueDaysAfterIssue: plan.dueDaysAfterIssue,
    minimumFee: Number(plan.minimumFee || 0),
    currency: plan.currency,
    templateSlug:
      typeof plan.snapshot?.templateSlug === "string" && plan.snapshot.templateSlug.trim()
        ? plan.snapshot.templateSlug
        : "classic-gray",
    lineItemTitle: firstItem?.title || "Retainer fee",
    lineItemAmount: Number(firstItem?.unitPrice || 0),
    snapshotFromInvoice:
      items.length > 0 ? { items: items as any, templateSlug: plan.snapshot?.templateSlug } : null,
    copiedFromInvoiceId: null,
    copiedFromInvoiceNumber: null,
  };
}

export function RecurringPlansSection({ compact = false }: Props) {
  const [plans, setPlans] = useState<RecurringPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [invoiceTemplates, setInvoiceTemplates] = useState<InvoiceTemplateOption[]>([]);
  const [invoicesForTemplate, setInvoicesForTemplate] = useState<InvoiceOption[]>([]);
  const [loadingInvoiceDetails, setLoadingInvoiceDetails] = useState(false);
  const [confirmDeletePlanId, setConfirmDeletePlanId] = useState<string | null>(null);

  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<"create" | "edit">("create");
  const [formState, setFormState] = useState<PlanFormState>(defaultFormState());

  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyPlan, setHistoryPlan] = useState<RecurringPlan | null>(null);
  const [historyRuns, setHistoryRuns] = useState<RecurringRun[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const getRecurringErrorMessage = (payload: any, fallback: string) => {
    if (payload?.code === "WORKSPACE_NOT_READY" || payload?.error === "No workspace found") {
      return "Workspace is still loading. Please wait a moment and try again.";
    }
    if (payload?.error) return payload.error;
    return fallback;
  };

  const updateForm = (patch: Partial<PlanFormState>) =>
    setFormState((prev) => ({ ...prev, ...patch }));

  const fetchPlans = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/automation/recurring");
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const isWorkspaceBootstrapState = data?.error === "No workspace found";
        if (isWorkspaceBootstrapState) {
          setPlans([]);
          return;
        }
        throw new Error(data.error || "Failed to load recurring plans");
      }
      setPlans(data.plans || []);
    } catch (error) {
      console.error("Failed to fetch recurring plans:", error);
      toast.error(error instanceof Error ? error.message : "Failed to load recurring plans");
    } finally {
      setLoading(false);
    }
  };

  const fetchDependencies = async () => {
    try {
      const [clientsRes, projectsRes, templatesRes, invoicesRes] = await Promise.all([
        fetch("/api/clients/list"),
        fetch("/api/projects/list"),
        fetch("/api/templates"),
        fetch("/api/invoices/list?status=draft,sent,paid&limit=100"),
      ]);
      if (clientsRes.ok) {
        const data = await clientsRes.json();
        setClients(
          (data.clients || []).map((client: any) => ({ id: client.id, name: client.name }))
        );
      }
      if (projectsRes.ok) {
        const data = await projectsRes.json();
        setProjects(
          (data.projects || []).map((project: any) => ({
            id: project.id,
            name: project.name,
            clientId: project.clientId,
          }))
        );
      }
      if (templatesRes.ok) {
        const data = await templatesRes.json();
        setInvoiceTemplates(data.templates || []);
      }
      if (invoicesRes.ok) {
        const data = await invoicesRes.json();
        setInvoicesForTemplate(
          (data.invoices || []).map((inv: any) => ({
            id: inv.id,
            number: inv.number,
            clientName: inv.clientName,
            total: inv.total,
            currency: inv.currency,
          }))
        );
      }
    } catch (error) {
      console.error("Failed to fetch dependencies:", error);
    }
  };

  const copyFromInvoice = async (invoiceId: string) => {
    if (!invoiceId) {
      updateForm({
        snapshotFromInvoice: null,
        copiedFromInvoiceId: null,
        copiedFromInvoiceNumber: null,
      });
      return;
    }
    setLoadingInvoiceDetails(true);
    try {
      const res = await fetch(`/api/invoices/${invoiceId}`);
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.invoice) {
        toast.error("Could not load invoice details");
        return;
      }
      const inv = data.invoice;
      const items = (inv.items || []).map((item: any) => ({
        title: item.title || "",
        description: item.description || null,
        quantity: Number(item.quantity) || 1,
        unitPrice: Number(item.unitPrice) || 0,
        taxRate: Number(item.taxRate) || 0,
      }));
      if (items.length === 0) {
        toast.error("This invoice has no line items");
        return;
      }
      const templateSlug = inv.template?.slug || "classic-gray";
      updateForm({
        clientId: inv.clientId || inv.client?.id || "",
        currency: inv.currency || "INR",
        templateSlug,
        name: `Recurring: ${inv.number}${inv.client?.name ? ` – ${inv.client.name}` : ""}`,
        snapshotFromInvoice: { items, templateSlug },
        copiedFromInvoiceId: inv.id,
        copiedFromInvoiceNumber: inv.number,
        lineItemTitle: items[0]?.title || "Retainer fee",
        lineItemAmount: items[0]?.unitPrice ?? 0,
      });
      toast.success(`Copied ${items.length} line item(s) from ${inv.number}`);
    } catch (error) {
      console.error("Failed to copy from invoice:", error);
      toast.error("Failed to load invoice");
    } finally {
      setLoadingInvoiceDetails(false);
    }
  };

  useEffect(() => {
    fetchPlans();
    fetchDependencies();
  }, []);

  const filteredProjects = useMemo(() => {
    if (!formState.clientId) return projects;
    return projects.filter(
      (project) => !project.clientId || project.clientId === formState.clientId
    );
  }, [projects, formState.clientId]);

  const openCreate = () => {
    setFormMode("create");
    setFormState(defaultFormState());
    setFormOpen(true);
  };

  const openEdit = (plan: RecurringPlan) => {
    setFormMode("edit");
    setFormState(mapPlanToForm(plan));
    setFormOpen(true);
  };

  const openHistory = async (plan: RecurringPlan) => {
    setHistoryPlan(plan);
    setHistoryOpen(true);
    setHistoryLoading(true);
    try {
      const res = await fetch(`/api/automation/recurring/${plan.id}`);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(getRecurringErrorMessage(data, "Failed to load history"));
      setHistoryRuns(data.plan?.runs || []);
    } catch (error) {
      console.error("Failed to load recurring plan history:", error);
      toast.error(error instanceof Error ? error.message : "Failed to load run history");
      setHistoryRuns([]);
    } finally {
      setHistoryLoading(false);
    }
  };

  const togglePlan = async (plan: RecurringPlan) => {
    try {
      const nextStatus = plan.status === "ACTIVE" ? "PAUSED" : "ACTIVE";
      const res = await fetch(`/api/automation/recurring/${plan.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(getRecurringErrorMessage(data, "Failed to update plan"));
      await fetchPlans();
      toast.success(nextStatus === "ACTIVE" ? "Plan resumed" : "Plan paused");
    } catch (error) {
      console.error("Failed to toggle recurring plan:", error);
      toast.error("Failed to update plan");
    }
  };

  const runPlanNow = async (plan: RecurringPlan) => {
    try {
      const res = await fetch(`/api/automation/recurring/${plan.id}/run`, { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Failed to run plan");
      await fetchPlans();
      toast.success(
        data?.result?.status === "SENT" ? "Plan run complete: invoice sent" : "Plan run complete"
      );
      if (historyOpen && historyPlan?.id === plan.id) {
        await openHistory(plan);
      }
    } catch (error: any) {
      console.error("Failed to run plan now:", error);
      toast.error(error.message || "Failed to run plan");
    }
  };

  const deletePlan = async (plan: RecurringPlan) => {
    if (confirmDeletePlanId !== plan.id) {
      setConfirmDeletePlanId(plan.id);
      return;
    }
    setConfirmDeletePlanId(null);
    try {
      const res = await fetch(`/api/automation/recurring/${plan.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "ARCHIVED" }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(getRecurringErrorMessage(data, "Failed to delete plan"));
      await fetchPlans();
      toast.success("Recurring plan deleted");
      if (historyOpen && historyPlan?.id === plan.id) {
        setHistoryOpen(false);
      }
    } catch (error) {
      console.error("Failed to delete recurring plan:", error);
      toast.error("Failed to delete plan");
    }
  };

  const submitForm = async () => {
    if (!formState.clientId) {
      toast.error("Select a client");
      return;
    }
    if (formState.sourceType === "MILESTONES_READY" && !formState.projectId) {
      toast.error("Select a project for milestone billing");
      return;
    }
    const hasItemsFromInvoice =
      Array.isArray(formState.snapshotFromInvoice?.items) &&
      formState.snapshotFromInvoice.items.length > 0;
    if (
      formState.sourceType === "FIXED_TEMPLATE" &&
      !hasItemsFromInvoice &&
      (!formState.lineItemTitle.trim() || formState.lineItemAmount <= 0)
    ) {
      toast.error("Enter a valid fixed amount or select an existing invoice");
      return;
    }
    if (formState.fallbackPolicy === "USE_MINIMUM_FEE" && formState.minimumFee <= 0) {
      toast.error("Minimum fee must be greater than 0 for this fallback");
      return;
    }

    setSaving(true);
    try {
      const payload: Record<string, any> = {
        name: formState.name,
        clientId: formState.clientId,
        projectId: formState.projectId || undefined,
        sourceType: formState.sourceType,
        intervalUnit: formState.intervalUnit,
        intervalValue: formState.intervalValue,
        fallbackPolicy: formState.fallbackPolicy,
        autoSend: formState.autoSend,
        approvalRequired: formState.approvalRequired,
        dueDaysAfterIssue: formState.dueDaysAfterIssue,
        minimumFee: formState.minimumFee || undefined,
        currency: formState.currency,
        templateSlug: formState.templateSlug || undefined,
        channel: "email",
      };

      if (formState.sourceType === "FIXED_TEMPLATE") {
        if (formState.snapshotFromInvoice?.items?.length) {
          payload.snapshot = {
            items: formState.snapshotFromInvoice.items.map((item) => ({
              title: item.title,
              description: item.description ?? undefined,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              taxRate: item.taxRate ?? 0,
            })),
            templateSlug: formState.snapshotFromInvoice.templateSlug || formState.templateSlug,
          };
        } else {
          payload.snapshot = {
            items: [
              {
                title: formState.lineItemTitle.trim(),
                quantity: 1,
                unitPrice: Number(formState.lineItemAmount),
                taxRate: 0,
              },
            ],
          };
        }
      }

      const url =
        formMode === "edit" && formState.id
          ? `/api/automation/recurring/${formState.id}`
          : "/api/automation/recurring";
      const method = formMode === "edit" ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(getRecurringErrorMessage(data, "Failed to save plan"));

      toast.success(formMode === "edit" ? "Recurring plan updated" : "Recurring plan created");
      setFormOpen(false);
      await fetchPlans();
    } catch (error: any) {
      console.error("Failed to save recurring plan:", error);
      toast.error(error.message || "Failed to save plan");
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="rounded-2xl border border-border/60 bg-white p-4 sm:p-6 space-y-4 min-w-0 overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-base font-semibold text-foreground">Recurring Invoice Plans</h3>
          <p className="text-xs text-muted-foreground">
            Interval billing that does not depend only on manual milestone updates.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={fetchPlans}>
            <RefreshCw className="h-4 w-4 mr-1" />
            Refresh
          </Button>
          <Button size="sm" onClick={openCreate}>
            <Plus className="h-4 w-4 mr-1" />
            New plan
          </Button>
        </div>
      </div>

      {formOpen && (
        <div className="rounded-xl border border-border/50 bg-slate-50/60 p-4 space-y-3">
          {formState.sourceType === "FIXED_TEMPLATE" && (
            <div className="rounded-lg border border-border/40 bg-white p-3 space-y-2">
              <p className="text-xs font-medium text-foreground flex items-center gap-1.5">
                <FileText className="h-3.5 w-3.5" />
                Use an existing invoice (recommended)
              </p>
              <p className="text-xs text-muted-foreground">
                Select an invoice to copy client, line items, and amount. You only set how often to
                repeat it.
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <select
                  className="rounded-lg border border-border/60 bg-white px-3 py-2 text-sm min-w-[200px]"
                  value={formState.copiedFromInvoiceId ?? ""}
                  onChange={(e) => copyFromInvoice(e.target.value)}
                  disabled={loadingInvoiceDetails}
                >
                  <option value="">Select an invoice to copy from...</option>
                  {invoicesForTemplate.map((inv) => (
                    <option key={inv.id} value={inv.id}>
                      {inv.number} – {inv.clientName || "No client"}{" "}
                      {inv.total != null ? `(${inv.currency || "INR"} ${inv.total})` : ""}
                    </option>
                  ))}
                </select>
                {loadingInvoiceDetails && (
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                )}
                {formState.copiedFromInvoiceNumber &&
                  formState.snapshotFromInvoice?.items?.length && (
                    <span className="text-xs text-muted-foreground">
                      Using {formState.snapshotFromInvoice.items.length} line item(s) from{" "}
                      {formState.copiedFromInvoiceNumber}
                      <button
                        type="button"
                        className="ml-2 text-primary hover:underline"
                        onClick={() =>
                          updateForm({
                            snapshotFromInvoice: null,
                            copiedFromInvoiceId: null,
                            copiedFromInvoiceNumber: null,
                          })
                        }
                      >
                        Clear
                      </button>
                    </span>
                  )}
              </div>
            </div>
          )}
          <div className={cn("grid gap-3", compact ? "grid-cols-1" : "sm:grid-cols-2")}>
            <label className="text-xs text-muted-foreground">
              Plan name
              <input
                className="mt-1 w-full rounded-lg border border-border/60 bg-white px-3 py-2 text-sm"
                value={formState.name}
                onChange={(e) => updateForm({ name: e.target.value })}
              />
            </label>
            <label className="text-xs text-muted-foreground">
              Client
              <select
                className="mt-1 w-full rounded-lg border border-border/60 bg-white px-3 py-2 text-sm"
                value={formState.clientId}
                onChange={(e) => updateForm({ clientId: e.target.value })}
              >
                <option value="">Select client</option>
                {clients.map((client) => (
                  <option key={client.id} value={client.id}>
                    {client.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-xs text-muted-foreground">
              Source
              <select
                className="mt-1 w-full rounded-lg border border-border/60 bg-white px-3 py-2 text-sm"
                value={formState.sourceType}
                onChange={(e) =>
                  updateForm({
                    sourceType: e.target.value as PlanFormState["sourceType"],
                  })
                }
              >
                <option value="FIXED_TEMPLATE">Fixed template</option>
                <option value="MILESTONES_READY">Milestones ready</option>
                <option value="MANUAL_REVIEW">Manual review</option>
                <option value="TIMESHEET_HOURS">Timesheet hours</option>
              </select>
            </label>
            <label className="text-xs text-muted-foreground">
              Invoice template
              <select
                className="mt-1 w-full rounded-lg border border-border/60 bg-white px-3 py-2 text-sm"
                value={formState.templateSlug}
                onChange={(e) => updateForm({ templateSlug: e.target.value })}
              >
                <option value="classic-gray">Classic Gray</option>
                {invoiceTemplates.map((template) => (
                  <option key={template.slug} value={template.slug}>
                    {template.name}
                    {template.isPro ? " (Pro)" : ""}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-xs text-muted-foreground">
              Project (optional)
              <select
                className="mt-1 w-full rounded-lg border border-border/60 bg-white px-3 py-2 text-sm"
                value={formState.projectId}
                onChange={(e) => updateForm({ projectId: e.target.value })}
              >
                <option value="">No project</option>
                {filteredProjects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-xs text-muted-foreground">
              Every
              <div className="mt-1 flex items-center gap-2">
                <input
                  className="w-20 rounded-lg border border-border/60 bg-white px-3 py-2 text-sm"
                  type="number"
                  min={1}
                  max={90}
                  value={formState.intervalValue}
                  onChange={(e) => updateForm({ intervalValue: Number(e.target.value || 1) })}
                />
                <select
                  className="flex-1 rounded-lg border border-border/60 bg-white px-3 py-2 text-sm"
                  value={formState.intervalUnit}
                  onChange={(e) =>
                    updateForm({ intervalUnit: e.target.value as PlanFormState["intervalUnit"] })
                  }
                >
                  <option value="DAYS">Days</option>
                  <option value="WEEKS">Weeks</option>
                  <option value="MONTHS">Months</option>
                </select>
              </div>
            </label>
            <label className="text-xs text-muted-foreground">
              Fallback
              <select
                className="mt-1 w-full rounded-lg border border-border/60 bg-white px-3 py-2 text-sm"
                value={formState.fallbackPolicy}
                onChange={(e) =>
                  updateForm({
                    fallbackPolicy: e.target.value as PlanFormState["fallbackPolicy"],
                  })
                }
              >
                <option value="SKIP_AND_NOTIFY">Skip and notify</option>
                <option value="CREATE_ZERO_DRAFT">Create zero-value draft</option>
                <option value="USE_MINIMUM_FEE">Use minimum fee</option>
              </select>
            </label>
            <label className="text-xs text-muted-foreground">
              Due in (days)
              <input
                className="mt-1 w-full rounded-lg border border-border/60 bg-white px-3 py-2 text-sm"
                type="number"
                min={0}
                max={120}
                value={formState.dueDaysAfterIssue}
                onChange={(e) => updateForm({ dueDaysAfterIssue: Number(e.target.value || 7) })}
              />
            </label>
            <label className="text-xs text-muted-foreground">
              Minimum fee
              <input
                className="mt-1 w-full rounded-lg border border-border/60 bg-white px-3 py-2 text-sm"
                type="number"
                min={0}
                value={formState.minimumFee}
                onChange={(e) => updateForm({ minimumFee: Number(e.target.value || 0) })}
              />
            </label>
            <label className="text-xs text-muted-foreground">
              Currency
              <input
                className="mt-1 w-full rounded-lg border border-border/60 bg-white px-3 py-2 text-sm uppercase"
                value={formState.currency}
                maxLength={3}
                onChange={(e) => updateForm({ currency: e.target.value.toUpperCase() })}
              />
            </label>
          </div>

          {formState.sourceType === "FIXED_TEMPLATE" &&
            !formState.snapshotFromInvoice?.items?.length && (
              <div className={cn("grid gap-3", compact ? "grid-cols-1" : "sm:grid-cols-2")}>
                <label className="text-xs text-muted-foreground">
                  Line item title
                  <input
                    className="mt-1 w-full rounded-lg border border-border/60 bg-white px-3 py-2 text-sm"
                    value={formState.lineItemTitle}
                    onChange={(e) => updateForm({ lineItemTitle: e.target.value })}
                  />
                </label>
                <label className="text-xs text-muted-foreground">
                  Amount
                  <input
                    className="mt-1 w-full rounded-lg border border-border/60 bg-white px-3 py-2 text-sm"
                    type="number"
                    min={0}
                    value={formState.lineItemAmount}
                    onChange={(e) => updateForm({ lineItemAmount: Number(e.target.value || 0) })}
                  />
                </label>
              </div>
            )}

          <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
            <label className="inline-flex items-center gap-2">
              <input
                type="checkbox"
                checked={formState.autoSend}
                onChange={(e) => updateForm({ autoSend: e.target.checked })}
              />
              Auto-send invoices
            </label>
            <label className="inline-flex items-center gap-2">
              <input
                type="checkbox"
                checked={formState.approvalRequired}
                onChange={(e) => updateForm({ approvalRequired: e.target.checked })}
              />
              Require approval
            </label>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => setFormOpen(false)}>
              Cancel
            </Button>
            <Button size="sm" onClick={submitForm} disabled={saving}>
              {saving
                ? "Saving..."
                : formMode === "edit"
                  ? "Save changes"
                  : "Create recurring plan"}
            </Button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="text-sm text-muted-foreground py-6">Loading recurring plans...</div>
      ) : plans.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border/60 py-8 text-center text-sm text-muted-foreground">
          No recurring plans yet. Create one to run interval-based invoicing.
        </div>
      ) : (
        <div className="space-y-3">
          {plans.map((plan) => (
            <div key={plan.id} className="rounded-xl border border-border/50 bg-white p-3 sm:p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-foreground">{plan.name}</p>
                    <Badge variant={plan.status === "ACTIVE" ? "default" : "secondary"}>
                      {plan.status}
                    </Badge>
                    {plan.latestRun?.status === "FAILED" && (
                      <Badge variant="destructive">Run failed</Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {SOURCE_LABELS[plan.sourceType]} • Every {plan.intervalValue}{" "}
                    {INTERVAL_LABELS[plan.intervalUnit]}
                    {plan.intervalValue > 1 ? "s" : ""} • Client: {plan.client.name}
                    {plan.project?.name ? ` • Project: ${plan.project.name}` : ""}
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => runPlanNow(plan)}
                    disabled={plan.status !== "ACTIVE"}
                    title={plan.status !== "ACTIVE" ? "Plan must be active to run now" : undefined}
                  >
                    <PlayCircle className="h-4 w-4 mr-1" />
                    Run now
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => openEdit(plan)}>
                    <Pencil className="h-4 w-4 mr-1" />
                    Edit
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => openHistory(plan)}>
                    <History className="h-4 w-4 mr-1" />
                    History
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => togglePlan(plan)}>
                    {plan.status === "ACTIVE" ? (
                      <>
                        <Pause className="h-4 w-4 mr-1" />
                        Pause
                      </>
                    ) : (
                      <>
                        <Play className="h-4 w-4 mr-1" />
                        Resume
                      </>
                    )}
                  </Button>
                  <Button
                    size="sm"
                    variant={confirmDeletePlanId === plan.id ? "destructive" : "outline"}
                    onClick={() => deletePlan(plan)}
                    className={cn(
                      confirmDeletePlanId !== plan.id &&
                        "text-destructive hover:text-destructive hover:border-destructive/50"
                    )}
                    title={
                      confirmDeletePlanId === plan.id
                        ? "Click again to confirm deletion"
                        : "Delete recurring plan"
                    }
                  >
                    <Trash2 className="h-4 w-4 mr-1" />
                    {confirmDeletePlanId === plan.id ? "Confirm Delete?" : "Delete"}
                  </Button>
                </div>
              </div>

              <div className="mt-3 grid grid-cols-1 gap-2 text-xs sm:grid-cols-3">
                <div className="rounded-lg bg-slate-50 px-3 py-2">
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <Clock3 className="h-3.5 w-3.5" />
                    Next run
                  </div>
                  <p className="mt-1 font-medium text-foreground">
                    {formatDistanceToNow(new Date(plan.nextRunAt), { addSuffix: true })}
                  </p>
                </div>
                <div className="rounded-lg bg-slate-50 px-3 py-2">
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Health
                  </div>
                  <p className="mt-1 font-medium text-foreground">
                    {plan.failureCount === 0
                      ? "Healthy"
                      : `${plan.failureCount} failure${plan.failureCount === 1 ? "" : "s"}`}
                  </p>
                </div>
                <div className="rounded-lg bg-slate-50 px-3 py-2">
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <AlertTriangle className="h-3.5 w-3.5" />
                    Last result
                  </div>
                  <p className="mt-1 font-medium text-foreground">
                    {plan.latestRun?.message || plan.lastError || "No runs yet"}
                  </p>
                </div>
              </div>

              {plan.lastError && (
                <p className="mt-2 text-xs text-rose-600">Last error: {plan.lastError}</p>
              )}
            </div>
          ))}
        </div>
      )}

      <Sheet open={historyOpen} onOpenChange={setHistoryOpen}>
        <SheetContent className="w-full sm:max-w-[560px] overflow-y-auto">
          <SheetHeader className="space-y-2">
            <SheetTitle>Run history {historyPlan ? `· ${historyPlan.name}` : ""}</SheetTitle>
          </SheetHeader>

          <div className="mt-4 space-y-3">
            {historyLoading ? (
              <p className="text-sm text-muted-foreground">Loading run history...</p>
            ) : historyRuns.length === 0 ? (
              <p className="text-sm text-muted-foreground">No runs available for this plan yet.</p>
            ) : (
              historyRuns.map((run) => (
                <div key={run.id} className="rounded-lg border border-border/50 bg-slate-50/40 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <Badge
                      variant={
                        run.status === "SUCCESS"
                          ? "default"
                          : run.status === "FAILED"
                            ? "destructive"
                            : "secondary"
                      }
                    >
                      {run.status}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(run.createdAt), { addSuffix: true })}
                    </span>
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">
                    {run.message || "No message"}
                  </p>
                  {run.invoiceId && (
                    <a
                      className="mt-2 inline-block text-xs text-primary hover:underline"
                      href={`/invoices/new?id=${run.invoiceId}`}
                    >
                      Open invoice
                    </a>
                  )}
                </div>
              ))
            )}
          </div>
        </SheetContent>
      </Sheet>
    </section>
  );
}
