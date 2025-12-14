"use client";

import { useState } from "react";
import { Plus, Trash2, Edit2, Save, X, Package, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";

type SavedItem = {
    id: string;
    title: string;
    description: string | null;
    rate: number;
    unit: string | null;
    taxRate: number | null;
    hsnCode: string | null;
    category: string | null;
    usageCount: number;
    lastUsedAt: string | null;
};

type UserSettings = {
    defaultTaxRate: number | null;
    taxInclusive: boolean;
    defaultCurrency: string;
    paymentTerms: string | null;
    defaultNotes: string | null;
    defaultTerms: string | null;
};

type SavedItemsManagerProps = {
    initialItems: SavedItem[];
    initialSettings: UserSettings;
};

export function SavedItemsManager({ initialItems, initialSettings }: SavedItemsManagerProps) {
    const [items, setItems] = useState<SavedItem[]>(initialItems);
    const [settings, setSettings] = useState<UserSettings>(initialSettings);
    const [searchQuery, setSearchQuery] = useState("");
    const [editingItem, setEditingItem] = useState<SavedItem | null>(null);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [saving, setSaving] = useState(false);
    const [savingSettings, setSavingSettings] = useState(false);

    // Filter items by search
    const filteredItems = items.filter(
        (item) =>
            item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            item.description?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    // Create new item
    const handleCreateItem = () => {
        setEditingItem({
            id: "",
            title: "",
            description: null,
            rate: 0,
            unit: "nos",
            taxRate: settings.defaultTaxRate,
            hsnCode: null,
            category: null,
            usageCount: 0,
            lastUsedAt: null,
        });
        setIsDialogOpen(true);
    };

    // Edit existing item
    const handleEditItem = (item: SavedItem) => {
        setEditingItem({ ...item });
        setIsDialogOpen(true);
    };

    // Save item (create or update)
    const handleSaveItem = async () => {
        if (!editingItem || !editingItem.title.trim()) return;

        setSaving(true);
        try {
            const isNew = !editingItem.id;
            const url = isNew ? "/api/items" : `/api/items/${editingItem.id}`;
            const method = isNew ? "POST" : "PUT";

            const res = await fetch(url, {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    title: editingItem.title,
                    description: editingItem.description,
                    rate: editingItem.rate,
                    unit: editingItem.unit,
                    taxRate: editingItem.taxRate,
                    hsnCode: editingItem.hsnCode,
                    category: editingItem.category,
                }),
            });

            if (res.ok) {
                const { item } = await res.json();
                if (isNew) {
                    setItems([item, ...items]);
                } else {
                    setItems(items.map((i) => (i.id === item.id ? item : i)));
                }
                setIsDialogOpen(false);
                setEditingItem(null);
            }
        } catch (err) {
            console.error("Failed to save item:", err);
        } finally {
            setSaving(false);
        }
    };

    // Delete item
    const handleDeleteItem = async (id: string) => {
        if (!confirm("Are you sure you want to delete this item?")) return;

        try {
            const res = await fetch(`/api/items/${id}`, { method: "DELETE" });
            if (res.ok) {
                setItems(items.filter((i) => i.id !== id));
            }
        } catch (err) {
            console.error("Failed to delete item:", err);
        }
    };

    // Save settings
    const handleSaveSettings = async () => {
        setSavingSettings(true);
        try {
            const res = await fetch("/api/user/settings", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(settings),
            });
            if (res.ok) {
                // Show success feedback
            }
        } catch (err) {
            console.error("Failed to save settings:", err);
        } finally {
            setSavingSettings(false);
        }
    };

    return (
        <div className="space-y-8">
            {/* Invoice Defaults Section */}
            <section className="rounded-2xl border border-border/60 bg-white p-6 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                    <div>
                        <h3 className="text-lg font-semibold">Invoice Defaults</h3>
                        <p className="text-sm text-muted-foreground">
                            These settings are applied to new invoices automatically.
                        </p>
                    </div>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={handleSaveSettings}
                        disabled={savingSettings}
                    >
                        {savingSettings ? "Saving..." : "Save Defaults"}
                    </Button>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                    <div>
                        <Label className="text-xs font-medium text-muted-foreground">
                            Default Tax Rate
                        </Label>
                        <Select
                            value={String(settings.defaultTaxRate || 0)}
                            onValueChange={(v) =>
                                setSettings({ ...settings, defaultTaxRate: parseFloat(v) })
                            }
                        >
                            <SelectTrigger className="mt-1">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="0">No tax</SelectItem>
                                <SelectItem value="5">5% GST</SelectItem>
                                <SelectItem value="12">12% GST</SelectItem>
                                <SelectItem value="18">18% GST</SelectItem>
                                <SelectItem value="28">28% GST</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="flex items-center justify-between rounded-lg border p-3">
                        <div>
                            <Label className="text-sm font-medium">Prices include tax</Label>
                            <p className="text-xs text-muted-foreground">
                                Tax-inclusive pricing mode
                            </p>
                        </div>
                        <Switch
                            checked={settings.taxInclusive}
                            onCheckedChange={(checked) =>
                                setSettings({ ...settings, taxInclusive: checked })
                            }
                        />
                    </div>

                    <div>
                        <Label className="text-xs font-medium text-muted-foreground">
                            Currency
                        </Label>
                        <Select
                            value={settings.defaultCurrency}
                            onValueChange={(v) =>
                                setSettings({ ...settings, defaultCurrency: v })
                            }
                        >
                            <SelectTrigger className="mt-1">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="INR">₹ INR (Indian Rupee)</SelectItem>
                                <SelectItem value="USD">$ USD (US Dollar)</SelectItem>
                                <SelectItem value="EUR">€ EUR (Euro)</SelectItem>
                                <SelectItem value="GBP">£ GBP (British Pound)</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div>
                        <Label className="text-xs font-medium text-muted-foreground">
                            Payment Terms
                        </Label>
                        <Select
                            value={settings.paymentTerms || "Net 30"}
                            onValueChange={(v) =>
                                setSettings({ ...settings, paymentTerms: v })
                            }
                        >
                            <SelectTrigger className="mt-1">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="Due on receipt">Due on receipt</SelectItem>
                                <SelectItem value="Net 7">Net 7 days</SelectItem>
                                <SelectItem value="Net 15">Net 15 days</SelectItem>
                                <SelectItem value="Net 30">Net 30 days</SelectItem>
                                <SelectItem value="Net 45">Net 45 days</SelectItem>
                                <SelectItem value="Net 60">Net 60 days</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="md:col-span-2">
                        <Label className="text-xs font-medium text-muted-foreground">
                            Default Notes (appears on invoice)
                        </Label>
                        <Textarea
                            value={settings.defaultNotes || ""}
                            onChange={(e) =>
                                setSettings({ ...settings, defaultNotes: e.target.value })
                            }
                            placeholder="Thank you for your business!"
                            className="mt-1 min-h-[80px]"
                        />
                    </div>

                    <div className="md:col-span-2">
                        <Label className="text-xs font-medium text-muted-foreground">
                            Default Terms & Conditions
                        </Label>
                        <Textarea
                            value={settings.defaultTerms || ""}
                            onChange={(e) =>
                                setSettings({ ...settings, defaultTerms: e.target.value })
                            }
                            placeholder="Payment is due within 30 days..."
                            className="mt-1 min-h-[80px]"
                        />
                    </div>
                </div>
            </section>

            {/* Saved Items Section */}
            <section className="rounded-2xl border border-border/60 bg-white p-6 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                    <div>
                        <h3 className="text-lg font-semibold">Saved Items Library</h3>
                        <p className="text-sm text-muted-foreground">
                            Quick-add these items when creating invoices.
                        </p>
                    </div>
                    <Button onClick={handleCreateItem}>
                        <Plus className="h-4 w-4 mr-2" />
                        Add Item
                    </Button>
                </div>

                {/* Search */}
                <div className="relative mb-4">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search items..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10"
                    />
                </div>

                {/* Items List */}
                {filteredItems.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                        <Package className="h-12 w-12 mx-auto mb-3 opacity-30" />
                        <p>No saved items yet</p>
                        <p className="text-sm">
                            Add items to quickly use them in your invoices.
                        </p>
                    </div>
                ) : (
                    <div className="divide-y divide-border/50">
                        {filteredItems.map((item) => (
                            <div
                                key={item.id}
                                className="flex items-center justify-between py-3 group"
                            >
                                <div className="flex-1">
                                    <div className="flex items-center gap-2">
                                        <p className="font-medium">{item.title}</p>
                                        {item.usageCount > 0 && (
                                            <Badge variant="secondary" className="text-[10px]">
                                                Used {item.usageCount}x
                                            </Badge>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-3 text-sm text-muted-foreground">
                                        <span>₹{item.rate.toLocaleString()}</span>
                                        {item.unit && <span>per {item.unit}</span>}
                                        {item.taxRate !== null && (
                                            <span>{item.taxRate}% tax</span>
                                        )}
                                        {item.hsnCode && <span>HSN: {item.hsnCode}</span>}
                                    </div>
                                    {item.description && (
                                        <p className="text-xs text-muted-foreground mt-1">
                                            {item.description}
                                        </p>
                                    )}
                                </div>
                                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => handleEditItem(item)}
                                    >
                                        <Edit2 className="h-4 w-4" />
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => handleDeleteItem(item.id)}
                                        className="text-destructive hover:text-destructive"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </section>

            {/* Edit/Create Item Dialog */}
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>
                            {editingItem?.id ? "Edit Item" : "Add New Item"}
                        </DialogTitle>
                        <DialogDescription>
                            {editingItem?.id
                                ? "Update this saved item."
                                : "Create a new item for your library."}
                        </DialogDescription>
                    </DialogHeader>

                    {editingItem && (
                        <div className="space-y-4">
                            <div>
                                <Label>Title *</Label>
                                <Input
                                    value={editingItem.title}
                                    onChange={(e) =>
                                        setEditingItem({ ...editingItem, title: e.target.value })
                                    }
                                    placeholder="e.g., Web Development"
                                />
                            </div>
                            <div>
                                <Label>Description</Label>
                                <Textarea
                                    value={editingItem.description || ""}
                                    onChange={(e) =>
                                        setEditingItem({
                                            ...editingItem,
                                            description: e.target.value,
                                        })
                                    }
                                    placeholder="Optional description"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <Label>Rate (₹)</Label>
                                    <Input
                                        type="number"
                                        value={editingItem.rate}
                                        onChange={(e) =>
                                            setEditingItem({
                                                ...editingItem,
                                                rate: parseFloat(e.target.value) || 0,
                                            })
                                        }
                                    />
                                </div>
                                <div>
                                    <Label>Unit</Label>
                                    <Select
                                        value={editingItem.unit || "nos"}
                                        onValueChange={(v) =>
                                            setEditingItem({ ...editingItem, unit: v })
                                        }
                                    >
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="nos">Nos</SelectItem>
                                            <SelectItem value="hour">Hour</SelectItem>
                                            <SelectItem value="day">Day</SelectItem>
                                            <SelectItem value="project">Project</SelectItem>
                                            <SelectItem value="month">Month</SelectItem>
                                            <SelectItem value="kg">Kg</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <Label>Tax Rate (%)</Label>
                                    <Input
                                        type="number"
                                        value={editingItem.taxRate ?? ""}
                                        onChange={(e) =>
                                            setEditingItem({
                                                ...editingItem,
                                                taxRate: e.target.value
                                                    ? parseFloat(e.target.value)
                                                    : null,
                                            })
                                        }
                                        placeholder="e.g., 18"
                                    />
                                </div>
                                <div>
                                    <Label>HSN Code</Label>
                                    <Input
                                        value={editingItem.hsnCode || ""}
                                        onChange={(e) =>
                                            setEditingItem({
                                                ...editingItem,
                                                hsnCode: e.target.value,
                                            })
                                        }
                                        placeholder="Optional"
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => setIsDialogOpen(false)}
                            disabled={saving}
                        >
                            Cancel
                        </Button>
                        <Button onClick={handleSaveItem} disabled={saving}>
                            {saving ? "Saving..." : "Save Item"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
