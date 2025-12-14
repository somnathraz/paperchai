import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { SettingsLayout } from "@/components/settings/settings-layout";

const exports = [
  { label: "Invoices (PDF + CSV)", description: "All invoices issued from this workspace" },
  { label: "Payments", description: "Collected payments and payout dates" },
  { label: "Reminder logs", description: "Timestamp + tone + channel" },
  { label: "Reliability scores", description: "Client history and scores" },
];

export default async function ExportSettingsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    redirect("/login?callbackUrl=/settings/export");
  }

  return (
    <SettingsLayout
      current="/settings/export"
      title="Data & export"
      description="Download your PaperChai data or request a compliance export."
    >
      <div className="space-y-4 rounded-2xl border border-white/20 bg-white/70 p-6 shadow-[0_18px_60px_-40px_rgba(0,0,0,0.45)]">
        {exports.map((item) => (
          <div key={item.label} className="flex items-center justify-between rounded-2xl border border-border/70 bg-white/80 px-4 py-3 shadow-inner">
            <div>
              <p className="text-sm font-semibold text-foreground">{item.label}</p>
              <p className="text-xs text-muted-foreground">{item.description}</p>
            </div>
            <button className="rounded-full border border-border/70 px-4 py-2 text-sm font-semibold text-muted-foreground">Export</button>
          </div>
        ))}
      </div>
    </SettingsLayout>
  );
}
