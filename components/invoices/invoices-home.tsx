"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ChevronDown, ChevronUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TemplateGallery } from "@/components/invoices/template-gallery";
import { invoiceService } from "@/lib/api/services";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { CheckCircle2, Clock, MoreHorizontal } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { SummaryCards } from "@/components/invoices/summary-cards";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type InvoiceSummary = {
  id: string;
  number: string;
  clientName: string;
  amount: string;
  totalRaw: number;
  amountPaidRaw: number;
  balanceDueRaw: number;
  createdAt: string;
  updatedAt: string;
  status: string;
  paymentMethod?: string | null;
  paymentReference?: string | null;
  paidAt?: string | null;
  source?: string | null;
  automationName?: string | null;
  approvalStatus?: string | null;
};

type InvoicesHomeProps = {
  firstName: string;
  templates: {
    slug: string;
    name: string;
    isPro: boolean;
    tags?: string | null;
    accent?: string | null;
    category?: string | null;
  }[];
  invoices: InvoiceSummary[];
};

export function InvoicesHome({ firstName, templates, invoices }: InvoicesHomeProps) {
  const router = useRouter();
  const [showGallery, setShowGallery] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sourceFilter, setSourceFilter] = useState<string>("all");
  const [isUpdating, setIsUpdating] = useState<string | null>(null);
  const [paymentInvoice, setPaymentInvoice] = useState<InvoiceSummary | null>(null);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("Bank Transfer");
  const [paymentReference, setPaymentReference] = useState("");
  const [paymentNote, setPaymentNote] = useState("");
  const [recordingPayment, setRecordingPayment] = useState(false);

  const handleUpdateStatus = async (invoiceId: string, status: string) => {
    setIsUpdating(invoiceId);
    try {
      const res = await invoiceService.updateStatus(invoiceId, status);
      if (res.error) throw new Error(res.error);
      toast.success(`Invoice marked as ${status}`);
      router.refresh();
    } catch (error: any) {
      toast.error(error.message || "Failed to update status");
    } finally {
      setIsUpdating(null);
    }
  };

  const openPaymentDialog = (invoice: InvoiceSummary) => {
    setPaymentInvoice(invoice);
    setPaymentAmount(String(invoice.balanceDueRaw || invoice.totalRaw || 0));
    setPaymentMethod(invoice.paymentMethod || "Bank Transfer");
    setPaymentReference(invoice.paymentReference || "");
    setPaymentNote("");
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
      router.refresh();
    } catch (error: any) {
      toast.error(error.message || "Failed to record payment");
    } finally {
      setRecordingPayment(false);
    }
  };

  const normalizeSource = (source?: string | null) => {
    const normalized = (source || "manual").toLowerCase();
    if (normalized.includes("slack")) return "slack";
    if (normalized.includes("notion")) return "notion";
    if (normalized.includes("recurring")) return "recurring";
    if (normalized.includes("api")) return "api";
    return "manual";
  };

  const filteredInvoices = useMemo(() => {
    return invoices.filter((inv) => {
      const isPartial = inv.amountPaidRaw > 0 && inv.balanceDueRaw > 0 && inv.status !== "paid";
      const statusOk =
        statusFilter === "all"
          ? true
          : statusFilter === "partial"
            ? isPartial
            : inv.status === statusFilter;
      const sourceOk = sourceFilter === "all" ? true : normalizeSource(inv.source) === sourceFilter;
      return statusOk && sourceOk;
    });
  }, [invoices, statusFilter, sourceFilter]);

  const summary = useMemo(() => {
    const slackInvoices = invoices.filter((inv) => normalizeSource(inv.source) === "slack");
    const slackPendingApproval = slackInvoices.filter((inv) => inv.approvalStatus === "PENDING");
    const slackSentOrPaid = slackInvoices.filter(
      (inv) => inv.status === "sent" || inv.status === "paid"
    );
    const totalOutstanding = invoices
      .filter((inv) => ["sent", "overdue", "scheduled"].includes(inv.status))
      .reduce((sum, inv) => sum + inv.totalRaw, 0);
    const totalBalanceDue = invoices
      .filter((inv) => ["sent", "overdue", "scheduled"].includes(inv.status))
      .reduce((sum, inv) => sum + inv.balanceDueRaw, 0);
    const totalPartialCollected = invoices.reduce((sum, inv) => sum + inv.amountPaidRaw, 0);
    const paidCount = invoices.filter((inv) => inv.status === "paid").length;
    return {
      total: invoices.length,
      slackTotal: slackInvoices.length,
      slackPendingApproval: slackPendingApproval.length,
      slackSentOrPaid: slackSentOrPaid.length,
      totalOutstanding,
      totalBalanceDue,
      totalPartialCollected,
      paidCount,
    };
  }, [invoices]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "draft":
        return "bg-slate-100 text-slate-700";
      case "partial":
        return "bg-amber-100 text-amber-700";
      case "sent":
        return "bg-blue-100 text-blue-700";
      case "paid":
        return "bg-green-100 text-green-700";
      case "overdue":
        return "bg-red-100 text-red-700";
      case "scheduled":
        return "bg-purple-100 text-purple-700";
      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  return (
    <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8 py-6 space-y-8">
      <section className="rounded-3xl border border-border/60 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Invoices</p>
            <h1 className="text-2xl font-semibold text-foreground">Manage your invoices</h1>
            <p className="text-sm text-muted-foreground">
              Track drafts, sent invoices, and payments in one place.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
            <Button
              variant="outline"
              onClick={() => setShowGallery((prev) => !prev)}
              className="w-full sm:w-auto"
            >
              {showGallery ? (
                <>
                  <ChevronUp className="mr-2 h-4 w-4" />
                  Hide template gallery
                </>
              ) : (
                <>
                  <ChevronDown className="mr-2 h-4 w-4" />
                  View template gallery
                </>
              )}
            </Button>
            <Button asChild className="w-full sm:w-auto">
              <Link href="/invoices/new">Create Invoice</Link>
            </Button>
          </div>
        </div>

        <div className="mt-6">
          <SummaryCards
            cards={[
              {
                label: "Outstanding",
                value: new Intl.NumberFormat("en-IN", {
                  style: "currency",
                  currency: "INR",
                  maximumFractionDigits: 0,
                }).format(summary.totalOutstanding),
                sub: "Total open invoice value",
              },
              {
                label: "Balance Due",
                value: new Intl.NumberFormat("en-IN", {
                  style: "currency",
                  currency: "INR",
                  maximumFractionDigits: 0,
                }).format(summary.totalBalanceDue),
                sub: "Open amount after partial payments",
              },
              {
                label: "Recorded Payments",
                value: new Intl.NumberFormat("en-IN", {
                  style: "currency",
                  currency: "INR",
                  maximumFractionDigits: 0,
                }).format(summary.totalPartialCollected),
                sub: `${summary.paidCount} fully paid invoices`,
              },
            ]}
          />
        </div>

        <div className="mt-8 min-w-0">
          <div className="mb-4 grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-4 min-w-0">
            <div className="rounded-2xl border border-border/60 bg-muted/20 p-3 min-w-0">
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground truncate">
                Total invoices
              </p>
              <p className="mt-1 text-xl font-semibold">{summary.total}</p>
            </div>
            <div className="rounded-2xl border border-border/60 bg-muted/20 p-3 min-w-0">
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground truncate">
                From Slack
              </p>
              <p className="mt-1 text-xl font-semibold">{summary.slackTotal}</p>
            </div>
            <div className="rounded-2xl border border-border/60 bg-muted/20 p-3 min-w-0">
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground truncate">
                Pending approval
              </p>
              <p className="mt-1 text-xl font-semibold">{summary.slackPendingApproval}</p>
            </div>
            <div className="rounded-2xl border border-border/60 bg-muted/20 p-3 min-w-0">
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground truncate">
                Slack sent/paid
              </p>
              <p className="mt-1 text-xl font-semibold">{summary.slackSentOrPaid}</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 pb-4">
            {["all", "draft", "sent", "partial", "paid", "overdue"].map((status) => (
              <Button
                key={status}
                variant={statusFilter === status ? "default" : "outline"}
                size="sm"
                onClick={() => setStatusFilter(status)}
                className="capitalize rounded-full px-4 h-8 text-xs font-medium"
              >
                {status === "partial" ? "partial paid" : status}
              </Button>
            ))}
          </div>
          <div className="flex flex-wrap gap-2 pb-2">
            {[
              { value: "all", label: "All sources" },
              { value: "slack", label: "Slack" },
              { value: "manual", label: "Manual" },
              { value: "api", label: "API" },
              { value: "recurring", label: "Recurring" },
            ].map((source) => (
              <Button
                key={source.value}
                variant={sourceFilter === source.value ? "default" : "outline"}
                size="sm"
                onClick={() => setSourceFilter(source.value)}
                className="rounded-full px-4 h-8 text-xs font-medium"
              >
                {source.label}
              </Button>
            ))}
          </div>
        </div>

        <div className="mt-5 space-y-3">
          {filteredInvoices.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border/70 bg-muted/30 p-6 text-sm text-muted-foreground">
              No invoices found for this filter.
            </div>
          ) : (
            filteredInvoices.map((invoice) => {
              const isPartialPaid =
                invoice.amountPaidRaw > 0 && invoice.balanceDueRaw > 0 && invoice.status !== "paid";

              return (
                <Link
                  key={invoice.id}
                  href={
                    invoice.status === "draft"
                      ? `/invoices/new?id=${invoice.id}`
                      : `/invoices/new?id=${invoice.id}`
                  }
                  className="block rounded-2xl border border-border/60 bg-white p-4 transition hover:border-primary/40 hover:shadow-sm"
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between relative">
                    <div className="min-w-0 pr-10">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-foreground">#{invoice.number}</p>
                        <Badge
                          className={`text-[10px] px-1.5 h-4 uppercase ${getStatusColor(
                            isPartialPaid ? "partial" : invoice.status
                          )}`}
                        >
                          {isPartialPaid ? "partial paid" : invoice.status}
                        </Badge>
                        <Badge variant="outline" className="text-[10px] uppercase">
                          {normalizeSource(invoice.source)}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">{invoice.clientName}</p>
                    </div>

                    <div className="flex items-center gap-4">
                      <span className="text-sm font-semibold text-foreground">
                        {invoice.amount}
                      </span>
                      {invoice.amountPaidRaw > 0 && invoice.status !== "paid" ? (
                        <span className="text-xs text-amber-700">
                          Paid{" "}
                          {new Intl.NumberFormat("en-IN", {
                            style: "currency",
                            currency: "INR",
                            maximumFractionDigits: 0,
                          }).format(invoice.amountPaidRaw)}{" "}
                          · Due{" "}
                          {new Intl.NumberFormat("en-IN", {
                            style: "currency",
                            currency: "INR",
                            maximumFractionDigits: 0,
                          }).format(invoice.balanceDueRaw)}
                        </span>
                      ) : null}

                      <DropdownMenu>
                        <DropdownMenuTrigger asChild onClick={(e) => e.preventDefault()}>
                          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem asChild>
                            <Link href={`/invoices/new?id=${invoice.id}`}>View / Edit</Link>
                          </DropdownMenuItem>
                          {(invoice.status === "sent" || invoice.status === "overdue") && (
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.preventDefault();
                                openPaymentDialog(invoice);
                              }}
                            >
                              Record payment
                            </DropdownMenuItem>
                          )}
                          {invoice.status === "sent" && (
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.preventDefault();
                                handleUpdateStatus(invoice.id, "paid");
                              }}
                              disabled={isUpdating === invoice.id}
                              className="text-green-600 focus:text-green-600"
                            >
                              <CheckCircle2 className="mr-2 h-4 w-4" />
                              Mark as Paid
                            </DropdownMenuItem>
                          )}
                          {invoice.status === "paid" && (
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.preventDefault();
                                handleUpdateStatus(invoice.id, "sent");
                              }}
                              disabled={isUpdating === invoice.id}
                            >
                              <Clock className="mr-2 h-4 w-4" />
                              Revert to Sent
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                    <span>Created {new Date(invoice.createdAt).toLocaleDateString("en-IN")}</span>
                    <span>Updated {new Date(invoice.updatedAt).toLocaleDateString("en-IN")}</span>
                    {invoice.automationName ? (
                      <Badge variant="outline" className="text-[10px]">
                        Automation: {invoice.automationName}
                      </Badge>
                    ) : null}
                    {invoice.approvalStatus === "PENDING" ? (
                      <Badge variant="outline" className="text-[10px] text-amber-700">
                        Approval pending
                      </Badge>
                    ) : null}
                  </div>
                </Link>
              );
            })
          )}
        </div>
      </section>

      {showGallery ? (
        <TemplateGallery firstName={firstName} templates={templates} variant="embedded" />
      ) : null}

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
                Balance due: {paymentInvoice?.balanceDueRaw?.toLocaleString("en-IN")}
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
