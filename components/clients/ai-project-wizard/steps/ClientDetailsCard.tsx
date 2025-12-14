"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import type { ExtractedData } from "../types";

type ClientDetailsCardProps = {
    data: ExtractedData;
    onDataChange: (data: ExtractedData) => void;
};

export function ClientDetailsCard({ data, onDataChange }: ClientDetailsCardProps) {
    const updateClient = (field: keyof ExtractedData["client"], value: string) => {
        onDataChange({
            ...data,
            client: { ...data.client, [field]: value },
        });
    };

    return (
        <Card className="shadow-sm border-slate-200 overflow-hidden">
            <div className="bg-slate-50/50 px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                <h4 className="font-semibold text-slate-800 flex items-center gap-2">
                    <div className="h-6 w-6 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-xs font-bold">
                        1
                    </div>
                    Client Details
                </h4>
            </div>
            <CardContent className="p-6 grid gap-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div className="space-y-2">
                        <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                            Client Name
                        </Label>
                        <Input
                            value={data.client.name}
                            onChange={(e) => updateClient("name", e.target.value)}
                            className="h-10 border-slate-200 focus:border-indigo-500 focus:ring-indigo-500/20"
                            placeholder="e.g. Acme Corp"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                            Email Address
                        </Label>
                        <Input
                            value={data.client.email}
                            onChange={(e) => updateClient("email", e.target.value)}
                            className="h-10 border-slate-200 focus:border-indigo-500 focus:ring-indigo-500/20"
                            placeholder="contact@example.com"
                        />
                    </div>
                </div>
                <div className="space-y-2">
                    <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                        Company / Entity
                    </Label>
                    <Input
                        value={data.client.company || ""}
                        onChange={(e) => updateClient("company", e.target.value)}
                        className="h-10 border-slate-200 focus:border-indigo-500 focus:ring-indigo-500/20"
                        placeholder="Legal entity name"
                    />
                </div>
            </CardContent>
        </Card>
    );
}
