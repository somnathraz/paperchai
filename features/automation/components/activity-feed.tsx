"use client";

import { useEffect, useState } from "react";
import { Mail, MessageSquare, Edit3, CheckCircle2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface ActivityItem {
    id: string;
    time: string; // ISO string
    description: string;
    type: string;
    meta?: string;
}

export function ActivityFeed() {
    const [activities, setActivities] = useState<ActivityItem[]>([]);

    useEffect(() => {
        fetch("/api/dashboard/automation")
            .then(res => res.json())
            .then(data => setActivities(data.activity || []))
            .catch(console.error);
    }, []);

    const getIcon = (type: string) => {
        if (type === 'email') return <Mail className="h-3 w-3 text-white" />;
        if (type === 'whatsapp') return <MessageSquare className="h-3 w-3 text-white" />;
        if (type === 'ai') return <Edit3 className="h-3 w-3 text-white" />;
        return <CheckCircle2 className="h-3 w-3 text-white" />;
    };

    const getColor = (type: string) => {
        if (type === 'email') return 'bg-blue-500';
        if (type === 'whatsapp') return 'bg-green-500';
        if (type === 'ai') return 'bg-purple-500';
        return 'bg-emerald-500';
    };

    return (
        <div className="rounded-3xl border border-border bg-card/50 backdrop-blur-sm p-6 overflow-hidden">
            <div className="flex items-center justify-between mb-6">
                <h3 className="font-semibold">Automation Log</h3>
                <button className="text-xs font-medium text-muted-foreground hover:text-foreground">Filter</button>
            </div>

            <div className="relative border-l border-border/50 ml-3 space-y-8">
                {activities.length === 0 ? (
                    <div className="text-sm text-muted-foreground pl-6">No recent automation activity.</div>
                ) : (
                    activities.map((item) => (
                        <div key={item.id} className="relative pl-6">
                            <div className={`absolute -left-[9px] top-1 h-4 w-4 rounded-full border-2 border-background flex items-center justify-center ${getColor(item.type)}`}>
                                {getIcon(item.type)}
                            </div>

                            <div className="flex flex-col gap-1">
                                <span className="text-xs text-muted-foreground font-mono">
                                    {formatDistanceToNow(new Date(item.time), { addSuffix: true })}
                                </span>
                                <p className="text-sm font-medium">{item.description}</p>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
