"use client";

import { useSearchParams, useRouter } from "next/navigation";
import {
    LayoutDashboard, Zap, FileText, Users, Activity
} from "lucide-react";
import { cn } from "@/lib/utils";

type TabConfig = {
    id: string;
    label: string;
    icon: React.ElementType;
};

const tabs: TabConfig[] = [
    { id: "overview", label: "Overview", icon: LayoutDashboard },
    { id: "automation", label: "Automation", icon: Zap },
    { id: "invoices", label: "Invoices", icon: FileText },
    { id: "clients", label: "Clients", icon: Users },
    { id: "activity", label: "Activity", icon: Activity },
];

export function DashboardTabNav({ activeTab }: { activeTab: string }) {
    const router = useRouter();

    const handleTabClick = (tabId: string) => {
        router.push(`/dashboard?tab=${tabId}`, { scroll: false });
    };

    return (
        <div className="border-b border-border/60 bg-white/80 backdrop-blur-sm w-full overflow-hidden">
            <div className="flex items-center gap-2 px-4 overflow-x-auto scrollbar-hide w-full sm:gap-1">
                {tabs.map((tab) => {
                    const Icon = tab.icon;
                    const isActive = activeTab === tab.id;

                    return (
                        <button
                            key={tab.id}
                            type="button"
                            onClick={() => handleTabClick(tab.id)}
                            className={cn(
                                "flex items-center gap-2 px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-all cursor-pointer min-w-max",
                                isActive
                                    ? "border-primary text-primary bg-primary/5"
                                    : "border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/30"
                            )}
                        >
                            <Icon className="h-4 w-4" />
                            <span>{tab.label}</span>
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
