import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { SettingsLayout } from "@/components/settings/settings-layout";
import { ReminderSettingsClient } from "@/components/settings/reminder-settings-client";

export default async function ReminderSettingsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    redirect("/login?callbackUrl=/settings/reminders");
  }

  return (
    <SettingsLayout
      current="/settings/reminders"
      title="Reminder settings"
      description="Control tone, cadence, and templates for email + WhatsApp reminders."
    >
      <ReminderSettingsClient />
    </SettingsLayout>
  );
}
