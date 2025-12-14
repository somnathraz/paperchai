"use client";

import { useEffect, useState } from "react";
import { Calendar, ChevronRight } from "lucide-react";
import { addDays, format, isSameDay, parseISO } from "date-fns";
import { CalendarModal } from "./calendar-modal";

interface UpcomingInvoice {
    id: string;
    client: string;
    amount: number;
    status: string;
}

interface DayData {
    day: string;
    date: string;
    fullDate: Date;
    count: number;
    hasReminders: boolean;
    invoices: UpcomingInvoice[];
}

export function UpcomingReminders() {
    const [days, setDays] = useState<DayData[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedDate, setSelectedDate] = useState<Date>(new Date());
    const [calendarOpen, setCalendarOpen] = useState(false);
    const [allUpcoming, setAllUpcoming] = useState<{ date: string, invoices: UpcomingInvoice[] }[]>([]);

    useEffect(() => {
        async function fetchData() {
            try {
                const res = await fetch("/api/dashboard/reminders");
                if (res.ok) {
                    const data = await res.json();

                    const upcoming: { date: string, invoices: UpcomingInvoice[] }[] = data.upcoming || [];
                    setAllUpcoming(upcoming);

                    // Generate next 7 days
                    const next7Days = Array.from({ length: 7 }).map((_, i) => {
                        const d = addDays(new Date(), i);
                        const dayInvoices = upcoming.filter(u => isSameDay(parseISO(u.date), d)).flatMap(u => u.invoices);

                        return {
                            day: format(d, 'EEE'),
                            date: format(d, 'd MMM'),
                            fullDate: d,
                            count: dayInvoices.length,
                            hasReminders: dayInvoices.length > 0,
                            invoices: dayInvoices
                        };
                    });
                    setDays(next7Days);
                }
            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        }
        fetchData();
    }, []);

    const selectedDayData = days.find(d => isSameDay(d.fullDate, selectedDate)) || days[0];

    return (
        <>
            <div className="rounded-3xl border border-border bg-card/50 backdrop-blur-sm p-6 space-y-4">
                <div className="flex items-center justify-between">
                    <h3 className="font-semibold flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        Upcoming (7 Days)
                    </h3>
                    <button
                        onClick={() => setCalendarOpen(true)}
                        className="text-xs font-medium text-muted-foreground hover:text-foreground flex items-center gap-1"
                    >
                        View Calendar <ChevronRight className="h-3 w-3" />
                    </button>
                </div>

                {loading ? (
                    <div className="h-20 w-full bg-muted/20 animate-pulse rounded-xl" />
                ) : (
                    <div className="grid grid-cols-7 gap-2">
                        {days.map((item, index) => (
                            <button
                                key={index}
                                onClick={() => setSelectedDate(item.fullDate)}
                                className={`flex flex-col items-center justify-center py-3 rounded-xl transition-all border ${isSameDay(item.fullDate, selectedDate)
                                    ? "bg-primary/5 border-primary ring-1 ring-primary"
                                    : item.hasReminders
                                        ? "bg-primary/5 border-primary/20 hover:bg-primary/10"
                                        : "bg-muted/10 border-transparent hover:bg-muted/20"
                                    }`}
                            >
                                <span className="text-[10px] text-muted-foreground uppercase tracking-wide">
                                    {item.day}
                                </span>
                                <span className={`text-sm font-semibold mt-1 ${item.hasReminders ? "text-foreground" : "text-muted-foreground/50"}`}>
                                    {item.date.split(" ")[0]}
                                </span>
                                {item.hasReminders ? (
                                    <span className="mt-2 inline-flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                                        {item.count}
                                    </span>
                                ) : (
                                    <div className="h-5 w-5 mt-2" />
                                )}
                            </button>
                        ))}
                    </div>
                )}

                <div className="rounded-xl bg-muted/20 p-4 mt-2 min-h-[100px]">
                    <p className="text-sm font-medium">{selectedDayData?.date}</p>
                    <div className="mt-3 space-y-2">
                        {selectedDayData?.invoices?.length > 0 ? (
                            selectedDayData.invoices.map((inv, idx) => (
                                <div key={idx} className="flex items-center gap-3 text-sm text-muted-foreground">
                                    <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                                    <span>{inv.client} - Invoice #{inv.id}</span>
                                </div>
                            ))
                        ) : (
                            <span className="text-xs text-muted-foreground italic">No reminders scheduled.</span>
                        )}
                    </div>
                </div>
            </div>

            <CalendarModal
                open={calendarOpen}
                onOpenChange={setCalendarOpen}
                invoices={allUpcoming}
            />
        </>
    );
}
