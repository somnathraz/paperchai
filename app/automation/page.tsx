import { DashboardLayout } from "@/components/dashboard/layout-shell";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { AutomationPageContent } from "@/features/automation/components/AutomationPageContent";

export default async function AutomationPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login?callbackUrl=/automation");
  }

  return (
    <DashboardLayout userName={session.user?.name} userEmail={session.user?.email}>
      <AutomationPageContent />
    </DashboardLayout>
  );
}
