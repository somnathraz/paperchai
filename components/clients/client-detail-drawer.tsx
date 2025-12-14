"use client";

import { useMemo, useState } from "react";
import {
  CalendarClock,
  FileText,
  Mail,
  Phone,
  Upload,
  MapPin,
  Globe,
  Tag,
  Sparkles,
  Receipt,
  ShieldCheck,
  Edit,
  Plus,
  MoreVertical,
  X,
  FolderKanban,
} from "lucide-react";
import { useRouter } from "next/navigation";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ProjectForm } from "./project-form";
import { AiProjectWizard } from "./ai-project-wizard";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";

type ClientDetailDrawerProps = {
  client: any;
  open: boolean;
  loading?: boolean;
  onOpenChange: (open: boolean) => void;
  userName?: string | null;
  userEmail?: string | null;
};

import { ClientDetail } from "./client-detail";

const timelineMock = [
  { label: "Soft reminder sent", time: "2h ago", icon: Mail, color: "text-primary" },
  { label: "WhatsApp delivered", time: "3h ago", icon: Receipt, color: "text-emerald-600" },
  { label: "Invoice FMCC-108 viewed", time: "1d ago", icon: FileText, color: "text-slate-600" },
  { label: "Reliability score updated +4", time: "1d ago", icon: ShieldCheck, color: "text-amber-600" },
];

export function ClientDetailDrawer({
  client,
  open,
  loading = false,
  onOpenChange,
  userName,
  userEmail,
}: ClientDetailDrawerProps) {
  const router = useRouter();
  const [creationMode, setCreationMode] = useState<"manual" | "ai">("manual");
  const [showNewProject, setShowNewProject] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Handlers
  const handleNewProject = () => {
    setCreationMode("manual");
    setShowNewProject(true);
  };

  const handleUploadDocument = () => {
    setCreationMode("ai");
    setShowNewProject(true);
  };

  const handleViewAllProjects = () => {
    // Switch to projects tab
    const tabs = document.querySelector('[data-value="projects"]') as HTMLElement;
    if (tabs) tabs.click();
  };

  const handleProjectCreated = async () => {
    setShowNewProject(false);
    setRefreshing(true);
    // Refresh the page
    setTimeout(() => {
      window.location.reload();
    }, 500);
  };

  const metrics = useMemo(() => {
    if (!client) return [];
    return [
      {
        label: "Reliability",
        value: client?.reliabilityScore ?? 0,
        sub: `Avg delay: ${client?.averageDelayDays ?? 0} days`,
      },
      {
        label: "Unpaid",
        value: `₹${Number(client?.outstanding || 0).toLocaleString()}`,
        sub: "Dues",
      },
      { label: "Paid this year", value: "₹4.2L", sub: "Total" },
      { label: "Last payment", value: "14 days ago", sub: "Timestamp" },
    ];
  }, [client]);

  if (!client && !loading) return null;

  const getReliabilityBadge = (score: number) => {
    if (score >= 80) {
      return (
        <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">
          Reliable
        </Badge>
      );
    }
    if (score >= 60) {
      return (
        <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100">
          Sometimes Late
        </Badge>
      );
    }
    return (
      <Badge className="bg-rose-100 text-rose-700 hover:bg-rose-100">
        High Risk
      </Badge>
    );
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader>
          {loading ? (
            <div className="py-4">
              <div className="h-8 w-48 bg-slate-200 rounded animate-pulse mb-2" />
              <div className="h-4 w-64 bg-slate-200 rounded animate-pulse" />
            </div>
          ) : client ? (
            <div className="flex items-start justify-between">
              <div>
                <SheetTitle className="text-2xl font-bold text-slate-900">
                  {client.name}
                </SheetTitle>
                <SheetDescription className="mt-1">
                  {client.email || "No email"} • {client.company || "No company"}
                </SheetDescription>
              </div>
              <div className="flex items-center gap-2">
                {getReliabilityBadge(client.reliabilityScore ?? 0)}
                <span className="text-lg font-semibold text-slate-900">
                  {client.reliabilityScore ?? 0}
                </span>
              </div>
            </div>
          ) : null}
        </SheetHeader>

        {loading ? (
          <div className="mt-6 space-y-6">
            <div className="h-32 bg-slate-200 rounded animate-pulse" />
            <div className="h-64 bg-slate-200 rounded animate-pulse" />
          </div>
        ) : client ? (
          <div className="mt-6 space-y-6">
            {/* Quick Actions */}
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" className="rounded-full">
                <Edit className="h-4 w-4 mr-2" />
                Edit Client
              </Button>
              <Button
                size="sm"
                className="rounded-full bg-primary"
                onClick={() => router.push(`/invoices/new?clientId=${client?.id}`)}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Invoice
              </Button>
              <Button variant="outline" size="sm" className="rounded-full">
                <Mail className="h-4 w-4 mr-2" />
                Send Reminder
              </Button>
              <Button variant="outline" size="sm" className="rounded-full">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </div>

            {/* Metrics Grid */}
            <div className="grid grid-cols-2 gap-3">
              {metrics.map((m) => (
                <div
                  key={m.label}
                  className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm"
                >
                  <p className="text-xs uppercase tracking-wider text-slate-500">
                    {m.label}
                  </p>
                  <p className="mt-1 text-lg font-semibold text-slate-900">
                    {m.value}
                  </p>
                  <p className="text-xs text-slate-500">{m.sub}</p>
                </div>
              ))}
            </div>

            {/* Tabs */}
            <Tabs defaultValue="overview" className="w-full">
              <TabsList className="grid w-full grid-cols-6">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="projects">Projects</TabsTrigger>
                <TabsTrigger value="invoices">Invoices</TabsTrigger>
                <TabsTrigger value="payments">Payments</TabsTrigger>
                <TabsTrigger value="agreements">Agreements</TabsTrigger>
                <TabsTrigger value="notes">Notes</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="mt-4 space-y-4">
                <ClientDetail
                  client={client}
                  userName={userName}
                  userEmail={userEmail}
                  onNewProject={handleNewProject}
                  onUploadDocument={handleUploadDocument}
                  onViewAllProjects={handleViewAllProjects}
                  compact={true}
                />
              </TabsContent>

              <TabsContent value="projects" className="mt-4">
                <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <p className="text-sm font-semibold text-slate-900">Projects</p>
                    <Button
                      variant="outline"
                      size="sm"
                      className="rounded-full"
                      onClick={() => setShowNewProject(true)}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      New Project
                    </Button>
                  </div>
                  <div className="overflow-x-auto no-scrollbar">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Project Name</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Rate</TableHead>
                          <TableHead>Invoices</TableHead>
                          <TableHead>Dates</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {client?.projects?.length > 0 ? (
                          client.projects.map((project: any) => (
                            <TableRow key={project.id}>
                              <TableCell>
                                <div>
                                  <p className="font-medium text-slate-900">{project.name}</p>
                                  {project.description && (
                                    <p className="text-xs text-slate-500 mt-0.5">
                                      {project.description}
                                    </p>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell>
                                <Badge
                                  variant={
                                    project.status === "active"
                                      ? "default"
                                      : project.status === "completed"
                                        ? "outline"
                                        : "secondary"
                                  }
                                  className={
                                    project.status === "active"
                                      ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-100"
                                      : project.status === "completed"
                                        ? "bg-slate-100 text-slate-700 hover:bg-slate-100"
                                        : ""
                                  }
                                >
                                  {project.status || "active"}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <div>
                                  <p className="text-sm font-medium text-slate-900">
                                    {project.totalBudget
                                      ? `${project.currency || "INR"} ${(project.totalBudget / 100).toLocaleString()}`
                                      : project.rateType === "hourly"
                                        ? `₹${Number(project.rateValue || 0).toLocaleString()}/hr`
                                        : project.rateType === "milestone"
                                          ? "Milestone"
                                          : `₹${Number(project.rateValue || 0).toLocaleString()}`}
                                  </p>
                                  <p className="text-xs text-slate-500">
                                    {project.billingStrategy === "PER_MILESTONE" ? "Milestone-based" : project.type}
                                  </p>
                                </div>
                              </TableCell>
                              <TableCell>
                                <span className="text-sm text-slate-600">
                                  {project._count?.invoices || 0} {project._count?.invoices === 1 ? 'invoice' : 'invoices'}
                                </span>
                              </TableCell>
                              <TableCell>
                                <div className="text-xs text-slate-600">
                                  {project.startDate ? (
                                    <p>
                                      {new Date(project.startDate).toLocaleDateString("en-IN", {
                                        day: "numeric",
                                        month: "short",
                                      })}
                                    </p>
                                  ) : (
                                    <p className="text-slate-400">—</p>
                                  )}
                                  {project.endDate && (
                                    <p className="text-slate-400">
                                      → {new Date(project.endDate).toLocaleDateString("en-IN", {
                                        day: "numeric",
                                        month: "short",
                                      })}
                                    </p>
                                  )}
                                </div>
                              </TableCell>
                            </TableRow>
                          ))
                        ) : (
                          <TableRow>
                            <TableCell colSpan={5} className="text-center text-slate-500 py-6">
                              No projects yet. Create one to get started.
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="invoices" className="mt-4">
                <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <p className="text-sm font-semibold text-slate-900">Invoices</p>
                    <Button
                      variant="outline"
                      size="sm"
                      className="rounded-full"
                      onClick={() => router.push(`/invoices/new?clientId=${client?.id}`)}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      New Invoice
                    </Button>
                  </div>
                  <div className="overflow-x-auto no-scrollbar">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Invoice</TableHead>
                          <TableHead>Amount</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Due Date</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {client?.invoices?.length > 0 ? (
                          client.invoices.map((inv: any) => (
                            <TableRow
                              key={inv.id}
                              className="cursor-pointer hover:bg-slate-50 transition-colors"
                              onClick={() => router.push(`/invoices/new?id=${inv.id}`)}
                            >
                              <TableCell className="font-medium text-blue-600 hover:text-blue-800">
                                {inv.number || inv.id}
                              </TableCell>
                              <TableCell>
                                ₹{Number(inv.total || 0).toLocaleString()}
                              </TableCell>
                              <TableCell>
                                <Badge
                                  variant={
                                    inv.status === "paid"
                                      ? "default"
                                      : inv.status === "overdue"
                                        ? "destructive"
                                        : "outline"
                                  }
                                  className={
                                    inv.status === "draft"
                                      ? "bg-amber-100 text-amber-700 border-amber-200"
                                      : ""
                                  }
                                >
                                  {inv.status || "draft"}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                {inv.dueDate
                                  ? new Date(inv.dueDate).toLocaleDateString()
                                  : "—"}
                              </TableCell>
                            </TableRow>
                          ))
                        ) : (
                          <TableRow>
                            <TableCell colSpan={4} className="text-center text-slate-500 py-6">
                              No invoices yet.
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="payments" className="mt-4">
                <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                  <p className="text-sm font-semibold text-slate-900 mb-4">Payments</p>
                  <div className="text-center text-slate-500 py-8">
                    Payment history will appear here.
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="agreements" className="mt-4">
                <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <p className="text-sm font-semibold text-slate-900">Agreements & Briefs</p>
                    <Button variant="outline" size="sm" className="rounded-full" onClick={handleUploadDocument}>
                      <Upload className="h-4 w-4 mr-2" />
                      Upload New
                    </Button>
                  </div>

                  {client?.documents?.length > 0 ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Document Name</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead>Uploaded</TableHead>
                          <TableHead className="text-right">Action</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {client.documents.map((doc: any) => (
                          <TableRow key={doc.id}>
                            <TableCell className="font-medium">
                              <div className="flex items-center gap-2">
                                <FileText className="h-4 w-4 text-blue-500" />
                                <span className="truncate max-w-[180px]" title={doc.name || "Untitled"}>
                                  {doc.name || "Untitled Document"}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="secondary" className="text-xs font-normal">
                                {doc.type || "AGREEMENT"}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-xs text-slate-500">
                              {new Date(doc.createdAt).toLocaleDateString()}
                            </TableCell>
                            <TableCell className="text-right">
                              <Button variant="ghost" size="sm" asChild>
                                <a href={doc.fileUrl} target="_blank" rel="noopener noreferrer">
                                  View
                                </a>
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-8 text-center text-slate-500 border-2 border-dashed border-slate-100 rounded-lg">
                      <FileText className="h-8 w-8 mb-2 opacity-50" />
                      <p>No agreements uploaded yet.</p>
                      <Button variant="link" onClick={handleUploadDocument} className="text-blue-600">
                        Upload your first agreement
                      </Button>
                    </div>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="notes" className="mt-4">
                <div className="space-y-4">
                  <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                      <p className="text-sm font-semibold text-slate-900">Client Notes</p>
                      <Button variant="outline" size="sm" className="rounded-full">
                        <Plus className="h-4 w-4 mr-2" />
                        Add Note
                      </Button>
                    </div>
                    <p className="text-sm text-slate-600">
                      {client.notes || "No notes added yet."}
                    </p>
                  </div>

                  <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                      <p className="text-sm font-semibold text-rose-900">Internal Notes</p>
                      <Button variant="outline" size="sm" className="rounded-full border-rose-300 text-rose-700">
                        <Plus className="h-4 w-4 mr-2" />
                        Add Note
                      </Button>
                    </div>
                    <p className="text-sm text-rose-700">
                      {client.internalNotes || "No internal notes. Add red flags, pricing info, etc."}
                    </p>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        ) : null}

        <Dialog open={showNewProject} onOpenChange={setShowNewProject}>
          <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create New Project</DialogTitle>
              <DialogDescription>
                Add a new project for {client?.name || "this client"}.
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-6 py-4">
              <RadioGroup defaultValue="manual" value={creationMode} onValueChange={(v: "manual" | "ai") => setCreationMode(v)} className="grid grid-cols-2 gap-4">
                <div>
                  <RadioGroupItem value="manual" id="mode-manual" className="peer sr-only" />
                  <Label
                    htmlFor="mode-manual"
                    className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer"
                  >
                    <CalendarClock className="mb-3 h-6 w-6" />
                    Manual Entry
                  </Label>
                </div>
                <div>
                  <RadioGroupItem value="ai" id="mode-ai" className="peer sr-only" />
                  <Label
                    htmlFor="mode-ai"
                    className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer"
                  >
                    <Sparkles className="mb-3 h-6 w-6 text-blue-500" />
                    AI Generation
                  </Label>
                </div>
              </RadioGroup>

              {client && (
                <div className="min-h-[400px]">
                  {creationMode === 'manual' ? (
                    <ProjectForm
                      clientId={client.id}
                      clientName={client.name}
                      onSuccess={handleProjectCreated}
                    />
                  ) : (
                    <AiProjectWizard
                      defaultClientId={client.id}
                      onSuccess={handleProjectCreated}
                    />
                  )}
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </SheetContent>
    </Sheet>
  );
}
