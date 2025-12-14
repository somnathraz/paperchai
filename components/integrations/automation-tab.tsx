"use client";

import { memo } from "react";
import { Zap, Crown, ArrowRight } from "lucide-react";
import { useIsPremium } from "@/lib/hooks/use-integration";
import { useRouter } from "next/navigation";
import { RunningAutomations } from "./running-automations";

const premiumTemplates = [
    {
        id: "notion-agreement-invoice",
        title: "Notion Agreement → AI Invoice",
        description: "Extract milestones from agreements and create draft invoices automatically",
        trigger: "Notion import completed",
        action: "AI extract + Create draft",
    },
    {
        id: "slack-thread-invoice",
        title: "Slack Thread → AI Invoice",
        description: "Convert Slack conversations into structured invoice drafts",
        trigger: "Message shortcut used",
        action: "AI parse + Create draft",
    },
    {
        id: "overdue-slack-sequence",
        title: "Overdue → Slack Sequence",
        description: "Automatically notify team when invoices become overdue",
        trigger: "Invoice overdue",
        action: "Post to Slack + Email",
    },
];

const TemplateCard = memo(function TemplateCard({ template, isPremium }: { template: typeof premiumTemplates[0]; isPremium: boolean }) {
    return (
        <div className="border border-stone-200 dark:border-stone-800 rounded-lg p-4 hover:border-violet-300 transition-colors">
            <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-medium text-sm">{template.title}</h4>
                        {!isPremium && (
                            <span className="px-2 py-0.5 bg-amber-100 dark:bg-amber-900 text-amber-800 dark:text-amber-200 text-xs rounded-full font-medium flex items-center gap-1">
                                <Crown className="w-3 h-3" />
                                Premium
                            </span>
                        )}
                    </div>
                    <p className="text-xs text-stone-500">{template.description}</p>
                </div>
            </div>

            <div className="flex items-center gap-2 text-xs">
                <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded">
                    {template.trigger}
                </span>
                <ArrowRight className="w-3 h-3 text-stone-400" />
                <span className="px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded">
                    {template.action}
                </span>
            </div>

            {isPremium && (
                <button className="mt-3 w-full px-3 py-1.5 border border-violet-300 text-violet-700 dark:text-violet-300 rounded-md text-xs font-medium hover:bg-violet-50 dark:hover:bg-violet-900/20 transition-colors">
                    Enable Rule
                </button>
            )}
        </div>
    );
});

export const AutomationTab = memo(function AutomationTab() {
    const router = useRouter();
    const isPremium = useIsPremium();

    if (!isPremium) {
        return (
            <div className="p-6">
                <div className="text-center py-12">
                    <div className="inline-flex p-4 bg-violet-100 dark:bg-violet-900/50 rounded-full mb-4">
                        <Zap className="w-8 h-8 text-violet-600" />
                    </div>
                    <h3 className="text-xl font-bold mb-2">Automation Rules</h3>
                    <p className="text-stone-500 mb-6 max-w-md mx-auto">
                        Create powerful workflows that trigger automatically. Available with Premium.
                    </p>

                    <div className="max-w-2xl mx-auto space-y-4 mb-8">
                        {premiumTemplates.map((template) => (
                            <TemplateCard key={template.id} template={template} isPremium={false} />
                        ))}
                    </div>

                    <button
                        onClick={() => router.push("/settings/billing")}
                        className="px-6 py-3 bg-violet-600 text-white rounded-lg font-medium hover:bg-violet-700 transition-colors"
                    >
                        Upgrade to Enable Automation
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="p-6">
            <div className="grid gap-6 lg:grid-cols-2">
                {/* Left: Running Automations */}
                <div>
                    <div className="mb-4">
                        <h3 className="text-lg font-semibold mb-1">Active Automations</h3>
                        <p className="text-sm text-stone-500">
                            Monitor your running workflows and their status
                        </p>
                    </div>
                    <RunningAutomations />
                </div>

                {/* Right: Templates */}
                <div>
                    <div className="mb-4">
                        <h3 className="text-lg font-semibold mb-1">Automation Templates</h3>
                        <p className="text-sm text-stone-500">
                            Pre-built workflows to automate your invoice management
                        </p>
                    </div>

                    <div className="space-y-4 mb-6">
                        {premiumTemplates.map((template) => (
                            <TemplateCard key={template.id} template={template} isPremium={true} />
                        ))}
                    </div>

                    <div className="border-t border-stone-200 dark:border-stone-800 pt-4">
                        <div className="bg-stone-50 dark:bg-stone-900 rounded-lg p-4">
                            <h4 className="font-medium text-sm mb-2">Custom Rule Builder</h4>
                            <p className="text-xs text-stone-500 mb-3">
                                Create your own automation rules with custom triggers and actions
                            </p>
                            <button className="px-4 py-2 bg-violet-600 text-white rounded-lg text-sm font-medium hover:bg-violet-700 transition-colors">
                                Build Custom Rule
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
});
