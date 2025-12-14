"use client";

import { Plus, Trash2, GripVertical, Copy, MoreHorizontal, Package, ChevronDown, ChevronUp, Percent, Search, Save } from "lucide-react";
import { useState, useEffect, useCallback, useMemo } from "react";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { InvoiceFormState, InvoiceItemInput } from "../../invoice-form";
import { cn } from "@/lib/utils";
import { useSavedItems, SavedItem } from "@/hooks/useUserPreferences";

type ItemsSectionProps = {
    formState: InvoiceFormState;
    onFormStateChange: (state: InvoiceFormState) => void;
};

// Fallback items if API hasn't loaded
const FALLBACK_ITEMS = [
    { title: "Web Development", unitPrice: 50000, unit: "project", taxRate: 18 },
    { title: "UI/UX Design", unitPrice: 25000, unit: "project", taxRate: 18 },
    { title: "Consulting Hour", unitPrice: 5000, unit: "hour", taxRate: 18 },
    { title: "Monthly Retainer", unitPrice: 100000, unit: "month", taxRate: 18 },
];

function SectionCard({ title, children, action }: { title: string; children: React.ReactNode; action?: React.ReactNode }) {
    return (
        <div className="rounded-xl border border-border/60 bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                    {title}
                </p>
                {action}
            </div>
            <div>{children}</div>
        </div>
    );
}

export function ItemsSection({ formState, onFormStateChange }: ItemsSectionProps) {
    const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());
    const [showSavedItems, setShowSavedItems] = useState(false);
    const [compactView, setCompactView] = useState(true);

    // Fetch saved items from API
    const { items: savedItems, loading: loadingSavedItems, saveItem, trackUsage } = useSavedItems();

    // Memoized handlers for stable references
    const updateField = useCallback(<K extends keyof InvoiceFormState>(
        field: K,
        value: InvoiceFormState[K]
    ) => {
        onFormStateChange({ ...formState, [field]: value });
    }, [formState, onFormStateChange]);

    const updateItem = useCallback((index: number, field: keyof InvoiceItemInput, value: any) => {
        const newItems = [...formState.items];
        newItems[index] = { ...newItems[index], [field]: value };
        onFormStateChange({ ...formState, items: newItems });
    }, [formState, onFormStateChange]);

    const addItem = useCallback((prefill?: Partial<InvoiceItemInput>) => {
        const defaultTax = formState.taxSettings?.defaultRate || 0;
        onFormStateChange({
            ...formState,
            items: [
                ...formState.items,
                { title: "", quantity: 1, unitPrice: 0, taxRate: defaultTax, ...prefill },
            ],
        });
    }, [formState, onFormStateChange]);

    const duplicateItem = useCallback((index: number) => {
        const item = formState.items[index];
        const newItems = [...formState.items];
        newItems.splice(index + 1, 0, { ...item });
        onFormStateChange({ ...formState, items: newItems });
    }, [formState, onFormStateChange]);

    const removeItem = useCallback((index: number) => {
        onFormStateChange({ ...formState, items: formState.items.filter((_, i) => i !== index) });
        setExpandedRows(prev => {
            const newSet = new Set(prev);
            newSet.delete(index);
            return newSet;
        });
    }, [formState, onFormStateChange]);

    const toggleExpand = useCallback((index: number) => {
        setExpandedRows(prev => {
            const newSet = new Set(prev);
            if (newSet.has(index)) {
                newSet.delete(index);
            } else {
                newSet.add(index);
            }
            return newSet;
        });
    }, []);

    // Apply default tax to all items
    const applyDefaultTax = useCallback(() => {
        const rate = formState.taxSettings?.defaultRate || 18;
        onFormStateChange({ ...formState, items: formState.items.map(item => ({ ...item, taxRate: rate })) });
    }, [formState, onFormStateChange]);

    // Calculate line total with tax consideration
    const calculateLineTotal = (item: InvoiceItemInput): number => {
        const base = (item.quantity || 0) * (item.unitPrice || 0);
        const taxRate = item.taxRate || 0;

        if (formState.taxSettings?.inclusive) {
            return base;
        }
        return base + (base * taxRate) / 100;
    };

    // Calculate subtotal (before tax)
    const subtotal = formState.items.reduce(
        (sum, item) => {
            const base = (item.quantity || 0) * (item.unitPrice || 0);
            if (formState.taxSettings?.inclusive) {
                const rate = item.taxRate || 0;
                return sum + (rate > 0 ? base / (1 + rate / 100) : base);
            }
            return sum + base;
        },
        0
    );

    // Calculate tax total
    const taxTotal = formState.items.reduce(
        (sum, item) => {
            const base = (item.quantity || 0) * (item.unitPrice || 0);
            const rate = item.taxRate || 0;
            if (formState.taxSettings?.inclusive) {
                return sum + (rate > 0 ? base - base / (1 + rate / 100) : 0);
            }
            return sum + (base * rate) / 100;
        },
        0
    );

    // Calculate discount
    const discountTotal = formState.adjustments
        ?.filter(a => a.type === "discount")
        .reduce((sum, adj) => {
            const base = adj.mode === "percent" ? (adj.value / 100) * subtotal : adj.value;
            return sum + base;
        }, 0) || 0;

    const total = subtotal + taxTotal - discountTotal;

    return (
        <div className="space-y-4 w-full">
            {/* Header with controls */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <h3 className="text-sm font-semibold">Line Items</h3>
                    <Badge variant="secondary" className="text-[11px]">
                        {formState.items.length} item{formState.items.length !== 1 ? 's' : ''}
                    </Badge>
                </div>
                <div className="flex items-center gap-2">
                    <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-[11px] gap-1"
                        onClick={() => setCompactView(!compactView)}
                    >
                        {compactView ? <ChevronDown className="h-3 w-3" /> : <ChevronUp className="h-3 w-3" />}
                        {compactView ? 'Expand All' : 'Compact'}
                    </Button>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="sm" className="h-7 text-[11px]">
                                <MoreHorizontal className="h-3.5 w-3.5" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                            <DropdownMenuItem onClick={() => setShowSavedItems(!showSavedItems)}>
                                <Package className="h-3.5 w-3.5 mr-2" />
                                Insert saved item
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={applyDefaultTax}>
                                <Percent className="h-3.5 w-3.5 mr-2" />
                                Apply {formState.taxSettings?.defaultRate || 18}% to all
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-destructive" onClick={() => updateField("items", [{ title: "", quantity: 1, unitPrice: 0, taxRate: 0 }])}>
                                <Trash2 className="h-3.5 w-3.5 mr-2" />
                                Clear all items
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </div>

            {/* Saved Items Quick Pick */}
            {showSavedItems && (
                <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 space-y-2">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-primary">Quick add saved items</span>
                        <Button variant="ghost" size="sm" className="h-6 text-[10px]" onClick={() => setShowSavedItems(false)}>
                            Close
                        </Button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {(savedItems.length > 0 ? savedItems : FALLBACK_ITEMS.map((item, i) => ({
                            id: `fallback-${i}`,
                            title: item.title,
                            rate: item.unitPrice,
                            unit: item.unit,
                            taxRate: item.taxRate,
                            description: null,
                            hsnCode: null,
                            category: null,
                            usageCount: 0,
                            lastUsedAt: null,
                        }))).slice(0, 6).map((item) => (
                            <Button
                                key={item.id}
                                variant="outline"
                                size="sm"
                                className="h-7 text-[11px] bg-white"
                                onClick={() => {
                                    addItem({
                                        title: item.title,
                                        unitPrice: item.rate,
                                        taxRate: item.taxRate || 18,
                                        description: item.description || undefined,
                                    });
                                    // Track usage if it's a saved item (not fallback)
                                    if (!item.id.startsWith('fallback-')) {
                                        trackUsage(item.id);
                                    }
                                    setShowSavedItems(false);
                                }}
                            >
                                <Plus className="h-3 w-3 mr-1" />
                                {item.title}
                            </Button>
                        ))}
                        {loadingSavedItems && (
                            <span className="text-xs text-muted-foreground">Loading...</span>
                        )}
                    </div>
                </div>
            )}

            {/* Items Table */}
            <div className="rounded-xl border border-border/60 bg-white overflow-hidden w-full">
                {/* Table Header */}
                <div className="grid grid-cols-[18px_1fr_50px_70px_50px_75px_28px] gap-0.5 px-2 py-2 text-[9px] font-semibold text-muted-foreground uppercase tracking-wider bg-muted/30 border-b border-border/40">
                    <span></span>
                    <span>Item</span>
                    <span className="text-center">Qty</span>
                    <span className="text-center">Rate</span>
                    <span className="text-center">Tax</span>
                    <span className="text-right">Total</span>
                    <span></span>
                </div>

                {/* Table Rows */}
                <div className="divide-y divide-border/30">
                    {formState.items.map((item, index) => {
                        const lineTotal = calculateLineTotal(item);
                        const isExpanded = expandedRows.has(index) || !compactView;
                        return (
                            <div key={index} className="group">
                                {/* Main Row */}
                                <div
                                    className={cn(
                                        "grid grid-cols-[18px_1fr_50px_70px_50px_75px_28px] gap-0.5 items-center py-1.5 px-2 transition-colors",
                                        "hover:bg-muted/20"
                                    )}
                                >
                                    {/* Drag Handle + Expand */}
                                    <div className="flex items-center justify-center">
                                        <button
                                            onClick={() => toggleExpand(index)}
                                            className="text-muted-foreground/40 hover:text-muted-foreground transition-colors"
                                        >
                                            {isExpanded ? (
                                                <ChevronUp className="h-3 w-3" />
                                            ) : (
                                                <GripVertical className="h-3 w-3 cursor-grab" />
                                            )}
                                        </button>
                                    </div>

                                    {/* Description */}
                                    <Input
                                        value={item.title}
                                        onChange={(e) => updateItem(index, "title", e.target.value)}
                                        placeholder="Item"
                                        className="h-7 text-xs border-0 bg-transparent hover:bg-muted/30 focus:bg-white focus:ring-1 focus:ring-primary/30 px-1"
                                    />

                                    {/* Quantity */}
                                    <Input
                                        type="number"
                                        value={item.quantity}
                                        onChange={(e) => updateItem(index, "quantity", parseFloat(e.target.value) || 0)}
                                        min="0"
                                        step="1"
                                        className="h-7 text-xs text-center border-0 bg-transparent hover:bg-muted/30 focus:bg-white focus:ring-1 focus:ring-primary/30 px-0"
                                    />

                                    {/* Rate */}
                                    <Input
                                        type="number"
                                        value={item.unitPrice}
                                        onChange={(e) => updateItem(index, "unitPrice", parseFloat(e.target.value) || 0)}
                                        min="0"
                                        className="h-7 text-xs text-center border-0 bg-transparent hover:bg-muted/30 focus:bg-white focus:ring-1 focus:ring-primary/30 px-0"
                                    />

                                    {/* Tax Rate */}
                                    <Select
                                        value={String(item.taxRate || 0)}
                                        onValueChange={(v) => updateItem(index, "taxRate", parseFloat(v) || 0)}
                                    >
                                        <SelectTrigger className="h-7 text-[10px] border-0 bg-transparent hover:bg-muted/30 px-0.5">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="0">0%</SelectItem>
                                            <SelectItem value="5">5%</SelectItem>
                                            <SelectItem value="12">12%</SelectItem>
                                            <SelectItem value="18">18%</SelectItem>
                                            <SelectItem value="28">28%</SelectItem>
                                        </SelectContent>
                                    </Select>

                                    {/* Line Total */}
                                    <span className="text-right text-[11px] font-medium tabular-nums">
                                        ₹{lineTotal.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                                    </span>

                                    {/* Actions Menu */}
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className={cn(
                                                    "h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                                                )}
                                            >
                                                <MoreHorizontal className="h-3 w-3 text-muted-foreground" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end" className="w-40">
                                            <DropdownMenuItem onClick={() => toggleExpand(index)}>
                                                {isExpanded ? 'Collapse' : 'Expand details'}
                                            </DropdownMenuItem>
                                            <DropdownMenuItem onClick={() => duplicateItem(index)}>
                                                <Copy className="h-3.5 w-3.5 mr-2" />
                                                Duplicate
                                            </DropdownMenuItem>
                                            <DropdownMenuItem
                                                onClick={async () => {
                                                    const saved = await saveItem({
                                                        title: item.title || "Untitled Item",
                                                        description: (item as any).description || null,
                                                        rate: item.unitPrice || 0,
                                                        unit: (item as any).unit || "nos",
                                                        taxRate: item.taxRate || null,
                                                        hsnCode: (item as any).hsnCode || null,
                                                        category: null,
                                                    });
                                                    if (saved) {
                                                        // Could show a toast notification here
                                                        console.log("Item saved as template:", saved);
                                                    }
                                                }}
                                            >
                                                <Save className="h-3.5 w-3.5 mr-2" />
                                                Save as template
                                            </DropdownMenuItem>
                                            <DropdownMenuSeparator />
                                            <DropdownMenuItem
                                                className="text-destructive"
                                                disabled={formState.items.length === 1}
                                                onClick={() => removeItem(index)}
                                            >
                                                <Trash2 className="h-3.5 w-3.5 mr-2" />
                                                Remove
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </div>

                                {/* Expanded Details */}
                                {isExpanded && (
                                    <div className="px-3 pb-3 pt-1 bg-muted/10 border-t border-dashed border-border/30">
                                        <div className="grid grid-cols-2 gap-3 ml-7">
                                            <div>
                                                <Label className="text-[10px] text-muted-foreground">Description / Notes</Label>
                                                <Textarea
                                                    value={(item as any).description || ""}
                                                    onChange={(e) => updateItem(index, "description" as any, e.target.value)}
                                                    placeholder="Add a detailed description..."
                                                    className="mt-1 h-16 text-xs resize-none"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <div>
                                                    <Label className="text-[10px] text-muted-foreground">Unit</Label>
                                                    <Select
                                                        value={(item as any).unit || "units"}
                                                        onValueChange={(v) => updateItem(index, "unit" as any, v)}
                                                    >
                                                        <SelectTrigger className="h-7 mt-1 text-xs">
                                                            <SelectValue />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="nos">Nos</SelectItem>
                                                            <SelectItem value="units">Units</SelectItem>
                                                            <SelectItem value="qty">Qty</SelectItem>
                                                            <SelectItem value="pcs">Pieces</SelectItem>
                                                            <SelectItem value="hours">Hours</SelectItem>
                                                            <SelectItem value="days">Days</SelectItem>
                                                            <SelectItem value="weeks">Weeks</SelectItem>
                                                            <SelectItem value="months">Months</SelectItem>
                                                            <SelectItem value="project">Project</SelectItem>
                                                            <SelectItem value="kg">Kg</SelectItem>
                                                            <SelectItem value="ltr">Ltr</SelectItem>
                                                            <SelectItem value="box">Box</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                                <div>
                                                    <Label className="text-[10px] text-muted-foreground">HSN/SAC Code</Label>
                                                    <Input
                                                        value={(item as any).hsnCode || ""}
                                                        onChange={(e) => updateItem(index, "hsnCode" as any, e.target.value)}
                                                        placeholder="e.g. 998314"
                                                        className="h-7 mt-1 text-xs"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>

                {/* Add Item Row */}
                <div className="px-3 py-2 border-t border-border/40 bg-muted/10">
                    <Button
                        onClick={() => addItem()}
                        variant="ghost"
                        className="w-full h-8 text-xs text-muted-foreground hover:text-primary gap-1"
                    >
                        <Plus className="h-3.5 w-3.5" />
                        Add line item
                    </Button>
                </div>
            </div>

            {/* Summary Card */}
            <div className="rounded-xl border border-border/60 bg-gradient-to-br from-slate-50 to-white p-3 shadow-sm">
                <div className="space-y-2.5 text-xs">
                    {/* Discount Controls */}
                    <div className="flex items-center justify-between pb-2 border-b border-border/40">
                        <div className="flex items-center gap-2">
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
                                                value: 10
                                            }]);
                                        }
                                    } else {
                                        updateField("adjustments", (formState.adjustments || []).filter(a => a.type !== "discount"));
                                    }
                                }}
                            />
                            <Label className="text-xs text-muted-foreground">Add discount</Label>
                        </div>
                        {formState.adjustments?.some(a => a.type === "discount") && (
                            <div className="flex items-center gap-2">
                                <Select
                                    value={formState.adjustments.find(a => a.type === "discount")?.mode || "percent"}
                                    onValueChange={(v) => {
                                        const adjustments = [...(formState.adjustments || [])];
                                        const discountIdx = adjustments.findIndex(a => a.type === "discount");
                                        if (discountIdx >= 0) {
                                            adjustments[discountIdx] = {
                                                ...adjustments[discountIdx],
                                                mode: v as "percent" | "fixed"
                                            };
                                            updateField("adjustments", adjustments);
                                        }
                                    }}
                                >
                                    <SelectTrigger className="h-7 w-20 text-[11px]">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="percent">%</SelectItem>
                                        <SelectItem value="fixed">₹</SelectItem>
                                    </SelectContent>
                                </Select>
                                <Input
                                    type="number"
                                    value={formState.adjustments.find(a => a.type === "discount")?.value || 0}
                                    onChange={(e) => {
                                        const adjustments = [...(formState.adjustments || [])];
                                        const discountIdx = adjustments.findIndex(a => a.type === "discount");
                                        if (discountIdx >= 0) {
                                            adjustments[discountIdx] = {
                                                ...adjustments[discountIdx],
                                                value: parseFloat(e.target.value) || 0
                                            };
                                            updateField("adjustments", adjustments);
                                        }
                                    }}
                                    className="h-7 w-20 text-xs text-center"
                                    min="0"
                                />
                            </div>
                        )}
                    </div>

                    <div className="flex justify-between py-0.5">
                        <span className="text-muted-foreground text-xs">Subtotal</span>
                        <span className="font-medium tabular-nums text-xs">
                            ₹{subtotal.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                        </span>
                    </div>
                    <div className="flex justify-between py-0.5">
                        <span className="text-muted-foreground flex items-center gap-1 text-xs">
                            Tax
                            {formState.taxSettings?.inclusive && (
                                <Badge variant="outline" className="text-[8px] px-1 py-0 h-3">incl.</Badge>
                            )}
                        </span>
                        <span className="font-medium tabular-nums text-amber-600 text-xs">
                            +₹{taxTotal.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                        </span>
                    </div>

                    {discountTotal > 0 && (
                        <div className="flex justify-between py-0.5">
                            <span className="text-emerald-600 text-xs">Discount</span>
                            <span className="font-medium tabular-nums text-emerald-600 text-xs">
                                -₹{discountTotal.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                            </span>
                        </div>
                    )}

                    <div className="border-t border-border/60 pt-2 mt-1.5">
                        <div className="flex justify-between items-center">
                            <span className="font-semibold text-sm">Total</span>
                            <span className="font-bold text-lg tabular-nums">
                                ₹{total.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
