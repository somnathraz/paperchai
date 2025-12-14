import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { SettingsLayout } from "@/components/settings/settings-layout";

export default async function SecuritySettingsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    redirect("/login?callbackUrl=/settings/security");
  }

  return (
    <SettingsLayout current="/settings/security" title="Security" description="Protect your PaperChai account and workspace access.">
      <div className="space-y-6 rounded-2xl border border-white/20 bg-white/70 p-6 shadow-[0_18px_60px_-40px_rgba(0,0,0,0.45)]">
        <div className="flex flex-col gap-3 rounded-2xl border border-border/70 bg-white/80 px-4 py-3 shadow-inner sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-foreground">Two-factor authentication</p>
            <p className="text-xs text-muted-foreground">Authenticator app · Last checked 2h ago</p>
          </div>
          <button className="rounded-full border border-border/70 px-4 py-2 text-sm font-semibold text-muted-foreground">Disable</button>
        </div>
        <div className="rounded-2xl border border-border/70 bg-white/80 p-4 shadow-inner">
          <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Active sessions</p>
          <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
            <li>Safari · macOS · This device</li>
            <li>Chrome · Windows · Yesterday</li>
            <li>PaperChai · iOS · 3 days ago</li>
          </ul>
          <button className="mt-3 text-sm font-semibold text-primary">Sign out of other devices</button>
        </div>
      </div>
    </SettingsLayout>
  );
}
