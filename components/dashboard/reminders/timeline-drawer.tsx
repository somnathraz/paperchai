"use client";

import { useState } from "react";
import { CheckCircle2, Clock, Mail, MessageSquare, Send } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

interface TimelineDrawerProps {
    invoiceId?: string;
    clientName?: string;
}

export function TimelineDrawerContent({ invoiceId = "108", clientName = "Rahul Sharma" }: TimelineDrawerProps) {
    const [sending, setSending] = useState(false);

    const handleSendNow = async () => {
        if (!invoiceId) return;

        setSending(true);
        try {
            const res = await fetch("/api/invoices/send", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    invoiceId: invoiceId, // In a real app, this would come from props
                    channel: "email"
                }),
            });

            if (res.ok) {
                toast.success("Reminder sent successfully");
            } else {
                toast.error("Failed to send reminder");
            }
        } catch (error) {
            console.error(error);
            toast.error("Failed to send reminder");
        } finally {
            setSending(false);
        }
    };

    return (
        <div className="h-full bg-background p-6 space-y-8">
            <div>
                <h3 className="text-xl font-bold">Resend Strategy</h3>
                <p className="text-sm text-muted-foreground">Invoice #{invoiceId} - {clientName}</p>
            </div>

            <div className="relative border-l-2 border-border/50 ml-3 space-y-8">
                {/* Step 1 */}
                <div className="relative pl-6">
                    <div className="absolute -left-[9px] top-0 h-4 w-4 rounded-full bg-emerald-500 border-2 border-background flex items-center justify-center">
                        <CheckCircle2 className="h-3 w-3 text-white" />
                    </div>
                    <div>
                        <p className="text-xs text-muted-foreground mb-0.5">Dec 01, 10:00 AM</p>
                        <p className="text-sm font-medium">Invoice Created</p>
                    </div>
                </div>

                {/* Step 2 */}
                <div className="relative pl-6">
                    <div className="absolute -left-[9px] top-0 h-4 w-4 rounded-full bg-emerald-500 border-2 border-background flex items-center justify-center">
                        <Mail className="h-3 w-3 text-white" />
                    </div>
                    <div>
                        <p className="text-xs text-muted-foreground mb-0.5">Dec 01, 10:05 AM</p>
                        <p className="text-sm font-medium">Sent via Email</p>
                        <p className="text-xs text-emerald-600 bg-emerald-50 inline-block px-1.5 rounded mt-1">Opened</p>
                    </div>
                </div>

                {/* Step 3 */}
                <div className="relative pl-6">
                    <div className="absolute -left-[9px] top-0 h-4 w-4 rounded-full bg-blue-500 border-2 border-background flex items-center justify-center">
                        <Clock className="h-3 w-3 text-white" />
                    </div>
                    <div>
                        <p className="text-xs text-muted-foreground mb-0.5">Dec 04, 2:15 PM (Scheduled)</p>
                        <p className="text-sm font-medium">Reminder 1 (Before Due)</p>
                        <div className="mt-2 text-xs bg-muted p-2 rounded-lg border border-border">
                            <span className="font-semibold block mb-1">Preview:</span>
                            &quot;Just a friendly nudge that invoice #{invoiceId} is due in 3 days...&quot;
                        </div>
                    </div>
                </div>

                {/* Step 4 */}
                <div className="relative pl-6 opacity-50">
                    <div className="absolute -left-[9px] top-0 h-4 w-4 rounded-full bg-muted border-2 border-background flex items-center justify-center">
                        <MessageSquare className="h-3 w-3 text-muted-foreground" />
                    </div>
                    <div>
                        <p className="text-xs text-muted-foreground mb-0.5">If unpaid by Dec 08</p>
                        <p className="text-sm font-medium">WhatsApp Follow-up</p>
                    </div>
                </div>
            </div>

            <div className="pt-6 border-t border-border flex gap-3">
                <Button
                    onClick={handleSendNow}
                    disabled={sending}
                    className="flex-1 rounded-xl bg-primary text-primary-foreground py-2.5 text-sm font-semibold hover:bg-primary/90 transition-colors flex items-center justify-center gap-2"
                >
                    <Send className={`h-4 w-4 ${sending ? 'animate-spin' : ''}`} />
                    {sending ? 'Sending...' : 'Send Now'}
                </Button>
                <button className="flex-1 rounded-xl border border-border bg-background py-2.5 text-sm font-semibold hover:bg-muted transition-colors">
                    Skip
                </button>
            </div>
        </div>
    );
}
