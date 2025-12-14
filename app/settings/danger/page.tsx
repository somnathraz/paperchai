import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { SettingsLayout } from "@/components/settings/settings-layout";

export default async function DangerSettingsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    redirect("/login?callbackUrl=/settings/danger");
  }

  return (
    <SettingsLayout current="/settings/danger" title="Danger zone" description="Reset, transfer, or delete your PaperChai workspace.">
      <div className="space-y-8">
        <DangerSection title="Workspace" description="Actions that affect your entire PaperChai workspace.">
          <DangerRow title="Delete workspace" body="Permanently removes reminders, invoices, clients, and AI history. This cannot be undone.">
            <DangerButton label="Delete workspace" />
          </DangerRow>
          <DangerRow title="Archive workspace" body="Freeze the workspace without deleting data. Autopilot and reminders pause.">
            <DangerButton label="Archive workspace" variant="outline" />
          </DangerRow>
          <DangerRow title="Transfer workspace ownership" body="Hand off billing, automation, and data control to another member.">
            <DangerButton label="Transfer ownership" variant="outline" />
          </DangerRow>
          <DangerRow title="Pause reminders globally" body="Immediately stops WhatsApp + email reminders for every client.">
            <DangerButton label="Pause reminders" variant="outline" />
          </DangerRow>
        </DangerSection>

        <DangerSection title="Billing" description="High-impact actions for subscription, billing, and payments.">
          <DangerRow title="Cancel subscription" body="Ends autopilot features at the end of your current billing cycle.">
            <DangerButton label="Cancel subscription" />
          </DangerRow>
          <DangerRow title="Disable auto-renewal" body="Turn off automatic renewals but keep access until renewal date.">
            <DangerButton label="Disable auto-renewal" variant="outline" />
          </DangerRow>
          <DangerRow title="Downgrade to free plan" body="Remove paid features while keeping workspace data intact.">
            <DangerButton label="Downgrade plan" variant="outline" />
          </DangerRow>
        </DangerSection>

        <DangerSection title="Data & logs" description="Control exports and irreversible data resets.">
          <DangerRow title="Export all data" body="Download invoices, reminders, clients, and AI reliability logs (PDF + CSV + JSON).">
            <DangerButton label="Export workspace data" variant="outline" />
          </DangerRow>
          <DangerRow title="Clear reminder history" body="Delete reminder delivery logs and transcripts.">
            <DangerButton label="Clear reminder history" variant="outline" />
          </DangerRow>
          <DangerRow title="Delete clients & invoices" body="Removes every client and invoice record. Use only if starting fresh.">
            <DangerButton label="Delete clients & invoices" />
          </DangerRow>
          <DangerRow title="Reset reliability model" body="Wipe AI scoring so PaperChai relearns client behavior from scratch.">
            <DangerButton label="Reset reliability" variant="outline" />
          </DangerRow>
        </DangerSection>

        <DangerSection title="Automation" description="Control PaperChai autopilot engines and integrations.">
          <DangerRow title="Stop autopilot engines" body="Instantly halt AI reminders, recaps, and follow-ups.">
            <DangerButton label="Stop autopilot" />
          </DangerRow>
          <DangerRow title="Disconnect integrations" body="Disconnect Gmail, WhatsApp, Slack, and Notion connectors.">
            <DangerButton label="Disconnect all integrations" variant="outline" />
          </DangerRow>
          <DangerRow title="Reset reminder cadence" body="Reset tones and timing back to PaperChai defaults.">
            <DangerButton label="Reset cadence" variant="outline" />
          </DangerRow>
        </DangerSection>

        <DangerSection title="Security & access" description="Critical controls for security and team access.">
          <DangerRow title="Sign out all devices" body="Force sign-out across browser, desktop, and mobile.">
            <DangerButton label="Logout all devices" variant="outline" />
          </DangerRow>
          <DangerRow title="Reset 2FA" body="Disable current authenticator pairing and require new setup.">
            <DangerButton label="Reset 2FA" variant="outline" />
          </DangerRow>
          <DangerRow title="Remove all members" body="Kick out collaborators and admins (in preparation for transfer).">
            <DangerButton label="Remove members" />
          </DangerRow>
        </DangerSection>
      </div>
    </SettingsLayout>
  );
}

type DangerSectionProps = {
  title: string;
  description: string;
  children: React.ReactNode;
};

function DangerSection({ title, description, children }: DangerSectionProps) {
  return (
    <div className="space-y-3 rounded-2xl border border-red-200 bg-red-50/70 p-6 shadow-[0_18px_60px_-40px_rgba(239,68,68,0.4)]">
      <div>
        <p className="text-xs uppercase tracking-[0.22em] text-red-500">{title}</p>
        <p className="text-sm text-red-600">{description}</p>
      </div>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

type DangerRowProps = {
  title: string;
  body: string;
  children: React.ReactNode;
};

function DangerRow({ title, body, children }: DangerRowProps) {
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-red-200/70 bg-white/90 px-4 py-3 text-sm text-red-700 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="font-semibold">{title}</p>
        <p className="text-xs">{body}</p>
      </div>
      {children}
    </div>
  );
}

type DangerButtonProps = {
  label: string;
  variant?: "solid" | "outline";
};

function DangerButton({ label, variant = "solid" }: DangerButtonProps) {
  if (variant === "outline") {
    return <button className="rounded-full border border-red-400 px-4 py-2 text-xs font-semibold text-red-700">{label}</button>;
  }
  return <button className="rounded-full bg-red-500 px-4 py-2 text-xs font-semibold text-white transition hover:bg-red-600">{label}</button>;
}
