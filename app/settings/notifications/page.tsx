import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { SettingsLayout } from "@/components/settings/settings-layout";

const notifications = [
  { label: "Invoice viewed", description: "When a client opens an invoice", defaultChecked: true },
  { label: "Reminder delivered", description: "WhatsApp or email reminder delivered", defaultChecked: true },
  { label: "Payment received", description: "Client marks an invoice as paid", defaultChecked: true },
  { label: "Reliability changes", description: "PaperChai recalculates a client’s score", defaultChecked: false },
  { label: "Weekly recap", description: "Email summary every Monday", defaultChecked: true },
];

export default async function NotificationSettingsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    redirect("/login?callbackUrl=/settings/notifications");
  }

  return (
    <SettingsLayout current="/settings/notifications" title="Notifications" description="Toggle which alerts you want to receive.">
      <div className="space-y-4 rounded-2xl border border-white/20 bg-white/70 p-6 shadow-[0_18px_60px_-40px_rgba(0,0,0,0.45)]">
        {notifications.map((item) => (
          <label key={item.label} className="flex items-start justify-between gap-3 rounded-2xl border border-border/70 bg-white/80 px-4 py-3 shadow-inner">
            <div>
              <p className="text-sm font-semibold text-foreground">{item.label}</p>
              <p className="text-xs text-muted-foreground">{item.description}</p>
            </div>
            <input type="checkbox" defaultChecked={item.defaultChecked} className="h-5 w-5 rounded border-border text-primary focus:ring-primary" />
          </label>
        ))}
      </div>
    </SettingsLayout>
  );
}
