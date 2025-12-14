"use client";

import { useEffect, useState } from "react";
import { MoreHorizontal, Mail, Zap, CheckCircle2, AlertCircle, Clock, Eye, Send, XCircle, CalendarDays } from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { TimelineDrawerContent } from "./timeline-drawer";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { CalendarModal } from "./calendar-modal";

import { toast } from "sonner";

interface QueueItem {
    id: string;
    invoiceId: string; // Actual ID for API calls
    client: string;
    type: string;
    channel: string;
    status: string;
    time: string;
    rawStatus?: string;
}

export function Queue() {
    const [queue, setQueue] = useState<QueueItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [sendingId, setSendingId] = useState<string | null>(null);
    const [calendarOpen, setCalendarOpen] = useState(false);
    const [allUpcoming, setAllUpcoming] = useState<{ date: string, invoices: any[] }[]>([]);

    useEffect(() => {
        async function fetchQueue() {
            try {
                const res = await fetch("/api/dashboard/reminders");
                if (res.ok) {
                    const data = await res.json();
                    setQueue(data.queue || []);
                    setAllUpcoming(data.upcoming || []);
                }
            } catch (error) {
                console.error("Failed to fetch queue", error);
            } finally {
                setLoading(false);
            }
        }
        fetchQueue();
    }, []);

    const handleResend = async (invoiceId: string, channel: string) => {
        setSendingId(invoiceId);
        try {
            const res = await fetch("/api/invoices/send", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    invoiceId: invoiceId,
                    channel: channel
                }),
            });

            if (res.ok) {
                toast.success("Reminder sent successfully");
                // Optimistically update status
                setQueue(prev => prev.map(item =>
                    item.invoiceId === invoiceId ? { ...item, status: 'sent' } : item
                ));
            } else {
                const error = await res.json();
                toast.error(error.error || "Failed to send reminder");
            }
        } catch (error) {
            toast.error("Failed to send reminder");
            console.error(error);
        } finally {
            setSendingId(null);
        }
    };

    if (loading) {
        return (
            <div className="rounded-3xl border border-border bg-card/50 backdrop-blur-sm p-6 space-y-4">
                <div className="flex items-center gap-2 mb-4">
                    <div className="h-8 w-8 rounded-full bg-muted animate-pulse" />
                    <div className="h-4 w-32 bg-muted rounded animate-pulse" />
                </div>
                <div className="space-y-4">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="h-16 w-full bg-muted/50 rounded-xl animate-pulse" />
                    ))}
                </div>
            </div>
        )
    }

    return (
        <>
            <div className="rounded-3xl border border-border bg-card/50 backdrop-blur-sm overflow-hidden min-h-[400px]">
                <div className="flex items-center justify-between border-b border-border/50 px-6 py-4">
                    <div className="flex items-center gap-2">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-500">
                            <Zap className="h-4 w-4" />
                        </div>
                        <div>
                            <h3 className="font-semibold">Today&apos;s Queue</h3>
                            <p className="text-xs text-muted-foreground">{queue.length} reminders scheduled</p>
                        </div>
                    </div>
                    <button
                        onClick={() => setCalendarOpen(true)}
                        className="text-xs font-medium text-primary hover:underline flex items-center gap-1"
                    >
                        <CalendarDays className="h-3 w-3" /> View full schedule
                    </button>
                </div>

                <div className="divide-y divide-border/50">
                    {queue.length === 0 ? (
                        <div className="p-8 text-center text-muted-foreground text-sm">
                            No reminders scheduled for today.
                        </div>
                    ) : (
                        queue.map((item) => (
                            <div key={item.id} className="flex items-center justify-between px-6 py-4 hover:bg-muted/30 transition-colors group">
                                <div className="flex items-center gap-4 min-w-[200px]">
                                    <div className="h-10 w-10 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center text-xs font-semibold text-gray-600">
                                        {item.client.charAt(0)}
                                    </div>
                                    <div className="min-w-0">
                                        <p className="font-medium text-sm text-foreground truncate max-w-[150px]">{item.client}</p>
                                        <p className="text-xs text-muted-foreground">Invoice #{item.id}</p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-3 min-w-[140px]">
                                    <div className={`flex items-center justify-center h-6 w-6 rounded-full ${item.channel === 'email' ? 'bg-blue-50 text-blue-600' : 'bg-green-50 text-green-600'}`}>
                                        <Mail className="h-3 w-3" />
                                    </div>
                                    <span className="text-sm text-muted-foreground truncate max-w-[100px]">{item.type}</span>
                                </div>

                                <div className="min-w-[110px]">
                                    {item.status === 'pending' && (
                                        <span className="inline-flex items-center gap-1.5 rounded-full bg-yellow-500/10 px-2.5 py-0.5 text-xs font-medium text-yellow-600">
                                            <Clock className="h-3 w-3" /> Pending
                                        </span>
                                    )}
                                    {item.status === 'processing' && (
                                        <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-500/10 px-2.5 py-0.5 text-xs font-medium text-blue-600">
                                            <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-blue-600" /> Processing
                                        </span>
                                    )}
                                    {item.status === 'sent' && (
                                        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-medium text-emerald-600">
                                            <CheckCircle2 className="h-3 w-3" /> Sent
                                        </span>
                                    )}
                                    {item.status === 'failed' && (
                                        <span className="inline-flex items-center gap-1.5 rounded-full bg-red-500/10 px-2.5 py-0.5 text-xs font-medium text-red-600">
                                            <AlertCircle className="h-3 w-3" /> Failed
                                        </span>
                                    )}
                                </div>

                                <div className="text-sm font-medium text-muted-foreground min-w-[70px]">
                                    {item.time}
                                </div>

                                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Sheet>
                                        <SheetTrigger asChild>
                                            <Button variant="ghost" size="sm" className="h-8 px-2 text-xs font-medium text-muted-foreground hover:text-foreground">
                                                <Eye className="mr-1.5 h-3.5 w-3.5" /> View
                                            </Button>
                                        </SheetTrigger>
                                        <SheetContent className="w-[400px] sm:w-[540px]">
                                            <TimelineDrawerContent />
                                        </SheetContent>
                                    </Sheet>

                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" size="icon" className="h-8 w-8">
                                                <MoreHorizontal className="h-4 w-4" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                            <DropdownMenuItem
                                                onClick={() => handleResend(item.invoiceId, item.channel)}
                                                disabled={sendingId === item.invoiceId}
                                            >
                                                <Send className={`mr-2 h-4 w-4 ${sendingId === item.invoiceId ? 'animate-spin' : ''}`} />
                                                {sendingId === item.invoiceId ? 'Sending...' : 'Resend now'}
                                            </DropdownMenuItem>
                                            <DropdownMenuItem>
                                                <Eye className="mr-2 h-4 w-4" /> View timeline
                                            </DropdownMenuItem>
                                            <DropdownMenuSeparator />
                                            <DropdownMenuItem className="text-red-600">
                                                <XCircle className="mr-2 h-4 w-4" /> Skip reminder
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </div>
                            </div>
                        ))
                    )}
                </div>
                <div className="bg-muted/20 px-6 py-3 border-t border-border/50">
                    <button className="text-xs font-medium text-muted-foreground hover:text-foreground">
                        View all past reminders
                    </button>
                </div>
            </div>

            <CalendarModal
                open={calendarOpen}
                onOpenChange={setCalendarOpen}
                invoices={allUpcoming}
            />
        </>
    )
}
