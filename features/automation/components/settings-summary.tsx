"use client";

import { Settings2, ArrowUpRight } from "lucide-react";
import Link from "next/link";

export function SettingsSummary() {
    return (
        <div className="rounded-3xl border border-border bg-card/50 backdrop-blur-sm p-6">
            <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold flex items-center gap-2">
                    <Settings2 className="h-4 w-4 text-muted-foreground" />
                    Config
                </h3>
            </div>

            <div className="space-y-3">
                <div className="flex items-center justify-between p-3 rounded-xl bg-muted/20 hover:bg-muted/40 transition-colors group cursor-pointer">
                    <div>
                        <p className="text-sm font-medium">Schedule</p>
                        <p className="text-xs text-muted-foreground">Before due, On due, +3d, +7d</p>
                    </div>
                    <ArrowUpRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>

                <div className="flex items-center justify-between p-3 rounded-xl bg-muted/20 hover:bg-muted/40 transition-colors group cursor-pointer">
                    <div>
                        <p className="text-sm font-medium">Tone & Style</p>
                        <p className="text-xs text-muted-foreground">Professional / Warm</p>
                    </div>
                    <ArrowUpRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>

                <div className="flex items-center justify-between p-3 rounded-xl bg-muted/20 hover:bg-muted/40 transition-colors group cursor-pointer">
                    <div>
                        <p className="text-sm font-medium">Channels</p>
                        <div className="flex items-center gap-2 mt-1">
                            <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
                            <span className="text-xs text-muted-foreground">Email + WhatsApp</span>
                        </div>
                    </div>
                    <ArrowUpRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
            </div>

            <div className="mt-4 pt-4 border-t border-border/50">
                <Link href="/settings" className="block w-full text-center text-xs font-medium text-primary hover:underline">
                    Advanced Settings
                </Link>
            </div>
        </div>
    );
}
