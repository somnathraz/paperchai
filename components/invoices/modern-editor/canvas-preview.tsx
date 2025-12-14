"use client";

import { useMemo, memo } from "react";
import { FileText, TabletSmartphone, MonitorSmartphone, ZoomIn, ZoomOut, Sun, Moon } from "lucide-react";
import { renderTemplate } from "../templates/registry";
import { InvoiceFormState } from "../invoice-form";
import { cn } from "@/lib/utils";
import { useFontLoader } from "../font-loader";

type CanvasPreviewProps = {
  templateSlug: string;
  formState: InvoiceFormState;
  zoom: number;
  previewMode: "a4" | "mobile" | "full";
  darkMode: boolean;
  onZoomChange: (zoom: number) => void;
  onModeChange: (mode: "a4" | "mobile" | "full") => void;
  onDarkModeToggle: () => void;
  templateTags?: string;
  currentTemplateName: string;
  onOpenTemplates: () => void;
  sidebarCollapsed?: boolean;
  sidebarWidth?: number;
  sections?: any;
  selectedClient?: {
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
  } | null;
  selectedProject?: {
    name: string;
    description?: string | null;
  } | null;
};

export const CanvasPreview = memo(function CanvasPreview({
  templateSlug,
  formState,
  zoom,
  previewMode,
  darkMode,
  onZoomChange,
  onModeChange,
  onDarkModeToggle,
  templateTags,
  currentTemplateName,
  onOpenTemplates,
  sidebarCollapsed = false,
  sidebarWidth = 520,
  sections,
  selectedClient,
  selectedProject,
}: CanvasPreviewProps) {
  // Format client address
  const formatClientAddress = () => {
    if (!selectedClient) return "";
    const parts = [
      selectedClient.addressLine1,
      selectedClient.addressLine2,
      selectedClient.city,
      selectedClient.state,
      selectedClient.postalCode,
      selectedClient.country
    ].filter(Boolean);
    return parts.join(", ");
  };

  const visibilityMap =
    sections?.reduce((acc: Record<string, boolean>, curr: { id: string; visible?: boolean }) => {
      acc[curr.id] = curr.visible ?? true;
      return acc;
    }, {} as Record<string, boolean>) || undefined;

  const totals = useMemo(() => {
    const taxSettings = formState.taxSettings || { inclusive: false, defaultRate: 0 };
    const defaultRate = taxSettings.defaultRate || 0;
    const isInclusive = taxSettings.inclusive;

    // Calculate subtotal and tax
    let subtotal = 0;
    let tax = 0;

    formState.items.forEach((item) => {
      const lineTotal = (item.quantity || 0) * (item.unitPrice || 0);
      const itemTaxRate = item.taxRate ?? defaultRate;

      if (isInclusive && itemTaxRate > 0) {
        // Price includes tax - extract tax from price
        const basePrice = lineTotal / (1 + itemTaxRate / 100);
        subtotal += basePrice;
        tax += lineTotal - basePrice;
      } else {
        // Price excludes tax - add tax to price
        subtotal += lineTotal;
        tax += (lineTotal * itemTaxRate) / 100;
      }
    });

    const discountTotal =
      formState.adjustments
        ?.filter((a) => a.type === "discount")
        .reduce((sum, adj) => {
          const base = adj.mode === "percent" ? (adj.value / 100) * subtotal : adj.value;
          return sum + base;
        }, 0) || 0;

    const feeTotal =
      formState.adjustments
        ?.filter((a) => a.type === "fee")
        .reduce((sum, adj) => {
          const base = adj.mode === "percent" ? (adj.value / 100) * subtotal : adj.value;
          return sum + base;
        }, 0) || 0;

    const total = isInclusive
      ? subtotal + tax - discountTotal + feeTotal  // For inclusive, subtotal already excludes tax
      : subtotal + tax - discountTotal + feeTotal;

    return { subtotal, tax, discountTotal, feeTotal, total };
  }, [formState.items, formState.adjustments, formState.taxSettings]);

  const mockData = {
    businessName: formState.businessName || "Your Business",
    documentTitle: formState.documentTitle || "INVOICE",
    invoiceNumber: formState.number || "INV-XXXX",
    logoUrl: formState.logoUrl,
    logoSettings: formState.logoSettings,
    signatureSettings: formState.signatureSettings,
    typography: formState.typography,
    fontFamily: formState.fontFamily,
    primaryColor: formState.primaryColor,
    accentColor: formState.accentColor,
    backgroundColor: formState.backgroundColor,
    gradientFrom: formState.gradientFrom,
    gradientTo: formState.gradientTo,
    layoutDensity: formState.layoutDensity,
    showBorder: formState.showBorder,
    clientName: selectedClient ? selectedClient.name : (formState.clientId ? "Selected client" : "Client Name"),
    clientEmail: selectedClient?.email || "",
    clientPhone: selectedClient?.phone || "",
    clientCompany: selectedClient?.company || "",
    clientAddress: formatClientAddress(),
    projectName: selectedProject?.name || "",
    totalLabel: formState.totalLabel || "Total",
    subtotalLabel: formState.subtotalLabel || "Subtotal",
    taxLabel: formState.taxLabel || "Tax",
    extraSummaryLabel: formState.extraSummaryLabel,
    extraSummaryValue: formState.extraSummaryValue,
    total: `₹${totals.total.toLocaleString()}`,
    subtotal: `₹${totals.subtotal.toLocaleString()}`,
    tax: `₹${totals.tax.toLocaleString()}`,
    discount: totals.discountTotal ? `₹${totals.discountTotal.toLocaleString()}` : undefined,
    fee: totals.feeTotal ? `₹${totals.feeTotal.toLocaleString()}` : undefined,
    notes: formState.notes,
    paymentTerms: formState.terms,
    reminderCadence: formState.reminderCadence,
    signatureUrl: formState.signatureUrl,
    items: formState.items.map((item: any) => ({
      name: item.title || "Item",
      description: item.description,
      quantity: item.quantity || 1,
      qty: item.quantity || 1,
      unit: item.unit || "nos",
      rate: item.unitPrice || 0,
      hsnCode: item.hsnCode,
      amount: `₹${((item.quantity || 0) * (item.unitPrice || 0)).toLocaleString()}`,
    })),
  };

  // Apply visibility overrides for templates that don't natively handle sections
  if (visibilityMap) {
    if (visibilityMap.header === false) {
      mockData.businessName = "";
      mockData.invoiceNumber = "";
      mockData.logoUrl = "";
    }
    if (visibilityMap.bill_to === false) {
      mockData.clientName = "";
    }
    if (visibilityMap.items === false) {
      mockData.items = [];
      mockData.subtotal = "₹0";
      mockData.tax = "₹0";
      mockData.total = "₹0";
    }
    if (visibilityMap.summary === false) {
      mockData.subtotal = "";
      mockData.tax = "";
      mockData.total = "";
      mockData.extraSummaryLabel = "";
      mockData.extraSummaryValue = "";
    }
    if (visibilityMap.notes === false) {
      mockData.notes = "";
    }
    if (visibilityMap.payment === false) {
      mockData.paymentTerms = "";
    }
  }

  const isDark = darkMode || (templateTags || "").toLowerCase().includes("dark");

  // Load font dynamically when fontFamily changes
  useFontLoader(formState.fontFamily);

  const getPreviewDimensions = () => {
    const zoomFactor = zoom / 100;
    if (previewMode === "mobile") {
      return {
        width: `${360 * zoomFactor}px`,
        minHeight: `${640 * zoomFactor}px`, // Mobile aspect ratio
        maxWidth: "100%",
      };
    }
    // A4 dimensions at 96dpi: 794px × 1123px (maintain aspect ratio)
    const a4Width = 794 * zoomFactor;
    const a4Height = 1123 * zoomFactor; // Maintain exact A4 aspect ratio
    return {
      width: `${a4Width}px`,
      minHeight: `${a4Height}px`,
      maxWidth: "100%",
    };
  };

  return (
    <div className="flex h-full flex-col bg-[#F7F7F7]">
      {/* Sticky Toolbar */}
      <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border/60 bg-white/95 px-6 py-3 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <button
            onClick={onOpenTemplates}
            className="inline-flex items-center gap-2 rounded-lg border border-border/60 bg-white px-3 py-1.5 text-xs font-medium text-foreground transition hover:border-primary/40 hover:text-primary"
          >
            <FileText className="h-3.5 w-3.5" />
            Templates
          </button>
          <div className="h-4 w-px bg-border/60" />
          <span className="text-xs font-medium text-muted-foreground">{currentTemplateName}</span>
          {(templateTags || "").toLowerCase().includes("pro") && (
            <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700">Pro</span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* View Mode Buttons */}
          {[
            { key: "a4", label: "A4", icon: FileText },
            { key: "mobile", label: "Mobile", icon: TabletSmartphone },
          ].map((mode) => (
            <button
              key={mode.key}
              onClick={() => onModeChange(mode.key as "a4" | "mobile")}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition",
                previewMode === mode.key
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border/60 text-muted-foreground hover:border-border"
              )}
            >
              <mode.icon className="h-3.5 w-3.5" />
              {mode.label}
            </button>
          ))}

          {/* Dark Mode Toggle */}
          {(templateTags || "").toLowerCase().includes("dark") && (
            <button
              onClick={onDarkModeToggle}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border/60 px-2.5 py-1.5 text-xs font-medium text-muted-foreground transition hover:text-foreground"
            >
              {darkMode ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
            </button>
          )}
        </div>
      </div>

      {/* Canvas Area - Large, Centered Preview */}
      <div className="flex-1 overflow-auto">
        <div className="flex min-h-full w-full items-center justify-center py-10 px-8">
          <div
            className={cn(
              "bg-white shadow-2xl overflow-auto transition-all flex-shrink-0",
              formState.showBorder && "border-[12px] border-slate-900/5"
            )}
            style={getPreviewDimensions()}
          >
            <div className="h-full w-full" style={{ minHeight: '100%', minWidth: '100%' }}>
              {renderTemplate(templateSlug, {
                preview: true,
                modalPreview: true,
                mockData,
                previewDark: isDark,
                sections,
                sectionVisibility: visibilityMap,
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Floating Zoom Controls (After Sidebar) - Vertical */}
      <div
        className="fixed bottom-8 z-20 flex flex-col items-center gap-1 rounded-full border border-border/60 bg-white px-2 py-3 shadow-lg transition-all duration-300"
        style={{ left: `${sidebarWidth + 16}px` }}
      >
        <button
          onClick={() => onZoomChange(Math.max(50, zoom - 25))}
          className="p-1 text-muted-foreground transition hover:text-foreground"
        >
          <ZoomOut className="h-4 w-4" />
        </button>
        <button
          onClick={() => onZoomChange(75)}
          className={cn(
            "px-2 py-1 text-xs font-medium transition w-full",
            zoom === 75 ? "text-primary font-semibold" : "text-muted-foreground hover:text-foreground"
          )}
        >
          75%
        </button>
        <button
          onClick={() => onZoomChange(100)}
          className={cn(
            "px-2 py-1 text-xs font-medium transition w-full",
            zoom === 100 ? "text-primary font-semibold" : "text-muted-foreground hover:text-foreground"
          )}
        >
          100%
        </button>
        <button
          onClick={() => onZoomChange(125)}
          className={cn(
            "px-2 py-1 text-xs font-medium transition w-full",
            zoom === 125 ? "text-primary font-semibold" : "text-muted-foreground hover:text-foreground"
          )}
        >
          125%
        </button>
        <button
          onClick={() => onZoomChange(Math.min(150, zoom + 25))}
          className="p-1 text-muted-foreground transition hover:text-foreground"
        >
          <ZoomIn className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
});

