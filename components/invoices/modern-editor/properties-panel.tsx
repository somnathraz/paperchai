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
import { InvoiceMetaSection, SectionsTab, PaymentTab, AttachmentsTab } from "./panels";
import {
  useSmartDefaults,
  useBillableItems,
  useRecentBranding,
  useSectionsDragDrop,
  useSectionsManager,
} from "./hooks";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  onClientUpdate?: (
    clientId: string,
    data: Partial<{
      email: string;
      phone: string;
      addressLine1: string;
      addressLine2: string;
      city: string;
      state: string;
      postalCode: string;
      country: string;
    }>
  ) => Promise<void>;
  onCreateClient?: () => void;
  onCreateProject?: () => void;
  onProjectSelect?: (project: {
    id: string;
    name: string;
    billableItems?: Array<{ title: string; quantity: number; unitPrice: number }> | null;
  }) => void;
  onEditProject?: (project: any) => void;
  onGenerateRazorpayLink?: () => Promise<void>;
  razorpayLinkLoading?: boolean;
  razorpayConfigured?: boolean;
  savedInvoiceId?: string;
};

type AccordionSectionProps = {
  title: string;
  children: React.ReactNode;
};

function SectionCard({ title, children }: AccordionSectionProps) {
  return (
    <div className="rounded-xl border border-border/60 bg-white p-3 shadow-sm">
      <div className="mb-2 flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          {title}
        </p>
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
  onGenerateRazorpayLink,
  razorpayLinkLoading,
  razorpayConfigured,
  savedInvoiceId,
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
  const updateField = useCallback(
    <K extends keyof InvoiceFormState>(field: K, value: InvoiceFormState[K]) => {
      onFormStateChange({ ...formState, [field]: value });
    },
    [formState, onFormStateChange]
  );

  const updateItem = useCallback(
    (index: number, field: keyof InvoiceItemInput, value: any) => {
      const newItems = [...formState.items];
      newItems[index] = { ...newItems[index], [field]: value };
      onFormStateChange({ ...formState, items: newItems });
    },
    [formState, onFormStateChange]
  );

  const addItem = useCallback(() => {
    onFormStateChange({
      ...formState,
      items: [...formState.items, { title: "", quantity: 1, unitPrice: 0, taxRate: 0 }],
    });
  }, [formState, onFormStateChange]);

  const removeItem = useCallback(
    (index: number) => {
      onFormStateChange({
        ...formState,
        items: formState.items.filter((_, i) => i !== index),
      });
    },
    [formState, onFormStateChange]
  );

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
    if (collapsed) return "bg-white";
    if (tabsCollapsed && contentCollapsed) return "bg-transparent";
    return "bg-white";
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
                  ? "600px" // tabs collapsed (48px) + border (1px) + content expanded (flex-1 fills remaining)
                  : contentCollapsed
                    ? "273px" // tabs expanded (224px) + border (1px) + content collapsed (48px)
                    : "600px", // both expanded (increased from 520px to give more space to content area)
              }}
            >
              <div className="transition-all duration-300 overflow-hidden opacity-100 flex-1">
                <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground whitespace-nowrap">
                  Properties
                </p>
                <p className="text-xs text-muted-foreground whitespace-nowrap">
                  {formState.number || "Draft"} ·{" "}
                  {formState.clientId ? "Client selected" : "No client"}
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

          <Tabs
            orientation="vertical"
            value={activeTab}
            onValueChange={setActiveTab}
            className="flex flex-1 min-h-0"
          >
            {/* First Sidebar: Tab List */}
            <div
              className={cn(
                "flex flex-col flex-shrink-0 border-r border-border/60 transition-all duration-300 relative",
                tabsCollapsed ? "w-12 bg-transparent" : "w-56 bg-white"
              )}
            >
              {!tabsCollapsed ? (
                <ScrollArea className="flex-1">
                  <TabsList className="flex flex-col items-start gap-1 rounded-none bg-transparent p-3 h-auto">
                    <TabsTrigger
                      value="client-invoice"
                      className="w-full justify-start gap-2 text-xs"
                    >
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
                      onClick={() => {
                        setActiveTab("client-invoice");
                        setTabsCollapsed(false);
                      }}
                      className="p-2 rounded-lg hover:bg-white text-muted-foreground hover:text-primary transition"
                      title="Client & Invoice"
                    >
                      <User className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => {
                        setActiveTab("sections");
                        setTabsCollapsed(false);
                      }}
                      className="p-2 rounded-lg hover:bg-white text-muted-foreground hover:text-primary transition"
                      title="Sections"
                    >
                      <Blocks className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => {
                        setActiveTab("items");
                        setTabsCollapsed(false);
                      }}
                      className="p-2 rounded-lg hover:bg-white text-muted-foreground hover:text-primary transition"
                      title="Items & Pricing"
                    >
                      <ShoppingCart className="h-4 w-4" />
                    </button>
                    <div className="w-6 my-1 border-t border-border/40 mx-auto" />
                    <button
                      onClick={() => {
                        setActiveTab("taxes");
                        setTabsCollapsed(false);
                      }}
                      className="p-2 rounded-lg hover:bg-white text-muted-foreground hover:text-primary transition"
                      title="Taxes & Discounts"
                    >
                      <Receipt className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => {
                        setActiveTab("payment");
                        setTabsCollapsed(false);
                      }}
                      className="p-2 rounded-lg hover:bg-white text-muted-foreground hover:text-primary transition"
                      title="Payment & Schedule"
                    >
                      <CreditCard className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => {
                        setActiveTab("reminders");
                        setTabsCollapsed(false);
                      }}
                      className="p-2 rounded-lg hover:bg-white text-muted-foreground hover:text-primary transition"
                      title="Reminders"
                    >
                      <Bell className="h-4 w-4" />
                    </button>
                    <div className="w-6 my-1 border-t border-border/40 mx-auto" />
                    <button
                      onClick={() => {
                        setActiveTab("attachments");
                        setTabsCollapsed(false);
                      }}
                      className="p-2 rounded-lg hover:bg-white text-muted-foreground hover:text-primary transition"
                      title="Attachments"
                    >
                      <Paperclip className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => {
                        setActiveTab("notes");
                        setTabsCollapsed(false);
                      }}
                      className="p-2 rounded-lg hover:bg-white text-muted-foreground hover:text-primary transition"
                      title="Notes & Terms"
                    >
                      <FileEdit className="h-4 w-4" />
                    </button>
                    <div className="w-6 my-1 border-t border-border/40 mx-auto" />
                    <button
                      onClick={() => {
                        setActiveTab("branding");
                        setTabsCollapsed(false);
                      }}
                      className="p-2 rounded-lg hover:bg-white text-muted-foreground hover:text-primary transition"
                      title="Branding"
                    >
                      <Palette className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => {
                        setActiveTab("settings");
                        setTabsCollapsed(false);
                      }}
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
                    {formState.clientId &&
                      !smartDefaultsDismissed &&
                      getClientRecommendations().length > 0 && (
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
                    {formState.clientId &&
                      smartDefaults?.client?.safeDueDate &&
                      !appliedDueDate && (
                        <DueDateRecommendation
                          date={smartDefaults.client.safeDueDate.date}
                          explanation={smartDefaults.client.safeDueDate.explanation}
                          onApply={applyDueDate}
                        />
                      )}

                    {/* Project Quick Apply - Billable Items & Next Milestone */}
                    {formState.projectId &&
                      !billableItemsDismissed &&
                      (billableItems.items.length > 0 || billableItems.nextMilestone) && (
                        <div className="rounded-lg border bg-purple-50 border-purple-200 p-3 mb-4 overflow-hidden">
                          <div className="flex items-start justify-between gap-2 mb-3">
                            <div className="flex items-center gap-2">
                              <div className="p-1 rounded text-purple-600">
                                <Sparkles className="h-4 w-4" />
                              </div>
                              <div>
                                <p className="text-sm font-medium text-slate-800">
                                  Quick Apply from Project
                                </p>
                                <p className="text-xs text-slate-500">
                                  Pre-configured items & milestones
                                </p>
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
                                  <Badge
                                    variant="secondary"
                                    className="text-[10px] h-4 px-1 bg-purple-100 text-purple-700 shrink-0"
                                  >
                                    Next Milestone
                                  </Badge>
                                  <span className="text-xs font-medium text-slate-800 line-clamp-1">
                                    {billableItems.nextMilestone.title}
                                  </span>
                                </div>
                                <p className="text-[10px] text-slate-500 mt-0.5 line-clamp-1">
                                  {billableItems.nextMilestone.currency}{" "}
                                  {(billableItems.nextMilestone.amount / 100).toLocaleString()} •{" "}
                                  {billableItems.nextMilestone.status}
                                </p>
                              </div>
                              <Button
                                variant="secondary"
                                size="sm"
                                onClick={applyNextMilestone}
                                disabled={
                                  billableItems.nextMilestone &&
                                  isItemAdded(
                                    billableItems.nextMilestone.title,
                                    billableItems.nextMilestone.amount / 100
                                  )
                                }
                                className={cn(
                                  "h-6 text-xs shrink-0",
                                  billableItems.nextMilestone &&
                                    isItemAdded(
                                      billableItems.nextMilestone.title,
                                      billableItems.nextMilestone.amount / 100
                                    ) &&
                                    "text-emerald-600 opacity-100"
                                )}
                              >
                                {billableItems.nextMilestone &&
                                isItemAdded(
                                  billableItems.nextMilestone.title,
                                  billableItems.nextMilestone.amount / 100
                                ) ? (
                                  <Check className="h-3 w-3" />
                                ) : (
                                  "Add"
                                )}
                              </Button>
                            </div>
                          )}

                          {/* Billable Items */}
                          {billableItems.items.slice(0, 3).map((item, idx) => (
                            <div
                              key={idx}
                              className="flex items-center justify-between gap-2 bg-white/60 rounded-md px-2.5 py-1.5 mb-1 overflow-hidden"
                            >
                              <div className="flex-1 min-w-0 overflow-hidden">
                                <span className="text-xs font-medium text-slate-800 line-clamp-1 block">
                                  {item.title}
                                </span>
                                <p className="text-[10px] text-slate-500 line-clamp-1">
                                  {item.currency} {item.unitPrice.toLocaleString()} ×{" "}
                                  {item.quantity}
                                </p>
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => applyBillableItem(item)}
                                disabled={isItemAdded(item.title, item.unitPrice)}
                                className={cn(
                                  "h-6 text-xs shrink-0",
                                  isItemAdded(item.title, item.unitPrice) &&
                                    "text-emerald-600 opacity-100"
                                )}
                              >
                                {isItemAdded(item.title, item.unitPrice) ? (
                                  <Check className="h-3 w-3" />
                                ) : (
                                  "Add"
                                )}
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
                                disabled={billableItems.items.every((item) =>
                                  isItemAdded(item.title, item.unitPrice)
                                )}
                              >
                                <Sparkles className="h-3 w-3 mr-1" />
                                {billableItems.items.every((item) =>
                                  isItemAdded(item.title, item.unitPrice)
                                )
                                  ? "All items added"
                                  : `Add remaining ${billableItems.items.filter((item) => !isItemAdded(item.title, item.unitPrice)).length} items`}
                              </Button>
                            </div>
                          )}

                          {billableItems.loading && (
                            <p className="text-xs text-slate-400 mt-2">Loading items...</p>
                          )}
                        </div>
                      )}

                    <InvoiceMetaSection formState={formState} updateField={updateField} />
                  </TabsContent>

                  {/* Tab: Sections */}
                  <TabsContent value="sections" className="space-y-4 mt-0">
                    <SectionsTab
                      sections={sections}
                      onSectionsChange={onSectionsChange}
                      addCustomSection={addCustomSection}
                      renameSection={renameSection}
                      toggleSectionVisibility={toggleSectionVisibility}
                      updateCustomContent={updateCustomContent}
                      updateCustomItems={updateCustomItems}
                      draggedSectionId={draggedSectionId}
                      dragOverIndex={dragOverIndex}
                      handleDragStart={handleDragStart}
                      handleDragEnd={handleDragEnd}
                      handleDragOver={handleDragOver}
                      handleDrop={handleDrop}
                      handleDragLeave={handleDragLeave}
                    />
                  </TabsContent>

                  {/* Tab: Items & Pricing */}
                  <TabsContent value="items" className="space-y-4 mt-0">
                    {/* Quick Apply suggestions in Items tab */}
                    {formState.projectId &&
                      !billableItemsDismissed &&
                      (billableItems.items.length > 0 || billableItems.nextMilestone) && (
                        <div className="rounded-lg border bg-gradient-to-r from-purple-50 to-indigo-50 border-purple-200/60 p-3">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <Sparkles className="h-4 w-4 text-purple-600" />
                              <span className="text-xs font-medium text-slate-700">
                                Quick Add from Project
                              </span>
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
                                  billableItems.nextMilestone &&
                                    isItemAdded(
                                      billableItems.nextMilestone.title,
                                      billableItems.nextMilestone.amount / 100
                                    )
                                    ? "bg-emerald-100 text-emerald-700 cursor-default"
                                    : "bg-purple-100 hover:bg-purple-200 text-purple-700"
                                )}
                              >
                                {billableItems.nextMilestone &&
                                  isItemAdded(
                                    billableItems.nextMilestone.title,
                                    billableItems.nextMilestone.amount / 100
                                  ) && <Check className="h-3 w-3" />}
                                <span className="truncate max-w-[120px]">
                                  {billableItems.nextMilestone.title}
                                </span>
                                <span
                                  className={cn(
                                    billableItems.nextMilestone &&
                                      isItemAdded(
                                        billableItems.nextMilestone.title,
                                        billableItems.nextMilestone.amount / 100
                                      )
                                      ? "text-emerald-600"
                                      : "text-purple-500"
                                  )}
                                >
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
                                {isItemAdded(item.title, item.unitPrice) && (
                                  <Check className="h-3 w-3" />
                                )}
                                <span className="truncate max-w-[100px]">{item.title}</span>
                                <span
                                  className={cn(
                                    isItemAdded(item.title, item.unitPrice)
                                      ? "text-emerald-600"
                                      : "text-slate-500"
                                  )}
                                >
                                  ₹{item.unitPrice.toLocaleString()}
                                </span>
                              </button>
                            ))}
                            {billableItems.items.length > 4 && (
                              <button
                                onClick={applyAllBillableItems}
                                disabled={billableItems.items.every((item) =>
                                  isItemAdded(item.title, item.unitPrice)
                                )}
                                className={cn(
                                  "inline-flex items-center gap-1 px-2 py-1 rounded-full text-[11px] font-medium transition-colors",
                                  billableItems.items.every((item) =>
                                    isItemAdded(item.title, item.unitPrice)
                                  )
                                    ? "bg-emerald-100 text-emerald-700 cursor-default"
                                    : "bg-purple-600 hover:bg-purple-700 text-white"
                                )}
                              >
                                {billableItems.items.every((item) =>
                                  isItemAdded(item.title, item.unitPrice)
                                )
                                  ? "All added"
                                  : `+${billableItems.items.filter((item) => !isItemAdded(item.title, item.unitPrice)).length} more`}
                              </button>
                            )}
                          </div>
                        </div>
                      )}
                    <ItemsSection formState={formState} onFormStateChange={onFormStateChange} />
                    <SectionCard title="Totals & Discount">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs font-medium">Add discount</Label>
                        <Switch
                          checked={!!formState.adjustments?.some((a) => a.type === "discount")}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              const adjustments = formState.adjustments || [];
                              if (!adjustments.some((a) => a.type === "discount")) {
                                updateField("adjustments", [
                                  ...adjustments,
                                  {
                                    id: `discount_${Date.now()}`,
                                    name: "Discount",
                                    type: "discount",
                                    mode: "percent",
                                    value: 0,
                                  },
                                ]);
                              }
                            } else {
                              // Remove discount when unchecked
                              updateField(
                                "adjustments",
                                (formState.adjustments || []).filter((a) => a.type !== "discount")
                              );
                            }
                          }}
                        />
                      </div>
                      {formState.adjustments?.some((a) => a.type === "discount") && (
                        <div className="grid grid-cols-2 gap-2">
                          <Select
                            value={
                              formState.adjustments.find((a) => a.type === "discount")?.mode ||
                              "percent"
                            }
                            onValueChange={(v) => {
                              const adjustments = formState.adjustments || [];
                              const discountIdx = adjustments.findIndex(
                                (a) => a.type === "discount"
                              );
                              if (discountIdx >= 0) {
                                const discount = adjustments[discountIdx];
                                adjustments[discountIdx] = {
                                  ...discount,
                                  mode: v as "percent" | "fixed",
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
                            value={
                              formState.adjustments.find((a) => a.type === "discount")?.value || 0
                            }
                            onChange={(e) => {
                              const adjustments = formState.adjustments || [];
                              const discountIdx = adjustments.findIndex(
                                (a) => a.type === "discount"
                              );
                              if (discountIdx >= 0) {
                                const discount = adjustments[discountIdx];
                                adjustments[discountIdx] = {
                                  ...discount,
                                  value: parseFloat(e.target.value) || 0,
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
                          <span>
                            ₹
                            {formState.items
                              .reduce(
                                (sum, item) => sum + (item.quantity || 0) * (item.unitPrice || 0),
                                0
                              )
                              .toLocaleString()}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Tax</span>
                          <span>
                            ₹
                            {formState.items
                              .reduce(
                                (sum, item) =>
                                  sum +
                                  ((item.quantity || 0) *
                                    (item.unitPrice || 0) *
                                    (item.taxRate || 0)) /
                                    100,
                                0
                              )
                              .toLocaleString()}
                          </span>
                        </div>
                        <Separator />
                        <div className="flex justify-between font-semibold">
                          <span>Total</span>
                          <span>
                            ₹
                            {(
                              formState.items.reduce(
                                (sum, item) => sum + (item.quantity || 0) * (item.unitPrice || 0),
                                0
                              ) +
                              formState.items.reduce(
                                (sum, item) =>
                                  sum +
                                  ((item.quantity || 0) *
                                    (item.unitPrice || 0) *
                                    (item.taxRate || 0)) /
                                    100,
                                0
                              )
                            ).toLocaleString()}
                          </span>
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
                        const client = clients.find((c) => c.id === formState.clientId);
                        return client?.address ? inferClientRegion(client.address) : null;
                      })()}
                    />
                  </TabsContent>

                  {/* Tab: Payment & Schedule */}
                  <TabsContent value="payment" className="space-y-4 mt-0">
                    <PaymentTab
                      formState={formState}
                      updateField={updateField}
                      onGenerateRazorpayLink={onGenerateRazorpayLink}
                      razorpayLinkLoading={razorpayLinkLoading}
                      razorpayConfigured={razorpayConfigured}
                      savedInvoiceId={savedInvoiceId}
                    />
                  </TabsContent>

                  {/* Tab: Reminders */}
                  <TabsContent value="reminders" className="space-y-4 mt-0">
                    <RemindersTab formState={formState} updateField={updateField} />
                  </TabsContent>

                  {/* Tab: Attachments */}
                  <TabsContent value="attachments" className="space-y-4 mt-0">
                    <AttachmentsTab formState={formState} updateField={updateField} />
                  </TabsContent>

                  {/* Tab: Notes & Terms */}
                  <TabsContent value="notes" className="space-y-4 mt-0">
                    <NotesTab formState={formState} updateField={updateField} />
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
                    <SettingsTab formState={formState} updateField={updateField} />
                  </TabsContent>
                </ScrollArea>
              </div>
            ) : (
              <div
                className={cn(
                  "flex flex-col items-center justify-center w-12 flex-shrink-0 border-l border-border/60 transition-all duration-300",
                  tabsCollapsed ? "bg-transparent" : "bg-white"
                )}
              >
                <button
                  onClick={() => setContentCollapsed(false)}
                  className="rounded-lg p-2 text-muted-foreground transition hover:bg-muted/50"
                  title="Expand content"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
              </div>
            )}
          </Tabs>
        </>
      )}
    </div>
  );
}
