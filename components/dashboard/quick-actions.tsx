import { FileText, BellRing, PlusCircle, BarChart3 } from "lucide-react";

const actions = [
  { label: "Create invoice", icon: FileText },
  { label: "Send reminder", icon: BellRing },
  { label: "Add payment", icon: PlusCircle },
  { label: "Generate recap", icon: BarChart3 },
];

export function QuickActions() {
  return (
    <div className="pointer-events-none fixed bottom-6 right-6 z-30 flex flex-col gap-2">
      {actions.map((action) => (
        <button
          key={action.label}
          className="pointer-events-auto inline-flex items-center gap-2 rounded-full border border-white/60 bg-white/90 px-4 py-2 text-xs font-semibold text-foreground shadow-[0_18px_60px_-40px_rgba(0,0,0,0.45)] backdrop-blur-xl transition hover:-translate-y-0.5 hover:shadow-[0_22px_70px_-42px_rgba(16,185,129,0.35)]"
        >
          <action.icon className="h-4 w-4 text-primary" />
          {action.label}
        </button>
      ))}
    </div>
  );
}
