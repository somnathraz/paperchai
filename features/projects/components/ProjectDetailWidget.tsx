
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, FileText, CheckCircle, RefreshCcw, Loader2 } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

// Local feature components
import { MilestoneList } from "./MilestoneList";
import { DocumentsPanel } from "./DocumentsPanel";
import { AutomationPanel } from "./AutomationPanel";

import { useProjects } from "../hooks/useProjects";

interface ProjectDetailWidgetProps {
    projectId: string;
}

export function ProjectDetailWidget({ projectId }: ProjectDetailWidgetProps) {
    const router = useRouter();
    const { selectedProject, isLoading, error, fetchProject, updateProject, clearSelected } = useProjects();
    const [activeTab, setActiveTab] = useState("milestones");

    useEffect(() => {
        fetchProject(projectId);
        return () => {
            clearSelected();
        };
    }, [projectId]); // eslint-disable-line react-hooks/exhaustive-deps

    const handleUpdateStatus = async (status: string) => {
        try {
            await updateProject(projectId, { status });
            toast.success(`Project status updated to ${status}`);
        } catch (e) {
            toast.error("Failed to update status");
        }
    };

    if (isLoading && !selectedProject) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-slate-500">Loading project details...</p>
            </div>
        );
    }

    if (error || !selectedProject) {
        return (
            <div className="p-8 text-center bg-red-50 text-red-600 rounded-lg">
                {error || "Project not found"}
            </div>
        );
    }

    const project = selectedProject;

    const getStatusBadge = (status: string) => {
        const s = status.toUpperCase();
        const color = s === "ACTIVE" ? "bg-green-100 text-green-700" :
            s === "COMPLETED" ? "bg-blue-100 text-blue-700" :
                s === "PLANNING" ? "bg-purple-100 text-purple-700" :
                    s === "ON_HOLD" || s === "PAUSED" ? "bg-yellow-100 text-yellow-700" :
                        "bg-gray-100 text-gray-700";
        return <Badge className={color}>{s}</Badge>;
    };

    const getInvoiceStatusStyle = (status: string) => {
        switch (status) {
            case "draft": return "bg-amber-100 text-amber-700 border-amber-200";
            case "sent": return "bg-blue-100 text-blue-700 border-blue-200";
            case "paid": return "bg-green-100 text-green-700 border-green-200";
            case "overdue": return "bg-red-100 text-red-700 border-red-200";
            default: return "bg-slate-100 text-slate-600";
        }
    };

    return (
        <div className="mx-auto max-w-7xl px-4 py-8 lg:px-8 bg-slate-50 min-h-screen">
            <div className="mb-6">
                <Link href={`/clients?clientId=${project.clientId}`} className="text-sm text-slate-500 hover:text-primary flex items-center mb-4">
                    <ArrowLeft className="h-4 w-4 mr-1" /> Back to Client
                </Link>

                <div className="flex items-start justify-between">
                    <div>
                        <h1 className="text-3xl font-bold text-slate-900">{project.name}</h1>
                        <div className="flex items-center gap-3 mt-2 text-slate-600">
                            <span className="flex items-center"><FileText className="h-4 w-4 mr-1" /> {project.client?.name}</span>
                            {project.totalBudget && (
                                <span className="font-semibold text-slate-900">
                                    Total Budget: {project.currency} {(project.totalBudget / 100).toFixed(2)}
                                </span>
                            )}
                        </div>
                    </div>
                    <div className="flex gap-2">
                        {getStatusBadge(project.status)}
                        <Badge variant="outline">{project.type}</Badge>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-6">
                    <div className="bg-white p-4 rounded-lg border shadow-sm flex items-center gap-3">
                        <div className="p-2 bg-blue-50 rounded-full text-blue-600">
                            <CheckCircle className="h-5 w-5" />
                        </div>
                        <div>
                            <p className="text-xs text-slate-500 uppercase tracking-wide">Progress</p>
                            <p className="font-semibold">
                                {project.milestones?.filter((m: any) => ['INVOICED', 'PAID', 'READY_FOR_INVOICE'].includes(m.status)).length || 0} / {project.milestones?.length || 0} Milestones
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full space-y-6">
                <TabsList className="bg-slate-100 p-1">
                    <TabsTrigger value="overview">Overview</TabsTrigger>
                    <TabsTrigger value="milestones">Milestones</TabsTrigger>
                    <TabsTrigger value="invoices">Invoices</TabsTrigger>
                    <TabsTrigger value="documents">Documents</TabsTrigger>
                    <TabsTrigger value="automation">Automation</TabsTrigger>
                </TabsList>

                <TabsContent value="overview">
                    <Card>
                        <CardContent className="pt-6">
                            <h3 className="text-lg font-semibold mb-2">Description</h3>
                            <p className="text-slate-600 whitespace-pre-wrap">{project.description || "No description provided."}</p>

                            <h3 className="text-lg font-semibold mt-6 mb-2">Billing Strategy</h3>
                            <p className="text-slate-600 uppercase tracking-wide text-sm font-medium bg-slate-100 inline-block px-2 py-1 rounded">
                                {project.billingStrategy?.replace("_", " ") || "UNKNOWN"}
                            </p>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="milestones">
                    <MilestoneList
                        milestones={project.milestones || []}
                        projectId={project.id}
                        currency={project.currency}
                        readOnly={false}
                    />
                </TabsContent>

                <TabsContent value="invoices">
                    <Card>
                        <CardHeader className="pb-2">
                            <div className="flex items-center justify-between">
                                <CardTitle className="text-lg">Invoices</CardTitle>
                                <Button
                                    size="sm"
                                    onClick={() => router.push(`/invoices/new?projectId=${project.id}&clientId=${project.clientId}`)}
                                >
                                    <RefreshCcw className="h-4 w-4 mr-2" />
                                    Create Invoice
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-2">
                                {project.invoices?.length === 0 ? (
                                    <div className="text-center py-8">
                                        <FileText className="h-12 w-12 mx-auto text-slate-300 mb-4" />
                                        <p className="text-slate-500">No invoices generated yet.</p>
                                        <p className="text-sm text-slate-400 mt-1">Create one manually or enable auto-invoicing for milestones.</p>
                                    </div>
                                ) : (
                                    project.invoices?.map((inv: any) => (
                                        <div
                                            key={inv.id}
                                            className="flex justify-between items-center p-3 border rounded-lg hover:bg-slate-50 cursor-pointer transition-colors"
                                            onClick={() => router.push(`/invoices/new?id=${inv.id}`)}
                                        >
                                            <div>
                                                <p className="font-medium text-blue-600 hover:text-blue-800">{inv.number}</p>
                                                <p className="text-sm text-slate-500">{new Date(inv.createdAt).toLocaleDateString()}</p>
                                            </div>
                                            <div className="text-right flex items-center gap-3">
                                                <p className="font-semibold">{project.currency} {Number(inv.total).toFixed(2)}</p>
                                                <Badge className={getInvoiceStatusStyle(inv.status)}>
                                                    {inv.status}
                                                </Badge>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="documents">
                    <DocumentsPanel documents={project.aiDocuments || []} projectId={project.id} />
                </TabsContent>

                <TabsContent value="automation">
                    <AutomationPanel project={project} />
                </TabsContent>
            </Tabs>
        </div>
    );
}
