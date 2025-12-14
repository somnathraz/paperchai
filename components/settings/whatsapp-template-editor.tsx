"use client";

import { useState } from "react";
import { AiTemplateGenerator } from "./ai-template-generator";

export function WhatsappTemplateEditor() {
    const [body, setBody] = useState(
        'Hey {{clientName}} — hope you\'re doing well! Dropping a friendly reminder for invoice #{{invoiceId}} ({{amount}}). Tap to pay:\n{{paymentLink}}'
    );

    const handleAiGenerate = (result: { subject?: string; body: string }) => {
        if (result.body) setBody(result.body);
    };

    return (
        <div className="space-y-6">
            <div className="rounded-2xl border border-white/20 bg-white/70 p-6 shadow-[0_18px_60px_-40px_rgba(0,0,0,0.45)]">
                <p className="mb-4 text-sm text-muted-foreground">
                    WhatsApp templates are pre-approved. You&apos;ll soon be able to request variations, languages, and quick replies.
                </p>

                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Template Content</h3>
                    <AiTemplateGenerator type="whatsapp" onGenerate={handleAiGenerate} />
                </div>

                <div className="space-y-4">
                    <div className="rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/5 via-white to-emerald-50 p-4 shadow-inner">
                        <textarea
                            value={body}
                            onChange={(e) => setBody(e.target.value)}
                            className="w-full bg-transparent text-sm text-foreground outline-none resize-none"
                            rows={4}
                        />
                    </div>
                    <p className="text-xs text-muted-foreground">
                        Note: Variables like <code className="bg-muted px-1 py-0.5 rounded text-foreground">{`{{clientName}}`}</code> will be replaced automatically.
                    </p>
                </div>
            </div>

            <div className="flex justify-end">
                <button className="rounded-xl bg-foreground px-6 py-2.5 text-sm font-bold text-background transition hover:bg-foreground/90 hover:shadow-lg hover:shadow-foreground/20">
                    Save Changes
                </button>
            </div>
        </div>
    );
}
