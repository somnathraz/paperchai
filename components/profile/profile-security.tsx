const sessions = [
  { device: "Safari · macOS", status: "This device", time: "2h ago" },
  { device: "Chrome · Windows", status: "Active", time: "Yesterday" },
  { device: "iOS App", status: "Active", time: "3d ago" },
];

export function ProfileSecurity() {
  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Security</p>
        <button className="text-xs font-semibold text-primary">Manage devices</button>
      </div>

      <div className="rounded-2xl border border-white/15 bg-white/70 p-4 shadow-inner">
        <p className="text-sm font-semibold text-foreground">Two-factor authentication</p>
        <p className="text-xs text-muted-foreground">Enabled • Authenticator app</p>
        <button className="mt-3 rounded-full border border-border/70 px-3 py-1 text-xs font-semibold text-foreground">Disable</button>
      </div>

      <div className="space-y-2 rounded-2xl border border-white/15 bg-white/70 p-4 shadow-inner">
        <p className="text-sm font-semibold text-foreground">Active sessions</p>
        <div className="space-y-2 text-xs text-muted-foreground">
          {sessions.map((session) => (
            <div key={session.device} className="flex items-center justify-between rounded-xl bg-white/70 px-3 py-2">
              <div>
                <p className="text-sm font-semibold text-foreground">{session.device}</p>
                <p>{session.status}</p>
              </div>
              <p>{session.time}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-amber-200 bg-amber-50/80 px-4 py-3 text-xs text-amber-800">
        Suspicious activity? <button className="font-semibold underline">Secure account</button>
      </div>
    </section>
  );
}
