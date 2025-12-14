"use client";

import { useState, useEffect, useCallback } from "react";
import {
  ChevronLeft,
  ChevronRight,
  GripVertical,
  GripHorizontal,
  Plus,
  Eye,
  EyeOff,
  User,
  FileText,
  FileEdit,
  ShoppingCart,
  Receipt,
  CreditCard,
  Palette,
  Bell,
  Paperclip,
  Settings,
  Blocks,
  Mail,
  Sparkles,
  Check,
} from "lucide-react";
import { toast } from "sonner";
import { InvoiceFormState, InvoiceItemInput } from "../invoice-form";
import { cn } from "@/lib/utils";
import { ClientSection, ItemsSection, TaxSection, inferClientRegion } from "./panels";
import { BrandingTab } from "./panels/BrandingTab";
import { SettingsTab } from "./panels/SettingsTab";
import { NotesTab } from "./panels/NotesTab";
import { RemindersTab } from "./panels/RemindersTab";
import {
  useSmartDefaults,
  useBillableItems,
  useRecentBranding,
  useSectionsDragDrop,
  useSectionsManager,
} from "./hooks";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { InvoiceSection } from "./types";
import { SmartDefaultsBanner, DueDateRecommendation, Recommendation } from "./SmartDefaultsBanner";
import type { SmartDefaultsResponse } from "@/app/api/smart-defaults/route";

type PropertiesPanelProps = {
  formState: InvoiceFormState;
  onFormStateChange: (state: InvoiceFormState) => void;
  clients: {
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
  }[];
  projects: {
    id: string;
    name: string;
    description?: string | null;
    clientId?: string | null;
    billableItems?: Array<{ title: string; quantity: number; unitPrice: number }> | null;
  }[];
  sections: InvoiceSection[];
  onSectionsChange: (sections: InvoiceSection[]) => void;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
  onWidthChange?: (width: number) => void;
  onClientUpdate?: (clientId: string, data: Partial<{ email: string; phone: string; addressLine1: string; addressLine2: string; city: string; state: string; postalCode: string; country: string }>) => Promise<void>;
  onCreateClient?: () => void;
  onCreateProject?: () => void;
  onProjectSelect?: (project: { id: string; name: string; billableItems?: Array<{ title: string; quantity: number; unitPrice: number }> | null }) => void;
  onEditProject?: (project: any) => void;
};

type AccordionSectionProps = {
  title: string;
  children: React.ReactNode;
};

function SectionCard({ title, children }: AccordionSectionProps) {
  return (
    <div className="rounded-xl border border-border/60 bg-white p-3 shadow-sm">
      <div className="mb-2 flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">{title}</p>
      </div>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

const inputBase =
  "mt-2 w-full rounded-lg border border-border/60 bg-white px-3 py-2 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:border-primary/40 focus:ring-2 focus:ring-primary/20";

export function PropertiesPanel({
  formState,
  onFormStateChange,
  clients,
  projects,
  sections,
  onSectionsChange,
  collapsed,
  onToggleCollapse,
  onWidthChange,
  onClientUpdate,
  onCreateClient,
  onCreateProject,
  onProjectSelect,
  onEditProject,
}: PropertiesPanelProps) {
  // Local UI state
  const [activeTab, setActiveTab] = useState("client-invoice");
  const [tabsCollapsed, setTabsCollapsed] = useState(false);
  const [contentCollapsed, setContentCollapsed] = useState(false);

  // Use modular hooks
  const {
    smartDefaults,
    dismissed: smartDefaultsDismissed,
    setDismissed: setSmartDefaultsDismissed,
    appliedDueDate,
    getClientRecommendations,
    applyRecommendation,
    applyAllRecommendations,
    applyDueDate,
    setAppliedDueDate,
  } = useSmartDefaults(formState, onFormStateChange);

  const {
    billableItems,
    dismissed: billableItemsDismissed,
    setDismissed: setBillableItemsDismissed,
    isItemAdded,
    applyBillableItem,
    applyNextMilestone,
    applyAllBillableItems,
  } = useBillableItems(formState, onFormStateChange, smartDefaults);

  const { recentBranding, saveRecent } = useRecentBranding(formState);

  const {
    toggleSectionVisibility,
    renameSection,
    moveSection,
    addCustomSection,
    updateCustomContent,
    updateCustomItems,
  } = useSectionsManager(sections, onSectionsChange);

  const {
    draggedSectionId,
    dragOverIndex,
    handleDragStart,
    handleDragEnd,
    handleDragOver,
    handleDrop,
    handleDragLeave,
  } = useSectionsDragDrop(sections, onSectionsChange);


  // Memoized field update handlers for stable references
  const updateField = useCallback(<K extends keyof InvoiceFormState>(field: K, value: InvoiceFormState[K]) => {
    onFormStateChange({ ...formState, [field]: value });
  }, [formState, onFormStateChange]);

  const updateItem = useCallback((index: number, field: keyof InvoiceItemInput, value: any) => {
    const newItems = [...formState.items];
    newItems[index] = { ...newItems[index], [field]: value };
    onFormStateChange({ ...formState, items: newItems });
  }, [formState, onFormStateChange]);

  const addItem = useCallback(() => {
    onFormStateChange({
      ...formState,
      items: [...formState.items, { title: "", quantity: 1, unitPrice: 0, taxRate: 0 }]
    });
  }, [formState, onFormStateChange]);

  const removeItem = useCallback((index: number) => {
    onFormStateChange({
      ...formState,
      items: formState.items.filter((_, i) => i !== index)
    });
  }, [formState, onFormStateChange]);

  // Calculate width based on collapse states
  const getPanelWidth = () => {
    if (collapsed) return 48; // Main panel collapsed
    if (tabsCollapsed && contentCollapsed) return 97; // Both collapsed (48px + 1px border + 48px)
    if (tabsCollapsed) return 600; // Tabs collapsed, content expanded (increased from 520px)
    if (contentCollapsed) return 273; // Tabs expanded (224px) + border (1px) + content collapsed (48px)
    return 600; // Both expanded (increased from 520px to give more space to content area)
  };

  // Notify parent of width changes
  useEffect(() => {
    if (onWidthChange) {
      const width = getPanelWidth();
      onWidthChange(width);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [collapsed, tabsCollapsed, contentCollapsed]);

  const getPanelBg = () => {
    if (collapsed) return 'bg-white';
    if (tabsCollapsed && contentCollapsed) return 'bg-transparent';
    return 'bg-white';
  };

  return (
    <div
      className={cn(
        "relative flex flex-col border-r border-border/60 transition-all duration-300 h-full",
        getPanelBg()
      )}
      style={{ width: `${getPanelWidth()}px` }}
    >
      {collapsed && onToggleCollapse ? (
        <div className="flex flex-col items-center py-4 bg-white">
          <button
            onClick={onToggleCollapse}
            className="rounded-lg p-2 text-muted-foreground transition hover:bg-muted/50"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
      ) : (
        <>
          {!(tabsCollapsed && contentCollapsed) && (
            <div
              className={cn(
                "flex-shrink-0 flex items-center justify-between border-b border-border/60 bg-white py-3 transition-all duration-300",
                tabsCollapsed ? "px-2" : "px-4"
              )}
              style={{
                width: tabsCollapsed
                  ? '600px' // tabs collapsed (48px) + border (1px) + content expanded (flex-1 fills remaining)
                  : contentCollapsed
                    ? '273px' // tabs expanded (224px) + border (1px) + content collapsed (48px)
                    : '600px' // both expanded (increased from 520px to give more space to content area)
              }}
            >
              <div className="transition-all duration-300 overflow-hidden opacity-100 flex-1">
                <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground whitespace-nowrap">Properties</p>
                <p className="text-xs text-muted-foreground whitespace-nowrap">
                  {formState.number || "Draft"} · {formState.clientId ? "Client selected" : "No client"}
                </p>
              </div>
              {onToggleCollapse && (
                <button
                  onClick={onToggleCollapse}
                  className="rounded-lg p-1 text-muted-foreground transition hover:bg-muted/50 flex-shrink-0 bg-white"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
              )}
            </div>
          )}

          <Tabs orientation="vertical" value={activeTab} onValueChange={setActiveTab} className="flex flex-1 min-h-0">
            {/* First Sidebar: Tab List */}
            <div className={cn(
              "flex flex-col flex-shrink-0 border-r border-border/60 transition-all duration-300 relative",
              tabsCollapsed ? "w-12 bg-transparent" : "w-56 bg-white"
            )}>
              {!tabsCollapsed ? (
                <ScrollArea className="flex-1">
                  <TabsList className="flex flex-col items-start gap-1 rounded-none bg-transparent p-3 h-auto">
                    <TabsTrigger value="client-invoice" className="w-full justify-start gap-2 text-xs">
                      <User className="h-4 w-4 flex-shrink-0" />
                      <span className="truncate">Client & Invoice</span>
                    </TabsTrigger>
                    <TabsTrigger value="sections" className="w-full justify-start gap-2 text-xs">
                      <Blocks className="h-4 w-4 flex-shrink-0" />
                      <span className="truncate">Sections</span>
                    </TabsTrigger>
                    <TabsTrigger value="items" className="w-full justify-start gap-2 text-xs">
                      <ShoppingCart className="h-4 w-4 flex-shrink-0" />
                      <span className="truncate">Items & Pricing</span>
                    </TabsTrigger>

                    {/* Separator */}
                    <div className="w-full my-2 border-t border-border/40" />

                    <TabsTrigger value="taxes" className="w-full justify-start gap-2 text-xs">
                      <Receipt className="h-4 w-4 flex-shrink-0" />
                      <span className="truncate">Taxes & Discounts</span>
                    </TabsTrigger>
                    <TabsTrigger value="payment" className="w-full justify-start gap-2 text-xs">
                      <CreditCard className="h-4 w-4 flex-shrink-0" />
                      <span className="truncate">Payment & Schedule</span>
                    </TabsTrigger>
                    <TabsTrigger value="reminders" className="w-full justify-start gap-2 text-xs">
                      <Bell className="h-4 w-4 flex-shrink-0" />
                      <span className="truncate">Reminders</span>
                    </TabsTrigger>

                    {/* Separator */}
                    <div className="w-full my-2 border-t border-border/40" />

                    <TabsTrigger value="attachments" className="w-full justify-start gap-2 text-xs">
                      <Paperclip className="h-4 w-4 flex-shrink-0" />
                      <span className="truncate">Attachments</span>
                    </TabsTrigger>
                    <TabsTrigger value="notes" className="w-full justify-start gap-2 text-xs">
                      <FileEdit className="h-4 w-4 flex-shrink-0" />
                      <span className="truncate">Notes & Terms</span>
                    </TabsTrigger>

                    {/* Separator */}
                    <div className="w-full my-2 border-t border-border/40" />

                    <TabsTrigger value="branding" className="w-full justify-start gap-2 text-xs">
                      <Palette className="h-4 w-4 flex-shrink-0" />
                      <span className="truncate">Branding</span>
                    </TabsTrigger>
                    <TabsTrigger value="settings" className="w-full justify-start gap-2 text-xs">
                      <Settings className="h-4 w-4 flex-shrink-0" />
                      <span className="truncate">Advanced</span>
                    </TabsTrigger>
                  </TabsList>
                </ScrollArea>
              ) : (
                <div className="flex flex-col items-center gap-1 py-4 bg-muted/20 h-full">
                  <button
                    onClick={() => setTabsCollapsed(false)}
                    className="rounded-lg p-2 text-muted-foreground transition hover:bg-white hover:shadow-sm mb-2"
                    title="Expand menu"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                  {/* Mini icon tabs when collapsed - clicking expands the sidebar */}
                  <div className="flex flex-col gap-1">
                    <button
                      onClick={() => { setActiveTab("client-invoice"); setTabsCollapsed(false); }}
                      className="p-2 rounded-lg hover:bg-white text-muted-foreground hover:text-primary transition"
                      title="Client & Invoice"
                    >
                      <User className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => { setActiveTab("sections"); setTabsCollapsed(false); }}
                      className="p-2 rounded-lg hover:bg-white text-muted-foreground hover:text-primary transition"
                      title="Sections"
                    >
                      <Blocks className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => { setActiveTab("items"); setTabsCollapsed(false); }}
                      className="p-2 rounded-lg hover:bg-white text-muted-foreground hover:text-primary transition"
                      title="Items & Pricing"
                    >
                      <ShoppingCart className="h-4 w-4" />
                    </button>
                    <div className="w-6 my-1 border-t border-border/40 mx-auto" />
                    <button
                      onClick={() => { setActiveTab("taxes"); setTabsCollapsed(false); }}
                      className="p-2 rounded-lg hover:bg-white text-muted-foreground hover:text-primary transition"
                      title="Taxes & Discounts"
                    >
                      <Receipt className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => { setActiveTab("payment"); setTabsCollapsed(false); }}
                      className="p-2 rounded-lg hover:bg-white text-muted-foreground hover:text-primary transition"
                      title="Payment & Schedule"
                    >
                      <CreditCard className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => { setActiveTab("reminders"); setTabsCollapsed(false); }}
                      className="p-2 rounded-lg hover:bg-white text-muted-foreground hover:text-primary transition"
                      title="Reminders"
                    >
                      <Bell className="h-4 w-4" />
                    </button>
                    <div className="w-6 my-1 border-t border-border/40 mx-auto" />
                    <button
                      onClick={() => { setActiveTab("attachments"); setTabsCollapsed(false); }}
                      className="p-2 rounded-lg hover:bg-white text-muted-foreground hover:text-primary transition"
                      title="Attachments"
                    >
                      <Paperclip className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => { setActiveTab("notes"); setTabsCollapsed(false); }}
                      className="p-2 rounded-lg hover:bg-white text-muted-foreground hover:text-primary transition"
                      title="Notes & Terms"
                    >
                      <FileEdit className="h-4 w-4" />
                    </button>
                    <div className="w-6 my-1 border-t border-border/40 mx-auto" />
                    <button
                      onClick={() => { setActiveTab("branding"); setTabsCollapsed(false); }}
                      className="p-2 rounded-lg hover:bg-white text-muted-foreground hover:text-primary transition"
                      title="Branding"
                    >
                      <Palette className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => { setActiveTab("settings"); setTabsCollapsed(false); }}
                      className="p-2 rounded-lg hover:bg-white text-muted-foreground hover:text-primary transition"
                      title="Advanced Settings"
                    >
                      <Settings className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              )}
              {/* Collapse button for tabs sidebar - Floating pill style */}
              {!tabsCollapsed && (
                <button
                  onClick={() => setTabsCollapsed(true)}
                  className="absolute top-3 -right-3 z-10 flex items-center gap-1 rounded-full border border-border/60 bg-white px-1.5 py-1 shadow-sm hover:bg-muted/50 hover:shadow transition group"
                  title="Collapse menu"
                >
                  <ChevronLeft className="h-3 w-3 text-muted-foreground group-hover:text-primary transition" />
                </button>
              )}
            </div>

            {/* Second Sidebar: Content Area */}
            {!contentCollapsed ? (
              <div className="flex flex-col flex-1 min-h-0 overflow-hidden transition-all duration-300 relative border-l border-border/60 bg-white">
                {/* Collapse button for content area - right edge style */}
                <button
                  onClick={() => setContentCollapsed(true)}
                  className="absolute top-3 -right-3 z-10 flex items-center gap-1 rounded-full border border-border/60 bg-white px-1.5 py-1 shadow-sm hover:bg-muted/50 hover:shadow transition group"
                  title="Collapse panel"
                >
                  <ChevronRight className="h-3 w-3 text-muted-foreground group-hover:text-primary transition" />
                </button>
                <ScrollArea className="h-full px-4 py-4 bg-white w-full">
                  {/* Tab: Client & Invoice */}
                  <TabsContent value="client-invoice" className="space-y-4 mt-0">
                    <ClientSection
                      formState={formState}
                      onFormStateChange={onFormStateChange}
                      clients={clients}
                      projects={projects}
                      onClientUpdate={onClientUpdate}
                      onCreateClient={onCreateClient}
                      onCreateProject={onCreateProject}
                      onProjectSelect={onProjectSelect}
                      onEditProject={onEditProject}
                    />

                    {/* Smart Defaults Banner - Client Recommendations */}
                    {formState.clientId && !smartDefaultsDismissed && getClientRecommendations().length > 0 && (
                      <SmartDefaultsBanner
                        type="client"
                        recommendations={getClientRecommendations()}
                        onApply={applyRecommendation}
                        onApplyAll={applyAllRecommendations}
                        onDismiss={() => setSmartDefaultsDismissed(true)}
                        className="mb-4"
                      />
                    )}

                    {/* AI Due Date Recommendation */}
                    {formState.clientId && smartDefaults?.client?.safeDueDate && !appliedDueDate && (
                      <DueDateRecommendation
                        date={smartDefaults.client.safeDueDate.date}
                        explanation={smartDefaults.client.safeDueDate.explanation}
                        onApply={applyDueDate}
                      />
                    )}

                    {/* Project Quick Apply - Billable Items & Next Milestone */}
                    {formState.projectId && !billableItemsDismissed && (billableItems.items.length > 0 || billableItems.nextMilestone) && (
                      <div className="rounded-lg border bg-purple-50 border-purple-200 p-3 mb-4 overflow-hidden">
                        <div className="flex items-start justify-between gap-2 mb-3">
                          <div className="flex items-center gap-2">
                            <div className="p-1 rounded text-purple-600">
                              <Sparkles className="h-4 w-4" />
                            </div>
                            <div>
                              <p className="text-sm font-medium text-slate-800">Quick Apply from Project</p>
                              <p className="text-xs text-slate-500">Pre-configured items & milestones</p>
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0 text-slate-400 hover:text-slate-600"
                            onClick={() => setBillableItemsDismissed(true)}
                          >
                            ×
                          </Button>
                        </div>

                        {/* Next Milestone */}
                        {billableItems.nextMilestone && (
                          <div className="flex items-center justify-between gap-2 bg-white/60 rounded-md px-2.5 py-2 mb-2 border border-purple-100 overflow-hidden">
                            <div className="flex-1 min-w-0 overflow-hidden">
                              <div className="flex items-center gap-2 overflow-hidden">
                                <Badge variant="secondary" className="text-[10px] h-4 px-1 bg-purple-100 text-purple-700 shrink-0">
                                  Next Milestone
                                </Badge>
                                <span className="text-xs font-medium text-slate-800 line-clamp-1">
                                  {billableItems.nextMilestone.title}
                                </span>
                              </div>
                              <p className="text-[10px] text-slate-500 mt-0.5 line-clamp-1">
                                {billableItems.nextMilestone.currency} {(billableItems.nextMilestone.amount / 100).toLocaleString()} • {billableItems.nextMilestone.status}
                              </p>
                            </div>
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={applyNextMilestone}
                              disabled={billableItems.nextMilestone && isItemAdded(billableItems.nextMilestone.title, billableItems.nextMilestone.amount / 100)}
                              className={cn("h-6 text-xs shrink-0", billableItems.nextMilestone && isItemAdded(billableItems.nextMilestone.title, billableItems.nextMilestone.amount / 100) && "text-emerald-600 opacity-100")}
                            >
                              {billableItems.nextMilestone && isItemAdded(billableItems.nextMilestone.title, billableItems.nextMilestone.amount / 100) ? <Check className="h-3 w-3" /> : "Add"}
                            </Button>
                          </div>
                        )}

                        {/* Billable Items */}
                        {billableItems.items.slice(0, 3).map((item, idx) => (
                          <div key={idx} className="flex items-center justify-between gap-2 bg-white/60 rounded-md px-2.5 py-1.5 mb-1 overflow-hidden">
                            <div className="flex-1 min-w-0 overflow-hidden">
                              <span className="text-xs font-medium text-slate-800 line-clamp-1 block">
                                {item.title}
                              </span>
                              <p className="text-[10px] text-slate-500 line-clamp-1">
                                {item.currency} {item.unitPrice.toLocaleString()} × {item.quantity}
                              </p>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => applyBillableItem(item)}
                              disabled={isItemAdded(item.title, item.unitPrice)}
                              className={cn("h-6 text-xs shrink-0", isItemAdded(item.title, item.unitPrice) && "text-emerald-600 opacity-100")}
                            >
                              {isItemAdded(item.title, item.unitPrice) ? <Check className="h-3 w-3" /> : "Add"}
                            </Button>
                          </div>
                        ))}

                        {/* Apply All */}
                        {billableItems.items.length > 0 && (
                          <div className="mt-2 flex justify-end">
                            <Button
                              variant="secondary"
                              size="sm"
                              className="h-6 text-xs"
                              onClick={applyAllBillableItems}
                              disabled={billableItems.items.every(item => isItemAdded(item.title, item.unitPrice))}
                            >
                              <Sparkles className="h-3 w-3 mr-1" />
                              {billableItems.items.every(item => isItemAdded(item.title, item.unitPrice))
                                ? "All items added"
                                : `Add remaining ${billableItems.items.filter(item => !isItemAdded(item.title, item.unitPrice)).length} items`
                              }
                            </Button>
                          </div>
                        )}

                        {billableItems.loading && (
                          <p className="text-xs text-slate-400 mt-2">Loading items...</p>
                        )}
                      </div>
                    )}

                    <SectionCard title="Invoice Meta">
                      <div>
                        <Label className="text-xs font-medium text-muted-foreground">Document Title</Label>
                        <Input
                          value={formState.documentTitle || "INVOICE"}
                          onChange={(e) => updateField("documentTitle", e.target.value)}
                          placeholder="INVOICE"
                          className="mt-1.5"
                        />
                        <p className="text-[11px] text-muted-foreground mt-1">E.g. INVOICE, BILL, RECEIPT, QUOTE</p>
                      </div>
                      <div>
                        <Label className="text-xs font-medium text-muted-foreground">Invoice Number</Label>
                        <div className="flex items-center gap-2 mt-2">
                          <Input
                            value={formState.number}
                            onChange={(e) => updateField("number", e.target.value)}
                            placeholder="INV-2024-001"
                          />
                          <Switch
                            checked={!formState.number || formState.number.startsWith("INV-")}
                            onCheckedChange={(checked) => {
                              if (checked && !formState.number) {
                                updateField("number", `INV-${new Date().getFullYear()}-${String(Date.now()).slice(-3)}`);
                              }
                            }}
                          />
                        </div>
                        <p className="text-[11px] text-muted-foreground mt-1">Auto-number enabled</p>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label className="text-xs font-medium text-muted-foreground">Invoice Date</Label>
                          <Input
                            type="date"
                            value={formState.date ? new Date(formState.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]}
                            onChange={(e) => updateField("date", e.target.value || undefined)}
                            className="mt-2"
                          />
                        </div>
                        <div>
                          <Label className="text-xs font-medium text-muted-foreground">Due Date</Label>
                          <Select
                            value={(() => {
                              if (!formState.dueDate) return "none";
                              const start = formState.date ? new Date(formState.date) : new Date();
                              const due = new Date(formState.dueDate);
                              start.setHours(0, 0, 0, 0);
                              due.setHours(0, 0, 0, 0);
                              const diff = Math.round((due.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));

                              if (diff === 0) return "today";
                              if (diff === 7) return "7";
                              if (diff === 15) return "15";
                              if (diff === 30) return "30";
                              return "custom";
                            })()}
                            onValueChange={(v) => {
                              const base = formState.date ? new Date(formState.date) : new Date();
                              const target = new Date(base);

                              if (v === "today") target.setDate(base.getDate());
                              else if (v === "7") target.setDate(base.getDate() + 7);
                              else if (v === "15") target.setDate(base.getDate() + 15);
                              else if (v === "30") target.setDate(base.getDate() + 30);

                              updateField("dueDate", target.toISOString());
                            }}
                          >
                            <SelectTrigger className="w-full mt-2">
                              <SelectValue placeholder="Select" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="today">Due on receipt</SelectItem>
                              <SelectItem value="7">Net 7</SelectItem>
                              <SelectItem value="15">Net 15</SelectItem>
                              <SelectItem value="30">Net 30</SelectItem>
                              <SelectItem value="custom">Custom</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div>
                        <Label className="text-xs font-medium text-muted-foreground">Reference / PO</Label>
                        <Input
                          value={formState.extraSummaryLabel || ""}
                          onChange={(e) => updateField("extraSummaryLabel", e.target.value)}
                          placeholder="PO-12345"
                          className="mt-2"
                        />
                      </div>
                      <div>
                        <Label className="text-xs font-medium text-muted-foreground">Tags</Label>
                        <Input
                          placeholder="Add tags (comma separated)"
                          className="mt-2"
                        />
                        <div className="flex flex-wrap gap-1 mt-2">
                          {/* Tags would go here */}
                        </div>
                      </div>
                    </SectionCard>
                  </TabsContent>

                  {/* Tab: Sections */}
                  <TabsContent value="sections" className="space-y-4 mt-0">
                    <SectionCard title="Sections">
                      <div className="flex items-center justify-between rounded-lg border border-border/60 bg-muted/40 px-3 py-2">
                        <p className="text-xs text-muted-foreground">
                          Show, rename, reorder, and add custom sections.
                        </p>
                        <Button
                          onClick={addCustomSection}
                          size="sm"
                          variant="outline"
                          className="h-8 gap-1 text-[11px]"
                        >
                          <Plus className="h-3.5 w-3.5" />
                          Custom
                        </Button>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {[
                          {
                            id: "signature",
                            label: "Signature",
                            section: { id: `signature_${Date.now()}`, title: "Signature", visible: true, custom: true, customType: "signature" as const },
                          },
                          {
                            id: "bank",
                            label: "Bank details",
                            section: {
                              id: `bank_${Date.now()}`,
                              title: "Bank Details",
                              visible: true,
                              custom: true,
                              customType: "keyValue" as const,
                              items: [
                                { label: "Account Name", value: "Your Name" },
                                { label: "Account No", value: "XXXX XXXX XXXX" },
                                { label: "IFSC", value: "XXXX0000" },
                              ],
                            },
                          },
                          {
                            id: "milestone",
                            label: "Milestones",
                            section: {
                              id: `milestone_${Date.now()}`,
                              title: "Milestones",
                              visible: true,
                              custom: true,
                              customType: "text" as const,
                              content: "Phase 1: Design\nPhase 2: Build\nPhase 3: QA",
                            },
                          },
                        ].map((preset) => (
                          <button
                            key={preset.id}
                            onClick={() => onSectionsChange([...sections, preset.section])}
                            className="rounded-md border border-dashed border-border/60 px-2 py-1 text-[11px] font-semibold text-muted-foreground hover:border-primary/50 hover:text-primary"
                          >
                            + {preset.label}
                          </button>
                        ))}
                      </div>
                      <div className="space-y-2">
                        {sections.map((section, index) => (
                          <div
                            key={section.id}
                            draggable
                            onDragStart={(e) => handleDragStart(e, section.id)}
                            onDragEnd={handleDragEnd}
                            onDragOver={(e) => handleDragOver(e, index)}
                            onDrop={(e) => handleDrop(e, index)}
                            onDragLeave={handleDragLeave}
                            className={cn(
                              "rounded-lg border border-border/60 bg-white px-3 py-2 transition-all cursor-move",
                              draggedSectionId === section.id && "opacity-50",
                              dragOverIndex === index && draggedSectionId !== section.id && "border-primary border-2 shadow-md"
                            )}
                          >
                            <div className="flex items-center gap-2">
                              <div className="flex flex-col gap-0.5 cursor-grab active:cursor-grabbing">
                                <GripHorizontal className="h-3 w-4 text-muted-foreground" />
                                <GripHorizontal className="h-3 w-4 text-muted-foreground" />
                              </div>
                              <Input
                                className="flex-1 text-xs font-medium"
                                value={section.title}
                                onChange={(e) => renameSection(section.id, e.target.value)}
                                onClick={(e) => e.stopPropagation()}
                                onMouseDown={(e) => e.stopPropagation()}
                              />
                              <Switch
                                checked={section.visible}
                                onCheckedChange={() => toggleSectionVisibility(section.id)}
                                onClick={(e) => e.stopPropagation()}
                              />
                              {section.custom && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onSectionsChange(sections.filter((s) => s.id !== section.id));
                                  }}
                                >
                                  ×
                                </Button>
                              )}
                            </div>
                            {section.custom && (
                              <div className="mt-2 space-y-2">
                                <div className="flex items-center gap-2">
                                  <Label className="text-[11px] text-muted-foreground">Type</Label>
                                  <Select
                                    value={section.customType || "text"}
                                    onValueChange={(v) =>
                                      onSectionsChange(
                                        sections.map((s) =>
                                          s.id === section.id
                                            ? { ...s, customType: v as "text" | "keyValue" | "signature" }
                                            : s
                                        )
                                      )
                                    }
                                  >
                                    <SelectTrigger className="h-8 w-40">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="text">Text block</SelectItem>
                                      <SelectItem value="keyValue">Key / value list</SelectItem>
                                      <SelectItem value="signature">Signature</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>

                                {section.customType !== "keyValue" && (
                                  <Textarea
                                    className="h-20 text-xs"
                                    placeholder="Custom section content (optional)"
                                    value={section.content || ""}
                                    onChange={(e) => updateCustomContent(section.id, e.target.value)}
                                  />
                                )}

                                {section.customType === "keyValue" && (
                                  <div className="space-y-2">
                                    <p className="text-[11px] font-semibold text-muted-foreground">Key/value rows</p>
                                    {(section.items || []).map((row, idx) => (
                                      <div key={idx} className="grid grid-cols-2 gap-2">
                                        <Input
                                          placeholder="Label"
                                          value={row.label}
                                          onChange={(e) => {
                                            const items = [...(section.items || [])];
                                            items[idx] = { ...items[idx], label: e.target.value };
                                            updateCustomItems(section.id, items);
                                          }}
                                        />
                                        <div className="flex gap-2">
                                          <Input
                                            placeholder="Value"
                                            value={row.value}
                                            onChange={(e) => {
                                              const items = [...(section.items || [])];
                                              items[idx] = { ...items[idx], value: e.target.value };
                                              updateCustomItems(section.id, items);
                                            }}
                                          />
                                          <Button
                                            variant="outline"
                                            size="icon"
                                            className="h-8 w-8"
                                            onClick={() => {
                                              const items = (section.items || []).filter((_, i) => i !== idx);
                                              updateCustomItems(section.id, items);
                                            }}
                                          >
                                            ×
                                          </Button>
                                        </div>
                                      </div>
                                    ))}
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() =>
                                        updateCustomItems(section.id, [...(section.items || []), { label: "", value: "" }])
                                      }
                                      className="h-8 text-[11px]"
                                    >
                                      + Add row
                                    </Button>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </SectionCard>
                  </TabsContent>

                  {/* Tab: Items & Pricing */}
                  <TabsContent value="items" className="space-y-4 mt-0">
                    {/* Quick Apply suggestions in Items tab */}
                    {formState.projectId && !billableItemsDismissed && (billableItems.items.length > 0 || billableItems.nextMilestone) && (
                      <div className="rounded-lg border bg-gradient-to-r from-purple-50 to-indigo-50 border-purple-200/60 p-3">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <Sparkles className="h-4 w-4 text-purple-600" />
                            <span className="text-xs font-medium text-slate-700">Quick Add from Project</span>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-5 w-5 p-0 text-slate-400 hover:text-slate-600"
                            onClick={() => setBillableItemsDismissed(true)}
                          >
                            ×
                          </Button>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {/* Next Milestone chip */}
                          {billableItems.nextMilestone && (
                            <button
                              onClick={applyNextMilestone}
                              className={cn(
                                "inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-[11px] font-medium transition-colors",
                                billableItems.nextMilestone && isItemAdded(billableItems.nextMilestone.title, billableItems.nextMilestone.amount / 100)
                                  ? "bg-emerald-100 text-emerald-700 cursor-default"
                                  : "bg-purple-100 hover:bg-purple-200 text-purple-700"
                              )}
                            >
                              {billableItems.nextMilestone && isItemAdded(billableItems.nextMilestone.title, billableItems.nextMilestone.amount / 100) && <Check className="h-3 w-3" />}
                              <span className="truncate max-w-[120px]">{billableItems.nextMilestone.title}</span>
                              <span className={cn(billableItems.nextMilestone && isItemAdded(billableItems.nextMilestone.title, billableItems.nextMilestone.amount / 100) ? "text-emerald-600" : "text-purple-500")}>
                                ₹{(billableItems.nextMilestone.amount / 100).toLocaleString()}
                              </span>
                            </button>
                          )}
                          {/* Billable items chips */}
                          {billableItems.items.slice(0, 4).map((item, idx) => (
                            <button
                              key={idx}
                              onClick={() => applyBillableItem(item)}
                              className={cn(
                                "inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-[11px] font-medium transition-colors",
                                isItemAdded(item.title, item.unitPrice)
                                  ? "bg-emerald-100 text-emerald-700 cursor-default"
                                  : "bg-slate-100 hover:bg-slate-200 text-slate-700"
                              )}
                            >
                              {isItemAdded(item.title, item.unitPrice) && <Check className="h-3 w-3" />}
                              <span className="truncate max-w-[100px]">{item.title}</span>
                              <span className={cn(isItemAdded(item.title, item.unitPrice) ? "text-emerald-600" : "text-slate-500")}>
                                ₹{item.unitPrice.toLocaleString()}
                              </span>
                            </button>
                          ))}
                          {billableItems.items.length > 4 && (
                            <button
                              onClick={applyAllBillableItems}
                              disabled={billableItems.items.every(item => isItemAdded(item.title, item.unitPrice))}
                              className={cn(
                                "inline-flex items-center gap-1 px-2 py-1 rounded-full text-[11px] font-medium transition-colors",
                                billableItems.items.every(item => isItemAdded(item.title, item.unitPrice))
                                  ? "bg-emerald-100 text-emerald-700 cursor-default"
                                  : "bg-purple-600 hover:bg-purple-700 text-white"
                              )}
                            >
                              {billableItems.items.every(item => isItemAdded(item.title, item.unitPrice))
                                ? "All added"
                                : `+${billableItems.items.filter(item => !isItemAdded(item.title, item.unitPrice)).length} more`
                              }
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                    <ItemsSection
                      formState={formState}
                      onFormStateChange={onFormStateChange}
                    />
                    <SectionCard title="Totals & Discount">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs font-medium">Add discount</Label>
                        <Switch
                          checked={!!formState.adjustments?.some(a => a.type === "discount")}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              const adjustments = formState.adjustments || [];
                              if (!adjustments.some(a => a.type === "discount")) {
                                updateField("adjustments", [...adjustments, {
                                  id: `discount_${Date.now()}`,
                                  name: "Discount",
                                  type: "discount",
                                  mode: "percent",
                                  value: 0
                                }]);
                              }
                            } else {
                              // Remove discount when unchecked
                              updateField("adjustments", (formState.adjustments || []).filter(a => a.type !== "discount"));
                            }
                          }}
                        />
                      </div>
                      {formState.adjustments?.some(a => a.type === "discount") && (
                        <div className="grid grid-cols-2 gap-2">
                          <Select
                            value={formState.adjustments.find(a => a.type === "discount")?.mode || "percent"}
                            onValueChange={(v) => {
                              const adjustments = formState.adjustments || [];
                              const discountIdx = adjustments.findIndex(a => a.type === "discount");
                              if (discountIdx >= 0) {
                                const discount = adjustments[discountIdx];
                                adjustments[discountIdx] = {
                                  ...discount,
                                  mode: v as "percent" | "fixed"
                                };
                                updateField("adjustments", adjustments);
                              }
                            }}
                          >
                            <SelectTrigger className="w-full">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="percent">Percent</SelectItem>
                              <SelectItem value="fixed">Fixed</SelectItem>
                            </SelectContent>
                          </Select>
                          <Input
                            type="number"
                            value={formState.adjustments.find(a => a.type === "discount")?.value || 0}
                            onChange={(e) => {
                              const adjustments = formState.adjustments || [];
                              const discountIdx = adjustments.findIndex(a => a.type === "discount");
                              if (discountIdx >= 0) {
                                const discount = adjustments[discountIdx];
                                adjustments[discountIdx] = {
                                  ...discount,
                                  value: parseFloat(e.target.value) || 0
                                };
                                updateField("adjustments", adjustments);
                              }
                            }}
                          />
                        </div>
                      )}
                      <Separator />
                      <div className="space-y-1 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Subtotal</span>
                          <span>₹{formState.items.reduce((sum, item) => sum + (item.quantity || 0) * (item.unitPrice || 0), 0).toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Tax</span>
                          <span>₹{formState.items.reduce((sum, item) => sum + ((item.quantity || 0) * (item.unitPrice || 0) * (item.taxRate || 0)) / 100, 0).toLocaleString()}</span>
                        </div>
                        <Separator />
                        <div className="flex justify-between font-semibold">
                          <span>Total</span>
                          <span>₹{(formState.items.reduce((sum, item) => sum + (item.quantity || 0) * (item.unitPrice || 0), 0) + formState.items.reduce((sum, item) => sum + ((item.quantity || 0) * (item.unitPrice || 0) * (item.taxRate || 0)) / 100, 0)).toLocaleString()}</span>
                        </div>
                      </div>
                    </SectionCard>
                  </TabsContent>

                  {/* Tab: Taxes & Discounts */}
                  <TabsContent value="taxes" className="space-y-4 mt-0">
                    <TaxSection
                      formState={formState}
                      onFormStateChange={onFormStateChange}
                      hasClientSelected={!!formState.clientId}
                      clientRegion={(() => {
                        const client = clients.find(c => c.id === formState.clientId);
                        return client?.address ? inferClientRegion(client.address) : null;
                      })()}
                    />
                  </TabsContent>

                  {/* Tab: Payment & Schedule */}
                  <TabsContent value="payment" className="space-y-4 mt-0">
                    <SectionCard title="Payment Methods">
                      <div className="space-y-3">
                        <div className="flex items-center justify-between rounded-lg border p-3">
                          <div>
                            <Label className="text-xs font-medium">UPI</Label>
                            <Input
                              placeholder="UPI ID"
                              className="mt-2"
                              value={formState.extraSummaryValue || ""}
                              onChange={(e) => updateField("extraSummaryValue", e.target.value)}
                            />
                          </div>
                          <Switch />
                        </div>
                        <div className="flex items-center justify-between rounded-lg border p-3">
                          <div>
                            <Label className="text-xs font-medium">Bank Transfer</Label>
                            <Textarea
                              placeholder="Bank details"
                              className="mt-2 h-16"
                            />
                          </div>
                          <Switch />
                        </div>
                        <div className="flex items-center justify-between">
                          <Label className="text-xs font-medium">Show QR code on invoice</Label>
                          <Switch />
                        </div>
                      </div>
                    </SectionCard>
                    <SectionCard title="Partial Payments">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs font-medium">Allow partial payments</Label>
                        <Switch />
                      </div>
                    </SectionCard>
                    <SectionCard title="Schedule Sending">
                      <div className="space-y-2">
                        <Label className="text-xs font-medium text-muted-foreground">Send timing</Label>
                        <Select defaultValue="now">
                          <SelectTrigger className="w-full">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="now">Send now</SelectItem>
                            <SelectItem value="schedule">Schedule send</SelectItem>
                          </SelectContent>
                        </Select>
                        <p className="text-[11px] text-muted-foreground">Use the Schedule button in the header to set date/time.</p>
                      </div>
                    </SectionCard>
                  </TabsContent>

                  {/* Tab: Reminders */}
                  <TabsContent value="reminders" className="space-y-4 mt-0">
                    <RemindersTab
                      formState={formState}
                      updateField={updateField}
                    />
                  </TabsContent>

                  {/* Tab: Attachments */}
                  <TabsContent value="attachments" className="space-y-4 mt-0">
                    <div className="rounded-lg border-2 border-dashed border-border/60 p-6 text-center">
                      <Paperclip className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                      <p className="text-xs text-muted-foreground mb-2">Drop agreements, SOWs, screenshots here</p>
                      <Button variant="outline" size="sm">Browse files</Button>
                    </div>
                    <div className="space-y-2">
                      {(formState.attachments || []).map((att, idx) => (
                        <div key={idx} className="rounded-lg border p-3 flex items-center justify-between">
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium truncate">{att.label || "Attachment"}</p>
                            <p className="text-[11px] text-muted-foreground truncate">{att.url}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Select defaultValue="reference">
                              <SelectTrigger className="h-7 w-24 text-[10px]">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="agreement">Agreement</SelectItem>
                                <SelectItem value="reference">Reference</SelectItem>
                                <SelectItem value="screenshot">Screenshot</SelectItem>
                              </SelectContent>
                            </Select>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() =>
                                updateField(
                                  "attachments",
                                  (formState.attachments || []).filter((_, i) => i !== idx)
                                )
                              }
                            >
                              ×
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </TabsContent>

                  {/* Tab: Notes & Terms */}

                  {/* Tab: Attachments */}
                  <TabsContent value="attachments" className="space-y-4 mt-0">
                    <div className="rounded-lg border-2 border-dashed border-border/60 p-6 text-center">
                      <Paperclip className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                      <p className="text-xs text-muted-foreground mb-2">Drop agreements, SOWs, screenshots here</p>
                      <Button variant="outline" size="sm">Browse files</Button>
                    </div>
                    <div className="space-y-2">
                      {(formState.attachments || []).map((att, idx) => (
                        <div key={idx} className="rounded-lg border p-3 flex items-center justify-between">
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium truncate">{att.label || "Attachment"}</p>
                            <p className="text-[11px] text-muted-foreground truncate">{att.url}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Select defaultValue="reference">
                              <SelectTrigger className="h-7 w-24 text-[10px]">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="agreement">Agreement</SelectItem>
                                <SelectItem value="reference">Reference</SelectItem>
                                <SelectItem value="screenshot">Screenshot</SelectItem>
                              </SelectContent>
                            </Select>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() =>
                                updateField(
                                  "attachments",
                                  (formState.attachments || []).filter((_, i) => i !== idx)
                                )
                              }
                            >
                              ×
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </TabsContent>

                  {/* Tab: Notes & Terms */}
                  <TabsContent value="notes" className="space-y-4 mt-0">
                    <NotesTab
                      formState={formState}
                      updateField={updateField}
                    />
                  </TabsContent>

                  {/* Tab: Branding */}
                  <TabsContent value="branding" className="space-y-4 mt-0">
                    <BrandingTab
                      formState={formState}
                      onFormStateChange={onFormStateChange}
                      updateField={updateField}
                    />
                  </TabsContent>

                  {/* Tab: Advanced (Settings) */}
                  <TabsContent value="settings" className="space-y-4 mt-0">
                    <SettingsTab
                      formState={formState}
                      updateField={updateField}
                    />
                  </TabsContent>
                </ScrollArea>
              </div >
            ) : (
              <div className={cn(
                "flex flex-col items-center justify-center w-12 flex-shrink-0 border-l border-border/60 transition-all duration-300",
                tabsCollapsed ? "bg-transparent" : "bg-white"
              )}>
                <button
                  onClick={() => setContentCollapsed(false)}
                  className="rounded-lg p-2 text-muted-foreground transition hover:bg-muted/50"
                  title="Expand content"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
              </div>
            )
            }
          </Tabs >
        </>
      )
      }
    </div >
  );
}
