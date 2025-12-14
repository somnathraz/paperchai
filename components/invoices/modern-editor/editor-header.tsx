"use client";

import Link from "next/link";
import { useState, memo } from "react";
import { ArrowLeft, Save, Clock, Send, Download, Sparkles } from "lucide-react";
import { DatePicker } from "@/components/ui/date-picker";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type EditorHeaderProps = {
  invoiceId?: string;
  templateName: string;
  onSaveDraft: () => void;
  onSchedule: (opts: { invoiceId?: string; when: string; channel: "email" | "whatsapp" | "both" }) => void;
  onSend: (opts: { invoiceId?: string; channel: "email" | "whatsapp" | "both" }) => void;
  onOpenSendModal?: () => void;
  onAIReview?: () => void;
  aiReviewIssueCount?: number;
  invoiceStatus?: string;
  lastSentAt?: string;
  hasAutomation?: boolean;
};

export const EditorHeader = memo(function EditorHeader({
  invoiceId,
  templateName,
  onSaveDraft,
  onSchedule,
  onSend,
  onOpenSendModal,
  invoiceStatus,
  lastSentAt,
  hasAutomation,
  onAIReview,
  aiReviewIssueCount,
}: EditorHeaderProps) {
  const [scheduleDate, setScheduleDate] = useState<Date | undefined>(undefined);
  const [scheduleTime, setScheduleTime] = useState("");
  const [channel, setChannel] = useState<"email" | "whatsapp" | "both">("email");
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  const isSentToday = lastSentAt && new Date(lastSentAt).toDateString() === new Date().toDateString();

  const handleDownloadPdf = async () => {
    if (!invoiceId) return;

    setIsDownloading(true);
    try {
      const response = await fetch(`/api/invoices/${invoiceId}/pdf`);
      if (!response.ok) throw new Error("Failed to generate PDF");

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `invoice-${invoiceId}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("PDF download error:", error);
      alert("Failed to download PDF. Please try again.");
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="sticky top-0 z-40 flex items-center justify-between border-b border-border/60 bg-white/95 px-6 py-3 backdrop-blur-sm shadow-sm">
      <div className="flex items-center gap-4">
        <Link
          href="/invoices"
          className="inline-flex items-center gap-2 rounded-lg border border-border/60 bg-white px-3 py-1.5 text-sm font-medium text-foreground transition hover:border-primary/40 hover:text-primary"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Link>
        <div className="h-4 w-px bg-border/60" />
        <span className="text-sm font-medium text-muted-foreground">Template: {templateName}</span>
        {invoiceStatus && (
          <span className={`text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded-full ${invoiceStatus === "sent" ? "bg-blue-100 text-blue-700" :
            invoiceStatus === "draft" ? "bg-slate-100 text-slate-700" :
              "bg-gray-100 text-gray-700"
            }`}>
            {invoiceStatus}
          </span>
        )}
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={handleDownloadPdf}
          disabled={isDownloading || !invoiceId}
          title={!invoiceId ? "Save the invoice first to download PDF" : "Download as PDF"}
          className="inline-flex items-center gap-2 rounded-lg border border-border/60 bg-white px-4 py-2 text-sm font-medium text-foreground transition hover:border-primary/40 hover:text-primary disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Download className={`h-4 w-4 ${isDownloading ? "animate-pulse" : ""}`} />
          {isDownloading ? "Generating..." : "Download PDF"}
        </button>
        <button
          onClick={onSaveDraft}
          className="inline-flex items-center gap-2 rounded-lg border border-border/60 bg-white px-4 py-2 text-sm font-medium text-foreground transition hover:border-primary/40 hover:text-primary"
        >
          <Save className="h-4 w-4" />
          Save Draft
        </button>
        {onAIReview && (
          <button
            onClick={onAIReview}
            className="relative inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-violet-600 via-purple-600 to-indigo-600 px-5 py-2 text-sm font-semibold text-white shadow-lg shadow-purple-500/30 transition-all hover:shadow-xl hover:shadow-purple-500/40 hover:scale-[1.02] active:scale-[0.98]"
          >
            <Sparkles className="h-4 w-4 animate-pulse" />
            AI Review
            {aiReviewIssueCount !== undefined && aiReviewIssueCount > 0 && (
              <span className="absolute -top-2 -right-2 flex h-6 w-6 items-center justify-center rounded-full bg-red-500 text-xs font-bold text-white ring-2 ring-white animate-bounce">
                {aiReviewIssueCount > 9 ? "9+" : aiReviewIssueCount}
              </span>
            )}
          </button>
        )}
        <button
          onClick={() => setShowScheduleModal(true)}
          className="inline-flex items-center gap-2 rounded-lg border border-border/60 bg-white px-4 py-2 text-sm font-medium text-foreground transition hover:border-primary/40 hover:text-primary"
        >
          <Clock className="h-4 w-4" />
          Schedule
        </button>
        <button
          onClick={() => onOpenSendModal ? onOpenSendModal() : onSend({ channel })}
          className={`inline-flex items-center gap-2 rounded-lg px-5 py-2 text-sm font-semibold text-white shadow-[0_4px_12px_rgba(16,185,129,0.3)] transition hover:shadow-[0_6px_16px_rgba(16,185,129,0.4)] ${isSentToday ? "bg-slate-400 cursor-not-allowed shadow-none" : "bg-gradient-to-r from-primary via-emerald-500 to-primary"
            }`}
          disabled={!!isSentToday}
          title={isSentToday ? "Invoice already sent today" : hasAutomation ? "Automation configured" : "Send immediately"}
        >
          {isSentToday ? (
            <>
              <Send className="h-4 w-4" />
              Sent Today
            </>
          ) : hasAutomation ? (
            <>
              <Clock className="h-4 w-4" />
              Save & Start Automation
            </>
          ) : (
            <>
              <Send className="h-4 w-4" />
              Send Invoice
            </>
          )}
        </button>
      </div>

      {/* Schedule Modal */}
      <Dialog open={showScheduleModal} onOpenChange={setShowScheduleModal}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Schedule Invoice</DialogTitle>
            <DialogDescription>
              Choose when and how to send this invoice.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Delivery Channel</label>
              <Select value={channel} onValueChange={(v: "email" | "whatsapp" | "both") => setChannel(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="email">Email</SelectItem>
                  <SelectItem value="whatsapp">WhatsApp</SelectItem>
                  <SelectItem value="both">Both</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Date</label>
              <DatePicker
                date={scheduleDate}
                onDateChange={setScheduleDate}
                placeholder="Pick a date"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Time</label>
              <Input
                type="time"
                value={scheduleTime}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setScheduleTime(e.target.value)}
                placeholder="Select time"
              />
            </div>
          </div>

          <DialogFooter>
            <button
              onClick={() => {
                setShowScheduleModal(false);
                setScheduleDate(undefined);
                setScheduleTime("");
              }}
              className="inline-flex items-center justify-center rounded-lg border border-border/60 bg-white px-4 py-2 text-sm font-medium text-foreground transition hover:border-primary/40 hover:text-primary"
            >
              Cancel
            </button>
            <button
              onClick={() => {
                if (!scheduleDate) return;
                // Combine date and time into ISO string
                const dateTime = new Date(scheduleDate);
                if (scheduleTime) {
                  const [hours, minutes] = scheduleTime.split(":");
                  dateTime.setHours(parseInt(hours), parseInt(minutes));
                }
                onSchedule({ when: dateTime.toISOString(), channel });
                setShowScheduleModal(false);
                setScheduleDate(undefined);
                setScheduleTime("");
              }}
              disabled={!scheduleDate}
              className="inline-flex items-center justify-center rounded-lg bg-gradient-to-r from-primary via-emerald-500 to-primary px-5 py-2 text-sm font-semibold text-white shadow-[0_4px_12px_rgba(16,185,129,0.3)] transition hover:shadow-[0_6px_16px_rgba(16,185,129,0.4)] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Schedule Invoice
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
});
