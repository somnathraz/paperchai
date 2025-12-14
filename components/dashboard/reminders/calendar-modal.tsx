"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Calendar, CalendarDayButton } from "@/components/ui/calendar";
import { format, isSameDay, parseISO } from "date-fns";
import { ChevronRight, Clock, CheckCircle2, AlertCircle } from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { TimelineDrawerContent } from "./timeline-drawer";
import { Button } from "@/components/ui/button";
import { DayButtonProps } from "react-day-picker";

interface CalendarModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    invoices: { date: string, invoices: any[] }[];
}

export function CalendarModal({ open, onOpenChange, invoices }: CalendarModalProps) {
    const [date, setDate] = useState<Date | undefined>(new Date());

    // Flatten invoices for easy lookup
    const allInvoices = invoices.flatMap(d => d.invoices.map(inv => ({ ...inv, date: d.date })));

    const selectedDayInvoices = date
        ? allInvoices.filter(inv => isSameDay(parseISO(inv.date), date))
        : [];

    const CustomDayButton = (props: DayButtonProps & { children?: React.ReactNode }) => {
        const { day, children, ...rest } = props;
        const dayInvoices = allInvoices.filter(inv => isSameDay(parseISO(inv.date), day.date));
        const count = dayInvoices.length;

        return (
            <CalendarDayButton day={day} {...rest}>
                <div className="relative flex flex-col items-center justify-center h-full w-full z-20">
                    <span className="z-10">{children}</span>
                    {count > 0 ? (
                        <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-[8px] font-bold h-3.5 w-3.5 rounded-full flex items-center justify-center shadow-sm">
                            {count}
                        </span>
                    ) : (
                        <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 bg-muted text-muted-foreground text-[8px] font-bold h-3.5 w-3.5 rounded-full flex items-center justify-center border border-border">
                            0
                        </span>
                    )}
                </div>
            </CalendarDayButton>
        );
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl">
                <DialogHeader>
                    <DialogTitle>Reminder Schedule</DialogTitle>
                </DialogHeader>

                <div className="flex flex-col md:flex-row gap-6 mt-4">
                    <div className="flex-1">
                        <Calendar
                            mode="single"
                            selected={date}
                            onSelect={setDate}
                            className="rounded-md border shadow"
                            modifiers={{
                                hasReminder: (d) => allInvoices.some(inv => isSameDay(parseISO(inv.date), d))
                            }}
                            modifiersStyles={{
                                hasReminder: { fontWeight: 'bold' }
                            }}
                            components={{
                                DayButton: CustomDayButton as any
                            }}
                        />
                    </div>

                    <div className="flex-1 space-y-4">
                        <div className="font-semibold border-b pb-2">
                            {date ? format(date, "EEEE, MMMM d") : "Select a date"}
                        </div>

                        <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2">
                            {selectedDayInvoices.length > 0 ? (
                                selectedDayInvoices.map((inv, idx) => (
                                    <div key={idx} className="flex items-center justify-between p-3 rounded-xl bg-muted/20 border border-border group">
                                        <div className="space-y-1">
                                            <p className="text-sm font-medium">{inv.client}</p>
                                            <p className="text-xs text-muted-foreground">Invoice #{inv.id} • ${(inv.amount || 0).toLocaleString()}</p>
                                        </div>

                                        <Sheet>
                                            <SheetTrigger asChild>
                                                <Button variant="ghost" size="sm" className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <ChevronRight className="h-4 w-4" />
                                                </Button>
                                            </SheetTrigger>
                                            <SheetContent className="w-[400px] sm:w-[540px]">
                                                <TimelineDrawerContent />
                                            </SheetContent>
                                        </Sheet>
                                    </div>
                                ))
                            ) : (
                                <div className="text-sm text-muted-foreground py-8 text-center italic">
                                    No reminders scheduled for this day.
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
