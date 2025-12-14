"use client";

import { useState } from "react";
import { Sparkles, Loader2, Wand2 } from "lucide-react";
import { cn } from "@/lib/utils";

type AiTemplateGeneratorProps = {
    type: "email" | "whatsapp";
    onGenerate: (result: { subject?: string; body: string }) => void;
};

const tones = ["Professional", "Warm", "Firm", "Urgent", "Friendly"];

export function AiTemplateGenerator({ type, onGenerate }: AiTemplateGeneratorProps) {
    const [prompt, setPrompt] = useState("");
    const [tone, setTone] = useState("Professional");
    const [loading, setLoading] = useState(false);
    const [isOpen, setIsOpen] = useState(false);

    const handleGenerate = async () => {
        if (!prompt) return;

        setLoading(true);
        try {
            const response = await fetch("/api/ai/generate-template", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ prompt, type, tone }),
            });

            if (!response.ok) throw new Error("Generation failed");

            const data = await response.json();
            onGenerate(data);
            setIsOpen(false); // Close after successful generation
        } catch (error) {
            console.error(error);
            // You might want to add a toast notification here
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) {
        return (
            <button
                onClick={() => setIsOpen(true)}
                className="flex items-center gap-2 text-xs font-semibold text-primary transition hover:text-primary/80"
            >
                <Sparkles className="h-3.5 w-3.5" />
                Analyze & Generate with AI
            </button>
        );
    }

    return (
        <div className="mt-2 space-y-3 rounded-xl border border-primary/20 bg-primary/5 p-4 transition-all animate-in fade-in slide-in-from-top-2">
            <div className="flex items-center justify-between">
                <label className="text-xs font-semibold uppercase tracking-wider text-primary">
                    AI Generator
                </label>
                <button
                    onClick={() => setIsOpen(false)}
                    className="text-xs text-muted-foreground hover:text-foreground"
                >
                    Cancel
                </button>
            </div>

            <div className="space-y-2">
                <textarea
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder={`Describe the ${type} you want... (e.g., "Polite reminder for invoice due tomorrow")`}
                    className="w-full resize-none rounded-lg border border-primary/20 bg-white px-3 py-2 text-sm placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/20"
                    rows={3}
                />
            </div>

            <div className="flex items-center gap-2">
                <div className="flex flex-1 items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
                    {tones.map((t) => (
                        <button
                            key={t}
                            onClick={() => setTone(t)}
                            className={cn(
                                "whitespace-nowrap rounded-full px-3 py-1 text-xs font-medium transition",
                                tone === t
                                    ? "bg-primary text-white shadow-sm"
                                    : "bg-white text-muted-foreground hover:bg-white/80"
                            )}
                        >
                            {t}
                        </button>
                    ))}
                </div>

                <button
                    onClick={handleGenerate}
                    disabled={!prompt || loading}
                    className="flex shrink-0 items-center gap-2 rounded-lg bg-primary px-4 py-2 text-xs font-bold text-white shadow-md shadow-primary/20 transition hover:scale-105 hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100"
                >
                    {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Wand2 className="h-3.5 w-3.5" />}
                    Generate
                </button>
            </div>
        </div>
    );
}
