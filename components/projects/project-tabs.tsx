"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MilestoneList } from "./milestone-list";
import { DocumentsPanel } from "./documents-panel";
import { AutomationPanel } from "./automation-panel";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, FileText } from "lucide-react";

export function ProjectTabs({ project }: { project: any }) {
    const router = useRouter();

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
        <Tabs defaultValue="milestones" className="w-full space-y-6">
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
                            {project.billingStrategy?.replace("_", " ")}
                        </p>
                    </CardContent>
                </Card>
            </TabsContent>

            <TabsContent value="milestones">
                <MilestoneList
                    milestones={project.milestones}
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
                                <Plus className="h-4 w-4 mr-2" />
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
                                project.invoices.map((inv: any) => (
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
                <DocumentsPanel documents={project.aiDocuments} projectId={project.id} />
            </TabsContent>

            <TabsContent value="automation">
                <AutomationPanel project={project} />
            </TabsContent>
        </Tabs>
    );
}
