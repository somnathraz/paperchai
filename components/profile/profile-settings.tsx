import Link from "next/link";

type ProfileSettingsProps = {
  data: {
    name?: string | null;
    email?: string | null;
    timezone?: string | null;
    currency?: string | null;
    reminderTone?: string | null;
    backupEmail?: string | null;
  };
};

export function ProfileSettings({ data }: ProfileSettingsProps) {
  const fields = [
    { label: "Name", value: data.name || "—" },
    { label: "Email", value: data.email || "—" },
    { label: "Timezone", value: data.timezone || "—" },
    { label: "Currency", value: data.currency || "—" },
    { label: "Reminder tone", value: data.reminderTone || "—" },
    { label: "Backup email", value: data.backupEmail || "Not set" },
  ];

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Personal settings</p>
        <Link href="/settings/profile" className="text-xs font-semibold text-primary">
          Edit
        </Link>
      </div>
      <div className="space-y-3">
        {fields.map((setting) => (
          <div key={setting.label} className="rounded-2xl border border-white/15 bg-white/70 px-4 py-3">
            <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">{setting.label}</p>
            <p className="text-sm font-semibold text-foreground">{setting.value}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
