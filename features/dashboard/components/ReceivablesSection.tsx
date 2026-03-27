"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  ArrowRight,
  CalendarDays,
  CircleDollarSign,
  Send,
  Wallet,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { invoiceService } from "@/lib/api/services";
import { CashflowSummaryPanel } from "./CashflowSummaryPanel";

type ReceivablesResponse = {
  buckets: {
    dueTodayAmount: number;
    dueThisWeekAmount: number;
    overdueAmount: number;
    partialPaidAmount: number;
  };
  expectedInflow: {
    next7Days: number;
    next30Days: number;
  };
  stateCounts: {
    draft: number;
    scheduled: number;
    sent: number;
    overdue: number;
    partialPaid: number;
    paid: number;
  };
  businessCounts: {
    activeClients: number;
    activeProjects: number;
    completedProjects: number;
  };
  receivables: Array<{
    id: string;
    clientId: string | null;
    number: string;
    clientName: string;
    dueDate: string | null;
    status: string;
    total: number;
    amountPaid: number;
    balanceDue: number;
    riskLabel: string;
    remindersReady: boolean;
  }>;
  topClients: Array<{
    id: string;
    name: string;
    outstanding: number;
    balanceDue: number;
    overdueCount: number;
    openInvoiceCount: number;
    reliabilityScore: number | null;
    averageDelayDays: number | null;
    trend: number[];
  }>;
  projectPipeline: Array<{
    id: string;
    name: string;
    clientId: string | null;
    clientName: string;
    status: string;
    readyToInvoiceAmount: number;
    invoicedAmount: number;
    paidAmount: number;
    pendingMilestones: number;
    nextMilestoneLabel: string;
  }>;
  cashflowSummary: {
    headline: string;
    summary: string;
    insights: string[];
    recommendations: string[];
  };
};

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}

function riskBadgeClasses(risk: string) {
  if (risk === "Overdue") return "bg-red-50 text-red-700 border-red-200";
  if (risk === "Partial paid") return "bg-amber-50 text-amber-700 border-amber-200";
  if (risk === "Due soon") return "bg-blue-50 text-blue-700 border-blue-200";
  return "bg-emerald-50 text-emerald-700 border-emerald-200";
}

export function ReceivablesSection({ compact = false }: { compact?: boolean }) {
  const [data, setData] = useState<ReceivablesResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sendingReminderId, setSendingReminderId] = useState<string | null>(null);
  const [paymentInvoice, setPaymentInvoice] = useState<
    ReceivablesResponse["receivables"][number] | null
  >(null);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("Bank Transfer");
  const [paymentReference, setPaymentReference] = useState("");
  const [paymentNote, setPaymentNote] = useState("");
  const [recordingPayment, setRecordingPayment] = useState(false);
  const [invoiceFilter, setInvoiceFilter] = useState<
    "all" | "overdue" | "partial_paid" | "due_today" | "no_reminder"
  >("all");

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/dashboard/receivables", { cache: "no-store" });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(json?.error || "Failed to load receivables");
      }
      setData(json);
    } catch (e: any) {
      setError(e?.message || "Failed to load receivables");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const statePills = useMemo(
    () => [
      { label: "Draft", value: data?.stateCounts.draft || 0 },
      { label: "Scheduled", value: data?.stateCounts.scheduled || 0 },
      { label: "Sent", value: data?.stateCounts.sent || 0 },
      { label: "Partial Paid", value: data?.stateCounts.partialPaid || 0 },
      { label: "Overdue", value: data?.stateCounts.overdue || 0 },
      { label: "Paid", value: data?.stateCounts.paid || 0 },
    ],
    [data]
  );

  const filteredReceivables = useMemo(() => {
    const invoices = data?.receivables || [];
    const now = new Date();
    const startOfToday = new Date(now);
    startOfToday.setHours(0, 0, 0, 0);
    const endOfToday = new Date(now);
    endOfToday.setHours(23, 59, 59, 999);

    return invoices.filter((invoice) => {
      if (invoiceFilter === "all") return true;
      if (invoiceFilter === "overdue") {
        return Boolean(invoice.dueDate && new Date(invoice.dueDate) < now);
      }
      if (invoiceFilter === "partial_paid") {
        return invoice.status === "partial_paid";
      }
      if (invoiceFilter === "due_today") {
        return Boolean(
          invoice.dueDate &&
          new Date(invoice.dueDate) >= startOfToday &&
          new Date(invoice.dueDate) <= endOfToday
        );
      }
      if (invoiceFilter === "no_reminder") {
        return !invoice.remindersReady;
      }
      return true;
    });
  }, [data?.receivables, invoiceFilter]);

  const openPaymentDialog = (invoice: ReceivablesResponse["receivables"][number]) => {
    setPaymentInvoice(invoice);
    setPaymentAmount(String(invoice.balanceDue || 0));
    setPaymentMethod("Bank Transfer");
    setPaymentReference("");
    setPaymentNote("");
  };

  const handleSendReminder = async (invoiceId: string) => {
    setSendingReminderId(invoiceId);
    try {
      const res = await fetch("/api/reminders/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ invoiceId, channel: "email" }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(json?.error || "Failed to send reminder");
      }
      toast.success("Reminder sent");
      await load();
    } catch (e: any) {
      toast.error(e?.message || "Failed to send reminder");
    } finally {
      setSendingReminderId(null);
    }
  };

  const handleRecordPayment = async () => {
    if (!paymentInvoice) return;
    const amount = Number(paymentAmount);
    if (!Number.isFinite(amount) || amount <= 0) {
      toast.error("Enter a valid payment amount");
      return;
    }

    setRecordingPayment(true);
    try {
      const res = await invoiceService.recordPayment({
        invoiceId: paymentInvoice.id,
        amount,
        paymentMethod,
        paymentReference,
        paymentNote,
      });
      if (res.error) throw new Error(res.error);
      toast.success("Payment recorded");
      setPaymentInvoice(null);
      await load();
    } catch (e: any) {
      toast.error(e?.message || "Failed to record payment");
    } finally {
      setRecordingPayment(false);
    }
  };

  return (
    <div className="space-y-6">
      <section className="w-full overflow-hidden rounded-3xl border border-white/20 bg-white/90 p-6 shadow-[0_32px_140px_-80px_rgba(0,0,0,0.5)] backdrop-blur-2xl">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Receivables</p>
            <h2 className="text-2xl font-semibold text-foreground">Know what is collectible now</h2>
            <p className="max-w-2xl text-sm text-muted-foreground">
              See what is due today, what is overdue, what is partially paid, and which clients or
              projects need action next.
            </p>
          </div>
          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="rounded-2xl border border-border/60 bg-muted/20 px-3 py-2">
                <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Clients</p>
                <p className="mt-1 text-lg font-semibold">
                  {data?.businessCounts.activeClients || 0}
                </p>
              </div>
              <div className="rounded-2xl border border-border/60 bg-muted/20 px-3 py-2">
                <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                  Active projects
                </p>
                <p className="mt-1 text-lg font-semibold">
                  {data?.businessCounts.activeProjects || 0}
                </p>
              </div>
              <div className="rounded-2xl border border-border/60 bg-muted/20 px-3 py-2">
                <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                  Completed
                </p>
                <p className="mt-1 text-lg font-semibold">
                  {data?.businessCounts.completedProjects || 0}
                </p>
              </div>
            </div>
            <div className="flex justify-end">
              <Button asChild variant="outline" size="sm">
                <a href="/api/dashboard/receivables/export" target="_blank" rel="noreferrer">
                  Export report
                </a>
              </Button>
            </div>
          </div>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {[
            {
              label: "Due today",
              value: data?.buckets.dueTodayAmount || 0,
              sub: "Immediate collection pressure",
              icon: CalendarDays,
            },
            {
              label: "Due this week",
              value: data?.buckets.dueThisWeekAmount || 0,
              sub: "Expected inflow in 7 days",
              icon: Wallet,
            },
            {
              label: "Overdue",
              value: data?.buckets.overdueAmount || 0,
              sub: "Needs active follow-up",
              icon: AlertCircle,
            },
            {
              label: "Partially collected",
              value: data?.buckets.partialPaidAmount || 0,
              sub: "Cash already received",
              icon: CircleDollarSign,
            },
          ].map((card) => {
            const Icon = card.icon;
            return (
              <div
                key={card.label}
                className="rounded-2xl border border-border/60 bg-gradient-to-br from-background to-muted/20 p-4"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">
                      {card.label}
                    </p>
                    <p className="mt-2 text-2xl font-semibold text-foreground">
                      {formatCurrency(card.value)}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">{card.sub}</p>
                  </div>
                  <div className="rounded-2xl border border-border/60 bg-background/90 p-2">
                    <Icon className="h-4 w-4 text-primary" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          {statePills.map((pill) => (
            <div
              key={pill.label}
              className="rounded-full border border-border/60 bg-muted/20 px-3 py-1.5 text-xs text-foreground"
            >
              <span className="font-semibold">{pill.value}</span> {pill.label}
            </div>
          ))}
        </div>

        {error ? (
          <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
            <Button
              variant="link"
              className="ml-2 h-auto p-0 text-red-700"
              onClick={() => void load()}
            >
              Retry
            </Button>
          </div>
        ) : null}
      </section>

      <CashflowSummaryPanel summary={data?.cashflowSummary || null} isLoading={isLoading} />

      <div className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
        <section className="w-full overflow-hidden rounded-3xl border border-white/20 bg-white/90 p-6 shadow-[0_32px_140px_-80px_rgba(0,0,0,0.5)] backdrop-blur-2xl">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">
                Open Receivables
              </p>
              <h3 className="text-xl font-semibold text-foreground">Which invoices need action</h3>
            </div>
            <div className="text-right text-sm text-muted-foreground">
              <p>Next 7d: {formatCurrency(data?.expectedInflow.next7Days || 0)}</p>
              <p>Next 30d: {formatCurrency(data?.expectedInflow.next30Days || 0)}</p>
            </div>
          </div>

          <div className="mt-4 space-y-3">
            <div className="flex flex-wrap gap-2">
              {[
                { value: "all", label: "All" },
                { value: "overdue", label: "Overdue" },
                { value: "partial_paid", label: "Partial paid" },
                { value: "due_today", label: "Due today" },
                { value: "no_reminder", label: "No reminder flow" },
              ].map((filter) => (
                <Button
                  key={filter.value}
                  size="sm"
                  variant={invoiceFilter === filter.value ? "default" : "outline"}
                  className="rounded-full"
                  onClick={() =>
                    setInvoiceFilter(
                      filter.value as
                        | "all"
                        | "overdue"
                        | "partial_paid"
                        | "due_today"
                        | "no_reminder"
                    )
                  }
                >
                  {filter.label}
                </Button>
              ))}
            </div>

            {!isLoading && filteredReceivables.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border/60 bg-muted/20 px-4 py-8 text-center text-sm text-muted-foreground">
                No open receivables right now.
              </div>
            ) : null}

            {filteredReceivables.slice(0, compact ? 5 : 8).map((invoice) => (
              <Link
                key={invoice.id}
                href={`/invoices/new?id=${invoice.id}`}
                className="block rounded-2xl border border-border/60 bg-background/90 p-4 transition hover:border-primary/40 hover:shadow-sm"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-semibold text-foreground">#{invoice.number}</p>
                      <Badge
                        className={`border text-[10px] uppercase ${riskBadgeClasses(invoice.riskLabel)}`}
                      >
                        {invoice.riskLabel}
                      </Badge>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">{invoice.clientName}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {invoice.dueDate
                        ? `Due ${new Date(invoice.dueDate).toLocaleDateString("en-IN")}`
                        : "No due date"}
                    </p>
                  </div>

                  <div className="text-left sm:text-right">
                    <p className="text-sm font-semibold text-foreground">
                      Due {formatCurrency(invoice.balanceDue)}
                    </p>
                    {invoice.amountPaid > 0 ? (
                      <p className="mt-1 text-xs text-amber-700">
                        Collected {formatCurrency(invoice.amountPaid)} of{" "}
                        {formatCurrency(invoice.total)}
                      </p>
                    ) : (
                      <p className="mt-1 text-xs text-muted-foreground">
                        Invoice total {formatCurrency(invoice.total)}
                      </p>
                    )}
                    <div className="mt-3 flex flex-wrap justify-start gap-2 sm:justify-end">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={(e) => {
                          e.preventDefault();
                          void handleSendReminder(invoice.id);
                        }}
                        disabled={sendingReminderId === invoice.id || !invoice.remindersReady}
                      >
                        <Send className="mr-1.5 h-3.5 w-3.5" />
                        {sendingReminderId === invoice.id
                          ? "Sending..."
                          : invoice.remindersReady
                            ? "Send reminder"
                            : "No reminder flow"}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={(e) => {
                          e.preventDefault();
                          openPaymentDialog(invoice);
                        }}
                      >
                        Record payment
                      </Button>
                      {invoice.clientId ? (
                        <Button asChild size="sm">
                          <Link
                            href={`/clients?clientId=${invoice.clientId}`}
                            onClick={(e) => e.stopPropagation()}
                          >
                            Open client
                          </Link>
                        </Button>
                      ) : null}
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>

        <section className="w-full overflow-hidden rounded-3xl border border-white/20 bg-white/90 p-6 shadow-[0_32px_140px_-80px_rgba(0,0,0,0.5)] backdrop-blur-2xl">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">
                Client Risk
              </p>
              <h3 className="text-xl font-semibold text-foreground">
                Who might slow your cashflow
              </h3>
            </div>
            <Link href="/clients" className="text-sm font-medium text-primary hover:underline">
              Open clients
            </Link>
          </div>

          <div className="mt-4 space-y-3">
            {(data?.topClients || []).length === 0 && !isLoading ? (
              <div className="rounded-2xl border border-dashed border-border/60 bg-muted/20 px-4 py-8 text-center text-sm text-muted-foreground">
                No risky clients yet.
              </div>
            ) : null}

            {(data?.topClients || []).map((client) => (
              <div
                key={client.id}
                className="rounded-2xl border border-border/60 bg-background/90 p-4"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold text-foreground">{client.name}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {client.openInvoiceCount} open invoice
                      {client.openInvoiceCount === 1 ? "" : "s"} · {client.overdueCount} overdue
                    </p>
                  </div>
                  <Badge variant="outline" className="text-[10px]">
                    Score {client.reliabilityScore ?? "—"}
                  </Badge>
                </div>
                <div className="mt-3 flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Balance due</span>
                  <span className="font-semibold text-foreground">
                    {formatCurrency(client.balanceDue)}
                  </span>
                </div>
                <div className="mt-3 flex h-12 items-end gap-1">
                  {client.trend.map((point, index) => (
                    <div
                      key={`${client.id}-${index}`}
                      className="flex-1 rounded-t-md bg-primary/20"
                      style={{ height: `${Math.max(point, 10)}%` }}
                      title={`Collection trend ${index + 1}`}
                    />
                  ))}
                </div>
                <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
                  <span>Avg delay {client.averageDelayDays ?? "—"}d</span>
                  <span className="inline-flex items-center gap-1 text-primary">
                    Review
                    <ArrowRight className="h-3.5 w-3.5" />
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      <section className="w-full overflow-hidden rounded-3xl border border-white/20 bg-white/90 p-6 shadow-[0_32px_140px_-80px_rgba(0,0,0,0.5)] backdrop-blur-2xl">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">
              Project Billing Pipeline
            </p>
            <h3 className="text-xl font-semibold text-foreground">
              What is about to become billable
            </h3>
          </div>
          <Link href="/projects" className="text-sm font-medium text-primary hover:underline">
            Open projects
          </Link>
        </div>

        <div className="mt-4 grid gap-3 lg:grid-cols-2">
          {(data?.projectPipeline || []).length === 0 && !isLoading ? (
            <div className="rounded-2xl border border-dashed border-border/60 bg-muted/20 px-4 py-8 text-center text-sm text-muted-foreground lg:col-span-2">
              No project billing pipeline yet.
            </div>
          ) : null}

          {(data?.projectPipeline || []).map((project) => (
            <Link
              key={project.id}
              href={`/projects/${project.id}`}
              className="block rounded-2xl border border-border/60 bg-background/90 p-4 transition hover:border-primary/40 hover:shadow-sm"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold text-foreground">{project.name}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{project.clientName}</p>
                </div>
                <Badge variant="outline" className="text-[10px] uppercase">
                  {project.status}
                </Badge>
              </div>

              <div className="mt-4 grid grid-cols-3 gap-2">
                <div className="rounded-xl border border-border/60 bg-muted/20 p-3">
                  <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Ready</p>
                  <p className="mt-1 text-sm font-semibold">
                    {formatCurrency(project.readyToInvoiceAmount)}
                  </p>
                </div>
                <div className="rounded-xl border border-border/60 bg-muted/20 p-3">
                  <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                    Invoiced
                  </p>
                  <p className="mt-1 text-sm font-semibold">
                    {formatCurrency(project.invoicedAmount)}
                  </p>
                </div>
                <div className="rounded-xl border border-border/60 bg-muted/20 p-3">
                  <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Paid</p>
                  <p className="mt-1 text-sm font-semibold">{formatCurrency(project.paidAmount)}</p>
                </div>
              </div>

              <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
                <span>
                  {project.pendingMilestones} billing milestone
                  {project.pendingMilestones === 1 ? "" : "s"} open
                </span>
                <span className="inline-flex items-center gap-1">
                  {project.nextMilestoneLabel}
                  <ArrowRight className="h-3.5 w-3.5" />
                </span>
              </div>
              {project.readyToInvoiceAmount > 0 ? (
                <div className="mt-3 flex justify-end">
                  <Button asChild size="sm" onClick={(e) => e.stopPropagation()}>
                    <Link
                      href={`/invoices/new?projectId=${project.id}${project.clientId ? `&clientId=${project.clientId}` : ""}`}
                    >
                      Create invoice
                    </Link>
                  </Button>
                </div>
              ) : null}
            </Link>
          ))}
        </div>
      </section>

      <Dialog open={!!paymentInvoice} onOpenChange={(open) => !open && setPaymentInvoice(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Record payment</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="rounded-xl border border-border/60 bg-muted/20 p-3 text-sm">
              <p className="font-medium text-foreground">{paymentInvoice?.number}</p>
              <p className="text-muted-foreground">{paymentInvoice?.clientName}</p>
              <p className="mt-1 text-muted-foreground">
                Balance due: {formatCurrency(Number(paymentInvoice?.balanceDue || 0))}
              </p>
            </div>
            <div className="space-y-2">
              <Label>Amount received</Label>
              <Input value={paymentAmount} onChange={(e) => setPaymentAmount(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Payment method</Label>
              <Input value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Reference</Label>
              <Input
                value={paymentReference}
                onChange={(e) => setPaymentReference(e.target.value)}
                placeholder="UTR / transaction ID / cash note"
              />
            </div>
            <div className="space-y-2">
              <Label>Internal note</Label>
              <Textarea
                value={paymentNote}
                onChange={(e) => setPaymentNote(e.target.value)}
                placeholder="Optional note"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setPaymentInvoice(null)}>
                Cancel
              </Button>
              <Button onClick={handleRecordPayment} disabled={recordingPayment}>
                {recordingPayment ? "Saving..." : "Record payment"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
