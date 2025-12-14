const stats = [
  { label: "Collected this month", value: "₹4.82L", sub: "+18% vs last month" },
  { label: "Avg payout time", value: "7.1 days", sub: "Fast" },
  { label: "Reliability", value: "98%", sub: "Healthy" },
  { label: "Invoices sent", value: "24", sub: "This month" },
];

export function ProfileStats() {
  return (
    <section className="space-y-3">
      <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Workspace stats</p>
      <div className="grid gap-3 sm:grid-cols-2">
        {stats.map((item) => (
          <div
            key={item.label}
            className="rounded-2xl border border-white/15 bg-white/70 p-4 shadow-[0_18px_60px_-40px_rgba(0,0,0,0.45)]"
          >
            <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">{item.label}</p>
            <p className="mt-2 text-2xl font-semibold text-foreground">{item.value}</p>
            <p className="text-xs text-muted-foreground">{item.sub}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
