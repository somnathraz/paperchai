import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { SettingsLayout } from "@/components/settings/settings-layout";

export default async function BillingSettingsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    redirect("/login?callbackUrl=/settings/billing");
  }

  return (
    <SettingsLayout
      current="/settings/billing"
      title="Billing & subscription"
      description="Manage your PaperChai plan, payment details, and usage."
    >
      <div className="space-y-6 rounded-2xl border border-white/20 bg-white/70 p-6 shadow-[0_18px_60px_-40px_rgba(0,0,0,0.45)]">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Current plan</p>
            <p className="text-lg font-semibold">Pro · ₹149 / month</p>
            <p className="text-sm text-muted-foreground">Next billing · Jan 19, 2025</p>
          </div>
          <button className="rounded-full bg-gradient-to-r from-primary via-emerald-500 to-primary px-4 py-2 text-sm font-semibold text-primary-foreground">
            Manage subscription
          </button>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border border-white/15 bg-white/80 p-4">
            <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Usage summary</p>
            <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
              <li>Clients billed: 8 / Unlimited</li>
              <li>Invoices issued: 24 this month</li>
              <li>Reminders sent: 58</li>
              <li>WhatsApp credits: 42 remaining</li>
            </ul>
          </div>
          <div className="rounded-2xl border border-white/15 bg-white/80 p-4">
            <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Payment method</p>
            <p className="mt-3 text-sm text-muted-foreground">Visa ending 4219 · Expires 07/27</p>
            <button className="mt-3 text-sm font-semibold text-primary">Update payment method</button>
          </div>
        </div>
      </div>
    </SettingsLayout>
  );
}
