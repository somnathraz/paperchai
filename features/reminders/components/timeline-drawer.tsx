"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, Clock, Mail, MessageSquare, Send } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useReminders } from "../hooks/useReminders";

interface TimelineDrawerProps {
  invoiceId?: string;
  clientName?: string;
}

export function TimelineDrawerContent({
  invoiceId,
  clientName = "Unknown Client",
}: TimelineDrawerProps) {
  const { sendReminder, refreshData } = useReminders();
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState<any[]>([]);
  const [invoiceLabel, setInvoiceLabel] = useState<string>(invoiceId || "Unknown");
  const [resolvedClientName, setResolvedClientName] = useState<string>(clientName);

  const loadTimeline = async () => {
    if (!invoiceId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/reminders/timeline/${invoiceId}`);
      if (!res.ok) throw new Error("Failed to fetch timeline");
      const data = await res.json();
      setEvents(data.events || []);
      setInvoiceLabel(data.invoice?.number || invoiceId);
      setResolvedClientName(data.invoice?.clientName || clientName);
    } catch (error) {
      toast.error("Failed to load timeline");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTimeline();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [invoiceId]);

  const handleSendNow = async () => {
    if (!invoiceId) return;

    setSending(true);
    try {
      await sendReminder(invoiceId, "email");
      toast.success("Reminder sent successfully");
      refreshData();
      await loadTimeline();
    } catch (error) {
      toast.error("Failed to send reminder");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="h-full bg-background p-6 space-y-8">
      <div>
        <h3 className="text-xl font-bold">Resend Strategy</h3>
        <p className="text-sm text-muted-foreground">
          Invoice #{invoiceLabel} - {resolvedClientName}
        </p>
      </div>

      <div className="relative border-l-2 border-border/50 ml-3 space-y-8">
        {loading ? (
          <div className="relative pl-6 text-sm text-muted-foreground">Loading timeline...</div>
        ) : events.length === 0 ? (
          <div className="relative pl-6 text-sm text-muted-foreground">
            No reminder history found yet.
          </div>
        ) : (
          events.map((event) => {
            const isSent = event.status === "sent";
            const isFailed = event.status === "failed";
            const isPending = event.status === "pending" || event.status === "processing";
            const isPaid = event.status === "paid" || event.status === "partial_paid";
            return (
              <div key={event.id} className="relative pl-6">
                <div
                  className={`absolute -left-[9px] top-0 h-4 w-4 rounded-full border-2 border-background flex items-center justify-center ${
                    isSent || isPaid
                      ? "bg-emerald-500"
                      : isFailed
                        ? "bg-red-500"
                        : isPending
                          ? "bg-blue-500"
                          : "bg-muted"
                  }`}
                >
                  {isSent || isPaid ? (
                    <CheckCircle2 className="h-3 w-3 text-white" />
                  ) : isFailed ? (
                    <MessageSquare className="h-3 w-3 text-white" />
                  ) : isPending ? (
                    <Clock className="h-3 w-3 text-white" />
                  ) : (
                    <Mail className="h-3 w-3 text-muted-foreground" />
                  )}
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-0.5">
                    {new Date(event.at).toLocaleString()}
                  </p>
                  <p className="text-sm font-medium">{event.title}</p>
                  {event.details ? (
                    <p className="text-xs text-red-600 mt-1">{event.details}</p>
                  ) : null}
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className="pt-6 border-t border-border flex gap-3">
        <Button
          onClick={handleSendNow}
          disabled={sending}
          className="flex-1 rounded-xl bg-primary text-primary-foreground py-2.5 text-sm font-semibold hover:bg-primary/90 transition-colors flex items-center justify-center gap-2"
        >
          <Send className={`h-4 w-4 ${sending ? "animate-spin" : ""}`} />
          {sending ? "Sending..." : "Send Now"}
        </Button>
        <button className="flex-1 rounded-xl border border-border bg-background py-2.5 text-sm font-semibold hover:bg-muted transition-colors">
          Skip
        </button>
      </div>
    </div>
  );
}
