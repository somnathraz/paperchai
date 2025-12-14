"use client";

import { useEffect, useMemo, useState } from "react";
import { Bell, FileText, FolderPlus, MoreHorizontal, NotebookPen, Plus, Search, Shield, Wallet, Menu } from "lucide-react";
import { useRouter } from "next/navigation";
import { ProfileSheet } from "@/components/profile/profile-sheet";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { SidebarContent } from "./sidebar";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select";

type TopbarProps = {
  userName?: string | null;
  userEmail?: string | null;
};

export function Topbar({ userName, userEmail }: TopbarProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [stage, setStage] = useState<"action" | "client" | "project">("action");
  const [clients, setClients] = useState<
    { id: string; name: string; reliabilityScore?: number; outstanding?: number | null }[]
  >([]);
  const [selectedClient, setSelectedClient] = useState<
    { id: string; name: string; reliabilityScore?: number; outstanding?: number | null } | null
  >(null);
  const [projectData, setProjectData] = useState({
    name: "",
    description: "",
    status: "active" as "active" | "paused" | "completed" | "archived",
    rateType: "fixed" as "fixed" | "hourly" | "milestone",
    rateValue: "",
    defaultTax: "",
    defaultCurrency: "INR",
    startDate: "",
    endDate: "",
    tags: "",
    notes: "",
    billingMode: "single" as "single" | "milestone",
    paymentSchedule: "",
  });
  const [loadingClients, setLoadingClients] = useState(false);
  const [clientQuery, setClientQuery] = useState("");
  const [selectedAction, setSelectedAction] = useState<string | null>(null);
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);

  useEffect(() => {
    const loadClients = async () => {
      setLoadingClients(true);
      try {
        const res = await fetch("/api/clients/list");
        if (res.ok) {
          const data = await res.json();
          setClients(data.clients || []);
        }
      } finally {
        setLoadingClients(false);
      }
    };
    if (open && stage === "client") loadClients();
  }, [open, stage]);

  const filteredClients = useMemo(() => {
    if (!clientQuery.trim()) return clients;
    const q = clientQuery.toLowerCase();
    return clients.filter((c) => c.name.toLowerCase().includes(q));
  }, [clients, clientQuery]);

  const displayName = userName || userEmail?.split("@")[0] || "PaperChai";
  const initials = displayName
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  const role = "Workspace";

  return (
    <header className="sticky top-0 z-20 flex w-full max-w-full items-center justify-between gap-4 overflow-x-hidden border-b border-border/60 bg-white/70 px-4 py-3 backdrop-blur-xl sm:px-6 lg:px-8">
      <div className="flex items-center gap-3">
        {/* Mobile Menu Trigger */}
        <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="lg:hidden shrink-0 -ml-2">
              <Menu className="h-5 w-5 text-muted-foreground" />
              <span className="sr-only">Toggle menu</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="p-0 w-[280px]">
            <SidebarContent onNavigate={() => setMobileMenuOpen(false)} />
          </SheetContent>
        </Sheet>

        <div className="hidden items-center gap-2 rounded-full border border-border/70 bg-muted/70 px-3 py-2 text-sm text-muted-foreground sm:flex">
          <Search className="h-4 w-4" />
          <input
            className="w-32 sm:w-40 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            placeholder="Search clients, invoices..."
          />
        </div>
        <div className="lg:hidden flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <span className="text-xs font-bold">PC</span>
        </div>
        <span className="hidden text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground sm:inline">Live</span>
        <span className="hidden h-2 w-2 rounded-full bg-emerald-500 sm:inline" />
      </div>

      <div className="flex items-center gap-2">
        <Button
          onClick={() => {
            setStage("action");
            setSelectedAction(null);
            setSelectedClientId(null);
            setSelectedClient(null);
            setProjectData({
              name: "",
              description: "",
              status: "active",
              rateType: "fixed",
              rateValue: "",
              defaultTax: "",
              defaultCurrency: "INR",
              startDate: "",
              endDate: "",
              tags: "",
              notes: "",
              billingMode: "single",
              paymentSchedule: "",
            });
            setOpen(true);
          }}
          className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-primary via-emerald-500 to-primary px-4 py-2 text-xs font-semibold text-primary-foreground shadow-[0_16px_50px_-20px_rgba(16,185,129,0.6)] transition hover:-translate-y-0.5 hover:shadow-[0_18px_60px_-24px_rgba(16,185,129,0.75)]"
        >
          <Plus className="h-4 w-4" />
          Add
        </Button>
        <button className="flex h-10 w-10 items-center justify-center rounded-full border border-border/70 text-muted-foreground transition hover:-translate-y-0.5 hover:shadow-inner">
          <Bell className="h-5 w-5" />
        </button>
        <ProfileSheet displayName={displayName} initials={initials || "PC"} email={userEmail} role={role} />
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          {stage === "action" ? (
            <>
              <DialogHeader>
                <DialogTitle>What do you want to add?</DialogTitle>
                <DialogDescription>
                  Start with the action, then pick the client so nothing gets misplaced.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-3 sm:grid-cols-2">
                {[
                  { key: "invoice", label: "Invoice", icon: FileText, desc: "Create a new invoice" },
                  { key: "payment", label: "Payment", icon: Wallet, desc: "Record a payment" },
                  { key: "project", label: "Project", icon: FolderPlus, desc: "Create a project" },
                  { key: "agreement", label: "Agreement", icon: Shield, desc: "Upload an agreement" },
                  { key: "note", label: "Note", icon: NotebookPen, desc: "Add a client note" },
                  { key: "client", label: "Client", icon: MoreHorizontal, desc: "Create a client" },
                ].map((action) => (
                  <button
                    key={action.key}
                    onClick={() => {
                      if (action.key === "client") {
                        setOpen(false);
                        router.push("/clients?new=1");
                        return;
                      }
                      setSelectedAction(action.key);
                      setStage("client");
                    }}
                    className="flex items-start gap-3 rounded-2xl border border-border/70 bg-muted/40 p-4 text-left transition hover:-translate-y-0.5 hover:bg-muted"
                  >
                    <action.icon className="h-5 w-5 text-primary" />
                    <div>
                      <p className="text-sm font-semibold">{action.label}</p>
                      <p className="text-xs text-muted-foreground">{action.desc}</p>
                    </div>
                  </button>
                ))}
              </div>
            </>
          ) : stage === "client" ? (
            <>
              <DialogHeader>
                <DialogTitle>Select client</DialogTitle>
                <DialogDescription>
                  Actions will attach to the chosen client. You can search by name or reliability.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-3">
                <Input
                  placeholder="Search clients..."
                  value={clientQuery}
                  onChange={(e) => setClientQuery(e.target.value)}
                />
                <ScrollArea className="max-h-[320px] rounded-xl border border-border/60">
                  <div className="divide-y divide-border/60">
                    {loadingClients && (
                      <div className="px-4 py-3 text-sm text-muted-foreground">Loading clients…</div>
                    )}
                    {!loadingClients &&
                      filteredClients.map((client) => {
                        const score = client.reliabilityScore ?? 100;
                        const badge =
                          score >= 80
                            ? "bg-emerald-100 text-emerald-700"
                            : score >= 60
                              ? "bg-amber-100 text-amber-700"
                              : "bg-rose-100 text-rose-700";
                        return (
                          <label
                            key={client.id}
                            className="flex cursor-pointer items-center gap-3 px-4 py-3 hover:bg-muted/40"
                          >
                            <input
                              type="radio"
                              name="client"
                              className="mt-0.5"
                              checked={selectedClientId === client.id}
                              onChange={() => {
                                setSelectedClientId(client.id);
                                setSelectedClient(client);
                              }}
                            />
                            <div className="flex-1">
                              <p className="text-sm font-semibold text-foreground">{client.name}</p>
                              <p className="text-xs text-muted-foreground">
                                Outstanding: ₹{Number(client.outstanding || 0).toLocaleString()}
                              </p>
                            </div>
                            <span className={`rounded-full px-2 py-[2px] text-[10px] font-semibold ${badge}`}>
                              {score}
                            </span>
                          </label>
                        );
                      })}
                    {!loadingClients && filteredClients.length === 0 && (
                      <div className="px-4 py-3 text-sm text-muted-foreground">No clients found.</div>
                    )}
                  </div>
                </ScrollArea>
              </div>
              <DialogFooter className="mt-4">
                <Button variant="outline" onClick={() => setStage("action")}>
                  Back
                </Button>
                <Button
                  onClick={() => {
                    if (!selectedClientId || !selectedAction) return;
                    if (selectedAction === "project") {
                      setStage("project");
                      return;
                    }
                    setOpen(false);
                    if (selectedAction === "invoice") {
                      router.push(`/invoices/new?clientId=${selectedClientId}`);
                    } else {
                      router.push(`/clients?clientId=${selectedClientId}&action=${selectedAction}`);
                    }
                  }}
                  disabled={!selectedClientId}
                >
                  Next
                </Button>
              </DialogFooter>
            </>
          ) : stage === "project" ? (
            <>
              <DialogHeader>
                <DialogTitle>Create project</DialogTitle>
                <DialogDescription>
                  Link a new project to {selectedClient?.name || "the selected client"}.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="rounded-lg bg-muted/40 p-3 text-xs text-muted-foreground">
                  <p>
                    Client: <strong>{selectedClient?.name}</strong>
                  </p>
                  <p>Projects stay inside the selected workspace.</p>
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-2 sm:col-span-2">
                    <label className="text-sm font-medium">Project name</label>
                    <Input
                      placeholder="e.g., Website redesign"
                      value={projectData.name}
                      onChange={(e) => setProjectData({ ...projectData, name: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Status</label>
                    <Select
                      value={projectData.status}
                      onValueChange={(v: any) => setProjectData({ ...projectData, status: v })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="paused">Paused</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                        <SelectItem value="archived">Archived</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Rate type</label>
                    <Select
                      value={projectData.rateType}
                      onValueChange={(v: any) => setProjectData({ ...projectData, rateType: v })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="fixed">Fixed</SelectItem>
                        <SelectItem value="hourly">Hourly</SelectItem>
                        <SelectItem value="milestone">Milestone</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Billing mode</label>
                    <Select
                      value={projectData.billingMode}
                      onValueChange={(v: any) => setProjectData({ ...projectData, billingMode: v })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="single">Single payment</SelectItem>
                        <SelectItem value="milestone">Milestone-based</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">
                      {projectData.rateType === "hourly"
                        ? "Hourly rate"
                        : projectData.rateType === "milestone"
                          ? "Milestone value"
                          : "Fixed amount"}
                    </label>
                    <Input
                      type="number"
                      value={projectData.rateValue}
                      onChange={(e) => setProjectData({ ...projectData, rateValue: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Default tax (%)</label>
                    <Input
                      type="number"
                      value={projectData.defaultTax}
                      onChange={(e) => setProjectData({ ...projectData, defaultTax: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Currency</label>
                    <Select
                      value={projectData.defaultCurrency}
                      onValueChange={(v: string) => setProjectData({ ...projectData, defaultCurrency: v })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="INR">INR (₹)</SelectItem>
                        <SelectItem value="USD">USD ($)</SelectItem>
                        <SelectItem value="EUR">EUR (€)</SelectItem>
                        <SelectItem value="GBP">GBP (£)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Start date</label>
                    <Input
                      type="date"
                      value={projectData.startDate}
                      onChange={(e) => setProjectData({ ...projectData, startDate: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">End date</label>
                    <Input
                      type="date"
                      value={projectData.endDate}
                      onChange={(e) => setProjectData({ ...projectData, endDate: e.target.value })}
                    />
                  </div>
                </div>

                {projectData.billingMode === "milestone" && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Payment schedule (steps)</label>
                    <textarea
                      className="min-h-[80px] w-full rounded-md border border-border/70 bg-background px-3 py-2 text-sm"
                      placeholder={`Milestone 1 - 40% on design\nMilestone 2 - 40% on dev\nMilestone 3 - 20% on launch`}
                      value={projectData.paymentSchedule}
                      onChange={(e) => setProjectData({ ...projectData, paymentSchedule: e.target.value })}
                    />
                    <p className="text-xs text-muted-foreground">
                      We will store this schedule so invoices can be triggered per milestone.
                    </p>
                  </div>
                )}

                <div className="space-y-2">
                  <label className="text-sm font-medium">Tags</label>
                  <Input
                    placeholder="e.g., Design, Urgent"
                    value={projectData.tags}
                    onChange={(e) => setProjectData({ ...projectData, tags: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Description / Notes</label>
                  <textarea
                    className="min-h-[80px] w-full rounded-md border border-border/70 bg-background px-3 py-2 text-sm"
                    value={projectData.description}
                    onChange={(e) => setProjectData({ ...projectData, description: e.target.value })}
                    placeholder="Brief description and internal notes"
                  />
                </div>
              </div>
              <DialogFooter className="mt-4">
                <Button
                  variant="outline"
                  onClick={() => {
                    setStage("client");
                  }}
                >
                  Back
                </Button>
                <Button
                  onClick={async () => {
                    if (!selectedClientId || !projectData.name.trim()) return;
                    const res = await fetch("/api/projects", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        ...projectData,
                        clientId: selectedClientId,
                        rateValue: projectData.rateValue ? parseFloat(projectData.rateValue) : 0,
                        defaultTax: projectData.defaultTax ? parseFloat(projectData.defaultTax) : 0,
                        startDate: projectData.startDate || undefined,
                        endDate: projectData.endDate || undefined,
                        billingMode: projectData.billingMode,
                        paymentSchedule: projectData.paymentSchedule,
                      }),
                    });
                    if (res.ok) {
                      setOpen(false);
                      setProjectData({
                        name: "",
                        description: "",
                        status: "active",
                        rateType: "fixed",
                        rateValue: "",
                        defaultTax: "",
                        defaultCurrency: "INR",
                        startDate: "",
                        endDate: "",
                        tags: "",
                        notes: "",
                        billingMode: "single",
                        paymentSchedule: "",
                      });
                      router.refresh();
                    }
                  }}
                  disabled={!projectData.name.trim()}
                >
                  Create project
                </Button>
              </DialogFooter>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </header>
  );
}
