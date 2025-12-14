"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2, FolderKanban, FileText, Plus, Trash2, DollarSign, Wand2 } from "lucide-react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

type Client = {
    id: string;
    name: string;
};

type CreateProjectModalProps = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onProjectCreated: (project: { id: string; name: string; clientId?: string }) => void;
    clients: Client[];
    projectToEdit?: {
        id: string;
        name: string;
        description?: string | null;
        clientId?: string | null;
        billableItems?: any[] | null;
    } | null;
    preselectedClientId?: string;
};

export function CreateProjectModal({
    open,
    onOpenChange,
    onProjectCreated,
    clients,
    preselectedClientId,
    projectToEdit,
}: CreateProjectModalProps) {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);
    const [formData, setFormData] = useState({
        name: "",
        description: "",
        clientId: preselectedClientId || "",
    });
    const [billableItems, setBillableItems] = useState<Array<{
        title: string;
        quantity: number;
        unitPrice: number;
    }>>([
        { title: "", quantity: 1, unitPrice: 0 },
    ]);

    // Handle initial state (Create vs Edit)
    // Handle initial state (Create vs Edit)
    useEffect(() => {
        if (open) {
            if (projectToEdit) {
                setFormData({
                    name: projectToEdit.name,
                    description: projectToEdit.description || "",
                    clientId: projectToEdit.clientId || "",
                });
                if (projectToEdit.billableItems && Array.isArray(projectToEdit.billableItems)) {
                    setBillableItems(projectToEdit.billableItems.map(item => ({
                        title: item.title,
                        quantity: item.quantity || 1,
                        unitPrice: item.unitPrice || 0
                    })));
                } else {
                    setBillableItems([{ title: "", quantity: 1, unitPrice: 0 }]);
                }
            } else {
                setFormData(prev => ({
                    ...prev,
                    clientId: preselectedClientId || "",
                    name: "",
                    description: ""
                }));
                setBillableItems([{ title: "", quantity: 1, unitPrice: 0 }]);
            }
        }
    }, [open, projectToEdit, preselectedClientId]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData.name.trim()) {
            toast.error("Project name is required");
            return;
        }

        setIsLoading(true);
        try {
            const url = projectToEdit ? `/api/projects/${projectToEdit.id}` : "/api/projects";
            const method = projectToEdit ? "PATCH" : "POST";

            const res = await fetch(url, {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    ...formData,
                    clientId: formData.clientId || undefined,
                    billableItems: billableItems.filter(item => item.title.trim()),
                }),
            });

            if (!res.ok) {
                const error = await res.json();
                throw new Error(error.error || `Failed to ${projectToEdit ? 'update' : 'create'} project`);
            }

            const data = await res.json();
            toast.success(`Project "${data.project.name}" ${projectToEdit ? 'updated' : 'created'}!`);
            onProjectCreated(data.project);
            onOpenChange(false);

            // Reset form if creating (for editing, state persists until modal close/reopen handles logic)
            if (!projectToEdit) {
                setFormData({
                    name: "",
                    description: "",
                    clientId: "",
                });
                setBillableItems([{ title: "", quantity: 1, unitPrice: 0 }]);
            }
        } catch (error) {
            console.error("Error saving project:", error);
            toast.error(error instanceof Error ? error.message : "Failed to save project");
        } finally {
            setIsLoading(false);
        }
    };

    const addItem = () => {
        setBillableItems([...billableItems, { title: "", quantity: 1, unitPrice: 0 }]);
    };

    const removeItem = (index: number) => {
        if (billableItems.length === 1) return;
        setBillableItems(billableItems.filter((_, i) => i !== index));
    };

    const updateItem = (index: number, field: keyof typeof billableItems[0], value: string | number) => {
        setBillableItems(billableItems.map((item, i) =>
            i === index ? { ...item, [field]: value } : item
        ));
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[440px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <FolderKanban className="h-5 w-5 text-primary" />
                        Create New Project
                    </DialogTitle>
                    <DialogDescription className="flex flex-col gap-2">
                        <span>Create a project to organize your invoices and track work for a client.</span>
                        <button
                            type="button"
                            onClick={() => {
                                onOpenChange(false);
                                router.push("/clients?wizard=true");
                            }}
                            className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline w-fit"
                        >
                            <Wand2 className="h-3 w-3" />
                            Or use AI Wizard for smart extraction from documents
                        </button>
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Project Name */}
                    <div className="space-y-2">
                        <Label htmlFor="projectName" className="text-xs font-medium">
                            Project Name <span className="text-rose-500">*</span>
                        </Label>
                        <div className="relative">
                            <FolderKanban className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                id="projectName"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                placeholder="Website Redesign"
                                className="pl-9"
                                autoFocus
                            />
                        </div>
                    </div>

                    {/* Client Selection */}
                    <div className="space-y-2">
                        <Label htmlFor="clientId" className="text-xs font-medium">
                            Assign to Client
                        </Label>
                        <Select
                            value={formData.clientId || "none"}
                            onValueChange={(value) => setFormData({ ...formData, clientId: value === "none" ? "" : value })}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Select a client (optional)" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="none">No client</SelectItem>
                                {clients.map((client) => (
                                    <SelectItem key={client.id} value={client.id}>
                                        {client.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <p className="text-[11px] text-muted-foreground">
                            Link this project to a specific client for better organization.
                        </p>
                    </div>

                    {/* Description */}
                    <div className="space-y-2">
                        <Label htmlFor="description" className="text-xs font-medium flex items-center gap-1">
                            <FileText className="h-3 w-3" />
                            Description
                        </Label>
                        <Textarea
                            id="description"
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            placeholder="Brief description of the project scope..."
                            className="h-16 resize-none"
                        />
                    </div>

                    {/* Billable Items */}
                    <div className="space-y-2">
                        <Label className="text-xs font-medium flex items-center gap-1">
                            <DollarSign className="h-3 w-3" />
                            Billable Items
                            <span className="text-muted-foreground font-normal">(auto-fill invoices)</span>
                        </Label>
                        <p className="text-[10px] text-muted-foreground -mt-1">
                            Define items that should be included every time you invoice this project.
                        </p>
                        <div className="space-y-2 max-h-40 overflow-y-auto">
                            {billableItems.map((item, idx) => (
                                <div key={idx} className="flex items-center gap-2">
                                    <Input
                                        value={item.title}
                                        onChange={(e) => updateItem(idx, "title", e.target.value)}
                                        placeholder="Item name"
                                        className="h-8 text-xs flex-1"
                                    />
                                    <Input
                                        type="number"
                                        value={item.quantity}
                                        onChange={(e) => updateItem(idx, "quantity", parseInt(e.target.value) || 1)}
                                        placeholder="Qty"
                                        className="h-8 text-xs w-14 text-center"
                                        min={1}
                                    />
                                    <Input
                                        type="number"
                                        value={item.unitPrice || ""}
                                        onChange={(e) => updateItem(idx, "unitPrice", parseFloat(e.target.value) || 0)}
                                        placeholder="Price"
                                        className="h-8 text-xs w-20"
                                        min={0}
                                    />
                                    {billableItems.length > 1 && (
                                        <button
                                            type="button"
                                            onClick={() => removeItem(idx)}
                                            className="p-1.5 text-muted-foreground hover:text-rose-500 transition"
                                        >
                                            <Trash2 className="h-3.5 w-3.5" />
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={addItem}
                            className="w-full text-[11px] h-7"
                        >
                            <Plus className="h-3 w-3 mr-1" />
                            Add Item
                        </Button>
                    </div>

                    <DialogFooter className="pt-4">
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={isLoading}>
                            {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                            Create Project
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
