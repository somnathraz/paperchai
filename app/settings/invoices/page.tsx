import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { SettingsLayout } from "@/components/settings/settings-layout";

export default async function InvoiceSettingsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    redirect("/login?callbackUrl=/settings/invoices");
  }

  return (
    <SettingsLayout
      current="/settings/invoices"
      title="Invoice settings"
      description="Defaults for numbering, due dates, tax, and PDF branding."
    >
      <div className="space-y-6 rounded-2xl border border-white/20 bg-white/70 p-6 shadow-[0_18px_60px_-40px_rgba(0,0,0,0.45)]">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="space-y-2">
            <span className="text-sm font-semibold text-foreground">Invoice prefix</span>
            <input className="w-full rounded-2xl border border-border/70 px-3 py-2 text-sm outline-none" defaultValue="FMCC-" />
          </label>
          <label className="space-y-2">
            <span className="text-sm font-semibold text-foreground">Default due days</span>
            <select className="w-full rounded-2xl border border-border/70 px-3 py-2 text-sm outline-none">
              {[7, 15, 30, 45].map((days) => (
                <option key={days}>Net {days}</option>
              ))}
            </select>
          </label>
          <label className="space-y-2">
            <span className="text-sm font-semibold text-foreground">Late fee (optional)</span>
            <input className="w-full rounded-2xl border border-border/70 px-3 py-2 text-sm outline-none" placeholder="e.g. 2%" />
          </label>
          <label className="space-y-2">
            <span className="text-sm font-semibold text-foreground">Default tax %</span>
            <input className="w-full rounded-2xl border border-border/70 px-3 py-2 text-sm outline-none" defaultValue="18%" />
          </label>
        </div>
        <label className="space-y-2">
          <span className="text-sm font-semibold text-foreground">Invoice footer</span>
          <textarea className="w-full rounded-2xl border border-border/70 px-3 py-2 text-sm outline-none" rows={3} defaultValue="Thanks for choosing PaperChai. Bank details on file." />
        </label>
      </div>
    </SettingsLayout>
  );
}
