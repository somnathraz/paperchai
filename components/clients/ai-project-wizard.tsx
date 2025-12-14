
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
    Loader2, Upload, FileText, CheckCircle, AlertTriangle,
    ChevronRight, Calendar, DollarSign, Plus, Trash2, Wand2, AlertCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
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
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

// Import modular components and hooks
import { UploadStep, ClientDetailsCard, ProjectScopeCard, ReviewStep } from "./ai-project-wizard/steps";
import { useProjectValidation, useDuplicateDetection } from "./ai-project-wizard/hooks";
import type { ExtractedData, AiProjectWizardProps } from "./ai-project-wizard/types";

export function AiProjectWizard({
    onSuccess,
    defaultClientId,
    open,
    onOpenChange,
    existingClientId,
    onComplete
}: AiProjectWizardProps) {
    const router = useRouter();
    const [step, setStep] = useState<"upload" | "review">("upload");
    const [isExtracting, setIsExtracting] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [file, setFile] = useState<File | null>(null);

    // State for the edited data
    const [data, setData] = useState<ExtractedData | null>(null);
    const [validationErrors, setValidationErrors] = useState<string[]>([]);

    // Use validation hook
    const { validateProjectData: validateProjectDataHook } = useProjectValidation();

    // Duplicate Detection State
    const [duplicateClient, setDuplicateClient] = useState<any>(null);
    const [duplicateProjectName, setDuplicateProjectName] = useState<boolean>(false);
    const [showDuplicateDialog, setShowDuplicateDialog] = useState(false);

    // Persistence Logic
    useEffect(() => {
        const saved = sessionStorage.getItem("ai_wizard_state");
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                if (parsed.data) setData(parsed.data);
                if (parsed.step) setStep(parsed.step);
                // Note: File object cannot be persisted easily, user might need to re-upload if they want to change it, 
                // but we have the extracted data which is the expensive part.
            } catch (e) {
                console.error("Failed to restore state", e);
            }
        }
    }, []);

    useEffect(() => {
        if (data || step !== "upload") {
            sessionStorage.setItem("ai_wizard_state", JSON.stringify({ data, step }));
        }
    }, [data, step]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
        }
    };

    const handleExtract = async () => {
        if (!file) return;

        setIsExtracting(true);
        try {
            // 1. Read file
            let contentToSend = "";
            let isBase64 = false;

            if (file.type === "application/pdf" || file.name.endsWith(".pdf")) {
                // Read as Base64 for PDF
                const buffer = await file.arrayBuffer();
                const bytes = new Uint8Array(buffer);
                let binary = '';
                for (let i = 0; i < bytes.byteLength; i++) {
                    binary += String.fromCharCode(bytes[i]);
                }
                contentToSend = btoa(binary);
                isBase64 = true;
            } else {
                // Read as Text for others
                contentToSend = await file.text();
            }

            const res = await fetch("/api/ai/projects/extract", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    fileMeta: {
                        fileKey: "temp/" + file.name, // Placeholder
                        fileName: file.name,
                        mimeType: file.type,
                        size: file.size
                    },
                    fileData: contentToSend, // Send base64 or text
                    isBase64: isBase64
                })
            });

            if (!res.ok) {
                throw new Error("Failed to extract data");
            }

            const result = await res.json();
            const extract = result.extract;

            // Handle new 'projects' array or legacy 'project' object
            const extractedProjects = extract.projects || (extract.project ? [extract.project] : []);

            if (extractedProjects.length === 0) {
                throw new Error("No project details found in extraction");
            }

            if (extractedProjects.length > 1) {
                toast.message(`Found ${extractedProjects.length} projects`, {
                    description: "We've loaded the first one. Multi-project selection coming soon."
                });
            }

            const mainProject = extractedProjects[0];

            // Transform API response to state shape (adding defaults if missing)
            setData({
                client: {
                    name: extract.client?.name || "",
                    email: extract.client?.email || "",
                    company: extract.client?.company || "",
                    phone: extract.client?.phone || "",
                    notes: extract.client?.notes || ""
                },
                project: {
                    name: mainProject.name || "New Project",
                    description: mainProject.description || "",
                    type: mainProject.type || "FIXED",
                    billingStrategy: mainProject.billingStrategy || "SINGLE_INVOICE",
                    totalBudget: mainProject.totalBudget || 0,
                    currency: mainProject.currency || "INR",
                    startDate: mainProject.startDate,
                    endDate: mainProject.endDate,
                    autoInvoiceEnabled: false, // Default off for safety
                    autoRemindersEnabled: true // Default on typically
                },
                milestones: mainProject.milestones?.map((m: any) => ({
                    title: m.title || "Milestone",
                    description: m.description || "",
                    amount: m.amount || 0,
                    expectedDate: m.expectedDate,
                    dueDate: m.dueDate,
                    billingTrigger: "ON_COMPLETION", // Safer default
                    status: "PLANNED"
                })) || [],
                confidence: {
                    client: extract.confidence?.client || 0,
                    project: extract.confidence?.projects || extract.confidence?.project || 0,
                    milestones: extract.confidence?.milestones || 0
                },
                warnings: extract.warnings || []
            });

            setStep("review");
        } catch (error) {
            console.error(error);
            toast.error("Failed to analyze document. Please try again or use manual entry.");
        } finally {
            setIsExtracting(false);
        }
    };

    const validateProjectData = () => {
        if (!data) return [];
        const errors: string[] = [];

        // 1. Required Fields
        if (!data.client.name?.trim()) errors.push("Client Name is required");
        if (!data.project.name?.trim()) errors.push("Project Name is required");

        // 2. Budget Logic
        if (data.project.totalBudget < 0) errors.push("Total Budget cannot be negative");

        // Strategy-Specific Budget Checks
        const milestoneSum = data.milestones.reduce((sum, m) => sum + m.amount, 0);

        if (["FIXED", "MILESTONE"].includes(data.project.type) || data.project.billingStrategy === "PER_MILESTONE") {
            // Milestones can be less than budget (remaining is profit/unallocated), but cannot exceed it.
            if (milestoneSum > data.project.totalBudget + 100) { // Tolerance of 1.00
                errors.push(`Milestone total (${data.project.currency} ${(milestoneSum / 100).toFixed(2)}) exceeds Project Budget`);
            }
        }

        if (data.project.billingStrategy === "SINGLE_INVOICE" && data.milestones.length > 1) {
            errors.push("Single Invoice strategy should typically have only one milestone/payment event.");
        }

        if (data.project.billingStrategy === "PER_MILESTONE" && data.milestones.length === 0) {
            errors.push("At least one milestone is required for 'Per Milestone' billing.");
        }

        // 3. Date Logic
        if (data.project.startDate && data.project.endDate) {
            if (new Date(data.project.startDate) > new Date(data.project.endDate)) {
                errors.push("Project Start Date must be before End Date");
            }
        }

        // 4. Data Integrity
        if (data.client.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.client.email)) {
            errors.push("Invalid Client Email format");
        }

        return errors;
    };

    const checkDuplicateClient = async (name: string, email: string) => {
        try {
            const params = new URLSearchParams();
            if (name) params.append("search", name);
            // We could search by email specifically if API supported strict filtering, but strict search often fails with slight typos.
            // The current API searches OR across name/email which is good.

            const res = await fetch(`/api/clients?${params.toString()}`);
            if (res.ok) {
                const result = await res.json();
                // Filter for likely matches (Exact ignore case + trim)
                const match = result.clients.find((c: any) =>
                    (c.name.toLowerCase().trim() === name.toLowerCase().trim()) ||
                    (email && c.email?.toLowerCase().trim() === email.toLowerCase().trim())
                );
                return match || null;
            }
            return null;
        } catch (e) {
            console.error("Failed to check duplicates", e);
            return null;
        }
    };

    const proceedWithSaving = async (existingClientId?: string, overrideProjectName?: string) => {
        if (!data) return;
        setIsSaving(true);
        setShowDuplicateDialog(false);

        try {
            let clientId = existingClientId;
            let projectToSave = { ...data.project };

            // Apply override if provided (e.g. V2)
            if (overrideProjectName) {
                projectToSave.name = overrideProjectName;
            } else if (existingClientId && duplicateProjectName && projectToSave.name === data.project.name) {
                // simple fallback
                projectToSave.name = `${projectToSave.name} (1)`;
            }

            // 1. Create Client if not merging
            if (!clientId) {
                const clientRes = await fetch("/api/clients", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        name: data.client.name,
                        email: data.client.email,
                        company: data.client.company,
                        phone: data.client.phone,
                        notes: data.client.notes
                    })
                });

                if (!clientRes.ok) throw new Error("Failed to create client");
                const clientData = await clientRes.json();
                clientId = clientData.client.id;
            }

            if (!clientId) throw new Error("No Client ID generated");

            // 2. Create Project with Milestones
            const projectRes = await fetch(`/api/clients/${clientId}/projects`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name: projectToSave.name,
                    description: data.project.description,
                    type: data.project.type,
                    billingStrategy: data.project.billingStrategy,
                    totalBudget: data.project.totalBudget,
                    currency: data.project.currency,
                    startDate: data.project.startDate,
                    endDate: data.project.endDate,
                    autoInvoiceEnabled: data.project.autoInvoiceEnabled,
                    autoRemindersEnabled: data.project.autoRemindersEnabled,
                    milestones: data.milestones.map(m => ({
                        title: m.title,
                        description: m.description,
                        amount: m.amount,
                        expectedDate: m.expectedDate,
                        dueDate: m.dueDate,
                        billingTrigger: m.billingTrigger,
                        status: m.status,
                        autoInvoiceEnabled: true,
                        autoRemindersEnabled: true
                    }))
                })
            });

            if (!projectRes.ok) throw new Error("Failed to create project");
            const projectData = await projectRes.json();

            toast.success(existingClientId ? "Project merged into existing client!" : "Client & Project created successfully!");
            sessionStorage.removeItem("ai_wizard_state");

            if (onSuccess) {
                onSuccess();
            } else {
                router.push(`/projects/${projectData.project.id}`);
            }

        } catch (error) {
            console.error(error);
            toast.error("Failed to save data. Please check fields and try again.");
        } finally {
            setIsSaving(false);
        }
    };

    const [duplicateProject, setDuplicateProject] = useState<any>(null);

    const handleMergeVariables = () => {
        if (!data || !duplicateClient) return;
        proceedWithSaving(duplicateClient.id);
    };

    const handleConfirm = async () => {
        if (!data) return;
        setValidationErrors([]);

        // 1. Run Logic Validation
        const errors = validateProjectData();
        if (errors.length > 0) {
            setValidationErrors(errors);
            toast.error("Please fix validation errors before proceeding.");
            return;
        }

        setIsSaving(true);

        try {
            // 2. Duplicate Detection
            let targetClient = null;
            let existingProj = null;

            if (defaultClientId) {
                // Scenario A: Existing Client (Drawer Mode)
                const res = await fetch(`/api/clients/${defaultClientId}`);
                if (res.ok) {
                    const { client } = await res.json();
                    targetClient = client;
                    existingProj = client.projects?.find((p: any) =>
                        p.name.toLowerCase().trim() === data.project.name.toLowerCase().trim()
                    );
                }
            } else {
                // Scenario B: New Client Mode
                const match = await checkDuplicateClient(data.client.name, data.client.email);
                if (match) {
                    // Fetch full details for project check
                    const res = await fetch(`/api/clients/${match.id}`);
                    if (res.ok) {
                        const { client } = await res.json();
                        targetClient = client;
                        existingProj = client.projects?.find((p: any) =>
                            p.name.toLowerCase().trim() === data.project.name.toLowerCase().trim()
                        );
                    } else {
                        targetClient = match;
                    }
                }
            }

            if (targetClient) {
                setDuplicateClient(targetClient);
                if (existingProj) {
                    setDuplicateProject(existingProj);
                    setDuplicateProjectName(true);
                } else {
                    setDuplicateProject(null);
                    setDuplicateProjectName(false);
                }

                if (!defaultClientId || existingProj) {
                    setShowDuplicateDialog(true);
                    setIsSaving(false);
                    return;
                }
            }

            // 3. No Duplicates or Safe to Proceed
            await proceedWithSaving(defaultClientId);

        } catch (error) {
            console.error("Duplicate check failed", error);
            toast.error("Error checking duplicates. Proceeding...");
            await proceedWithSaving(defaultClientId);
        }
    };

    if (step === "upload") {
        return (
            <div className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50/50">
                <div className="h-16 w-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mb-6">
                    <Upload className="h-8 w-8" />
                </div>
                <h3 className="text-lg font-semibold text-slate-900 mb-2">Upload Project Brief or Contract</h3>
                <p className="text-sm text-slate-500 text-center max-w-md mb-8">
                    Upload a PDF, Doc, or plain text file. Our AI will extract client details, project scope, billing terms, and milestones automatically.
                </p>

                <div className="w-full max-w-sm">
                    <Input
                        type="file"
                        accept=".txt,.md,.json,.csv,.pdf"
                        onChange={handleFileChange}
                        disabled={isExtracting}
                        className="mb-4 bg-white"
                    />
                    <Button
                        onClick={handleExtract}
                        disabled={!file || isExtracting}
                        className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white"
                    >
                        {isExtracting ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Analyzing Document...
                            </>
                        ) : (
                            <>
                                <Wand2 className="mr-2 h-4 w-4" />
                                Analyze & Extract
                            </>
                        )}
                    </Button>
                </div>

                <div className="mt-8 flex items-center gap-2 text-xs text-slate-400">
                    <CheckCircle className="h-3 w-3" /> Secure Processing
                    <span className="mx-1">•</span>
                    <CheckCircle className="h-3 w-3" /> Human Review Required
                </div>
            </div>
        );
    }

    if (step !== "review" || !data) return null;

    const totalMilestoneAmount = data.milestones.reduce((acc, m) => acc + (m.amount || 0), 0);
    const budgetUtilization = (totalMilestoneAmount / (data.project.totalBudget || 1)) * 100;
    const isBudgetExceeded = totalMilestoneAmount > (data.project.totalBudget + 100);

    const handleUpdateProject = async () => {
        if (!duplicateProject) return;
        setIsSaving(true);
        setShowDuplicateDialog(false);
        try {
            const res = await fetch(`/api/projects/${duplicateProject.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    description: data?.project.description,
                    totalBudget: data?.project.totalBudget,
                    startDate: data?.project.startDate,
                    endDate: data?.project.endDate,
                    type: data?.project.type,
                    billingStrategy: data?.project.billingStrategy,
                    autoInvoiceEnabled: data?.project.autoInvoiceEnabled,
                    autoRemindersEnabled: data?.project.autoRemindersEnabled,
                })
            });
            if (!res.ok) throw new Error("Failed to update project");
            toast.success("Project version updated using AI suggestions.");
            sessionStorage.removeItem("ai_wizard_state");
            if (onSuccess) onSuccess();
            else router.push(`/projects/${duplicateProject.id}`);
        } catch (error) {
            console.error(error);
            toast.error("Failed to update project.");
        } finally {
            setIsSaving(false);
        }
    };

    const handleReplaceProject = async () => {
        if (!duplicateProject || !duplicateClient) return;
        setIsSaving(true);
        setShowDuplicateDialog(false);
        try {
            // 1. Delete Old
            const delRes = await fetch(`/api/projects/${duplicateProject.id}`, {
                method: "DELETE"
            });
            if (!delRes.ok) throw new Error("Failed to delete existing project");

            // 2. Create New (re-uses existing client ID)
            await proceedWithSaving(duplicateClient.id);
        } catch (error) {
            console.error(error);
            toast.error("Failed to replace project.");
            setIsSaving(false);
        }
    };

    const handleCreateV2 = async () => {
        if (!duplicateProject || !duplicateClient || !data) return;
        const baseName = data.project.name;
        // Basic versioning
        const newName = baseName.includes("(V") ? `${baseName} (New)` : `${baseName} (V2)`;

        setShowDuplicateDialog(false);
        await proceedWithSaving(duplicateClient.id, newName);
    };

    return (
        <>
            <ReviewStep
                data={data}
                setData={setData}
                validationErrors={validationErrors}
                onBack={() => setStep("upload")}
                onConfirm={handleConfirm}
                onCancel={() => router.back()}
                isSaving={isSaving}
            />
            {/* Smart Duplicate Dialog */}
            <Dialog open={showDuplicateDialog} onOpenChange={setShowDuplicateDialog}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            {duplicateProjectName ? (
                                <>
                                    <AlertTriangle className="h-5 w-5 text-amber-600" />
                                    Project Conflict Detected
                                </>
                            ) : (
                                "Client Exists"
                            )}
                        </DialogTitle>
                        <DialogDescription>
                            {duplicateProjectName ? (
                                <>
                                    A project named <strong>&quot;{data?.project.name}&quot;</strong> already exists for client <strong>{duplicateClient?.name}</strong>.
                                </>
                            ) : (
                                <>
                                    The client <strong>{duplicateClient?.name}</strong> already exists in your database.
                                </>
                            )}
                        </DialogDescription>
                    </DialogHeader>

                    {duplicateProjectName && duplicateProject && (
                        <div className="bg-slate-50 p-3 rounded-lg text-sm border border-slate-100 space-y-2">
                            <h5 className="font-semibold text-slate-700 text-xs uppercase tracking-wide">Existing Project</h5>
                            <div className="flex justify-between items-center">
                                <span className="text-slate-500">Total Budget:</span>
                                <span className="font-mono font-medium">{duplicateProject.currency} {(duplicateProject.totalBudget / 100).toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-slate-500">Status:</span>
                                <Badge variant="outline" className="text-[10px] h-5">{duplicateProject.status || 'Active'}</Badge>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-slate-500">Milestones:</span>
                                <span>{duplicateProject.milestones?.length || 0} count</span>
                            </div>
                        </div>
                    )}

                    <DialogFooter className="flex-col gap-2 sm:gap-0 mt-4">
                        {duplicateProjectName ? (
                            <div className="flex flex-col gap-2 w-full">
                                <Button onClick={handleUpdateProject} variant="outline" className="w-full justify-start">
                                    <div className="flex flex-col items-start">
                                        <span className="font-semibold">Update Existing</span>
                                        <span className="text-[10px] text-slate-500 font-normal">Update details, keep milestones.</span>
                                    </div>
                                </Button>
                                <Button onClick={handleCreateV2} className="w-full justify-start bg-indigo-600 hover:bg-indigo-700 text-white">
                                    <div className="flex flex-col items-start">
                                        <span className="font-semibold">Create as Version 2</span>
                                        <span className="text-[10px] text-indigo-100 font-normal">Save as &quot;{data.project.name} (V2)&quot;</span>
                                    </div>
                                </Button>
                                <Button onClick={handleReplaceProject} variant="destructive" className="w-full justify-start bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200">
                                    <div className="flex flex-col items-start">
                                        <span className="font-semibold">Delete Old & Replace</span>
                                        <span className="text-[10px] text-rose-600/80 font-normal">Danger: Removes old data permanently.</span>
                                    </div>
                                </Button>
                            </div>
                        ) : (
                            <div className="flex flex-col gap-2 w-full">
                                <Button onClick={() => proceedWithSaving(duplicateClient?.id)} className="w-full bg-indigo-600">
                                    Add Project to Client
                                </Button>
                                <Button variant="outline" onClick={() => proceedWithSaving()}>
                                    Create as New Client instead
                                </Button>
                            </div>
                        )}
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
