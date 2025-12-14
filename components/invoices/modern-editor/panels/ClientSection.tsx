"use client";

import { useState, useEffect } from "react";
import { Plus, MapPin, Mail, Building2, Phone, Save, ChevronDown, ChevronUp, Pencil, UserPlus, FolderPlus } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { InvoiceFormState } from "../../invoice-form";
import { cn } from "@/lib/utils";

type Client = {
    id: string;
    name: string;
    email?: string | null;
    phone?: string | null;
    company?: string | null;
    addressLine1?: string | null;
    addressLine2?: string | null;
    city?: string | null;
    state?: string | null;
    country?: string | null;
    postalCode?: string | null;
    address?: string | null; // Combined address for backward compatibility
};

type Project = {
    id: string;
    name: string;
    description?: string | null;
    status?: string | null;
    clientId?: string | null;
    billableItems?: Array<{ title: string; quantity: number; unitPrice: number }> | null;
    milestones?: Array<{ title: string; amount: number; currency: string; description?: string | null }> | null;
};

type ClientSectionProps = {
    formState: InvoiceFormState;
    onFormStateChange: (state: InvoiceFormState) => void;
    clients: Client[];
    projects: Project[];
    onCreateClient?: () => void;
    onCreateProject?: () => void;
    onProjectSelect?: (project: Project) => void;
    onClientUpdate?: (clientId: string, data: Partial<{ email: string; phone: string; addressLine1: string; addressLine2: string; city: string; state: string; postalCode: string; country: string }>) => Promise<void>;
    onEditProject?: (project: Project) => void;
};

// Helper to infer region from address for tax automation
function inferClientRegion(address?: string | null): { region: string; taxRate: number } | null {
    if (!address) return null;
    const addr = address.toLowerCase();

    // India detection
    if (addr.includes("india") || /\b\d{6}\b/.test(addr)) {
        return { region: "India", taxRate: 18 };
    }

    // UK detection
    if (addr.includes("uk") || addr.includes("united kingdom") || addr.includes("england")) {
        return { region: "UK", taxRate: 20 };
    }

    // EU detection
    if (
        addr.includes("germany") ||
        addr.includes("france") ||
        addr.includes("netherlands") ||
        addr.includes("spain") ||
        addr.includes("italy")
    ) {
        return { region: "EU", taxRate: 21 };
    }

    return null;
}

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
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

export function ClientSection({
    formState,
    onFormStateChange,
    clients,
    projects,
    onCreateClient,
    onCreateProject,
    onProjectSelect,
    onClientUpdate,
    onEditProject,
}: ClientSectionProps) {
    const [isEditingBilling, setIsEditingBilling] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [billingExpanded, setBillingExpanded] = useState(true);

    // Local billing info state (for editing)
    const [billingInfo, setBillingInfo] = useState({
        email: "",
        phone: "",
        addressLine1: "",
        addressLine2: "",
        city: "",
        state: "",
        postalCode: "",
        country: "",
    });

    const updateField = <K extends keyof InvoiceFormState>(
        field: K,
        value: InvoiceFormState[K]
    ) => {
        onFormStateChange({ ...formState, [field]: value });
    };

    // Get selected client for location display
    const selectedClient = clients.find((c) => c.id === formState.clientId);
    const clientRegion = inferClientRegion(
        selectedClient?.address ||
        [selectedClient?.addressLine1, selectedClient?.city, selectedClient?.country].filter(Boolean).join(", ")
    );

    // Get selected project for display
    const selectedProject = projects.find(p => p.id === formState.projectId);

    // Update billing info when client changes
    useEffect(() => {
        if (selectedClient) {
            setBillingInfo({
                email: selectedClient.email || "",
                phone: selectedClient.phone || "",
                addressLine1: selectedClient.addressLine1 || "",
                addressLine2: selectedClient.addressLine2 || "",
                city: selectedClient.city || "",
                state: selectedClient.state || "",
                postalCode: selectedClient.postalCode || "",
                country: selectedClient.country || "",
            });
            setIsEditingBilling(false);
        }
    }, [selectedClient]);

    // Filter projects by selected client
    const filteredProjects = projects.filter(
        (p) => !formState.clientId || p.clientId === formState.clientId
    );

    // Format display address
    const getDisplayAddress = () => {
        const parts = [
            billingInfo.addressLine1,
            billingInfo.addressLine2,
            billingInfo.city,
            billingInfo.state,
            billingInfo.postalCode,
            billingInfo.country,
        ].filter(Boolean);
        return parts.join(", ");
    };

    const handleSaveToClient = async () => {
        if (!selectedClient || !onClientUpdate) return;

        setIsSaving(true);
        try {
            await onClientUpdate(selectedClient.id, {
                email: billingInfo.email || undefined,
                phone: billingInfo.phone || undefined,
                addressLine1: billingInfo.addressLine1 || undefined,
                addressLine2: billingInfo.addressLine2 || undefined,
                city: billingInfo.city || undefined,
                state: billingInfo.state || undefined,
                postalCode: billingInfo.postalCode || undefined,
                country: billingInfo.country || undefined,
            });
            toast.success("Client updated successfully");
            setIsEditingBilling(false);
        } catch (error) {
            console.error("Failed to save client:", error);
            toast.error("Failed to update client");
        } finally {
            setIsSaving(false);
        }
    };

    const hasAddressInfo = billingInfo.addressLine1 || billingInfo.city || billingInfo.country;
    const hasContactInfo = billingInfo.email || billingInfo.phone;

    return (
        <SectionCard title="Bill To">
            {/* Client Selection */}
            <div>
                <div className="flex items-center justify-between">
                    <Label className="text-xs font-medium text-muted-foreground">Client</Label>
                    {onCreateClient && (
                        <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 gap-1 text-[11px] text-primary hover:text-primary"
                            onClick={onCreateClient}
                        >
                            <Plus className="h-3 w-3" />
                            New Client
                        </Button>
                    )}
                </div>
                <Select
                    value={formState.clientId || "none"}
                    onValueChange={(v) => {
                        const newClientId = v === "none" ? undefined : v;
                        updateField("clientId", newClientId);

                        // Auto-suggest tax when client changes if automatic tax is enabled
                        if (newClientId && formState.taxSettings?.automatic) {
                            const newClient = clients.find((c) => c.id === newClientId);
                            const region = inferClientRegion(newClient?.address);
                            if (region) {
                                updateField("taxSettings", {
                                    ...formState.taxSettings,
                                    defaultRate: region.taxRate,
                                });
                            }
                        }
                    }}
                >
                    <SelectTrigger className="w-full mt-2 overflow-hidden">
                        <SelectValue placeholder="Select client">
                            {selectedClient ? (
                                <span className="line-clamp-1">{selectedClient.name}</span>
                            ) : null}
                        </SelectValue>
                    </SelectTrigger>
                    <SelectContent className="w-[var(--radix-select-trigger-width)]">
                        <SelectItem value="none">No client</SelectItem>
                        {clients.length === 0 && (
                            <div className="py-3 px-2 text-center">
                                <p className="text-xs text-muted-foreground mb-2">No clients yet</p>
                                {onCreateClient && (
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        className="w-full h-8 text-xs gap-1"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onCreateClient();
                                        }}
                                    >
                                        <UserPlus className="h-3 w-3" />
                                        Create your first client
                                    </Button>
                                )}
                            </div>
                        )}
                        {clients.map((client) => (
                            <SelectItem key={client.id} value={client.id}>
                                <span className="line-clamp-1">{client.name}</span>
                                {client.company && (
                                    <span className="text-muted-foreground text-xs ml-1 truncate">({client.company})</span>
                                )}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            {/* Client Billing Details - Shows when client is selected */}
            {selectedClient && (
                <Collapsible open={billingExpanded} onOpenChange={setBillingExpanded}>
                    <div className="mt-3 rounded-lg border border-border/60 bg-muted/20 overflow-hidden">
                        <CollapsibleTrigger className="w-full">
                            <div className="flex items-center justify-between px-3 py-2 hover:bg-muted/40 transition">
                                <div className="flex items-center gap-2">
                                    <Building2 className="h-4 w-4 text-muted-foreground" />
                                    <div className="text-left">
                                        <p className="text-sm font-medium">{selectedClient.name}</p>
                                        {selectedClient.company && (
                                            <p className="text-xs text-muted-foreground">{selectedClient.company}</p>
                                        )}
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    {clientRegion && (
                                        <Badge variant="outline" className="text-[10px] h-5">
                                            <MapPin className="h-3 w-3 mr-1" />
                                            {clientRegion.region}
                                        </Badge>
                                    )}
                                    {billingExpanded ? (
                                        <ChevronUp className="h-4 w-4 text-muted-foreground" />
                                    ) : (
                                        <ChevronDown className="h-4 w-4 text-muted-foreground" />
                                    )}
                                </div>
                            </div>
                        </CollapsibleTrigger>

                        <CollapsibleContent>
                            <div className="border-t border-border/60 px-3 py-3 space-y-3">
                                {/* View Mode */}
                                {!isEditingBilling ? (
                                    <>
                                        {/* Contact Info */}
                                        <div className="space-y-1">
                                            {billingInfo.email && (
                                                <div className="flex items-center gap-2 text-xs">
                                                    <Mail className="h-3 w-3 text-muted-foreground" />
                                                    <span>{billingInfo.email}</span>
                                                </div>
                                            )}
                                            {billingInfo.phone && (
                                                <div className="flex items-center gap-2 text-xs">
                                                    <Phone className="h-3 w-3 text-muted-foreground" />
                                                    <span>{billingInfo.phone}</span>
                                                </div>
                                            )}
                                        </div>

                                        {/* Address */}
                                        {hasAddressInfo ? (
                                            <div className="flex items-start gap-2 text-xs">
                                                <MapPin className="h-3 w-3 text-muted-foreground mt-0.5" />
                                                <span className="text-muted-foreground">{getDisplayAddress()}</span>
                                            </div>
                                        ) : (
                                            <div className="flex items-center gap-2 text-xs text-amber-600 bg-amber-50 px-2 py-1.5 rounded">
                                                <MapPin className="h-3 w-3" />
                                                <span>No billing address on file</span>
                                            </div>
                                        )}

                                        {(!hasContactInfo || !hasAddressInfo) && (
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className="w-full h-8 text-xs gap-1"
                                                onClick={() => setIsEditingBilling(true)}
                                            >
                                                <Pencil className="h-3 w-3" />
                                                Add Billing Info
                                            </Button>
                                        )}

                                        {(hasContactInfo || hasAddressInfo) && (
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="w-full h-7 text-[11px] text-muted-foreground"
                                                onClick={() => setIsEditingBilling(true)}
                                            >
                                                <Pencil className="h-3 w-3 mr-1" />
                                                Edit billing info
                                            </Button>
                                        )}
                                    </>
                                ) : (
                                    /* Edit Mode */
                                    <div className="space-y-3">
                                        <div className="grid grid-cols-2 gap-2">
                                            <div>
                                                <Label className="text-[11px] text-muted-foreground">Email</Label>
                                                <Input
                                                    type="email"
                                                    value={billingInfo.email}
                                                    onChange={(e) => setBillingInfo({ ...billingInfo, email: e.target.value })}
                                                    placeholder="billing@example.com"
                                                    className="h-8 mt-1 text-xs"
                                                />
                                            </div>
                                            <div>
                                                <Label className="text-[11px] text-muted-foreground">Phone</Label>
                                                <Input
                                                    type="tel"
                                                    value={billingInfo.phone}
                                                    onChange={(e) => setBillingInfo({ ...billingInfo, phone: e.target.value })}
                                                    placeholder="+91 98765 43210"
                                                    className="h-8 mt-1 text-xs"
                                                />
                                            </div>
                                        </div>

                                        <div>
                                            <Label className="text-[11px] text-muted-foreground">Address Line 1</Label>
                                            <Input
                                                value={billingInfo.addressLine1}
                                                onChange={(e) => setBillingInfo({ ...billingInfo, addressLine1: e.target.value })}
                                                placeholder="Street address"
                                                className="h-8 mt-1 text-xs"
                                            />
                                        </div>

                                        <div>
                                            <Label className="text-[11px] text-muted-foreground">Address Line 2</Label>
                                            <Input
                                                value={billingInfo.addressLine2}
                                                onChange={(e) => setBillingInfo({ ...billingInfo, addressLine2: e.target.value })}
                                                placeholder="Apt, suite, etc. (optional)"
                                                className="h-8 mt-1 text-xs"
                                            />
                                        </div>

                                        <div className="grid grid-cols-2 gap-2">
                                            <div>
                                                <Label className="text-[11px] text-muted-foreground">City</Label>
                                                <Input
                                                    value={billingInfo.city}
                                                    onChange={(e) => setBillingInfo({ ...billingInfo, city: e.target.value })}
                                                    placeholder="City"
                                                    className="h-8 mt-1 text-xs"
                                                />
                                            </div>
                                            <div>
                                                <Label className="text-[11px] text-muted-foreground">State</Label>
                                                <Input
                                                    value={billingInfo.state}
                                                    onChange={(e) => setBillingInfo({ ...billingInfo, state: e.target.value })}
                                                    placeholder="State"
                                                    className="h-8 mt-1 text-xs"
                                                />
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-2">
                                            <div>
                                                <Label className="text-[11px] text-muted-foreground">Postal Code</Label>
                                                <Input
                                                    value={billingInfo.postalCode}
                                                    onChange={(e) => setBillingInfo({ ...billingInfo, postalCode: e.target.value })}
                                                    placeholder="560001"
                                                    className="h-8 mt-1 text-xs"
                                                />
                                            </div>
                                            <div>
                                                <Label className="text-[11px] text-muted-foreground">Country</Label>
                                                <Input
                                                    value={billingInfo.country}
                                                    onChange={(e) => setBillingInfo({ ...billingInfo, country: e.target.value })}
                                                    placeholder="India"
                                                    className="h-8 mt-1 text-xs"
                                                />
                                            </div>
                                        </div>

                                        <div className="flex gap-2 pt-2">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className="flex-1 h-8 text-xs"
                                                onClick={() => setIsEditingBilling(false)}
                                            >
                                                Cancel
                                            </Button>
                                            <Button
                                                size="sm"
                                                className="flex-1 h-8 text-xs gap-1"
                                                onClick={handleSaveToClient}
                                                disabled={isSaving}
                                            >
                                                <Save className="h-3 w-3" />
                                                {isSaving ? "Saving..." : "Save to Client"}
                                            </Button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </CollapsibleContent>
                    </div>
                </Collapsible>
            )}

            {/* Project Selection */}
            <div>
                <div className="flex items-center justify-between">
                    <Label className="text-xs font-medium text-muted-foreground">Project</Label>
                    {onCreateProject && (
                        <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 gap-1 text-[11px] text-primary hover:text-primary"
                            onClick={onCreateProject}
                        >
                            <FolderPlus className="h-3 w-3" />
                            New Project
                        </Button>
                    )}
                </div>
                <Select
                    value={formState.projectId || "none"}
                    onValueChange={(v) => {
                        const projectId = v === "none" ? undefined : v;
                        updateField("projectId", projectId);
                        if (projectId) {
                            const selected = projects.find(p => p.id === projectId);
                            if (selected && onProjectSelect) {
                                onProjectSelect(selected);
                            }
                        }
                    }}
                >
                    <SelectTrigger className="w-full mt-2 overflow-hidden">
                        <SelectValue placeholder="Select project">
                            {selectedProject ? (
                                <span className="line-clamp-1">{selectedProject.name}</span>
                            ) : null}
                        </SelectValue>
                    </SelectTrigger>
                    <SelectContent className="w-[var(--radix-select-trigger-width)]">
                        <SelectItem value="none">No project</SelectItem>
                        {filteredProjects.length === 0 && formState.clientId && (
                            <div className="py-3 px-2 text-center">
                                <p className="text-xs text-muted-foreground mb-2">No projects for this client</p>
                                {onCreateProject && (
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        className="w-full h-8 text-xs gap-1"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onCreateProject();
                                        }}
                                    >
                                        <FolderPlus className="h-3 w-3" />
                                        Create project
                                    </Button>
                                )}
                            </div>
                        )}
                        {filteredProjects.map((project) => (
                            <SelectItem key={project.id} value={project.id}>
                                <span className="truncate">{project.name}</span>
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>

                {/* Selected Project Details */}
                {selectedProject && (
                    <div className="mt-3 rounded-lg border border-border/60 bg-slate-50 p-3 space-y-2 relative group overflow-hidden">
                        {/* Edit Button */}
                        {onEditProject && (
                            <Button
                                size="icon"
                                variant="ghost"
                                className="absolute top-2 right-2 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onEditProject(selectedProject);
                                }}
                            >
                                <Pencil className="h-3 w-3 text-slate-400 hover:text-primary" />
                            </Button>
                        )}

                        <div className="flex items-start justify-between pr-6 gap-2">
                            <div className="min-w-0 flex-1">
                                <h4 className="text-xs font-semibold text-slate-700 line-clamp-1" title={selectedProject.name}>{selectedProject.name}</h4>
                                {selectedProject.description && (
                                    <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-1" title={selectedProject.description}>
                                        {selectedProject.description}
                                    </p>
                                )}
                            </div>
                            {selectedProject.status && (
                                <Badge variant="outline" className={cn(
                                    "text-[10px] h-5 px-1.5 capitalize shrink-0",
                                    selectedProject.status.toLowerCase() === 'active' ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
                                        selectedProject.status.toLowerCase() === 'completed' ? "bg-blue-50 text-blue-700 border-blue-200" :
                                            "text-slate-600"
                                )}>
                                    {selectedProject.status.toLowerCase()}
                                </Badge>
                            )}
                        </div>

                        <div className="pt-2 border-t border-slate-200/60 flex flex-wrap gap-3 text-[11px] text-slate-600">
                            {selectedProject.billableItems && selectedProject.billableItems.length > 0 && (
                                <div className="flex items-center gap-1">
                                    <span className="font-medium text-slate-900">{selectedProject.billableItems.length}</span>
                                    <span>fixed items</span>
                                </div>
                            )}
                            {selectedProject.milestones && selectedProject.milestones.length > 0 && (
                                <div className="flex items-center gap-1">
                                    <span className="font-medium text-slate-900">{selectedProject.milestones.length}</span>
                                    <span>milestones</span>
                                </div>
                            )}
                            {(!selectedProject.billableItems?.length && !selectedProject.milestones?.length) && (
                                <span className="text-amber-600">No unbilled items</span>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </SectionCard>
    );
}

export { inferClientRegion };
