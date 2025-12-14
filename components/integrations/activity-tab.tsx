"use client";

import { memo, useState, useMemo } from "react";
import { Database, MessageSquare, Activity as ActivityIcon, Filter } from "lucide-react";

type EventSource = "notion" | "slack" | "system" | "all";
type EventType = "import" | "invoice" | "payment" | "reminder" | "all";

interface Event {
    id: string;
    source: EventSource;
    type: EventType;
    title: string;
    description: string;
    timestamp: Date;
}

// Mock data - replace with real API
const mockEvents: Event[] = [
    {
        id: "1",
        source: "notion",
        type: "import",
        title: 'Imported from Notion: Agreement "Q4 SOW"',
        description: "Created 3 milestones, Draft invoice #INV-042",
        timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
    },
    {
        id: "2",
        source: "slack",
        type: "invoice",
        title: "Created via Slack: Message shortcut in #sales",
        description: "Draft invoice #INV-041",
        timestamp: new Date(Date.now() - 5 * 60 * 60 * 1000),
    },
    {
        id: "3",
        source: "system",
        type: "payment",
        title: "Invoice #INV-040 marked as PAID",
        description: "Payment: ₹12,000 via UPI",
        timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000),
    },
];

const EventIcon = memo(function EventIcon({ source }: { source: EventSource }) {
    switch (source) {
        case "notion":
            return <Database className="w-5 h-5" />;
        case "slack":
            return <MessageSquare className="w-5 h-5" />;
        default:
            return <ActivityIcon className="w-5 h-5" />;
    }
});

const EventItem = memo(function EventItem({ event }: { event: Event }) {
    const iconColor = useMemo(() => {
        switch (event.source) {
            case "notion":
                return "bg-black text-white";
            case "slack":
                return "bg-[#4A154B] text-white";
            default:
                return "bg-stone-200 text-stone-600";
        }
    }, [event.source]);

    const timeAgo = useMemo(() => {
        const diff = Date.now() - event.timestamp.getTime();
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const days = Math.floor(hours / 24);

        if (days > 0) return `${days} day${days > 1 ? "s" : ""} ago`;
        if (hours > 0) return `${hours} hour${hours > 1 ? "s" : ""} ago`;
        return "Just now";
    }, [event.timestamp]);

    return (
        <div className="flex gap-4 p-4 border-b border-stone-200 dark:border-stone-800 last:border-0 hover:bg-stone-50 dark:hover:bg-stone-900/50 transition-colors">
            <div className={`p-2 rounded-lg ${iconColor} flex-shrink-0 h-fit`}>
                <EventIcon source={event.source} />
            </div>
            <div className="flex-1 min-w-0">
                <h4 className="font-medium text-sm mb-1">{event.title}</h4>
                <p className="text-xs text-stone-500">{event.description}</p>
                <span className="text-xs text-stone-400 mt-1 inline-block">{timeAgo}</span>
            </div>
        </div>
    );
});

export const ActivityTab = memo(function ActivityTab() {
    const [sourceFilter, setSourceFilter] = useState<EventSource>("all");
    const [typeFilter, setTypeFilter] = useState<EventType>("all");

    const filteredEvents = useMemo(() => {
        return mockEvents.filter((event) => {
            if (sourceFilter !== "all" && event.source !== sourceFilter) return false;
            if (typeFilter !== "all" && event.type !== typeFilter) return false;
            return true;
        });
    }, [sourceFilter, typeFilter]);

    return (
        <div className="p-6">
            {/* Filters */}
            <div className="mb-6 flex gap-4 items-center">
                <div className="flex items-center gap-2">
                    <Filter className="w-4 h-4 text-stone-400" />
                    <span className="text-sm font-medium">Filters:</span>
                </div>

                <select
                    value={sourceFilter}
                    onChange={(e) => setSourceFilter(e.target.value as EventSource)}
                    className="px-3 py-1.5 border border-stone-300 dark:border-stone-700 rounded-lg text-sm bg-white dark:bg-stone-900"
                >
                    <option value="all">All Sources</option>
                    <option value="notion">Notion</option>
                    <option value="slack">Slack</option>
                    <option value="system">System</option>
                </select>

                <select
                    value={typeFilter}
                    onChange={(e) => setTypeFilter(e.target.value as EventType)}
                    className="px-3 py-1.5 border border-stone-300 dark:border-stone-700 rounded-lg text-sm bg-white dark:bg-stone-900"
                >
                    <option value="all">All Types</option>
                    <option value="import">Imports</option>
                    <option value="invoice">Invoices</option>
                    <option value="payment">Payments</option>
                    <option value="reminder">Reminders</option>
                </select>
            </div>

            {/* Event Feed */}
            <div className="border border-stone-200 dark:border-stone-800 rounded-lg overflow-hidden">
                {filteredEvents.length > 0 ? (
                    filteredEvents.map((event) => <EventItem key={event.id} event={event} />)
                ) : (
                    <div className="p-12 text-center text-stone-500">
                        <ActivityIcon className="w-12 h-12 mx-auto mb-3 opacity-30" />
                        <p className="text-sm">No activity found</p>
                    </div>
                )}
            </div>
        </div>
    );
});
