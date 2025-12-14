"use client";

import { useMemo, useState } from "react";
import { Plus, Search, ArrowUpDown, MoreVertical, Eye, Mail, FileText, ChevronRight, Loader2, FolderKanban, ArrowRight } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { ClientDetailDrawer } from "./client-detail-drawer";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ClientForm } from "./client-form";
import { NewProjectDialog } from "@/components/projects/new-project-dialog";

type ClientListItem = {
  id: string;
  name: string;
  email?: string | null;
  reliabilityScore: number;
  averageDelayDays: number;
  outstanding: any;
  updatedAt: Date;
  tags?: string | null;
  company?: string | null;
  projectsCount?: number;
  invoicesCount?: number;
};

type ClientsTableViewProps = {
  clients: ClientListItem[];
  userName?: string | null;
  userEmail?: string | null;
  showAiWizard?: boolean;
};

type SortField = "name" | "outstanding" | "score" | "delay";
type SortDirection = "asc" | "desc";

export function ClientsTableView({
  clients,
  userName,
  userEmail,
  showAiWizard = false,
}: ClientsTableViewProps) {
  const [query, setQuery] = useState("");
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [clientProjects, setClientProjects] = useState<Record<string, any[]>>({});
  const [loadingProjects, setLoadingProjects] = useState<Set<string>>(new Set());

  // Restore original state
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [selectedClient, setSelectedClient] = useState<any>(null);
  const [projectCreationClient, setProjectCreationClient] = useState<ClientListItem | null>(null);
  const [reliabilityFilter, setReliabilityFilter] = useState<string>("all");
  const [sortField, setSortField] = useState<SortField>("name");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [showNewClient, setShowNewClient] = useState(showAiWizard);
  const [loadingClient, setLoadingClient] = useState(false);

  // Toggle row expansion and fetch projects if needed
  const toggleRow = async (clientId: string) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(clientId)) {
      newExpanded.delete(clientId);
    } else {
      newExpanded.add(clientId);
      // Fetch data if not already present
      if (!clientProjects[clientId]) {
        setLoadingProjects(prev => new Set(prev).add(clientId));
        try {
          const res = await fetch(`/api/clients/${clientId}`);
          if (res.ok) {
            const data = await res.json();
            setClientProjects(prev => ({ ...prev, [clientId]: data.client.projects || [] }));
          }
        } catch (err) {
          console.error(err);
        } finally {
          setLoadingProjects(prev => {
            const next = new Set(prev);
            next.delete(clientId);
            return next;
          });
        }
      }
    }
    setExpandedRows(newExpanded);
  };

  // Fetch full client details when drawer opens
  const handleClientClick = async (clientId: string) => {
    setSelectedClientId(clientId);
    setLoadingClient(true);
    try {
      const res = await fetch(`/api/clients/${clientId}`);
      if (res.ok) {
        const data = await res.json();
        setSelectedClient(data.client);
      } else {
        // Fallback to basic client data
        const basicClient = clients.find((c) => c.id === clientId);
        setSelectedClient(basicClient);
      }
    } catch (error) {
      // Fallback to basic client data
      const basicClient = clients.find((c) => c.id === clientId);
      setSelectedClient(basicClient);
    } finally {
      setLoadingClient(false);
    }
  };

  const filteredAndSorted = useMemo(() => {
    let filtered = clients;

    // Search filter
    if (query.trim()) {
      const q = query.toLowerCase();
      filtered = filtered.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          (c.email || "").toLowerCase().includes(q) ||
          (c.company || "").toLowerCase().includes(q)
      );
    }

    // Reliability filter
    if (reliabilityFilter !== "all") {
      filtered = filtered.filter((c) => {
        if (reliabilityFilter === "reliable") return c.reliabilityScore >= 80;
        if (reliabilityFilter === "sometimes") return c.reliabilityScore >= 60 && c.reliabilityScore < 80;
        if (reliabilityFilter === "high-risk") return c.reliabilityScore < 60;
        return true;
      });
    }

    // Sort
    const sorted = [...filtered].sort((a, b) => {
      let aVal: any;
      let bVal: any;

      switch (sortField) {
        case "name":
          aVal = a.name.toLowerCase();
          bVal = b.name.toLowerCase();
          break;
        case "outstanding":
          aVal = Number(a.outstanding || 0);
          bVal = Number(b.outstanding || 0);
          break;
        case "score":
          aVal = a.reliabilityScore;
          bVal = b.reliabilityScore;
          break;
        case "delay":
          aVal = a.averageDelayDays;
          bVal = b.averageDelayDays;
          break;
        default:
          return 0;
      }

      if (aVal < bVal) return sortDirection === "asc" ? -1 : 1;
      if (aVal > bVal) return sortDirection === "asc" ? 1 : -1;
      return 0;
    });

    return sorted;
  }, [clients, query, reliabilityFilter, sortField, sortDirection]);

  const getReliabilityBadge = (score: number) => {
    if (score >= 80) {
      return <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">Reliable</Badge>;
    }
    if (score >= 60) {
      return <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100">Sometimes Late</Badge>;
    }
    return <Badge className="bg-rose-100 text-rose-700 hover:bg-rose-100">High Risk</Badge>;
  };

  const formatCurrency = (amount: any) => {
    return `₹${Number(amount || 0).toLocaleString()}`;
  };

  const formatDate = (date: Date) => {
    if (!date) return "—";
    const d = new Date(date);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays}d ago`;
    return d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
  };

  const parseTags = (tags: string | null | undefined): string[] => {
    if (!tags) return [];
    return tags.split(",").map((t) => t.trim()).filter(Boolean);
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-7xl px-4 py-8 lg:px-8">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Clients</h1>
            <p className="mt-1 text-sm text-slate-600">
              Track reliability, outstanding payments & client behavior.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-sm text-slate-500">Total clients</p>
              <p className="text-2xl font-semibold text-slate-900">{clients.length}</p>
            </div>
            <Button
              onClick={() => setShowNewClient(true)}
              className="rounded-full bg-primary shadow-primary/40"
            >
              <Plus className="h-4 w-4 mr-2" />
              New Client
            </Button>
          </div>
        </div>

        {/* Filters Row */}
        <div className="mb-4 flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input
              value={query}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setQuery(e.target.value)}
              placeholder="Search clients..."
              className="pl-9"
            />
          </div>

          <Select value={reliabilityFilter} onValueChange={setReliabilityFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Reliability" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Clients</SelectItem>
              <SelectItem value="reliable">Reliable (80-100)</SelectItem>
              <SelectItem value="sometimes">Sometimes Late (60-79)</SelectItem>
              <SelectItem value="high-risk">High Risk (&lt;60)</SelectItem>
            </SelectContent>
          </Select>

          <Select
            value={`${sortField}-${sortDirection}`}
            onValueChange={(v) => {
              const [field, dir] = v.split("-") as [SortField, SortDirection];
              setSortField(field);
              setSortDirection(dir);
            }}
          >
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="name-asc">Name (A-Z)</SelectItem>
              <SelectItem value="name-desc">Name (Z-A)</SelectItem>
              <SelectItem value="outstanding-desc">Outstanding (High → Low)</SelectItem>
              <SelectItem value="outstanding-asc">Outstanding (Low → High)</SelectItem>
              <SelectItem value="score-asc">Score (Low → High)</SelectItem>
              <SelectItem value="score-desc">Score (High → Low)</SelectItem>
              <SelectItem value="delay-asc">Delay (Low → High)</SelectItem>
              <SelectItem value="delay-desc">Delay (High → Low)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Table */}
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="overflow-x-auto no-scrollbar">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50/50">
                  <TableHead className="w-[30px]"></TableHead>
                  <TableHead className="w-[300px]">
                    <button
                      onClick={() => handleSort("name")}
                      className="flex items-center gap-2 font-semibold hover:text-primary transition-colors"
                    >
                      Client Name
                      <ArrowUpDown className="h-3 w-3" />
                    </button>
                  </TableHead>
                  <TableHead>
                    <button
                      onClick={() => handleSort("score")}
                      className="flex items-center gap-2 font-semibold hover:text-primary transition-colors"
                    >
                      Reliability
                      <ArrowUpDown className="h-3 w-3" />
                    </button>
                  </TableHead>
                  <TableHead className="text-right">Projects</TableHead>
                  <TableHead className="text-right">
                    <div className="flex justify-end">
                      <button
                        onClick={() => handleSort("outstanding")}
                        className="flex items-center gap-2 font-semibold hover:text-primary transition-colors"
                      >
                        Outstanding
                        <ArrowUpDown className="h-3 w-3" />
                      </button>
                    </div>
                  </TableHead>
                  <TableHead className="w-[140px] text-right">
                    <div className="flex justify-end">
                      <button
                        onClick={() => handleSort("delay")}
                        className="flex items-center gap-2 font-semibold hover:text-primary transition-colors"
                      >
                        Avg Delay
                        <ArrowUpDown className="h-3 w-3" />
                      </button>
                    </div>
                  </TableHead>
                  <TableHead className="w-[140px]">Last Invoice</TableHead>
                  <TableHead className="hidden md:table-cell w-[200px]">Tags</TableHead>
                  <TableHead className="w-[200px] text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAndSorted.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="h-32 text-center text-slate-500">
                      No clients found. Try adjusting your filters.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredAndSorted.map((client) => (
                    <>
                      <TableRow
                        key={client.id}
                        className="cursor-pointer hover:bg-slate-50/50 transition-colors group"
                        onClick={() => toggleRow(client.id)}
                      >
                        <TableCell>
                          <ChevronRight className={cn("h-4 w-4 text-slate-400 transition-transform duration-200", expandedRows.has(client.id) ? "rotate-90" : "")} />
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-semibold text-slate-900">{client.name}</p>
                            <p className="text-xs text-slate-500">{client.email || "No email"}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold text-slate-900">
                              {client.reliabilityScore}
                            </span>
                            {getReliabilityBadge(client.reliabilityScore)}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <span className="text-sm font-medium text-slate-900">
                            {client.projectsCount || 0}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <span className="font-semibold text-slate-900">
                            {formatCurrency(client.outstanding)}
                          </span>
                        </TableCell>
                        <TableCell className="text-right font-mono text-slate-600">
                          {client.averageDelayDays.toFixed(1)}d
                        </TableCell>
                        <TableCell className="text-slate-600 text-sm">
                          {formatDate(client.updatedAt)}
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          <div className="flex flex-wrap gap-1">
                            {parseTags(client.tags).slice(0, 2).map((tag, idx) => (
                              <Badge key={idx} variant="outline" className="text-xs">
                                {tag}
                              </Badge>
                            ))}
                            {parseTags(client.tags).length > 2 && (
                              <Badge variant="outline" className="text-xs">
                                +{parseTags(client.tags).length - 2}
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2" onClick={e => e.stopPropagation()}>
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-8 text-xs font-normal"
                              onClick={() => {
                                setProjectCreationClient(client);
                              }}
                            >
                              <Plus className="h-3 w-3 mr-1.5" />
                              New Project
                            </Button>
                            <Button
                              variant="secondary"
                              size="sm"
                              className="h-8 text-xs font-normal"
                              onClick={() => handleClientClick(client.id)}
                            >
                              View
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                      {expandedRows.has(client.id) && (
                        <TableRow className="bg-slate-50/30 hover:bg-slate-50/30">
                          <TableCell colSpan={9} className="p-0">
                            <div className="px-10 py-6 border-b">
                              {loadingProjects.has(client.id) ? (
                                <div className="flex items-center gap-2 text-sm text-slate-500 py-2">
                                  <Loader2 className="h-4 w-4 animate-spin" /> Loading projects...
                                </div>
                              ) : clientProjects[client.id]?.length > 0 ? (
                                <div className="rounded-md border border-slate-200 bg-white shadow-sm overflow-hidden">
                                  <Table>
                                    <TableHeader className="bg-slate-50">
                                      <TableRow>
                                        <TableHead className="w-[250px] pl-4">Project Name</TableHead>
                                        <TableHead className="w-[120px]">Status</TableHead>
                                        <TableHead className="text-right">Budget</TableHead>
                                        <TableHead className="text-right">Invoices</TableHead>
                                        <TableHead className="w-[100px]"></TableHead>
                                      </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                      {clientProjects[client.id].map((project: any) => (
                                        <TableRow key={project.id} className="hover:bg-slate-50 group/project">
                                          <TableCell className="pl-4 font-medium text-slate-900">
                                            <div className="flex items-center gap-2">
                                              <FolderKanban className="h-4 w-4 text-slate-400" />
                                              {project.name}
                                            </div>
                                          </TableCell>
                                          <TableCell>
                                            <Badge variant="outline" className="text-[10px] uppercase tracking-wide">
                                              {project.status}
                                            </Badge>
                                          </TableCell>
                                          <TableCell className="text-right font-mono text-slate-600">
                                            {project.totalBudget ? `₹${(project.totalBudget / 100).toLocaleString()}` : "—"}
                                          </TableCell>
                                          <TableCell className="text-right text-slate-500">
                                            {project._count?.invoices || 0}
                                          </TableCell>
                                          <TableCell className="text-right">
                                            <Link
                                              href={`/projects/${project.id}`}
                                              className="inline-flex items-center text-xs font-medium text-blue-600 hover:text-blue-700 opacity-0 group-hover/project:opacity-100 transition-opacity"
                                            >
                                              Open <ArrowRight className="h-3 w-3 ml-1" />
                                            </Link>
                                          </TableCell>
                                        </TableRow>
                                      ))}
                                    </TableBody>
                                  </Table>
                                </div>
                              ) : (
                                <div className="text-center py-6 text-slate-500 text-sm italic bg-white rounded-lg border border-dashed border-slate-200">
                                  No active projects for {client.name}.
                                  <button
                                    onClick={() => setProjectCreationClient(client)}
                                    className="ml-2 text-blue-600 hover:underline font-medium"
                                  >
                                    Create one?
                                  </button>
                                </div>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>

        {/* Right Drawer */}
        <ClientDetailDrawer
          client={selectedClient}
          open={selectedClientId !== null}
          loading={loadingClient}
          onOpenChange={(open) => {
            if (!open) {
              setSelectedClientId(null);
              setSelectedClient(null);
            }
          }}
          userName={userName}
          userEmail={userEmail}
        />

        {/* New Client Modal */}
        <Dialog open={showNewClient} onOpenChange={setShowNewClient}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Add New Client</DialogTitle>
              <DialogDescription>
                Create a new client profile with all details.
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <ClientForm onSuccess={() => setShowNewClient(false)} />
            </div>
          </DialogContent>
        </Dialog>

        {/* New Project Dialog */}
        {projectCreationClient && (
          <NewProjectDialog
            open={!!projectCreationClient}
            onOpenChange={(open) => !open && setProjectCreationClient(null)}
            clientId={projectCreationClient.id}
            clientName={projectCreationClient.name}
          />
        )}
      </div>
    </div>
  );
}

