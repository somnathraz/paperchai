export function ProfileBilling() {
  const features = ["Unlimited clients", "Smart reminders", "Reliability scoring", "Monthly recap PDF", "Agreement gists"];

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Billing & plan</p>
        <button className="text-xs font-semibold text-primary">Manage subscription</button>
      </div>
      <div className="space-y-3 rounded-2xl border border-white/15 bg-white/70 p-4 shadow-inner">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-foreground">Pro · ₹149 / month</p>
            <p className="text-xs text-muted-foreground">Next billing: Jan 19, 2025</p>
          </div>
          <span className="rounded-full bg-primary/10 px-3 py-1 text-[11px] font-semibold text-primary">Active</span>
        </div>
        <ul className="space-y-2 text-sm text-muted-foreground">
          {features.map((feature) => (
            <li key={feature} className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-primary" />
              {feature}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
