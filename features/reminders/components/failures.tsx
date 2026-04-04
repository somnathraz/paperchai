"use client";

import { AlertTriangle, RefreshCcw, XCircle, CheckCircle2 } from "lucide-react";
import { useReminders } from "../hooks/useReminders";
import { toast } from "sonner";
import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";

interface FailureItem {
  id: string;
  stepId?: string;
  invoiceId?: string;
  invoiceNumber?: string;
  occurredAt?: string;
  status?: string;
  title: string;
  reason: string;
  client: string;
  type: string;
}

export function Failures() {
  const { filteredFailures, isLoading, refreshData } = useReminders();
  const [actioningId, setActioningId] = useState<string | null>(null);
  const [logOpen, setLogOpen] = useState(false);
  const [logLoading, setLogLoading] = useState(false);
  const [logData, setLogData] = useState<any | null>(null);

  const handleAction = async (stepId: string, action: "retry" | "dismiss") => {
    setActioningId(stepId);
    try {
      const res = await fetch("/api/reminders/actions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stepId, action }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Action failed");
      }
      toast.success(action === "retry" ? "Reminder queued for retry" : "Failure dismissed");
      refreshData();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to apply action");
    } finally {
      setActioningId(null);
    }
  };

  const handleViewLog = async (stepId: string) => {
    setLogOpen(true);
    setLogLoading(true);
    try {
      const res = await fetch(`/api/reminders/steps/${stepId}`);
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to load step log");
      }
      const data = await res.json();
      setLogData(data);
    } catch (error) {
      setLogData(null);
      toast.error(error instanceof Error ? error.message : "Failed to load step log");
    } finally {
      setLogLoading(false);
    }
  };

  if (isLoading && filteredFailures.length === 0) {
    return (
      <div className="rounded-3xl border border-border/50 bg-card/50 p-5 space-y-4 animate-pulse">
        <div className="h-5 w-32 bg-muted rounded" />
        <div className="h-20 w-full bg-muted/20 rounded-xl" />
      </div>
    );
  }

  if (filteredFailures.length === 0) {
    return (
      <div className="rounded-3xl border border-dashed border-border bg-card/30 p-5 flex flex-col items-center justify-center text-center min-h-[150px]">
        <div className="h-10 w-10 rounded-full bg-emerald-50 text-emerald-500 flex items-center justify-center mb-3">
          <CheckCircle2 className="h-5 w-5" />
        </div>
        <p className="text-sm font-medium">All systems normal</p>
        <p className="text-xs text-muted-foreground mt-1">
          No failed reminders match the active filters.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-3xl border border-red-200 bg-red-50/30 p-5 space-y-4">
      <div className="flex items-center gap-2 text-red-700">
        <AlertTriangle className="h-4 w-4" />
        <h3 className="font-semibold text-sm">Attention Items ({filteredFailures.length})</h3>
      </div>

      <div className="space-y-2">
        {filteredFailures.map((item: FailureItem) => (
          <div
            key={item.id}
            className="bg-white rounded-xl p-3 border border-red-100 shadow-sm transition-all hover:shadow-md"
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-foreground">{item.title}</p>
                <p className="text-xs text-red-600 mt-0.5">{item.reason}</p>
                <p className="text-[10px] text-muted-foreground mt-1">Client: {item.client}</p>
              </div>
              <div className="flex items-center gap-1">
                <button
                  className="h-7 w-7 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-500 transition-colors"
                  title="Retry"
                  disabled={actioningId === (item.stepId || item.id)}
                  onClick={() => handleAction(item.stepId || item.id, "retry")}
                >
                  <RefreshCcw className="h-3.5 w-3.5" />
                </button>
                <button
                  className="h-7 w-7 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-500 transition-colors"
                  title="Dismiss"
                  disabled={actioningId === (item.stepId || item.id)}
                  onClick={() => handleAction(item.stepId || item.id, "dismiss")}
                >
                  <XCircle className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
            <div className="mt-2 pt-2 border-t border-border/50 flex items-center gap-3">
              <button
                className="text-xs font-medium text-muted-foreground hover:text-foreground"
                onClick={() => handleViewLog(item.stepId || item.id)}
              >
                View Log
              </button>
              {item.invoiceId ? (
                <a
                  href={`/invoices/new?id=${item.invoiceId}`}
                  className="text-xs font-medium text-primary hover:text-primary/80"
                >
                  Open Invoice
                </a>
              ) : null}
            </div>
          </div>
        ))}
      </div>
      <Sheet open={logOpen} onOpenChange={setLogOpen}>
        <SheetContent className="w-[420px] sm:w-[560px]">
          <SheetHeader>
            <SheetTitle>Reminder Failure Log</SheetTitle>
          </SheetHeader>
          {logLoading ? (
            <div className="mt-6 text-sm text-muted-foreground">Loading log...</div>
          ) : !logData?.step ? (
            <div className="mt-6 text-sm text-muted-foreground">No log data found.</div>
          ) : (
            <div className="mt-6 space-y-4 text-sm">
              <div className="rounded-xl border p-3">
                <p className="text-xs text-muted-foreground">Step</p>
                <p className="font-medium">
                  #{logData.step.index + 1} • {logData.step.status}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Send at: {new Date(logData.step.sendAt).toLocaleString()}
                </p>
                {logData.step.lastError ? (
                  <p className="text-xs text-red-600 mt-2">{logData.step.lastError}</p>
                ) : null}
              </div>
              <div className="rounded-xl border p-3">
                <p className="text-xs text-muted-foreground">Invoice</p>
                <p className="font-medium">
                  #{logData.step.invoice?.number || logData.step.invoice?.id} •{" "}
                  {logData.step.invoice?.client?.name}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Status: {logData.step.invoice?.status || "unknown"}
                </p>
              </div>
              <div className="rounded-xl border p-3">
                <p className="text-xs text-muted-foreground mb-2">Recent Events</p>
                <div className="space-y-2 max-h-64 overflow-auto">
                  {(logData.history || []).map((h: any) => (
                    <div key={h.id} className="text-xs">
                      <p className="font-medium">
                        {h.kind || "event"} • {h.status || "unknown"}
                      </p>
                      <p className="text-muted-foreground">
                        {new Date(h.createdAt).toLocaleString()}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
