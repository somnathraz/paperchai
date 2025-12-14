import { Lightbulb } from "lucide-react";

const suggestions = [
  "Last invoice · Kinetic Desk · ₹18,200",
  "Avg delay · 6.4 days",
  "Recommend Net 7",
  "Auto-fill client details?",
];

export function SmartSuggestionBar() {
  return (
    <div className="rounded-3xl border border-white/20 bg-white/90 p-4 shadow-[0_18px_60px_-40px_rgba(15,23,42,0.5)]">
      <div className="flex items-center gap-2 text-xs uppercase tracking-[0.22em] text-muted-foreground">
        <Lightbulb className="h-4 w-4 text-primary" />
        Suggestions
      </div>
      <div className="mt-3 flex flex-wrap gap-2 text-sm text-muted-foreground">
        {suggestions.map((suggestion) => (
          <span key={suggestion} className="rounded-full border border-border/60 px-3 py-1 text-xs">
            {suggestion}
          </span>
        ))}
      </div>
    </div>
  );
}
