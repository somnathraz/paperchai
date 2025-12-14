import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { DashboardLayout } from "@/components/dashboard/layout-shell";
import { ClientForm } from "@/components/clients/client-form";

export default async function NewClientPage() {
  const session = await getServerSession(authOptions);
  if (!session) {
    redirect("/login?callbackUrl=/clients/new");
  }

  return (
    <DashboardLayout userName={session.user?.name} userEmail={session.user?.email}>
      <div className="min-h-screen bg-slate-50 py-10">
        <ClientForm />
      </div>
    </DashboardLayout>
  );
}
