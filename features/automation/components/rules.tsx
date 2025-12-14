"use client";

import { MessageSquare, Mail, ShieldAlert, Zap, GripVertical } from "lucide-react";
import { Switch } from "@/components/ui/switch"; // Assuming we have or will treat as if we have a basic switch

export function AutomationRules() {
    return (
        <div className="rounded-3xl border border-border bg-card/50 backdrop-blur-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-border/50 flex items-center justify-between">
                <h3 className="font-semibold flex items-center gap-2">
                    <Zap className="h-4 w-4 text-primary" />
                    Active Rules
                </h3>
                <button className="text-xs font-medium text-primary hover:underline">+ New Rule</button>
            </div>

            <div className="divide-y divide-border/50">
                {/* Rule 1 */}
                <div className="p-4 flex items-start gap-4 hover:bg-muted/30 transition-colors group">
                    <div className="mt-2 text-muted-foreground cursor-grab opacity-0 group-hover:opacity-100 transition-opacity">
                        <GripVertical className="h-4 w-4" />
                    </div>
                    <div className="h-10 w-10 flex items-center justify-center rounded-xl bg-blue-50 text-blue-600 shrink-0">
                        <Mail className="h-5 w-5" />
                    </div>
                    <div className="flex-1">
                        <div className="flex items-center justify-between">
                            <h4 className="font-medium text-sm">Auto-send Reminders</h4>
                            {/* Toggle would go here, mocking UI for now */}
                            <div className="h-5 w-9 bg-primary rounded-full relative cursor-pointer">
                                <div className="absolute right-0.5 top-0.5 h-4 w-4 bg-white rounded-full shadow-sm" />
                            </div>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                            Send emails 3 days before due, on due date, and 3, 7, 14 days after.
                        </p>
                        <div className="mt-2 flex items-center gap-3">
                            <button className="text-xs font-medium text-muted-foreground hover:text-foreground">Customize Schedule</button>
                        </div>
                    </div>
                </div>

                {/* Rule 2 */}
                <div className="p-4 flex items-start gap-4 hover:bg-muted/30 transition-colors group">
                    <div className="mt-2 text-muted-foreground cursor-grab opacity-0 group-hover:opacity-100 transition-opacity">
                        <GripVertical className="h-4 w-4" />
                    </div>
                    <div className="h-10 w-10 flex items-center justify-center rounded-xl bg-green-50 text-green-600 shrink-0">
                        <MessageSquare className="h-5 w-5" />
                    </div>
                    <div className="flex-1">
                        <div className="flex items-center justify-between">
                            <h4 className="font-medium text-sm">WhatsApp Escalation</h4>
                            <div className="h-5 w-9 bg-primary rounded-full relative cursor-pointer">
                                <div className="absolute right-0.5 top-0.5 h-4 w-4 bg-white rounded-full shadow-sm" />
                            </div>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                            If email unread for 24h, send WhatsApp follow-up automatically.
                        </p>
                    </div>
                </div>

                {/* Rule 3 */}
                <div className="p-4 flex items-start gap-4 hover:bg-muted/30 transition-colors group">
                    <div className="mt-2 text-muted-foreground cursor-grab opacity-0 group-hover:opacity-100 transition-opacity">
                        <GripVertical className="h-4 w-4" />
                    </div>
                    <div className="h-10 w-10 flex items-center justify-center rounded-xl bg-orange-50 text-orange-600 shrink-0">
                        <ShieldAlert className="h-5 w-5" />
                    </div>
                    <div className="flex-1">
                        <div className="flex items-center justify-between">
                            <h4 className="font-medium text-sm">Client Risk Detection</h4>
                            <div className="h-5 w-9 bg-muted rounded-full relative cursor-pointer">
                                <div className="absolute left-0.5 top-0.5 h-4 w-4 bg-white rounded-full shadow-sm" />
                            </div>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                            AI analyzes payment patterns to predict late payments.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
