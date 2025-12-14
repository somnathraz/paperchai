import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ProfileForm } from "@/components/profile/profile-form";
import { SettingsLayout } from "@/components/settings/settings-layout";

export default async function ProfileSettingsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    redirect("/login?callbackUrl=/settings/profile");
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
  });

  if (!user) {
    redirect("/login");
  }

  return (
    <SettingsLayout
      current="/settings/profile"
      title="Profile settings"
      description="Update yor profile settings."
    >
      <ProfileForm
        initialData={{
          name: user.name ?? "",
          role: user.role ?? "Founder",
          timezone: user.timezone ?? "Asia/Kolkata",
          currency: user.currency ?? "INR",
          reminderTone: user.reminderTone ?? "Warm + Polite",
          backupEmail: user.backupEmail ?? "",
        }}
      />
    </SettingsLayout>
  );
}
