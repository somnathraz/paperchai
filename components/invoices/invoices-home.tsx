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
  updatedAt: string;
  status: string;
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
  const [filter, setFilter] = useState<string>("all");
  const [isUpdating, setIsUpdating] = useState<string | null>(null);

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

  const filteredInvoices = useMemo(() => {
    if (filter === "all") return invoices;
    return invoices.filter((inv) => inv.status === filter);
  }, [invoices, filter]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "draft":
        return "bg-slate-100 text-slate-700";
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

        <div className="mt-8">
          <div className="flex flex-wrap gap-2 pb-4">
            {["all", "draft", "sent", "paid", "overdue"].map((status) => (
              <Button
                key={status}
                variant={filter === status ? "default" : "outline"}
                size="sm"
                onClick={() => setFilter(status)}
                className="capitalize rounded-full px-4 h-8 text-xs font-medium"
              >
                {status}
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
            filteredInvoices.map((invoice) => (
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
                        className={`text-[10px] px-1.5 h-4 uppercase ${getStatusColor(invoice.status)}`}
                      >
                        {invoice.status}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">{invoice.clientName}</p>
                  </div>

                  <div className="flex items-center gap-4">
                    <span className="text-sm font-semibold text-foreground">{invoice.amount}</span>

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
            ))
          )}
        </div>
      </section>

      {showGallery ? (
        <TemplateGallery firstName={firstName} templates={templates} variant="embedded" />
      ) : null}
    </div>
  );
}
