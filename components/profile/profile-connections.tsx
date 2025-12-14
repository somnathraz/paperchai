const connections = [
  { label: "Google Sign-in", status: "Connected", action: "Manage", active: true },
  { label: "WhatsApp reminders", status: "Active", action: "Manage", active: true },
  { label: "Email sending", status: "Verified", action: "Manage", active: true },
  { label: "Slack notifications", status: "Not connected", action: "Connect", active: false },
  { label: "Notion contract sync", status: "Not connected", action: "Connect", active: false },
];

export function ProfileConnections() {
  return (
    <section className="space-y-3">
      <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Connected accounts</p>
      <div className="space-y-3">
        {connections.map((item) => (
          <div
            key={item.label}
            className="flex items-center justify-between rounded-2xl border border-white/15 bg-white/70 px-4 py-3 shadow-inner"
          >
            <div>
              <p className="text-sm font-semibold text-foreground">{item.label}</p>
              <p className="text-xs text-muted-foreground">{item.status}</p>
            </div>
            <button
              className={`rounded-full px-3 py-1 text-xs font-semibold ${
                item.active ? "bg-primary/10 text-primary" : "border border-border/70 text-muted-foreground"
              }`}
            >
              {item.action}
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}
