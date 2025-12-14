import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { SettingsLayout } from "@/components/settings/settings-layout";

export default async function AIAutopilotSettingsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    redirect("/login?callbackUrl=/settings/ai-autopilot");
  }

  return (
    <SettingsLayout current="/settings/ai-autopilot" title="AI autopilot" description="Control when PaperChai acts on your behalf.">
      <div className="space-y-4 rounded-2xl border border-white/20 bg-white/70 p-6 shadow-[0_18px_60px_-40px_rgba(0,0,0,0.45)]">
        <label className="flex items-center justify-between rounded-2xl border border-border/70 bg-white/80 px-4 py-3 shadow-inner">
          <div>
            <p className="text-sm font-semibold text-foreground">Auto-escalate risky clients</p>
            <p className="text-xs text-muted-foreground">PaperChai nudges using a firmer tone after 10 days.</p>
          </div>
          <input type="checkbox" className="h-5 w-5 rounded border-border text-primary focus:ring-primary" defaultChecked />
        </label>
        <label className="flex items-center justify-between rounded-2xl border border-border/70 bg-white/80 px-4 py-3 shadow-inner">
          <div>
            <p className="text-sm font-semibold text-foreground">Auto-send monthly recap</p>
            <p className="text-xs text-muted-foreground">Automatically generate the recap card at month end.</p>
          </div>
          <input type="checkbox" className="h-5 w-5 rounded border-border text-primary focus:ring-primary" defaultChecked />
        </label>
      </div>
    </SettingsLayout>
  );
}
