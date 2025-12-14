import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { SettingsLayout } from "@/components/settings/settings-layout";

export default async function PaymentPreferencesPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    redirect("/login?callbackUrl=/settings/payment");
  }

  return (
    <SettingsLayout
      current="/settings/payment"
      title="Payment preferences"
      description="Control default due dates, late fees, and net terms."
    >
      <div className="space-y-4 rounded-2xl border border-white/20 bg-white/70 p-6 shadow-[0_18px_60px_-40px_rgba(0,0,0,0.45)]">
        <label className="space-y-2">
          <span className="text-sm font-semibold text-foreground">Default net terms</span>
          <select className="w-full rounded-2xl border border-border/70 px-3 py-2 text-sm outline-none">
            {[7, 15, 30, 45].map((days) => (
              <option key={days}>Net {days}</option>
            ))}
          </select>
        </label>
        <label className="space-y-2">
          <span className="text-sm font-semibold text-foreground">Auto late fee</span>
          <input className="w-full rounded-2xl border border-border/70 px-3 py-2 text-sm outline-none" placeholder="e.g. 2% per week" />
        </label>
      </div>
    </SettingsLayout>
  );
}
