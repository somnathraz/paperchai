"use client";

import { useEffect, useState } from "react";
import { Sparkles, Bell, FileText, Zap, ArrowRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface AutomationSuggestion {
  id: string;
  title: string;
  description: string;
  icon: any;
  action: string;
  actionLabel: string;
  priority: "high" | "medium" | "low";
}

export function AutomationSuggestions() {
  const [suggestions, setSuggestions] = useState<AutomationSuggestion[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSuggestions();
  }, []);

  const fetchSuggestions = async () => {
    try {
      const res = await fetch("/api/automation/suggestions");
      if (res.ok) {
        const data = await res.json();
        setSuggestions(data.suggestions || []);
      }
    } catch (err) {
      console.error("Failed to fetch automation suggestions:", err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="border border-stone-200 dark:border-stone-800 rounded-xl p-6 bg-white dark:bg-stone-900/50">
        <div className="flex items-center justify-center py-4">
          <Loader2 className="w-6 h-6 animate-spin text-stone-400" />
        </div>
      </div>
    );
  }

  if (suggestions.length === 0) {
    return null;
  }

  const priorityColors = {
    high: "from-rose-50 to-orange-50 dark:from-rose-950/20 dark:to-orange-950/20 border-rose-200 dark:border-rose-800",
    medium:
      "from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 border-blue-200 dark:border-blue-800",
    low: "from-slate-50 to-stone-50 dark:from-slate-950/20 dark:to-stone-950/20 border-slate-200 dark:border-slate-800",
  };

  const iconMap: Record<string, any> = {
    Sparkles,
    Bell,
    FileText,
    Zap,
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <Sparkles className="w-5 h-5 text-violet-600" />
        <h3 className="font-semibold text-lg">Smart Automation Suggestions</h3>
      </div>

      {suggestions.map((suggestion) => {
        const IconComponent = iconMap[suggestion.icon] || Sparkles;
        return (
          <div
            key={suggestion.id}
            className={`border rounded-xl p-5 bg-gradient-to-br ${priorityColors[suggestion.priority]}`}
          >
            <div className="flex items-start gap-4">
              <div className="p-3 bg-white dark:bg-stone-900/50 rounded-lg shadow-sm">
                <IconComponent className="w-5 h-5 text-violet-600" />
              </div>
              <div className="flex-1">
                <h4 className="font-semibold mb-1">{suggestion.title}</h4>
                <p className="text-sm text-stone-600 dark:text-stone-400 mb-3">
                  {suggestion.description}
                </p>
                <Button
                  size="sm"
                  className="bg-violet-600 hover:bg-violet-700 text-white"
                  onClick={() => (window.location.href = suggestion.action)}
                >
                  {suggestion.actionLabel}
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
