import { ArrowUpRight, Clock3, Sparkles, Wallet } from "lucide-react";
import { cn } from "@/lib/utils";

const metrics = [
  { label: "Collected this month", value: "₹4.82L", badge: "+18%", icon: Wallet, accent: "from-primary/20 via-primary/10 to-white" },
  { label: "Average payout time", value: "7.1 days", badge: "Fast", icon: Clock3, accent: "from-emerald-400/30 via-white to-white" },
  { label: "Reliability score", value: "98%", badge: "Healthy", icon: Sparkles, accent: "from-indigo-400/30 via-white to-white" },
];

export function MetricStrip() {
  return (
    <section className="grid gap-4 md:grid-cols-3">
      {metrics.map((item) => (
        <div
          key={item.label}
          className={cn(
            "group relative overflow-hidden rounded-2xl border border-white/30 bg-white/80 p-5 shadow-[0_26px_120px_-70px_rgba(0,0,0,0.55)] backdrop-blur-xl"
          )}
        >
          <div className="absolute inset-0 bg-gradient-to-br opacity-70" />
          <div className="relative flex items-center justify-between gap-3">
            <div>
              <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">{item.label}</p>
              <div className="mt-2 flex items-end gap-2">
                <p className="text-3xl font-bold leading-tight">{item.value}</p>
                <span className="flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-1 text-[11px] font-semibold text-emerald-700">
                  <ArrowUpRight className="h-3 w-3" />
                  {item.badge}
                </span>
              </div>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary/20 via-primary/30 to-emerald-400/30 text-primary shadow-inner">
              <item.icon className="h-5 w-5" />
            </div>
          </div>
          <div className="relative mt-3 h-2 w-full overflow-hidden rounded-full bg-muted">
            <div className="absolute inset-0 bg-gradient-to-r from-primary/20 via-primary/40 to-emerald-400/40" />
          </div>
        </div>
      ))}
    </section>
  );
}
