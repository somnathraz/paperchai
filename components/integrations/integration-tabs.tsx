"use client";

import { memo } from "react";
import { Database, MessageSquare, Zap, Activity } from "lucide-react";
import { useActiveTab, useIntegration } from "@/lib/hooks/use-integration";

const tabs = [
    { id: "connections" as const, label: "Connections", icon: Database },
    { id: "automation" as const, label: "Automation", icon: Zap },
    { id: "activity" as const, label: "Activity", icon: Activity },
];

export const IntegrationTabs = memo(function IntegrationTabs() {
    const activeTab = useActiveTab();
    const { setTab } = useIntegration();

    return (
        <div className="border-b border-stone-200 dark:border-stone-800">
            <nav className="flex gap-8 px-6" aria-label="Integration tabs">
                {tabs.map((tab) => {
                    const Icon = tab.icon;
                    const isActive = activeTab === tab.id;

                    return (
                        <button
                            key={tab.id}
                            onClick={() => setTab(tab.id)}
                            className={`flex items-center gap-2 py-4 border-b-2 transition-colors ${isActive
                                    ? "border-violet-600 text-violet-600 font-medium"
                                    : "border-transparent text-stone-500 hover:text-stone-700 dark:hover:text-stone-300"
                                }`}
                            aria-current={isActive ? "page" : undefined}
                        >
                            <Icon className="w-4 h-4" />
                            {tab.label}
                        </button>
                    );
                })}
            </nav>
        </div>
    );
});
