
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ensureActiveWorkspace } from "@/lib/workspace";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DashboardLayout } from "@/components/dashboard/layout-shell";
import { ArrowLeft, Calendar, FileText, CheckCircle, Clock } from "lucide-react";
import Link from "next/link";
import { ProjectTabs } from "@/components/projects/project-tabs";

type PageProps = {
    params: {
        id: string;
    };
};

export default async function ProjectDetailPage({ params }: PageProps) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
        redirect("/login");
    }

    const workspace = await ensureActiveWorkspace(session.user.id, session.user.name);
    if (!workspace) {
        redirect("/dashboard");
    }

    const project = await prisma.project.findUnique({
        where: {
            id: params.id,
            workspaceId: workspace.id
        },
        include: {
            client: true,
            milestones: {
                orderBy: { orderIndex: "asc" }
            },
            aiDocuments: {
                orderBy: { createdAt: "desc" }
            },
            invoices: {
                orderBy: { createdAt: "desc" },
                take: 10
            }
        }
    });

    if (!project) {
        return (
            <DashboardLayout userName={session.user.name} userEmail={session.user.email}>
                <div className="p-8 text-center bg-red-50 text-red-600 rounded-lg">
                    Project not found or access denied.
                </div>
            </DashboardLayout>
        );
    }

    const getStatusBadge = (status: string) => {
        // Handle both legacy lowercase and new uppercase
        const s = status.toUpperCase();
        const color = s === "ACTIVE" ? "bg-green-100 text-green-700" :
            s === "COMPLETED" ? "bg-blue-100 text-blue-700" :
                s === "PLANNING" ? "bg-purple-100 text-purple-700" :
                    s === "ON_HOLD" || s === "PAUSED" ? "bg-yellow-100 text-yellow-700" :
                        "bg-gray-100 text-gray-700";
        return <Badge className={color}>{s}</Badge>;
    };

    return (
        <DashboardLayout userName={session.user.name} userEmail={session.user.email}>
            <div className="mx-auto max-w-7xl px-4 py-8 lg:px-8">
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
                                    {project.milestones.filter(m => m.status === 'INVOICED' || m.status === 'PAID' || m.status === 'READY_FOR_INVOICE').length} / {project.milestones.length} Milestones
                                </p>
                            </div>
                        </div>
                        {/* More stats can go here */}
                    </div>
                </div>

                {/* Client-side Tabs Component */}
                <ProjectTabs project={project} />

            </div>
        </DashboardLayout>
    );
}
